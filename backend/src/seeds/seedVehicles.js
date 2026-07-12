const prisma = require('../prisma/client');

async function seedVehicles() {
  console.log('🌱 Seeding vehicles...');

  const vehicles = [
    { registrationNumber: 'MH-01-TRK-001', name: 'Tata Prima', model: 'Prima 4028.S', type: 'TRUCK', maxLoadCapacity: 20000, odometer: 45200, acquisitionCost: 3500000, region: 'Maharashtra', status: 'AVAILABLE' },
    { registrationNumber: 'DL-02-VAN-001', name: 'Force Traveller', model: 'Traveller 3350', type: 'VAN', maxLoadCapacity: 2500, odometer: 28000, acquisitionCost: 1200000, region: 'Delhi', status: 'AVAILABLE' },
    { registrationNumber: 'KA-03-BUS-001', name: 'Tata Starbus', model: 'Starbus Ultra', type: 'BUS', maxLoadCapacity: 6000, odometer: 112000, acquisitionCost: 4800000, region: 'Karnataka', status: 'AVAILABLE' },
    { registrationNumber: 'GJ-04-TRK-002', name: 'Ashok Leyland', model: 'DOST Strong', type: 'MINI_TRUCK', maxLoadCapacity: 1500, odometer: 67000, acquisitionCost: 850000, region: 'Gujarat', status: 'AVAILABLE' },
    { registrationNumber: 'MH-05-VAN-002', name: 'Mahindra Bolero', model: 'Bolero Maxi Truck', type: 'VAN', maxLoadCapacity: 1000, odometer: 32000, acquisitionCost: 950000, region: 'Maharashtra', status: 'AVAILABLE' },
    { registrationNumber: 'TN-06-TRL-001', name: 'Volvo FH', model: 'FH 540', type: 'TRAILER', maxLoadCapacity: 30000, odometer: 89000, acquisitionCost: 8500000, region: 'Tamil Nadu', status: 'ON_TRIP' },
    { registrationNumber: 'RJ-07-TRK-003', name: 'Eicher Pro', model: 'Pro 6049', type: 'TRUCK', maxLoadCapacity: 18000, odometer: 54000, acquisitionCost: 2900000, region: 'Rajasthan', status: 'ON_TRIP' },
    { registrationNumber: 'UP-08-VAN-003', name: 'Toyota HiAce', model: 'HiAce 2.8D', type: 'VAN', maxLoadCapacity: 3000, odometer: 41000, acquisitionCost: 2100000, region: 'Uttar Pradesh', status: 'IN_SHOP' },
    { registrationNumber: 'WB-09-TRK-004', name: 'BharatBenz 1617', model: '1617 R Heavy Duty', type: 'TRUCK', maxLoadCapacity: 25000, odometer: 78000, acquisitionCost: 4100000, region: 'West Bengal', status: 'IN_SHOP' },
    { registrationNumber: 'MH-10-TRK-005', name: 'Tata LPT 2518', model: 'LPT 2518', type: 'TRUCK', maxLoadCapacity: 22000, odometer: 155000, acquisitionCost: 3200000, region: 'Maharashtra', status: 'RETIRED' },
    { registrationNumber: 'PB-11-BUS-002', name: 'Swaraj Mazda', model: 'T2 School Bus', type: 'BUS', maxLoadCapacity: 4500, odometer: 22000, acquisitionCost: 3600000, region: 'Punjab', status: 'AVAILABLE' },
    { registrationNumber: 'HR-12-TRL-002', name: 'Bharat Benz 4028', model: '4028 Trailer', type: 'TRAILER', maxLoadCapacity: 35000, odometer: 34000, acquisitionCost: 9200000, region: 'Haryana', status: 'AVAILABLE' },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: {},
      create: v,
    });
  }

  console.log(`✅ Seeded ${vehicles.length} vehicles`);
}

module.exports = { seedVehicles };
