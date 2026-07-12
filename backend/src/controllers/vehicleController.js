const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendSuccessWithMessage, paginate } = require('../utils/apiResponse');

const VALID_TYPES = ['TRUCK', 'VAN', 'BUS', 'MINI_TRUCK', 'TRAILER', 'OTHER'];
const VALID_STATUSES = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildWhereClause({ search, status, type, region }) {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { region: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (type && VALID_TYPES.includes(type)) where.type = type;
  if (region) where.region = { contains: region, mode: 'insensitive' };
  return where;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/vehicles
 */
const listVehicles = asyncHandler(async (req, res) => {
  const { search, status, type, region, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
  const where = buildWhereClause({ search, status, type, region });

  const allowedSort = ['name', 'registrationNumber', 'type', 'status', 'region', 'maxLoadCapacity', 'createdAt'];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.vehicle.count({ where });
  const { skip, take, meta } = paginate(page, limit, total);

  const vehicles = await prisma.vehicle.findMany({
    where,
    skip,
    take,
    orderBy: { [orderByField]: orderDir },
  });

  return sendSuccess(res, { vehicles, pagination: meta });
});

/**
 * POST /api/vehicles
 */
const createVehicle = asyncHandler(async (req, res) => {
  const { registrationNumber, name, model, type, maxLoadCapacity, odometer, acquisitionCost, region } = req.body;

  // Validations
  if (!registrationNumber?.trim()) throw ApiError.badRequest('Registration number is required');
  if (!name?.trim()) throw ApiError.badRequest('Vehicle name is required');
  if (!model?.trim()) throw ApiError.badRequest('Vehicle model is required');
  if (!VALID_TYPES.includes(type)) throw ApiError.badRequest(`Vehicle type must be one of: ${VALID_TYPES.join(', ')}`);
  if (!maxLoadCapacity || parseFloat(maxLoadCapacity) <= 0) throw ApiError.badRequest('Max load capacity must be greater than 0');
  if (odometer !== undefined && parseFloat(odometer) < 0) throw ApiError.badRequest('Odometer cannot be negative');
  if (acquisitionCost !== undefined && parseFloat(acquisitionCost) < 0) throw ApiError.badRequest('Acquisition cost cannot be negative');
  if (!region?.trim()) throw ApiError.badRequest('Region is required');

  // Check uniqueness
  const existing = await prisma.vehicle.findUnique({ where: { registrationNumber: registrationNumber.trim().toUpperCase() } });
  if (existing) throw ApiError.conflict(`Vehicle with registration number ${registrationNumber} already exists`);

  const vehicle = await prisma.vehicle.create({
    data: {
      registrationNumber: registrationNumber.trim().toUpperCase(),
      name: name.trim(),
      model: model.trim(),
      type,
      maxLoadCapacity: parseFloat(maxLoadCapacity),
      odometer: parseFloat(odometer) || 0,
      acquisitionCost: parseFloat(acquisitionCost) || 0,
      region: region.trim(),
    },
  });

  return sendCreated(res, { vehicle }, 'Vehicle created successfully');
});

/**
 * GET /api/vehicles/available
 */
const getAvailableVehicles = asyncHandler(async (req, res) => {
  const { type, region, minCapacity } = req.query;
  const where = {
    status: 'AVAILABLE',
  };
  if (type && VALID_TYPES.includes(type)) where.type = type;
  if (region) where.region = { contains: region, mode: 'insensitive' };
  if (minCapacity) where.maxLoadCapacity = { gte: parseFloat(minCapacity) };

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return sendSuccess(res, { vehicles });
});

/**
 * GET /api/vehicles/export
 */
const exportVehicles = asyncHandler(async (req, res) => {
  const { search, status, type, region } = req.query;
  const where = buildWhereClause({ search, status, type, region });

  const vehicles = await prisma.vehicle.findMany({ where, orderBy: { registrationNumber: 'asc' } });

  const headers = ['ID', 'Registration Number', 'Name', 'Model', 'Type', 'Max Load (kg)', 'Odometer (km)', 'Acquisition Cost', 'Region', 'Status', 'Created At'];
  const rows = vehicles.map(v => [
    v.id, v.registrationNumber, v.name, v.model, v.type,
    v.maxLoadCapacity, v.odometer, v.acquisitionCost, v.region, v.status,
    v.createdAt.toISOString(),
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vehicles.csv"');
  return res.send(csv);
});

/**
 * GET /api/vehicles/:id
 */
const getVehicle = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid vehicle ID');

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      trips: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { driver: { select: { name: true, licenseNumber: true } } },
      },
      maintenance: { orderBy: { createdAt: 'desc' }, take: 10 },
      fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
      expenses: { orderBy: { date: 'desc' }, take: 10 },
    },
  });

  if (!vehicle) throw ApiError.notFound(`Vehicle with ID ${id} not found`);

  // Calculate analytics
  const completedTrips = vehicle.trips.filter(t => t.status === 'COMPLETED');
  const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);
  const totalFuelConsumed = completedTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);
  const totalRevenue = completedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const totalMaintenanceCost = vehicle.maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  const totalFuelCost = vehicle.fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0);
  const operationalCost = totalMaintenanceCost + totalFuelCost;
  const fuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : null;
  let roi = null;
  if (vehicle.acquisitionCost > 0) {
    roi = (totalRevenue - operationalCost) / vehicle.acquisitionCost;
  }

  return sendSuccess(res, {
    vehicle,
    analytics: {
      totalTrips: vehicle.trips.length,
      completedTrips: completedTrips.length,
      totalDistance,
      totalFuelConsumed,
      totalRevenue,
      totalMaintenanceCost,
      totalFuelCost,
      operationalCost,
      fuelEfficiency,
      roi,
      roiPercent: roi !== null ? roi * 100 : null,
    },
  });
});

