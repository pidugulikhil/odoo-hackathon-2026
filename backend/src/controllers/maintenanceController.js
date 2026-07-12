const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendSuccessWithMessage, paginate } = require('../utils/apiResponse');

const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

async function generateMaintenanceNumber() {
  const last = await prisma.maintenance.findFirst({
    orderBy: { id: 'desc' },
    select: { maintenanceNumber: true },
  });
  let nextNum = 1;
  if (last?.maintenanceNumber) {
    const match = last.maintenanceNumber.match(/MNT-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  return `MNT-${String(nextNum).padStart(5, '0')}`;
}

/**
 * GET /api/maintenance
 */
const listMaintenance = asyncHandler(async (req, res) => {
  const { search, status, vehicleId, type, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { maintenanceNumber: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (vehicleId) where.vehicleId = parseInt(vehicleId);
  if (type) where.type = { contains: type, mode: 'insensitive' };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const total = await prisma.maintenance.count({ where });
  const { skip, take, meta } = paginate(page, limit, total);
  const allowedSort = ['maintenanceNumber', 'status', 'type', 'cost', 'startDate', 'createdAt'];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

  const records = await prisma.maintenance.findMany({
    where, skip, take,
    orderBy: { [orderByField]: sortOrder === 'asc' ? 'asc' : 'desc' },
    include: { vehicle: { select: { id: true, name: true, registrationNumber: true, status: true } } },
  });

  return sendSuccess(res, { maintenance: records, pagination: meta });
});

/**
 * POST /api/maintenance
 */
const createMaintenance = asyncHandler(async (req, res) => {
  const { vehicleId, type, description, cost, technician } = req.body;

  if (!vehicleId) throw ApiError.badRequest('Vehicle ID is required');
  if (!type?.trim()) throw ApiError.badRequest('Maintenance type is required');
  if (!description?.trim()) throw ApiError.badRequest('Description is required');
  if (cost !== undefined && parseFloat(cost) < 0) throw ApiError.badRequest('Cost cannot be negative');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (vehicle.status === 'RETIRED') throw ApiError.badRequest('Cannot create maintenance for a retired vehicle');

  const maintenanceNumber = await generateMaintenanceNumber();

  const record = await prisma.maintenance.create({
    data: {
      maintenanceNumber,
      vehicleId: parseInt(vehicleId),
      type: type.trim(),
      description: description.trim(),
      cost: parseFloat(cost) || 0,
      technician: technician?.trim() || null,
      status: 'DRAFT',
    },
    include: { vehicle: { select: { id: true, name: true, registrationNumber: true } } },
  });

  return sendCreated(res, { maintenance: record }, `Maintenance record ${maintenanceNumber} created`);
});

/**
 * GET /api/maintenance/:id
 */
const getMaintenance = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid ID');

  const record = await prisma.maintenance.findUnique({
    where: { id },
    include: { vehicle: true },
  });

  if (!record) throw ApiError.notFound('Maintenance record not found');
  return sendSuccess(res, { maintenance: record });
});

/**
 * PUT /api/maintenance/:id (only DRAFT)
 */
const updateMaintenance = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const record = await prisma.maintenance.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Maintenance record not found');
  if (record.status !== 'DRAFT') throw ApiError.invalidTransition('Only DRAFT maintenance records can be edited');

  const { type, description, cost, technician } = req.body;
  const data = {};
  if (type) data.type = type.trim();
  if (description) data.description = description.trim();
  if (cost !== undefined) {
    if (parseFloat(cost) < 0) throw ApiError.badRequest('Cost cannot be negative');
    data.cost = parseFloat(cost);
  }
  if (technician !== undefined) data.technician = technician?.trim() || null;

  const updated = await prisma.maintenance.update({ where: { id }, data });
  return sendSuccessWithMessage(res, 'Maintenance record updated', { maintenance: updated });
});

/**
 * POST /api/maintenance/:id/start
 * DRAFT → ACTIVE + Vehicle → IN_SHOP (atomic)
 */
