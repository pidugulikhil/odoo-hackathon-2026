const prisma = require('../prisma/client');

async function seedOperations() {
  console.log('🌱 Seeding operations (maintenance, fuel, expenses)...');

  const getVehicle = async (reg) => prisma.vehicle.findUnique({ where: { registrationNumber: reg } });
  const getTrip = async (num) => prisma.trip.findUnique({ where: { tripNumber: num } });

  const v1 = await getVehicle('MH-01-TRK-001');
  const v2 = await getVehicle('DL-02-VAN-001');
  const v3 = await getVehicle('KA-03-BUS-001');
  const v8 = await getVehicle('UP-08-VAN-003');
  const v9 = await getVehicle('WB-09-TRK-004');

  const now = new Date();
  const dayAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };

  if (!v1 || !v8) {
    console.log('⚠️  Required vehicles not found. Run seedVehicles first.');
    return;
  }

  // MAINTENANCE records
  const maintenanceRecords = [
    // ACTIVE (for IN_SHOP vehicles)
    { maintenanceNumber: 'MNT-00001', vehicleId: v8.id, type: 'Engine Overhaul', description: 'Full engine maintenance and part replacement', cost: 85000, technician: 'Ramesh Mechanic', status: 'ACTIVE', startDate: dayAgo(3) },
    { maintenanceNumber: 'MNT-00002', vehicleId: v9.id, type: 'Brake Service', description: 'Brake pad replacement and rotor resurfacing', cost: 22000, technician: 'Sunil Auto Works', status: 'ACTIVE', startDate: dayAgo(1) },
    // COMPLETED
    { maintenanceNumber: 'MNT-00003', vehicleId: v1.id, type: 'Oil Change', description: 'Engine oil and filter replacement', cost: 4500, technician: 'City Garage', status: 'COMPLETED', startDate: dayAgo(20), endDate: dayAgo(19) },
    { maintenanceNumber: 'MNT-00004', vehicleId: v2.id, type: 'Tyre Replacement', description: 'All 4 tyres replaced', cost: 32000, technician: 'MRF Service', status: 'COMPLETED', startDate: dayAgo(15), endDate: dayAgo(14) },
    { maintenanceNumber: 'MNT-00005', vehicleId: v3.id, type: 'AC Service', description: 'Air conditioning system service', cost: 8500, technician: 'Cool Cars', status: 'COMPLETED', startDate: dayAgo(12), endDate: dayAgo(11) },
    // DRAFT
    { maintenanceNumber: 'MNT-00006', vehicleId: v1.id, type: 'Scheduled Service', description: '50000 km scheduled maintenance', cost: 15000, technician: null, status: 'DRAFT' },
    { maintenanceNumber: 'MNT-00007', vehicleId: v2.id, type: 'Battery Check', description: 'Battery health check and terminals cleaning', cost: 2000, technician: null, status: 'DRAFT' },
    // CANCELLED
    { maintenanceNumber: 'MNT-00008', vehicleId: v3.id, type: 'Paint Job', description: 'Full body repaint', cost: 45000, technician: null, status: 'CANCELLED' },
  ];

  for (const m of maintenanceRecords) {
    await prisma.maintenance.upsert({
      where: { maintenanceNumber: m.maintenanceNumber },
      update: {},
      create: m,
    });
  }

  console.log(`✅ Seeded ${maintenanceRecords.length} maintenance records`);

  // FUEL LOGS
  const trip3 = await getTrip('TRIP-00003');
  const trip4 = await getTrip('TRIP-00004');
  const trip5 = await getTrip('TRIP-00005');

  const fuelLogs = [
    { vehicleId: v1.id, tripId: trip3?.id, liters: 45, cost: 4950, date: dayAgo(9), odometer: 44162, pricePerLiter: 110 },
    { vehicleId: v2.id, tripId: trip4?.id, liters: 68, cost: 7480, date: dayAgo(7), odometer: 27592, pricePerLiter: 110 },
    { vehicleId: v3.id, tripId: trip5?.id, liters: 90, cost: 9900, date: dayAgo(5), odometer: 111578, pricePerLiter: 110 },
    { vehicleId: v1.id, tripId: null, liters: 30, cost: 3300, date: dayAgo(3), odometer: 44200, pricePerLiter: 110 },
    { vehicleId: v2.id, tripId: null, liters: 25, cost: 2750, date: dayAgo(2), odometer: 27620, pricePerLiter: 110 },
  ];

  for (const f of fuelLogs) {
    await prisma.fuelLog.create({ data: f });
  }

  console.log(`✅ Seeded ${fuelLogs.length} fuel logs`);

  // EXPENSES
  const expenses = [
    { vehicleId: v1.id, tripId: trip3?.id, type: 'TOLL', description: 'Highway tolls', amount: 850, date: dayAgo(9) },
    { vehicleId: v1.id, tripId: trip3?.id, type: 'PARKING', description: 'Overnight parking', amount: 400, date: dayAgo(9) },
    { vehicleId: v2.id, tripId: trip4?.id, type: 'TOLL', description: 'NH-19 tolls', amount: 1200, date: dayAgo(7) },
    { vehicleId: v3.id, tripId: trip5?.id, type: 'TOLL', description: 'State highway tolls', amount: 950, date: dayAgo(5) },
    { vehicleId: v3.id, tripId: trip5?.id, type: 'FINE', description: 'Overweight fine at checkpoint', amount: 2000, date: dayAgo(5) },
    { vehicleId: v1.id, tripId: null, type: 'INSURANCE', description: 'Annual vehicle insurance', amount: 75000, date: dayAgo(30) },
    { vehicleId: v2.id, tripId: null, type: 'REPAIR', description: 'Door handle repair', amount: 1500, date: dayAgo(20) },
  ];

  for (const e of expenses) {
    await prisma.expense.create({ data: e });
  }

  console.log(`✅ Seeded ${expenses.length} expenses`);
}

module.exports = { seedOperations };
