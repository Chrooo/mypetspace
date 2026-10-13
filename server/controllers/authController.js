const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

/* ---------- helpers ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// returns a clean email or phone number (09XXXXXXXXX), or null if it is neither
const cleanIdentifier = (value = '') => {
  const v = String(value).trim().toLowerCase();
  if (EMAIL_RE.test(v)) return v;
  const phone = v.replace(/[\s-]/g, '').replace(/^\+63/, '0');
  return /^09\d{9}$/.test(phone) ? phone : null;
};

// returns an error message, or null if everything is fine
const validate = ({ fullName, identifier, password }) => {
  if (!fullName || !fullName.trim()) return 'Full name is required.';
  if (!cleanIdentifier(identifier)) return 'Enter a valid email or a mobile number like 09123456789.';
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must be at least 8 characters with a letter and a number.';
  }
  return null;
};

const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ---------- controllers ---------- */

// POST /api/register  (public - always creates a Customer)
const register = async (req, res) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });

    const identifier = cleanIdentifier(req.body.identifier);
    if (await UserModel.findOne({ identifier })) {
      return res.status(409).json({ message: 'An account with this email or phone already exists.' });
    }

    // the role is NEVER taken from req.body, so nobody can sign up as admin
    const user = await UserModel.create({
      fullName: req.body.fullName,
      identifier,
      password: req.body.password,
      role: 'customer',
    });

    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// POST /api/login
const login = async (req, res) => {
  try {
    const identifier = cleanIdentifier(req.body.identifier);
    if (!identifier || !req.body.password) {
      return res.status(400).json({ message: 'Enter your email or phone and your password.' });
    }

    const user = await UserModel.findOne({ identifier }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ message: 'Incorrect email/phone or password.' });
    }

    res.json({ token: makeToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// POST /api/createStaff  (admin only) - creates Hotel Staff / Groomer / Admin accounts
const createStaff = async (req, res) => {
  try {
    if (!['admin', 'staff', 'groomer'].includes(req.body.role)) {
      return res.status(400).json({ message: 'Role must be admin, staff, or groomer.' });
    }
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });

    const identifier = cleanIdentifier(req.body.identifier);
    if (await UserModel.findOne({ identifier })) {
      return res.status(409).json({ message: 'An account with this email or phone already exists.' });
    }

    const user = await UserModel.create({
      fullName: req.body.fullName,
      identifier,
      password: req.body.password,
      role: req.body.role,
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { register, login, createStaff };