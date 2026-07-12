require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { seedAll } = require('./seedAll');

seedAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
