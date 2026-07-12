const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendSuccessWithMessage, paginate } = require('../utils/apiResponse');
const { checkDriverEligibility, getLicenseStatus, getDaysUntilExpiry } = require('../services/driverEligibilityService');

const VALID_STATUSES = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];
const VALID_LICENSE_STATUSES = ['VALID', 'EXPIRING_SOON', 'EXPIRED'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function enrichDriver(driver) {
  const licenseStatus = getLicenseStatus(driver.licenseExpiryDate);
  const daysUntilExpiry = getDaysUntilExpiry(driver.licenseExpiryDate);
  return { ...driver, licenseStatus, daysUntilExpiry };
}

function buildWhereClause({ search, status, licenseStatus, licenseCategory, region }) {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { contactNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { region: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (licenseCategory) where.licenseCategory = { contains: licenseCategory, mode: 'insensitive' };
  if (region) where.region = { contains: region, mode: 'insensitive' };
  // licenseStatus is computed, filter in code
  return where;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/drivers
 */
const listDrivers = asyncHandler(async (req, res) => {
  const { search, status, licenseStatus, licenseCategory, region, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
  const where = buildWhereClause({ search, status, licenseStatus, licenseCategory, region });

  const allowedSort = ['name', 'licenseNumber', 'status', 'region', 'safetyScore', 'licenseExpiryDate', 'createdAt'];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.driver.count({ where });
  const { skip, take, meta } = paginate(page, limit, total);

  const drivers = await prisma.driver.findMany({
    where, skip, take,
    orderBy: { [orderByField]: orderDir },
  });

  let enriched = drivers.map(enrichDriver);

  // Post-filter by licenseStatus (computed field)
  if (licenseStatus && VALID_LICENSE_STATUSES.includes(licenseStatus)) {
    enriched = enriched.filter(d => d.licenseStatus === licenseStatus);
  }

  return sendSuccess(res, { drivers: enriched, pagination: meta });
});

/**
 * POST /api/drivers
 */
const createDriver = asyncHandler(async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, email, safetyScore, region } = req.body;

  if (!name?.trim()) throw ApiError.badRequest('Driver name is required');
  if (!licenseNumber?.trim()) throw ApiError.badRequest('License number is required');
  if (!licenseCategory?.trim()) throw ApiError.badRequest('License category is required');
  if (!licenseExpiryDate) throw ApiError.badRequest('License expiry date is required');
  if (!contactNumber?.trim()) throw ApiError.badRequest('Contact number is required');
  if (!region?.trim()) throw ApiError.badRequest('Region is required');

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest('Invalid email format');
  }

  const score = safetyScore !== undefined ? parseFloat(safetyScore) : 100;
  if (score < 0 || score > 100) throw ApiError.badRequest('Safety score must be between 0 and 100');

  const expiryDate = new Date(licenseExpiryDate);
  if (isNaN(expiryDate.getTime())) throw ApiError.badRequest('Invalid license expiry date format');

  const existing = await prisma.driver.findUnique({ where: { licenseNumber: licenseNumber.trim().toUpperCase() } });
  if (existing) throw ApiError.conflict(`Driver with license number ${licenseNumber} already exists`);

  const driver = await prisma.driver.create({
    data: {
      name: name.trim(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
      licenseCategory: licenseCategory.trim().toUpperCase(),
      licenseExpiryDate: expiryDate,
      contactNumber: contactNumber.trim(),
      email: email?.toLowerCase().trim() || null,
      safetyScore: score,
      region: region.trim(),
    },
  });

  return sendCreated(res, { driver: enrichDriver(driver) }, 'Driver created successfully');
});

/**
 * GET /api/drivers/available
 */
const getAvailableDrivers = asyncHandler(async (req, res) => {
  const { licenseCategory, region } = req.query;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    status: 'AVAILABLE',
    licenseExpiryDate: { gte: today },
  };
  if (licenseCategory) where.licenseCategory = { contains: licenseCategory, mode: 'insensitive' };
  if (region) where.region = { contains: region, mode: 'insensitive' };

  const drivers = await prisma.driver.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return sendSuccess(res, { drivers: drivers.map(enrichDriver) });
});

/**
 * GET /api/drivers/export
 */
const exportDrivers = asyncHandler(async (req, res) => {
  const { search, status, licenseCategory, region } = req.query;
  const where = buildWhereClause({ search, status, licenseCategory, region });

  const drivers = await prisma.driver.findMany({ where, orderBy: { name: 'asc' } });

  const headers = ['ID', 'Name', 'License Number', 'License Category', 'License Expiry', 'License Status', 'Safety Score', 'Status', 'Region', 'Contact', 'Email'];
  const rows = drivers.map(d => {
    const enriched = enrichDriver(d);
    return [
      d.id, d.name, d.licenseNumber, d.licenseCategory,
      d.licenseExpiryDate.toISOString().split('T')[0],
      enriched.licenseStatus, d.safetyScore, d.status, d.region,
      d.contactNumber, d.email || '',
    ];
  });

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="drivers.csv"');
  return res.send(csv);
});

/**
 * GET /api/drivers/:id
 */
const getDriver = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid driver ID');

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      trips: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { vehicle: { select: { name: true, registrationNumber: true } } },
      },
    },
  });

  if (!driver) throw ApiError.notFound(`Driver with ID ${id} not found`);

  const completedTrips = driver.trips.filter(t => t.status === 'COMPLETED');
  const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);

  return sendSuccess(res, {
    driver: enrichDriver(driver),
    analytics: {
      totalTrips: driver.trips.length,
      completedTrips: completedTrips.length,
      totalDistance,
    },
  });
});

