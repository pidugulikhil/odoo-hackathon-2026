const prisma = require('../prisma/client');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getLicenseStatus } = require('../services/driverEligibilityService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeDiv(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return numerator / denominator;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const { type, status, region } = req.query;

  // Vehicle filters
  const vehicleWhere = {};
  if (type) vehicleWhere.type = type;
  if (region) vehicleWhere.region = { contains: region, mode: 'insensitive' };

  const [vehicles, drivers, trips, maintenance, fuelAgg, maintenanceAgg] = await Promise.all([
    prisma.vehicle.findMany({ where: vehicleWhere }),
    prisma.driver.findMany(),
    prisma.trip.findMany(),
    prisma.maintenance.findMany(),
    prisma.fuelLog.aggregate({ _sum: { cost: true } }),
    prisma.maintenance.aggregate({ _sum: { cost: true } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vehicle stats
  const activeVehicles = vehicles.filter(v => v.status !== 'RETIRED').length;
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onTripVehicles = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inShopVehicles = vehicles.filter(v => v.status === 'IN_SHOP').length;

  // Driver stats
  const availableDrivers = drivers.filter(d => d.status === 'AVAILABLE').length;
  const onTripDrivers = drivers.filter(d => d.status === 'ON_TRIP').length;
  const suspendedDrivers = drivers.filter(d => d.status === 'SUSPENDED').length;

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringLicenses = drivers.filter(d => {
    const expiry = new Date(d.licenseExpiryDate);
    return expiry >= today && expiry <= thirtyDaysFromNow;
  }).length;

  // Trip stats
  const activeTrips = trips.filter(t => t.status === 'DISPATCHED').length;
  const pendingTrips = trips.filter(t => t.status === 'DRAFT').length;
  const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;

  // Fleet utilization
  const fleetUtilization = activeVehicles > 0 ? (onTripVehicles / activeVehicles) * 100 : 0;

  // Financial
  const totalFuelCost = fuelAgg._sum.cost || 0;
  const totalMaintenanceCost = maintenanceAgg._sum.cost || 0;
  const operationalCost = totalFuelCost + totalMaintenanceCost;
  const totalRevenue = trips.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.revenue || 0), 0);

  return sendSuccess(res, {
    kpis: {
      // Required KPIs
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance: inShopVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty: onTripDrivers,
      fleetUtilization: parseFloat(fleetUtilization.toFixed(2)),
      // Extra useful data
      totalVehicles: vehicles.length,
      totalDrivers: drivers.length,
      availableDrivers,
      suspendedDrivers,
      completedTrips,
      expiringLicenses,
      totalFuelCost,
      totalMaintenanceCost,
      operationalCost,
      totalRevenue,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - operationalCost) / totalRevenue) * 100 : 0,
    },
  });
});

// ─── Fuel Efficiency ──────────────────────────────────────────────────────────

/**
 * GET /api/analytics/fuel-efficiency
 */
const getFuelEfficiency = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'COMPLETED', fuelConsumed: { gt: 0 } },
        select: { actualDistance: true, fuelConsumed: true },
      },
    },
  });

  const data = vehicles.map(v => {
    const totalDistance = v.trips.reduce((s, t) => s + (t.actualDistance || 0), 0);
    const totalFuel = v.trips.reduce((s, t) => s + (t.fuelConsumed || 0), 0);
    const efficiency = totalFuel > 0 ? totalDistance / totalFuel : null;
    return {
      vehicleId: v.id,
      name: v.name,
      registrationNumber: v.registrationNumber,
      type: v.type,
      region: v.region,
      totalDistance,
      totalFuel,
      fuelEfficiency: efficiency ? parseFloat(efficiency.toFixed(2)) : null,
      trips: v.trips.length,
    };
  }).filter(v => v.fuelEfficiency !== null);

  // Fleet average
  const totalDist = data.reduce((s, v) => s + v.totalDistance, 0);
  const totalFuelAll = data.reduce((s, v) => s + v.totalFuel, 0);
  const fleetAvgEfficiency = totalFuelAll > 0 ? totalDist / totalFuelAll : null;

  return sendSuccess(res, {
    fleetAvgEfficiency: fleetAvgEfficiency ? parseFloat(fleetAvgEfficiency.toFixed(2)) : null,
    vehicles: data.sort((a, b) => (b.fuelEfficiency || 0) - (a.fuelEfficiency || 0)),
  });
});

