const express = require('express');
const router = express.Router();
const { listFuelLogs, createFuelLog, getFuelLog, deleteFuelLog, updateFuelLog } = require('../controllers/fuelController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', listFuelLogs);
router.post('/', requireRole('FLEET_MANAGER', 'DRIVER', 'FINANCIAL_ANALYST'), createFuelLog);
router.get('/:id', getFuelLog);
router.put('/:id', requireRole('FLEET_MANAGER', 'FINANCIAL_ANALYST'), updateFuelLog);
router.delete('/:id', requireRole('FLEET_MANAGER', 'FINANCIAL_ANALYST'), deleteFuelLog);

module.exports = router;