/**
 * PUT /api/drivers/:id
 */
const updateDriver = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw ApiError.badRequest('Invalid driver ID');

  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound(`Driver with ID ${id} not found`);

  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, email, safetyScore, region } = req.body;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw ApiError.badRequest('Invalid email format');
  if (safetyScore !== undefined) {
    const score = parseFloat(safetyScore);
    if (score < 0 || score > 100) throw ApiError.badRequest('Safety score must be between 0 and 100');
  }

  if (licenseNumber && licenseNumber.trim().toUpperCase() !== existing.licenseNumber) {
    const dup = await prisma.driver.findUnique({ where: { licenseNumber: licenseNumber.trim().toUpperCase() } });
    if (dup) throw ApiError.conflict(`Driver with license number ${licenseNumber} already exists`);
  }

  const data = {};
  if (name) data.name = name.trim();
  if (licenseNumber) data.licenseNumber = licenseNumber.trim().toUpperCase();
  if (licenseCategory) data.licenseCategory = licenseCategory.trim().toUpperCase();
  if (licenseExpiryDate) data.licenseExpiryDate = new Date(licenseExpiryDate);
  if (contactNumber) data.contactNumber = contactNumber.trim();
  if (email !== undefined) data.email = email?.toLowerCase().trim() || null;
  if (safetyScore !== undefined) data.safetyScore = parseFloat(safetyScore);
  if (region) data.region = region.trim();

  const driver = await prisma.driver.update({ where: { id }, data });
  return sendSuccessWithMessage(res, 'Driver updated successfully', { driver: enrichDriver(driver) });
});

/**
 * POST /api/drivers/:id/suspend
 */
const suspendDriver = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw ApiError.notFound(`Driver not found`);
  if (driver.status === 'SUSPENDED') throw ApiError.invalidTransition('Driver is already suspended');
  if (driver.status === 'ON_TRIP') throw ApiError.invalidTransition('Cannot suspend a driver currently on a trip');

  const updated = await prisma.driver.update({ where: { id }, data: { status: 'SUSPENDED' } });
  return sendSuccessWithMessage(res, 'Driver suspended', { driver: enrichDriver(updated) });
});

/**
 * POST /api/drivers/:id/off-duty
 */
const setOffDuty = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw ApiError.notFound(`Driver not found`);
  if (driver.status === 'ON_TRIP') throw ApiError.invalidTransition('Cannot set driver off duty while on a trip');

  const updated = await prisma.driver.update({ where: { id }, data: { status: 'OFF_DUTY' } });
  return sendSuccessWithMessage(res, 'Driver set to off duty', { driver: enrichDriver(updated) });
});

/**
 * POST /api/drivers/:id/available
 */
const setAvailable = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw ApiError.notFound(`Driver not found`);
  if (driver.status === 'ON_TRIP') throw ApiError.invalidTransition('Cannot change status of driver on a trip');

  const updated = await prisma.driver.update({ where: { id }, data: { status: 'AVAILABLE' } });
  return sendSuccessWithMessage(res, 'Driver set to available', { driver: enrichDriver(updated) });
});

module.exports = {
  listDrivers, createDriver, getDriver, updateDriver,
  suspendDriver, setOffDuty, setAvailable,
  getAvailableDrivers, exportDrivers,
};
