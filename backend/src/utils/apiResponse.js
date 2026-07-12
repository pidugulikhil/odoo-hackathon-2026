/**
 * Standard API response helpers — all responses follow this contract:
 *
 * SUCCESS:  { success: true, data: {} }
 * SUCCESS+: { success: true, message: "...", data: {} }
 * ERROR:    { success: false, error: { code: "...", message: "..." } }
 */

const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const sendSuccessWithMessage = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const sendCreated = (res, data = {}, message = null) => {
  if (message) return sendSuccessWithMessage(res, message, data, 201);
  return sendSuccess(res, data, 201);
};

const sendError = (res, statusCode, code, message) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

/**
 * Paginate helper — returns pagination metadata
 */
const paginate = (page, limit, total) => {
  const currentPage = Math.max(1, parseInt(page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const totalPages = Math.ceil(total / pageSize);
  const skip = (currentPage - 1) * pageSize;
  return {
    skip,
    take: pageSize,
    meta: {
      total,
      page: currentPage,
      limit: pageSize,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  };
};

module.exports = { sendSuccess, sendSuccessWithMessage, sendCreated, sendError, paginate };
