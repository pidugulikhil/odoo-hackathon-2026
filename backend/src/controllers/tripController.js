const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendSuccessWithMessage, paginate } = require('../utils/apiResponse');
const { checkDriverEligibility, getLicenseStatus } = require('../services/driverEligibilityService');

const VALID_STATUSES = ['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];

// ─── Trip Number Generation ───────────────────────────────────────────────────

async function generateTripNumber() {
  // Use a transaction to find the last trip number and increment atomically
  const lastTrip = await prisma.trip.findFirst({
    orderBy: { id: 'desc' },
    select: { tripNumber: true },
  });

  let nextNum = 1;
  if (lastTrip?.tripNumber) {
    const match = lastTrip.tripNumber.match(/TRIP-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  // Pad to 5 digits
  return `TRIP-${String(nextNum).padStart(5, '0')}`;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/trips
 */
const listTrips = asyncHandler(async (req, res) => {
  const { search, status, vehicleId, driverId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { tripNumber: { contains: search, mode: 'insensitive' } },
      { source: { contains: search, mode: 'insensitive' } },
      { destination: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (vehicleId) where.vehicleId = parseInt(vehicleId);
  if (driverId) where.driverId = parseInt(driverId);
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const allowedSort = ['tripNumber', 'status', 'source', 'destination', 'createdAt', 'dispatchDate', 'completionDate'];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.trip.count({ where });
  const { skip, take, meta } = paginate(page, limit, total);

  const trips = await prisma.trip.findMany({
    where, skip, take,
    orderBy: { [orderByField]: orderDir },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true, type: true } },
      driver: { select: { id: true, name: true, licenseNumber: true } },
    },
  });

  return sendSuccess(res, { trips, pagination: meta });
});

/**
 * POST /api/trips
 */
const createTrip = asyncHandler(async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = req.body;

  if (!source?.trim()) throw ApiError.badRequest('Source is required');
  if (!destination?.trim()) throw ApiError.badRequest('Destination is required');
  if (!vehicleId) throw ApiError.badRequest('Vehicle is required');
  if (!driverId) throw ApiError.badRequest('Driver is required');
  if (!cargoWeight || parseFloat(cargoWeight) <= 0) throw ApiError.badRequest('Cargo weight must be greater than 0');
  if (!plannedDistance || parseFloat(plannedDistance) <= 0) throw ApiError.badRequest('Planned distance must be greater than 0');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');

  const driver = await prisma.driver.findUnique({ where: { id: parseInt(driverId) } });
  if (!driver) throw ApiError.notFound('Driver not found');

  // Cargo capacity check
  const weight = parseFloat(cargoWeight);
  if (weight > vehicle.maxLoadCapacity) {
    throw ApiError.badRequest(`Cargo weight ${weight} kg exceeds vehicle capacity ${vehicle.maxLoadCapacity} kg`);
  }

  // Generate trip number
  let tripNumber;
  let attempts = 0;
  while (attempts < 5) {
    const candidate = await generateTripNumber();
    const exists = await prisma.trip.findUnique({ where: { tripNumber: candidate } });
    if (!exists) { tripNumber = candidate; break; }
    attempts++;
  }
  if (!tripNumber) throw ApiError.internal('Failed to generate unique trip number');

  const trip = await prisma.trip.create({
    data: {
      tripNumber,
      source: source.trim(),
      destination: destination.trim(),
      vehicleId: parseInt(vehicleId),
      driverId: parseInt(driverId),
      cargoWeight: weight,
      plannedDistance: parseFloat(plannedDistance),
      status: 'DRAFT',
    },
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      driver: { select: { id: true, name: true, licenseNumber: true } },
    },
  });

  return sendCreated(res, { trip }, `Trip ${tripNumber} created successfully`);
});

/**
 * GET /api/trips/:id
 */
const getTrip = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid trip ID');

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      driver: true,
      fuelLogs: { orderBy: { date: 'desc' } },
      expenses: { orderBy: { date: 'desc' } },
    },
  });

  if (!trip) throw ApiError.notFound(`Trip with ID ${id} not found`);
  return sendSuccess(res, { trip });
});

