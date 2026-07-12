const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendSuccessWithMessage, sendCreated } = require('../utils/apiResponse');

/**
 * POST /api/auth/login
 * Login with email + password → returns JWT
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!user) {
    throw ApiError.invalidCredentials('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.invalidCredentials('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return sendSuccessWithMessage(res, 'Login successful', {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw ApiError.badRequest('All fields (name, email, password, role) are required');
  }

  const allowedRoles = ['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];
  if (!allowedRoles.includes(role)) {
    throw ApiError.badRequest('Invalid role specified');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    throw ApiError.conflict('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return sendCreated(res, { user }, 'User registered successfully');
});

const googleLogin = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw ApiError.badRequest('Token is required');

  let profile;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    profile = JSON.parse(jsonPayload);
  } catch (err) {
    throw ApiError.badRequest('Invalid token format');
  }

  const { email, name } = profile;
  if (!email) throw ApiError.badRequest('Email not provided in Google profile');

  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email: email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
        role: req.body.role || 'FLEET_MANAGER',
      }
    });
  }

  const jwtToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return sendSuccessWithMessage(res, 'Logged in with Google successfully', {
    token: jwtToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Current password and new password are required');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.unauthorized('User not found');

  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.invalidCredentials('Invalid current password');
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: newHash },
  });

  return sendSuccessWithMessage(res, 'Password changed successfully');
});

/**
 * GET /api/auth/me
 * Returns current authenticated user
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) throw ApiError.notFound('User not found');

  return sendSuccess(res, { user });
});

module.exports = { login, register, googleLogin, getMe, changePassword };
