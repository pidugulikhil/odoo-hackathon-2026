/**
 * Driver Eligibility Service
 * 
 * Checks if a driver is eligible to be assigned to a trip.
 * Returns { eligible: true } or { eligible: false, reason: "..." }
 */

/**
 * Calculate license status based on expiry date.
 */
function getLicenseStatus(licenseExpiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(licenseExpiryDate);
  expiry.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiry < today) return 'EXPIRED';
  if (expiry <= thirtyDaysFromNow) return 'EXPIRING_SOON';
  return 'VALID';
}

/**
 * Get days until license expiry (negative = already expired).
 */
function getDaysUntilExpiry(licenseExpiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(licenseExpiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a driver is eligible to be assigned to a trip.
 * @param {Object} driver - Prisma Driver object
 * @returns {{ eligible: boolean, reason?: string }}
 */
function checkDriverEligibility(driver) {
  if (!driver) {
    return { eligible: false, reason: 'Driver not found' };
  }

  const licenseStatus = getLicenseStatus(driver.licenseExpiryDate);
  const expiryDate = new Date(driver.licenseExpiryDate).toISOString().split('T')[0];

  if (licenseStatus === 'EXPIRED') {
    return {
      eligible: false,
      reason: `Driver license expired on ${expiryDate}`,
    };
  }

  if (driver.status === 'SUSPENDED') {
    return {
      eligible: false,
      reason: 'Driver is currently suspended',
    };
  }

  if (driver.status === 'OFF_DUTY') {
    return {
      eligible: false,
      reason: 'Driver is currently off duty',
    };
  }

  if (driver.status === 'ON_TRIP') {
    return {
      eligible: false,
      reason: 'Driver is already assigned to an active trip',
    };
  }

  return { eligible: true };
}

module.exports = { checkDriverEligibility, getLicenseStatus, getDaysUntilExpiry };
