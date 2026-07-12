const ApiError = require('../utils/ApiError');

const TRIP_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  DISPATCHED: 'DISPATCHED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
});

function canTransition(currentStatus, nextStatus) {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

function assertTripTransition(currentStatus, nextStatus) {
  if (!TRIP_STATUS[currentStatus]) {
    throw ApiError.badRequest(`Unknown trip status: ${currentStatus}`);
  }

  if (!TRIP_STATUS[nextStatus]) {
    throw ApiError.badRequest(`Unknown trip status: ${nextStatus}`);
  }

  if (!canTransition(currentStatus, nextStatus)) {
    throw ApiError.invalidTransition(
      `Invalid trip state transition: ${currentStatus} -> ${nextStatus}`
    );
  }
}

module.exports = {
  TRIP_STATUS,
  ALLOWED_TRANSITIONS,
  canTransition,
  assertTripTransition,
};