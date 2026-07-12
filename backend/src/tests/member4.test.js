const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/client');

describe('Member 4 Integration Tests (Maintenance, Fuel, Expenses, Analytics, Reports)', () => {
  let token;
  let testVehicleId;
  let testVehicleReg = `TEST-VEH-${Date.now()}`;
  let testMaintenanceId;
  let testFuelLogId;
  let testExpenseId;

  // Log in as FLEET_MANAGER to get authorization token
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'fleet@transitops.com',
        password: 'password123'
      });
    
    token = res.body.data?.token;
    if (!token) {
      throw new Error('Failed to obtain auth token. Ensure database is seeded.');
    }

    // Create a temporary test vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: testVehicleReg,
        name: 'Test Heavy Truck',
        model: 'Prima 4028',
        type: 'TRUCK',
        maxLoadCapacity: 25000,
        odometer: 10000,
        acquisitionCost: 3000000,
        region: 'North',
        status: 'AVAILABLE',
      }
    });
    testVehicleId = vehicle.id;
  });

  // Clean up any test records created
  afterAll(async () => {
    try {
      await prisma.maintenance.deleteMany({ where: { vehicleId: testVehicleId } });
      await prisma.fuelLog.deleteMany({ where: { vehicleId: testVehicleId } });
      await prisma.expense.deleteMany({ where: { vehicleId: testVehicleId } });
      await prisma.vehicle.delete({ where: { id: testVehicleId } });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    await prisma.$disconnect();
  });

  describe('1. Maintenance Module Tests', () => {
    test('POST /api/maintenance - should create maintenance as DRAFT', async () => {
      const res = await request(app)
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          type: 'Oil Change',
          description: 'Regular engine oil check',
          cost: 1500,
          technician: 'Mr. John'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maintenance.status).toBe('DRAFT');
      expect(res.body.data.maintenance.maintenanceNumber).toBeDefined();
      testMaintenanceId = res.body.data.maintenance.id;
    });

    test('POST /api/maintenance - should fail if cost is negative', async () => {
      const res = await request(app)
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          type: 'Oil Change',
          description: 'Regular oil check',
          cost: -50,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('PUT /api/maintenance/:id - should update DRAFT maintenance', async () => {
      const res = await request(app)
        .put(`/api/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'Full Engine Service',
          cost: 2500
        });

      expect(res.status).toBe(200);
      expect(res.body.data.maintenance.type).toBe('Full Engine Service');
      expect(res.body.data.maintenance.cost).toBe(2500);
    });

    test('POST /api/maintenance/:id/start - should transition maintenance to ACTIVE and vehicle to IN_SHOP', async () => {
      const res = await request(app)
        .post(`/api/maintenance/${testMaintenanceId}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.maintenance.status).toBe('ACTIVE');

      const vehicle = await prisma.vehicle.findUnique({ where: { id: testVehicleId } });
      expect(vehicle.status).toBe('IN_SHOP');
    });

    test('POST /api/maintenance/:id/start - should prevent duplicate ACTIVE maintenance', async () => {
      // Create a second draft maintenance
      const draftRes = await request(app)
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          type: 'Tire Rotations',
          description: 'Check tires',
          cost: 500,
        });
      const secondMaintId = draftRes.body.data.maintenance.id;

      // Try starting it (should fail since testMaintenanceId is ACTIVE)
      const res = await request(app)
        .post(`/api/maintenance/${secondMaintId}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409); // Conflict

      // Cleanup second maintenance
      await prisma.maintenance.delete({ where: { id: secondMaintId } });
    });

    test('POST /api/maintenance/:id/complete - should transition to COMPLETED and return vehicle to AVAILABLE', async () => {
      const res = await request(app)
        .post(`/api/maintenance/${testMaintenanceId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ cost: 3000 });

      expect(res.status).toBe(200);
      expect(res.body.data.maintenance.status).toBe('COMPLETED');
      expect(res.body.data.maintenance.cost).toBe(3000);

      const vehicle = await prisma.vehicle.findUnique({ where: { id: testVehicleId } });
      expect(vehicle.status).toBe('AVAILABLE');
    });

    test('POST /api/maintenance - should block creating maintenance draft on a retired vehicle', async () => {
      // Retire the vehicle
      await prisma.vehicle.update({ where: { id: testVehicleId }, data: { status: 'RETIRED' } });

      const res = await request(app)
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          type: 'Post-Retirement Inspection',
          description: 'Retired inspection',
          cost: 100
        });

      expect(res.status).toBe(400);

      // Restore vehicle status
      await prisma.vehicle.update({ where: { id: testVehicleId }, data: { status: 'AVAILABLE' } });
    });
  });

  describe('2. Fuel Log Module Tests', () => {
    test('POST /api/fuel - should create a fuel log and calculate pricePerLiter', async () => {
      const res = await request(app)
        .post('/api/fuel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          liters: 50,
          cost: 5000,
          date: '2026-07-12',
          odometer: 10500
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fuelLog.pricePerLiter).toBe(100);
      testFuelLogId = res.body.data.fuelLog.id;
    });

    test('POST /api/fuel - should fail if liters <= 0 or cost is negative', async () => {
      const res1 = await request(app)
        .post('/api/fuel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          liters: 0,
          cost: 500,
          date: '2026-07-12'
        });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/fuel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          liters: 10,
          cost: -50,
          date: '2026-07-12'
        });
      expect(res2.status).toBe(400);
    });

    test('PUT /api/fuel/:id - should update fuel log liters and cost and recalculate pricePerLiter', async () => {
      const res = await request(app)
        .put(`/api/fuel/${testFuelLogId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          liters: 40,
          cost: 4400
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fuelLog.liters).toBe(40);
      expect(res.body.data.fuelLog.cost).toBe(4400);
      expect(res.body.data.fuelLog.pricePerLiter).toBe(110);
    });

    test('GET /api/fuel - should support pagination, sorting and filter', async () => {
      const res = await request(app)
        .get('/api/fuel')
        .set('Authorization', `Bearer ${token}`)
        .query({ vehicleId: testVehicleId });

      expect(res.status).toBe(200);
      expect(res.body.data.fuelLogs.length).toBeGreaterThan(0);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe('3. Expense Module Tests', () => {
    test('POST /api/expenses - should create expense record successfully', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: testVehicleId,
          type: 'TOLL',
          amount: 500,
          date: '2026-07-12',
          description: 'Noida expressway toll'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.expense.type).toBe('TOLL');
      testExpenseId = res.body.data.expense.id;
    });

    test('PUT /api/expenses/:id - should update expense amount and type', async () => {
      const res = await request(app)
        .put(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'PARKING',
          amount: 600
        });

      expect(res.status).toBe(200);
      expect(res.body.data.expense.type).toBe('PARKING');
      expect(res.body.data.expense.amount).toBe(600);
    });

    test('GET /api/expenses - should return expense summary totals', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .query({ vehicleId: testVehicleId });

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalAmount).toBe(600);
    });
  });

  describe('4. Dashboard Backend API and Filtering Tests', () => {
    test('GET /api/analytics/dashboard - should return dashboard KPIs with totalFleetCost', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const kpis = res.body.data.kpis;
      expect(kpis.activeVehicles).toBeDefined();
      expect(kpis.availableVehicles).toBeDefined();
      expect(kpis.vehiclesInMaintenance).toBeDefined();
      expect(kpis.totalFleetCost).toBeDefined();
      expect(kpis.operationalCost).toBeDefined();
    });

    test('GET /api/analytics/dashboard - should apply region filter correctly', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .query({ region: 'North' });

      expect(res.status).toBe(200);
      const kpis = res.body.data.kpis;
      // Scoped only to North region vehicles (which is our test vehicle)
      expect(kpis.totalVehicles).toBe(1);
    });
  });

  describe('5. Reports and CSV Export Tests', () => {
    test('GET /api/analytics/fuel-efficiency/export - should export fuel efficiency CSV', async () => {
      const res = await request(app)
        .get('/api/analytics/fuel-efficiency/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Fuel Efficiency');
    });

    test('GET /api/analytics/fleet-utilization/export - should export fleet utilization CSV', async () => {
      const res = await request(app)
        .get('/api/analytics/fleet-utilization/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Registration Number');
    });

    test('GET /api/analytics/operational-cost/export - should export operational cost CSV', async () => {
      const res = await request(app)
        .get('/api/analytics/operational-cost/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Operational Cost');
    });

    test('GET /api/analytics/vehicle-roi/export - should export ROI CSV', async () => {
      const res = await request(app)
        .get('/api/analytics/vehicle-roi/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('ROI %');
    });
  });

  describe('6. Activity Feed Tests', () => {
    test('GET /api/analytics/activity - should return list of formatted activities', async () => {
      const res = await request(app)
        .get('/api/analytics/activity')
        .set('Authorization', `Bearer ${token}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.activities)).toBe(true);
      
      // Ensure recently logged actions appear in the feed
      const messages = res.body.data.activities.map(a => a.message);
      const fuelAddedMessage = messages.find(m => m.includes('Fuel Added'));
      const expenseAddedMessage = messages.find(m => m.includes('Expense Added'));
      expect(fuelAddedMessage).toBeDefined();
      expect(expenseAddedMessage).toBeDefined();
    });
  });
});
