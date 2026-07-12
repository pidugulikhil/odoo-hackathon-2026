const prisma = require('../prisma/client');

async function seedDrivers() {
  console.log('🌱 Seeding drivers...');

  const now = new Date();
  const future2y = new Date(now); future2y.setFullYear(future2y.getFullYear() + 2);
  const future1y = new Date(now); future1y.setFullYear(future1y.getFullYear() + 1);
  const in20Days = new Date(now); in20Days.setDate(in20Days.getDate() + 20);
  const in25Days = new Date(now); in25Days.setDate(in25Days.getDate() + 25);
  const past = new Date(now); past.setMonth(past.getMonth() - 3);

  const drivers = [
    { name: 'Rajesh Kumar', licenseNumber: 'MH-DL-001-2021', licenseCategory: 'HGV', licenseExpiryDate: future2y, contactNumber: '9876543210', email: 'rajesh@example.com', safetyScore: 95, region: 'Maharashtra', status: 'AVAILABLE' },
    { name: 'Suresh Patel', licenseNumber: 'GJ-DL-002-2020', licenseCategory: 'HGV', licenseExpiryDate: future1y, contactNumber: '9123456789', email: 'suresh@example.com', safetyScore: 88, region: 'Gujarat', status: 'AVAILABLE' },
    { name: 'Pradeep Singh', licenseNumber: 'DL-DL-003-2019', licenseCategory: 'LMV', licenseExpiryDate: future2y, contactNumber: '9234567890', email: 'pradeep@example.com', safetyScore: 92, region: 'Delhi', status: 'AVAILABLE' },
    { name: 'Mohan Das', licenseNumber: 'KA-DL-004-2022', licenseCategory: 'HGV', licenseExpiryDate: future1y, contactNumber: '9345678901', email: 'mohan@example.com', safetyScore: 78, region: 'Karnataka', status: 'AVAILABLE' },
    { name: 'Vikram Rao', licenseNumber: 'TN-DL-005-2021', licenseCategory: 'HTV', licenseExpiryDate: future2y, contactNumber: '9456789012', email: 'vikram@example.com', safetyScore: 96, region: 'Tamil Nadu', status: 'ON_TRIP' },
    { name: 'Santosh Verma', licenseNumber: 'RJ-DL-006-2020', licenseCategory: 'HGV', licenseExpiryDate: future1y, contactNumber: '9567890123', email: 'santosh@example.com', safetyScore: 85, region: 'Rajasthan', status: 'ON_TRIP' },
    { name: 'Ajay Mishra', licenseNumber: 'UP-DL-007-2018', licenseCategory: 'LMV', licenseExpiryDate: in20Days, contactNumber: '9678901234', email: 'ajay@example.com', safetyScore: 72, region: 'Uttar Pradesh', status: 'AVAILABLE' },
    { name: 'Ramesh Yadav', licenseNumber: 'WB-DL-008-2019', licenseCategory: 'HGV', licenseExpiryDate: in25Days, contactNumber: '9789012345', email: 'ramesh@example.com', safetyScore: 80, region: 'West Bengal', status: 'OFF_DUTY' },
    { name: 'Dinesh Chauhan', licenseNumber: 'MH-DL-009-2017', licenseCategory: 'HTV', licenseExpiryDate: past, contactNumber: '9890123456', email: 'dinesh@example.com', safetyScore: 45, region: 'Maharashtra', status: 'SUSPENDED' },
    { name: 'Anil Gupta', licenseNumber: 'PB-DL-010-2021', licenseCategory: 'HGV', licenseExpiryDate: future2y, contactNumber: '9901234567', email: 'anil@example.com', safetyScore: 98, region: 'Punjab', status: 'AVAILABLE' },
    { name: 'Manoj Tiwari', licenseNumber: 'HR-DL-011-2022', licenseCategory: 'HTV', licenseExpiryDate: future2y, contactNumber: '8901234567', email: 'manoj@example.com', safetyScore: 91, region: 'Haryana', status: 'AVAILABLE' },
    { name: 'Ravi Sharma', licenseNumber: 'DL-DL-012-2020', licenseCategory: 'LMV', licenseExpiryDate: future1y, contactNumber: '8012345678', email: 'ravi@example.com', safetyScore: 67, region: 'Delhi', status: 'OFF_DUTY' },
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: {},
      create: d,
    });
  }

  console.log(`✅ Seeded ${drivers.length} drivers`);
}

module.exports = { seedDrivers };
