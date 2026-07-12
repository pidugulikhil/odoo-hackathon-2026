const bcrypt = require('bcrypt');
const prisma = require('../prisma/client');

async function seedUsers() {
  console.log('🌱 Seeding users...');

  const users = [
    { name: 'Fleet Manager', email: 'fleet@transitops.com', password: 'password123', role: 'FLEET_MANAGER' },
    { name: 'Alex Driver', email: 'driver@transitops.com', password: 'password123', role: 'DRIVER' },
    { name: 'Safety Officer', email: 'safety@transitops.com', password: 'password123', role: 'SAFETY_OFFICER' },
    { name: 'Financial Analyst', email: 'finance@transitops.com', password: 'password123', role: 'FINANCIAL_ANALYST' },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
  }

  console.log(`✅ Seeded ${users.length} users`);
}

module.exports = { seedUsers };
