const express = require('express');
const router = express.Router();
const {
  listMaintenance, createMaintenance, getMaintenance, updateMaintenance,
  startMaintenance, completeMaintenance, cancelMaintenance,
} = require('../controllers/maintenanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', listMaintenance);
router.post('/', requireRole('FLEET_MANAGER'), createMaintenance);
router.get('/:id', getMaintenance);
router.put('/:id', requireRole('FLEET_MANAGER'), updateMaintenance);
router.post('/:id/start', requireRole('FLEET_MANAGER'), startMaintenance);
router.post('/:id/complete', requireRole('FLEET_MANAGER'), completeMaintenance);
router.post('/:id/cancel', requireRole('FLEET_MANAGER'), cancelMaintenance);

module.exports = router;