// ─── Fleet Utilization ────────────────────────────────────────────────────────

/**
 * GET /api/analytics/fleet-utilization
 */
const getFleetUtilization = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany();
  const activeVehicles = vehicles.filter(v => v.status !== 'RETIRED').length;
  const onTripVehicles = vehicles.filter(v => v.status === 'ON_TRIP').length;
  const inShopVehicles = vehicles.filter(v => v.status === 'IN_SHOP').length;
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const retiredVehicles = vehicles.filter(v => v.status === 'RETIRED').length;

  const utilization = activeVehicles > 0 ? (onTripVehicles / activeVehicles) * 100 : 0;

  // By type breakdown
  const typeGroups = {};
  vehicles.forEach(v => {
    if (!typeGroups[v.type]) typeGroups[v.type] = { total: 0, onTrip: 0, available: 0, inShop: 0, retired: 0 };
    typeGroups[v.type].total++;
    if (v.status === 'ON_TRIP') typeGroups[v.type].onTrip++;
    if (v.status === 'AVAILABLE') typeGroups[v.type].available++;
    if (v.status === 'IN_SHOP') typeGroups[v.type].inShop++;
    if (v.status === 'RETIRED') typeGroups[v.type].retired++;
  });

  return sendSuccess(res, {
    fleetUtilization: parseFloat(utilization.toFixed(2)),
    totalVehicles: vehicles.length,
    activeVehicles,
    onTripVehicles,
    inShopVehicles,
    availableVehicles,
    retiredVehicles,
    byType: typeGroups,
  });
});

// ─── Operational Cost ─────────────────────────────────────────────────────────

/**
 * GET /api/analytics/operational-cost
 */
const getOperationalCost = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      fuelLogs: { select: { cost: true } },
      maintenance: { where: { status: 'COMPLETED' }, select: { cost: true } },
      expenses: { select: { amount: true, type: true } },
    },
  });

  const data = vehicles.map(v => {
    const fuelCost = v.fuelLogs.reduce((s, f) => s + f.cost, 0);
    const maintenanceCost = v.maintenance.reduce((s, m) => s + m.cost, 0);
    const otherExpenses = v.expenses.reduce((s, e) => s + e.amount, 0);
    const operationalCost = fuelCost + maintenanceCost;
    const totalFleetCost = operationalCost + otherExpenses;
    return {
      vehicleId: v.id,
      name: v.name,
      registrationNumber: v.registrationNumber,
      type: v.type,
      region: v.region,
      fuelCost,
      maintenanceCost,
      otherExpenses,
      operationalCost,
      totalFleetCost,
    };
  });

  const totals = data.reduce((acc, v) => ({
    fuelCost: acc.fuelCost + v.fuelCost,
    maintenanceCost: acc.maintenanceCost + v.maintenanceCost,
    otherExpenses: acc.otherExpenses + v.otherExpenses,
    operationalCost: acc.operationalCost + v.operationalCost,
    totalFleetCost: acc.totalFleetCost + v.totalFleetCost,
  }), { fuelCost: 0, maintenanceCost: 0, otherExpenses: 0, operationalCost: 0, totalFleetCost: 0 });

  return sendSuccess(res, { vehicles: data, totals });
});

// ─── Vehicle ROI ─────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/vehicle-roi
 * ROI = (Revenue - (MaintenanceCost + FuelCost)) / AcquisitionCost
 */