/**
 * PUT /api/trips/:id  (only DRAFT)
 */
const updateTrip = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.status !== 'DRAFT') throw ApiError.invalidTransition('Only DRAFT trips can be edited');

  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = req.body;

  const data = {};
  if (source) data.source = source.trim();
  if (destination) data.destination = destination.trim();
  if (cargoWeight !== undefined) {
    if (parseFloat(cargoWeight) <= 0) throw ApiError.badRequest('Cargo weight must be greater than 0');
    data.cargoWeight = parseFloat(cargoWeight);
  }
  if (plannedDistance !== undefined) {
    if (parseFloat(plannedDistance) <= 0) throw ApiError.badRequest('Planned distance must be greater than 0');
    data.plannedDistance = parseFloat(plannedDistance);
  }
  if (vehicleId) data.vehicleId = parseInt(vehicleId);
  if (driverId) data.driverId = parseInt(driverId);

  // Validate capacity with updated values
  const targetVehicleId = data.vehicleId || trip.vehicleId;
  const targetWeight = data.cargoWeight || trip.cargoWeight;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: targetVehicleId } });
  if (vehicle && targetWeight > vehicle.maxLoadCapacity) {
    throw ApiError.badRequest(`Cargo weight ${targetWeight} kg exceeds vehicle capacity ${vehicle.maxLoadCapacity} kg`);
  }

  const updated = await prisma.trip.update({
    where: { id },
    data,
    include: {
      vehicle: { select: { id: true, name: true, registrationNumber: true } },
      driver: { select: { id: true, name: true, licenseNumber: true } },
    },
  });

  return sendSuccessWithMessage(res, 'Trip updated successfully', { trip: updated });
});

/**
 * DELETE /api/trips/:id  (only DRAFT)
 */
const deleteTrip = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.status !== 'DRAFT') throw ApiError.invalidTransition('Only DRAFT trips can be deleted');

  await prisma.trip.delete({ where: { id } });
  return sendSuccessWithMessage(res, `Trip ${trip.tripNumber} deleted successfully`, {});
});

/**
 * POST /api/trips/:id/dispatch
 * Concurrency-safe dispatch using atomic conditional updates in a transaction.
 */
const dispatchTrip = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid trip ID');

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: true },
  });

  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.status !== 'DRAFT') {
    throw ApiError.invalidTransition(`Cannot dispatch: trip is ${trip.status.toLowerCase()}, not DRAFT`);
  }

  const { vehicle, driver } = trip;

  // Pre-dispatch validations
  if (vehicle.status === 'IN_SHOP') throw ApiError.resourceUnavailable(`Cannot dispatch: vehicle is currently In Shop`);
  if (vehicle.status === 'RETIRED') throw ApiError.resourceUnavailable(`Cannot dispatch: vehicle is retired`);
  if (vehicle.status === 'ON_TRIP') throw ApiError.resourceUnavailable(`Cannot dispatch: vehicle is already assigned to an active trip`);

  const eligibility = checkDriverEligibility(driver);
  if (!eligibility.eligible) throw ApiError.resourceUnavailable(`Cannot dispatch: ${eligibility.reason}`);

  if (trip.cargoWeight > vehicle.maxLoadCapacity) {
    throw ApiError.badRequest(`Cannot dispatch: cargo weight ${trip.cargoWeight} kg exceeds vehicle capacity ${vehicle.maxLoadCapacity} kg`);
  }

  // Concurrency-safe dispatch transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomically claim vehicle (only if still AVAILABLE)
      const vehicleUpdate = await tx.vehicle.updateMany({
        where: { id: vehicle.id, status: 'AVAILABLE' },
        data: { status: 'ON_TRIP' },
      });

      if (vehicleUpdate.count === 0) {
        throw ApiError.resourceUnavailable('Cannot dispatch: vehicle is no longer available (concurrent request)');
      }

      // 2. Atomically claim driver (only if still AVAILABLE)
      const driverUpdate = await tx.driver.updateMany({
        where: { id: driver.id, status: 'AVAILABLE' },
        data: { status: 'ON_TRIP' },
      });

      if (driverUpdate.count === 0) {
        throw ApiError.resourceUnavailable('Cannot dispatch: driver is no longer available (concurrent request)');
      }

      // 3. Re-verify no other DISPATCHED trip for same vehicle/driver
      const conflictVehicle = await tx.trip.findFirst({
        where: { vehicleId: vehicle.id, status: 'DISPATCHED', id: { not: id } },
      });
      if (conflictVehicle) {
        throw ApiError.resourceUnavailable('Cannot dispatch: vehicle is already assigned to an active trip');
      }

      const conflictDriver = await tx.trip.findFirst({
        where: { driverId: driver.id, status: 'DISPATCHED', id: { not: id } },
      });
      if (conflictDriver) {
        throw ApiError.resourceUnavailable('Cannot dispatch: driver is already assigned to an active trip');
      }

      // 4. Update trip → DISPATCHED
      const dispatched = await tx.trip.update({
        where: { id },
        data: {
          status: 'DISPATCHED',
          dispatchDate: new Date(),
          startOdometer: vehicle.odometer,
        },
        include: {
          vehicle: { select: { id: true, name: true, registrationNumber: true, status: true } },
          driver: { select: { id: true, name: true, licenseNumber: true, status: true } },
        },
      });

      return dispatched;
    });

    return sendSuccessWithMessage(res, `Trip ${result.tripNumber} dispatched successfully`, { trip: result });
  } catch (err) {
    if (err.isOperational) throw err;
    throw ApiError.internal('Dispatch failed due to a system error');
  }
});

