const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendSuccessWithMessage, paginate } = require('../utils/apiResponse');

const VALID_TYPES = ['TOLL', 'PARKING', 'REPAIR', 'FINE', 'INSURANCE', 'OTHER'];

/**
 * GET /api/expenses
 */
const listExpenses = asyncHandler(async (req, res) => {
  const { vehicleId, tripId, type, dateFrom, dateTo, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

  const where = {};
  if (vehicleId) where.vehicleId = parseInt(vehicleId);
  if (tripId) where.tripId = parseInt(tripId);
  if (type && VALID_TYPES.includes(type)) where.type = type;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const total = await prisma.expense.count({ where });
  const { skip, take, meta } = paginate(page, limit, total);

  const expenses = await prisma.expense.findMany({
    where, skip, take,
    orderBy: { [['date', 'amount', 'createdAt'].includes(sortBy) ? sortBy : 'date']: sortOrder === 'asc' ? 'asc' : 'desc' },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  // Summary
  const totalAmount = await prisma.expense.aggregate({ where, _sum: { amount: true } });

  return sendSuccess(res, {
    expenses,
    pagination: meta,
    summary: { totalAmount: totalAmount._sum.amount || 0 },
  });
});

/**
 * POST /api/expenses
 */
const createExpense = asyncHandler(async (req, res) => {
  const { vehicleId, tripId, type, description, amount, date } = req.body;

  if (!vehicleId) throw ApiError.badRequest('Vehicle ID is required');
  if (!VALID_TYPES.includes(type)) throw ApiError.badRequest(`Expense type must be one of: ${VALID_TYPES.join(', ')}`);
  if (amount === undefined || parseFloat(amount) < 0) throw ApiError.badRequest('Amount cannot be negative');
  if (!date) throw ApiError.badRequest('Date is required');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: parseInt(tripId) } });
    if (!trip) throw ApiError.notFound('Trip not found');
  }

  const expense = await prisma.expense.create({
    data: {
      vehicleId: parseInt(vehicleId),
      tripId: tripId ? parseInt(tripId) : null,
      type,
      description: description?.trim() || null,
      amount: parseFloat(amount),
      date: new Date(date),
    },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  return sendCreated(res, { expense }, 'Expense added successfully');
});

/**
 * GET /api/expenses/:id
 */
const getExpense = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });
  if (!expense) throw ApiError.notFound('Expense not found');
  return sendSuccess(res, { expense });
});

/**
 * DELETE /api/expenses/:id
 */
const deleteExpense = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw ApiError.notFound('Expense not found');
  await prisma.expense.delete({ where: { id } });
  return sendSuccessWithMessage(res, 'Expense deleted', {});
});

/**
 * PUT /api/expenses/:id
 */
const updateExpense = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid ID');

  const record = await prisma.expense.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Expense not found');

  const { vehicleId, tripId, type, description, amount, date } = req.body;

  const data = {};
  if (vehicleId !== undefined) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    data.vehicleId = parseInt(vehicleId);
  }
  if (tripId !== undefined) {
    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: parseInt(tripId) } });
      if (!trip) throw ApiError.notFound('Trip not found');
      data.tripId = parseInt(tripId);
    } else {
      data.tripId = null;
    }
  }
  if (type !== undefined) {
    if (!VALID_TYPES.includes(type)) throw ApiError.badRequest(`Expense type must be one of: ${VALID_TYPES.join(', ')}`);
    data.type = type;
  }
  if (description !== undefined) data.description = description?.trim() || null;
  if (amount !== undefined) {
    if (parseFloat(amount) < 0) throw ApiError.badRequest('Amount cannot be negative');
    data.amount = parseFloat(amount);
  }
  if (date !== undefined) data.date = new Date(date);

  const updated = await prisma.expense.update({
    where: { id },
    data,
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  return sendSuccessWithMessage(res, 'Expense updated successfully', { expense: updated });
});

module.exports = { listExpenses, createExpense, getExpense, deleteExpense, updateExpense };
