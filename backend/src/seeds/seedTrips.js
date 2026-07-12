const prisma = require('../prisma/client');

async function seedTrips() {
  console.log('🌱 Seeding trips...');

  // Get vehicle/driver IDs by registration/license
  const getVehicle = async (reg) => prisma.vehicle.findUnique({ where: { registrationNumber: reg } });
  const getDriver = async (lic) => prisma.driver.findUnique({ where: { licenseNumber: lic } });

  const now = new Date();
  const dayAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };

  // DISPATCHED trips (these vehicles/drivers are already ON_TRIP from seed)
  const v6 = await getVehicle('TN-06-TRL-001');
  const v7 = await getVehicle('RJ-07-TRK-003');
  const d5 = await getDriver('TN-DL-005-2021');
  const d6 = await getDriver('RJ-DL-006-2020');

  // AVAILABLE vehicles/drivers for DRAFT and COMPLETED trips
  const v1 = await getVehicle('MH-01-TRK-001');
  const v2 = await getVehicle('DL-02-VAN-001');
  const v3 = await getVehicle('KA-03-BUS-001');
  const v4 = await getVehicle('GJ-04-TRK-002');
  const d1 = await getDriver('MH-DL-001-2021');
  const d2 = await getDriver('GJ-DL-002-2020');
  const d3 = await getDriver('DL-DL-003-2019');
  const d4 = await getDriver('KA-DL-004-2022');

  if (!v6 || !v7 || !d5 || !d6 || !v1 || !d1) {
    console.log('⚠️  Required vehicles/drivers not found. Run seedVehicles and seedDrivers first.');
    return;
  }

  const trips = [
    // DISPATCHED trips - must match ON_TRIP vehicles/drivers from seed
    {
      tripNumber: 'TRIP-00001',
      source: 'Chennai', destination: 'Bangalore',
      vehicleId: v6.id, driverId: d5.id,
      cargoWeight: 15000, plannedDistance: 350,
      status: 'DISPATCHED',
      dispatchDate: dayAgo(2),
      startOdometer: v6.odometer - 0,
    },
    {
      tripNumber: 'TRIP-00002',
      source: 'Jaipur', destination: 'Delhi',
      vehicleId: v7.id, driverId: d6.id,
      cargoWeight: 12000, plannedDistance: 280,
      status: 'DISPATCHED',
      dispatchDate: dayAgo(1),
      startOdometer: v7.odometer - 0,
    },
    // COMPLETED trips
    {
      tripNumber: 'TRIP-00003',
      source: 'Mumbai', destination: 'Pune',
      vehicleId: v1.id, driverId: d1.id,
      cargoWeight: 18000, plannedDistance: 150,
      startOdometer: 44000, finalOdometer: 44162,
      actualDistance: 162, fuelConsumed: 45,
      revenue: 28000, status: 'COMPLETED',
      dispatchDate: dayAgo(10), completionDate: dayAgo(9),
    },
    {
      tripNumber: 'TRIP-00004',
      source: 'Delhi', destination: 'Lucknow',
      vehicleId: v2.id, driverId: d3.id,
      cargoWeight: 1800, plannedDistance: 580,
      startOdometer: 27000, finalOdometer: 27592,
      actualDistance: 592, fuelConsumed: 68,
      revenue: 18500, status: 'COMPLETED',
      dispatchDate: dayAgo(8), completionDate: dayAgo(7),
    },
    {
      tripNumber: 'TRIP-00005',
      source: 'Bangalore', destination: 'Hyderabad',
      vehicleId: v3.id, driverId: d4.id,
      cargoWeight: 3500, plannedDistance: 570,
      startOdometer: 111000, finalOdometer: 111578,
      actualDistance: 578, fuelConsumed: 90,
      revenue: 35000, status: 'COMPLETED',
      dispatchDate: dayAgo(6), completionDate: dayAgo(5),
    },
    {
      tripNumber: 'TRIP-00006',
      source: 'Ahmedabad', destination: 'Mumbai',
      vehicleId: v4.id, driverId: d2.id,
      cargoWeight: 1200, plannedDistance: 540,
      startOdometer: 66000, finalOdometer: 66558,
      actualDistance: 558, fuelConsumed: 55,
      revenue: 16000, status: 'COMPLETED',
      dispatchDate: dayAgo(4), completionDate: dayAgo(3),
    },
    // DRAFT trips
    {
      tripNumber: 'TRIP-00007',
      source: 'Mumbai', destination: 'Nagpur',
      vehicleId: v1.id, driverId: d1.id,
      cargoWeight: 16000, plannedDistance: 850,
      status: 'DRAFT',
    },
    {
      tripNumber: 'TRIP-00008',
      source: 'Delhi', destination: 'Chandigarh',
      vehicleId: v2.id, driverId: d3.id,
      cargoWeight: 2000, plannedDistance: 250,
      status: 'DRAFT',
    },
    // CANCELLED trips
    {
      tripNumber: 'TRIP-00009',
      source: 'Kolkata', destination: 'Patna',
      vehicleId: v3.id, driverId: d4.id,
      cargoWeight: 4000, plannedDistance: 600,
      status: 'CANCELLED',
    },
    {
      tripNumber: 'TRIP-00010',
      source: 'Hyderabad', destination: 'Chennai',
      vehicleId: v1.id, driverId: d1.id,
      cargoWeight: 17000, plannedDistance: 700,
      startOdometer: 44162, status: 'CANCELLED',
      dispatchDate: dayAgo(15),
    },
  ];

  for (const t of trips) {
    await prisma.trip.upsert({
      where: { tripNumber: t.tripNumber },
      update: {},
      create: t,
    });
  }

  console.log(`✅ Seeded ${trips.length} trips`);
}

module.exports = { seedTrips };