/**
 * POST /api/trips/:id/complete
 */
const completeTrip = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { finalOdometer, fuelConsumed, revenue } = req.body;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: true },
  });

  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.status !== 'DISPATCHED') {
    throw ApiError.invalidTransition(`Cannot complete: trip is ${trip.status.toLowerCase()}, not DISPATCHED`);
  }

  if (finalOdometer === undefined || finalOdometer === null) throw ApiError.badRequest('Final odometer is required');
  const finalOdo = parseFloat(finalOdometer);
  const startOdo = trip.startOdometer || 0;
  if (finalOdo < startOdo) {
    throw ApiError.badRequest(`Final odometer (${finalOdo}) cannot be less than start odometer (${startOdo})`);
  }

  if (fuelConsumed === undefined || parseFloat(fuelConsumed) <= 0) {
    throw ApiError.badRequest('Fuel consumed must be greater than 0');
  }

  const rev = parseFloat(revenue) || 0;
  if (rev < 0) throw ApiError.badRequest('Revenue cannot be negative');

  const actualDistance = finalOdo - startOdo;

  const result = await prisma.$transaction(async (tx) => {
    const completed = await tx.trip.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        finalOdometer: finalOdo,
        actualDistance,
        fuelConsumed: parseFloat(fuelConsumed),
        revenue: rev,
        completionDate: new Date(),
      },
    });

    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'AVAILABLE', odometer: finalOdo },
    });

    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: 'AVAILABLE' },
    });

    return completed;
  });

  return sendSuccessWithMessage(res, `Trip ${result.tripNumber} completed successfully`, { trip: result });
});

/**
 * POST /api/trips/:id/cancel
 */
const cancelTrip = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: true },
  });

  if (!trip) throw ApiError.notFound('Trip not found');

  if (trip.status === 'COMPLETED') {
    throw ApiError.invalidTransition('Cannot cancel a completed trip');
  }
  if (trip.status === 'CANCELLED') {
    throw ApiError.invalidTransition('Trip is already cancelled');
  }

  const result = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.trip.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // If DISPATCHED, restore vehicle and driver
    if (trip.status === 'DISPATCHED') {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'AVAILABLE' },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      });
    }

    return cancelled;
  });

  return sendSuccessWithMessage(res, `Trip ${result.tripNumber} cancelled successfully`, { trip: result });
});

module.exports = {
  listTrips, createTrip, getTrip, updateTrip, deleteTrip,
  dispatchTrip, completeTrip, cancelTrip,
};