const startMaintenance = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const record = await prisma.maintenance.findUnique({
    where: { id },
    include: { vehicle: true },
  });

  if (!record) throw ApiError.notFound('Maintenance record not found');
  if (record.status !== 'DRAFT') throw ApiError.invalidTransition(`Cannot start: maintenance is already ${record.status}`);

  const { vehicle } = record;
  if (vehicle.status === 'ON_TRIP') throw ApiError.invalidTransition('Cannot activate maintenance: vehicle is currently on a trip');
  if (vehicle.status === 'RETIRED') throw ApiError.invalidTransition('Cannot activate maintenance: vehicle is retired');

  // Check no other active maintenance for this vehicle
  const existingActive = await prisma.maintenance.findFirst({
    where: { vehicleId: record.vehicleId, status: 'ACTIVE', id: { not: id } },
  });
  if (existingActive) {
    throw ApiError.conflict(`Vehicle already has active maintenance record ${existingActive.maintenanceNumber}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Atomically claim vehicle
    const vehicleUpdate = await tx.vehicle.updateMany({
      where: {
        id: vehicle.id,
        status: { notIn: ['ON_TRIP', 'RETIRED'] },
      },
      data: { status: 'IN_SHOP' },
    });

    if (vehicleUpdate.count === 0) {
      throw ApiError.resourceUnavailable('Cannot start maintenance: vehicle status changed (concurrent request)');
    }

    const updated = await tx.maintenance.update({
      where: { id },
      data: { status: 'ACTIVE', startDate: new Date() },
      include: { vehicle: { select: { id: true, name: true, registrationNumber: true, status: true } } },
    });

    return updated;
  });

  return sendSuccessWithMessage(res, `Maintenance ${record.maintenanceNumber} started. Vehicle is now IN_SHOP.`, { maintenance: result });
});

/**
 * POST /api/maintenance/:id/complete
 * ACTIVE → COMPLETED + Vehicle → AVAILABLE (unless RETIRED)
 */
const completeMaintenance = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const record = await prisma.maintenance.findUnique({
    where: { id },
    include: { vehicle: true },
  });

  if (!record) throw ApiError.notFound('Maintenance record not found');
  if (record.status !== 'ACTIVE') throw ApiError.invalidTransition(`Cannot complete: maintenance is ${record.status}, not ACTIVE`);

  const { cost } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const updateData = { status: 'COMPLETED', endDate: new Date() };
    if (cost !== undefined && parseFloat(cost) >= 0) updateData.cost = parseFloat(cost);

    const updated = await tx.maintenance.update({
      where: { id },
      data: updateData,
    });

    // Restore vehicle to AVAILABLE unless RETIRED
    if (record.vehicle.status !== 'RETIRED') {
      await tx.vehicle.update({
        where: { id: record.vehicleId },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  });

  return sendSuccessWithMessage(res, `Maintenance ${record.maintenanceNumber} completed. Vehicle restored to AVAILABLE.`, { maintenance: result });
});

/**
 * POST /api/maintenance/:id/cancel
 * Only DRAFT can be cancelled
 */
const cancelMaintenance = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const record = await prisma.maintenance.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Maintenance record not found');

  if (record.status === 'COMPLETED') throw ApiError.invalidTransition('Cannot cancel a completed maintenance record');
  if (record.status === 'CANCELLED') throw ApiError.invalidTransition('Maintenance record is already cancelled');
  if (record.status === 'ACTIVE') throw ApiError.invalidTransition('Cannot cancel an active maintenance record. Complete it first.');

  const updated = await prisma.maintenance.update({ where: { id }, data: { status: 'CANCELLED' } });
  return sendSuccessWithMessage(res, `Maintenance ${record.maintenanceNumber} cancelled`, { maintenance: updated });
});

module.exports = {
  listMaintenance, createMaintenance, getMaintenance, updateMaintenance,
  startMaintenance, completeMaintenance, cancelMaintenance,
};
