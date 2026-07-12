require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const prisma = require('../prisma/client');
const { seedUsers } = require('./seedUsers');
const { seedVehicles } = require('./seedVehicles');
const { seedDrivers } = require('./seedDrivers');
const { seedTrips } = require('./seedTrips');
const { seedOperations } = require('./seedOperations');

async function seedAll() {
  console.log('🚀 Starting TransitOps seed...\n');

  try {
    // Order matters: Users → Vehicles → Drivers → Trips → Operations
    await seedUsers();
    await seedVehicles();
    await seedDrivers();
    await seedTrips();
    await seedOperations();

    console.log('\n🎉 All seed data loaded successfully!');
    console.log('\n📋 Demo Login Accounts:');
    console.log('  Fleet Manager:      fleet@transitops.com    / password123');
    console.log('  Driver:             driver@transitops.com   / password123');
    console.log('  Safety Officer:     safety@transitops.com   / password123');
    console.log('  Financial Analyst:  finance@transitops.com  / password123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { seedAll };