const getVehicleRoi = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: { where: { status: 'COMPLETED' }, select: { revenue: true, fuelConsumed: true } },
      fuelLogs: { select: { cost: true } },
      maintenance: { where: { status: 'COMPLETED' }, select: { cost: true } },
    },
  });

  const data = vehicles.map(v => {
    const revenue = v.trips.reduce((s, t) => s + (t.revenue || 0), 0);
    const fuelCost = v.fuelLogs.reduce((s, f) => s + f.cost, 0);
    const maintenanceCost = v.maintenance.reduce((s, m) => s + m.cost, 0);
    const netProfit = revenue - (maintenanceCost + fuelCost);

    let roi = null;
    let roiPercent = null;
    if (v.acquisitionCost > 0) {
      roi = netProfit / v.acquisitionCost;
      roiPercent = roi * 100;
    }

    return {
      vehicleId: v.id,
      name: v.name,
      registrationNumber: v.registrationNumber,
      type: v.type,
      status: v.status,
      acquisitionCost: v.acquisitionCost,
      revenue,
      fuelCost,
      maintenanceCost,
      netProfit,
      roi: roi !== null ? parseFloat(roi.toFixed(4)) : null,
      roiPercent: roiPercent !== null ? parseFloat(roiPercent.toFixed(2)) : null,
    };
  });

  return sendSuccess(res, { vehicles: data.sort((a, b) => (b.roiPercent || -Infinity) - (a.roiPercent || -Infinity)) });
});

// ─── Activity Feed ────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/activity
 */
const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  const [recentTrips, recentMaintenance, recentFuel, recentExpenses] = await Promise.all([
    prisma.trip.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        vehicle: { select: { name: true, registrationNumber: true } },
        driver: { select: { name: true } },
      },
    }),
    prisma.maintenance.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { vehicle: { select: { name: true, registrationNumber: true } } },
    }),
    prisma.fuelLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { name: true, registrationNumber: true } } },
    }),
    prisma.expense.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { name: true, registrationNumber: true } } },
    }),
  ]);

  const activities = [];

  recentTrips.forEach(t => {
    let action = 'created';
    if (t.status === 'DISPATCHED') action = 'dispatched';
    if (t.status === 'COMPLETED') action = 'completed';
    if (t.status === 'CANCELLED') action = 'cancelled';
    activities.push({
      type: 'TRIP',
      icon: 'truck',
      message: `Trip ${t.tripNumber} ${action}`,
      detail: `${t.source} → ${t.destination} | Driver: ${t.driver.name}`,
      timestamp: t.updatedAt,
      status: t.status,
    });
  });

  recentMaintenance.forEach(m => {
    let action = 'created';
    if (m.status === 'ACTIVE') action = 'activated';
    if (m.status === 'COMPLETED') action = 'completed';
    activities.push({
      type: 'MAINTENANCE',
      icon: 'wrench',
      message: `Vehicle ${m.vehicle.registrationNumber} entered maintenance`,
      detail: `${m.type}: ${m.description}`,
      timestamp: m.updatedAt,
      status: m.status,
    });
  });

  recentFuel.forEach(f => {
    activities.push({
      type: 'FUEL',
      icon: 'fuel',
      message: `Fuel log added for ${f.vehicle.registrationNumber}`,
      detail: `${f.liters}L at ₹${f.cost}`,
      timestamp: f.createdAt,
    });
  });

  recentExpenses.forEach(e => {
    activities.push({
      type: 'EXPENSE',
      icon: 'receipt',
      message: `Expense added for ${e.vehicle.registrationNumber}`,
      detail: `${e.type}: ₹${e.amount}`,
      timestamp: e.createdAt,
    });
  });

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return sendSuccess(res, { activities: activities.slice(0, limit) });
});

module.exports = {
  getDashboard,
  getFuelEfficiency,
  getFleetUtilization,
  getOperationalCost,
  getVehicleRoi,
  getActivity,
};
