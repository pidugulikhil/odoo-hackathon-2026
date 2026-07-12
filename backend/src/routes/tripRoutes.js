const express = require('express');
const router = express.Router();
const {
  listTrips, createTrip, getTrip, updateTrip, deleteTrip,
  dispatchTrip, completeTrip, cancelTrip,
} = require('../controllers/tripController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', listTrips);
router.post('/', requireRole('FLEET_MANAGER', 'DRIVER'), createTrip);
router.get('/:id', getTrip);
router.put('/:id', requireRole('FLEET_MANAGER', 'DRIVER'), updateTrip);
router.delete('/:id', requireRole('FLEET_MANAGER'), deleteTrip);
router.post('/:id/dispatch', requireRole('FLEET_MANAGER', 'DRIVER'), dispatchTrip);
router.post('/:id/complete', requireRole('FLEET_MANAGER', 'DRIVER'), completeTrip);
router.post('/:id/cancel', requireRole('FLEET_MANAGER', 'DRIVER'), cancelTrip);

module.exports = router;
