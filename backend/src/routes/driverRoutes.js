const express = require('express');
const router = express.Router();
const {
  listDrivers, createDriver, getDriver, updateDriver,
  suspendDriver, setOffDuty, setAvailable,
  getAvailableDrivers, exportDrivers,
} = require('../controllers/driverController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

// Static routes BEFORE /:id
router.get('/export', exportDrivers);
router.get('/available', getAvailableDrivers);

router.get('/', listDrivers);
router.post('/', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), createDriver);
router.get('/:id', getDriver);
router.put('/:id', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), updateDriver);
router.post('/:id/suspend', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), suspendDriver);
router.post('/:id/off-duty', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), setOffDuty);
router.post('/:id/available', requireRole('FLEET_MANAGER', 'SAFETY_OFFICER'), setAvailable);

module.exports = router;