/**
 * PUT /api/vehicles/:id
 */
const updateVehicle = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid vehicle ID');

  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound(`Vehicle with ID ${id} not found`);

  const { registrationNumber, name, model, type, maxLoadCapacity, odometer, acquisitionCost, region } = req.body;

  // Validate type if provided
  if (type && !VALID_TYPES.includes(type)) throw ApiError.badRequest(`Invalid vehicle type. Must be one of: ${VALID_TYPES.join(', ')}`);
  if (maxLoadCapacity !== undefined && parseFloat(maxLoadCapacity) <= 0) throw ApiError.badRequest('Max load capacity must be greater than 0');
  if (odometer !== undefined && parseFloat(odometer) < 0) throw ApiError.badRequest('Odometer cannot be negative');
  if (acquisitionCost !== undefined && parseFloat(acquisitionCost) < 0) throw ApiError.badRequest('Acquisition cost cannot be negative');

  // Check uniqueness if changing registration
  if (registrationNumber && registrationNumber.trim().toUpperCase() !== existing.registrationNumber) {
    const dup = await prisma.vehicle.findUnique({ where: { registrationNumber: registrationNumber.trim().toUpperCase() } });
    if (dup) throw ApiError.conflict(`Vehicle with registration number ${registrationNumber} already exists`);
  }

  const data = {};
  if (registrationNumber) data.registrationNumber = registrationNumber.trim().toUpperCase();
  if (name) data.name = name.trim();
  if (model) data.model = model.trim();
  if (type) data.type = type;
  if (maxLoadCapacity !== undefined) data.maxLoadCapacity = parseFloat(maxLoadCapacity);
  if (odometer !== undefined) data.odometer = parseFloat(odometer);
  if (acquisitionCost !== undefined) data.acquisitionCost = parseFloat(acquisitionCost);
  if (region) data.region = region.trim();

  const vehicle = await prisma.vehicle.update({ where: { id }, data });
  return sendSuccessWithMessage(res, 'Vehicle updated successfully', { vehicle });
});

/**
 * POST /api/vehicles/:id/retire
 */
const retireVehicle = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid vehicle ID');

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw ApiError.notFound(`Vehicle with ID ${id} not found`);

  if (vehicle.status === 'RETIRED') throw ApiError.invalidTransition('Vehicle is already retired');
  if (vehicle.status === 'ON_TRIP') throw ApiError.invalidTransition('Cannot retire a vehicle that is currently on a trip');

  // Check for active maintenance
  const activeMaintenance = await prisma.maintenance.findFirst({
    where: { vehicleId: id, status: 'ACTIVE' },
  });
  if (activeMaintenance) {
    throw ApiError.invalidTransition(`Cannot retire vehicle with active maintenance record ${activeMaintenance.maintenanceNumber}`);
  }

  const retired = await prisma.vehicle.update({ where: { id }, data: { status: 'RETIRED' } });
  return sendSuccessWithMessage(res, 'Vehicle retired successfully', { vehicle: retired });
});

module.exports = {
  listVehicles,
  createVehicle,
  getVehicle,
  updateVehicle,
  retireVehicle,
  getAvailableVehicles,
  exportVehicles,
};
