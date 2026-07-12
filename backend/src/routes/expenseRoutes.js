const express = require('express');
const router = express.Router();
const { listExpenses, createExpense, getExpense, deleteExpense } = require('../controllers/expenseController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', listExpenses);
router.post('/', requireRole('FLEET_MANAGER', 'DRIVER', 'FINANCIAL_ANALYST'), createExpense);
router.get('/:id', getExpense);
router.delete('/:id', requireRole('FLEET_MANAGER', 'FINANCIAL_ANALYST'), deleteExpense);

module.exports = router;
