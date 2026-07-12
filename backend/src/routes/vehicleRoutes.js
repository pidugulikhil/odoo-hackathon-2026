const express = require('express');
const router = express.Router();
const {
  listVehicles, createVehicle, getVehicle, updateVehicle, retireVehicle,
  getAvailableVehicles, exportVehicles,
} = require('../controllers/vehicleController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All vehicle routes require authentication
router.use(authenticate);

// GET /api/vehicles/export - must come before /:id
router.get('/export', exportVehicles);

// GET /api/vehicles/available - must come before /:id
router.get('/available', getAvailableVehicles);

// GET /api/vehicles
router.get('/', listVehicles);

// POST /api/vehicles
router.post('/', requireRole('FLEET_MANAGER'), createVehicle);

// GET /api/vehicles/:id
router.get('/:id', getVehicle);

// PUT /api/vehicles/:id
router.put('/:id', requireRole('FLEET_MANAGER'), updateVehicle);

// POST /api/vehicles/:id/retire
router.post('/:id/retire', requireRole('FLEET_MANAGER'), retireVehicle);

module.exports = router;
