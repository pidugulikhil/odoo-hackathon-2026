const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendSuccessWithMessage, paginate } = require('../utils/apiResponse');

/**
 * GET /api/fuel
 */
const listFuelLogs = asyncHandler(async (req, res) => {
  const { vehicleId, tripId, dateFrom, dateTo, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

  const where = {};
  if (vehicleId) where.vehicleId = parseInt(vehicleId);
  if (tripId) where.tripId = parseInt(tripId);
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const total = await prisma.fuelLog.count({ where });
  const { skip, take, meta } = paginate(page, limit, total);
  const allowedSort = ['date', 'liters', 'cost', 'createdAt'];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : 'date';

  const logs = await prisma.fuelLog.findMany({
    where, skip, take,
    orderBy: { [orderByField]: sortOrder === 'asc' ? 'asc' : 'desc' },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  return sendSuccess(res, { fuelLogs: logs, pagination: meta });
});

/**
 * POST /api/fuel
 */
const createFuelLog = asyncHandler(async (req, res) => {
  const { vehicleId, tripId, liters, cost, date, odometer } = req.body;

  if (!vehicleId) throw ApiError.badRequest('Vehicle ID is required');
  if (!liters || parseFloat(liters) <= 0) throw ApiError.badRequest('Liters must be greater than 0');
  if (cost === undefined || parseFloat(cost) < 0) throw ApiError.badRequest('Cost cannot be negative');
  if (!date) throw ApiError.badRequest('Date is required');
  if (odometer !== undefined && parseFloat(odometer) < 0) throw ApiError.badRequest('Odometer cannot be negative');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: parseInt(tripId) } });
    if (!trip) throw ApiError.notFound('Trip not found');
  }

  const litersVal = parseFloat(liters);
  const costVal = parseFloat(cost);
  const pricePerLiter = litersVal > 0 ? costVal / litersVal : null;

  const log = await prisma.fuelLog.create({
    data: {
      vehicleId: parseInt(vehicleId),
      tripId: tripId ? parseInt(tripId) : null,
      liters: litersVal,
      cost: costVal,
      date: new Date(date),
      odometer: odometer !== undefined ? parseFloat(odometer) : null,
      pricePerLiter,
    },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  return sendCreated(res, { fuelLog: log }, 'Fuel log added successfully');
});

/**
 * GET /api/fuel/:id
 */
const getFuelLog = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const log = await prisma.fuelLog.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });
  if (!log) throw ApiError.notFound('Fuel log not found');
  return sendSuccess(res, { fuelLog: log });
});

/**
 * DELETE /api/fuel/:id
 */
const deleteFuelLog = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const log = await prisma.fuelLog.findUnique({ where: { id } });
  if (!log) throw ApiError.notFound('Fuel log not found');
  await prisma.fuelLog.delete({ where: { id } });
  return sendSuccessWithMessage(res, 'Fuel log deleted', {});
});

module.exports = { listFuelLogs, createFuelLog, getFuelLog, deleteFuelLog };
