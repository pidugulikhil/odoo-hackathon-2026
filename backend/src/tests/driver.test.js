const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/client');

describe('Driver Section Integration Tests (Member 2)', () => {
  let token;
  let driverId;
  const uniqueSuffix = Date.now();
  const testLicense = `TEST-LIC-${uniqueSuffix}`;

  // Log in as FLEET_MANAGER to get the authorization token before tests run
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'fleet@transitops.com',
        password: 'password123'
      });
    
    token = res.body.data?.token;
    if (!token) {
      throw new Error('Failed to obtain auth token. Ensure database is seeded first.');
    }
  });

  // Clean up any test drivers created during the test run
  afterAll(async () => {
    try {
      await prisma.driver.deleteMany({
        where: {
          licenseNumber: {
            startsWith: 'TEST-'
          }
        }
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    await prisma.$disconnect();
  });

  describe('1. Validation and CRUD tests', () => {
    test('POST /api/drivers - should fail if name is missing', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          licenseNumber: testLicense,
          licenseCategory: 'HGV',
          licenseExpiryDate: '2028-12-31',
          contactNumber: '9999999999',
          region: 'TestRegion'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('name');
    });

    test('POST /api/drivers - should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Driver',
          licenseNumber: testLicense,
          licenseCategory: 'HGV',
          licenseExpiryDate: '2028-12-31',
          contactNumber: '9999999999',
          email: 'invalid-email-format',
          region: 'TestRegion'
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toContain('email');
    });

    test('POST /api/drivers - should fail with out-of-bounds safety score', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Driver',
          licenseNumber: testLicense,
          licenseCategory: 'HGV',
          licenseExpiryDate: '2028-12-31',
          contactNumber: '9999999999',
          safetyScore: 120,
          region: 'TestRegion'
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toContain('score');
    });

    test('POST /api/drivers - should create a driver successfully', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Integration Driver',
          licenseNumber: testLicense,
          licenseCategory: 'HGV',
          licenseExpiryDate: '2029-05-15',
          contactNumber: '9876543210',
          email: `test-${uniqueSuffix}@transitops.com`,
          safetyScore: 95,
          region: 'Mumbai'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.driver).toBeDefined();
      expect(res.body.data?.driver.name).toBe('Test Integration Driver');
      driverId = res.body.data?.driver.id;
    });

    test('POST /api/drivers - should block creating duplicate license number', async () => {
      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Another Driver',
          licenseNumber: testLicense,
          licenseCategory: 'LMV',
          licenseExpiryDate: '2029-01-01',
          contactNumber: '9999999999',
          region: 'Delhi'
        });

      expect(res.status).toBe(409); // Conflict
    });
  });

  describe('2. Automatic License Status computations', () => {
    test('GET /api/drivers/:id - should enrich driver with valid license status', async () => {
      const res = await request(app)
        .get(`/api/drivers/${driverId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { driver } = res.body.data;
      expect(driver.licenseStatus).toBe('VALID');
      expect(driver.daysUntilExpiry).toBeGreaterThan(30);
    });

    test('POST /api/drivers - expiring soon logic (<= 30 days left)', async () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 15); // 15 days from now

      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Expiring Driver',
          licenseNumber: `TEST-EXP-${uniqueSuffix}`,
          licenseCategory: 'HGV',
          licenseExpiryDate: expiringDate.toISOString().split('T')[0],
          contactNumber: '9888888888',
          region: 'Pune'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.driver.licenseStatus).toBe('EXPIRING_SOON');
      expect(res.body.data.driver.daysUntilExpiry).toBeLessThanOrEqual(30);
      expect(res.body.data.driver.daysUntilExpiry).toBeGreaterThan(0);
    });

    test('POST /api/drivers - expired logic (< today)', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5); // 5 days ago

      const res = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Expired Driver',
          licenseNumber: `TEST-EXPD-${uniqueSuffix}`,
          licenseCategory: 'HGV',
          licenseExpiryDate: expiredDate.toISOString().split('T')[0],
          contactNumber: '9777777777',
          region: 'Goa'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.driver.licenseStatus).toBe('EXPIRED');
      expect(res.body.data.driver.daysUntilExpiry).toBeLessThan(0);
    });
  });

  describe('3. Driver Operational Status and Eligibility Service', () => {
    test('POST /api/drivers/:id/off-duty - should transition to OFF_DUTY', async () => {
      const res = await request(app)
        .post(`/api/drivers/${driverId}/off-duty`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.driver.status).toBe('OFF_DUTY');
    });

    test('POST /api/drivers/:id/suspend - should transition to SUSPENDED', async () => {
      const res = await request(app)
        .post(`/api/drivers/${driverId}/suspend`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.driver.status).toBe('SUSPENDED');
    });

    test('POST /api/drivers/:id/available - should restore to AVAILABLE', async () => {
      const res = await request(app)
        .post(`/api/drivers/${driverId}/available`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.driver.status).toBe('AVAILABLE');
    });
  });

  describe('4. List and Export APIs', () => {
    test('GET /api/drivers/available - should return only AVAILABLE and unexpired drivers', async () => {
      const res = await request(app)
        .get('/api/drivers/available')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.drivers)).toBe(true);
      
      // All returned drivers must be AVAILABLE and VALID or EXPIRING_SOON (not EXPIRED)
      res.body.data.drivers.forEach(d => {
        expect(d.status).toBe('AVAILABLE');
        expect(d.licenseStatus).not.toBe('EXPIRED');
      });
    });

    test('GET /api/drivers/export - should successfully generate CSV', async () => {
      const res = await request(app)
        .get('/api/drivers/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('License Number');
      expect(res.text).toContain(testLicense);
    });
  });
});
