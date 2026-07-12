const express = require('express');
const router = express.Router();
const {
  getDashboard, getFuelEfficiency, getFleetUtilization,
  getOperationalCost, getVehicleRoi, getActivity,
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/fuel-efficiency', getFuelEfficiency);
router.get('/fleet-utilization', getFleetUtilization);
router.get('/operational-cost', getOperationalCost);
router.get('/vehicle-roi', getVehicleRoi);
router.get('/activity', getActivity);

module.exports = router;
