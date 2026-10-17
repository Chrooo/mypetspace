const UserModel = require('../models/User');
const { makeToken, makeTwoFactorTicket } = require('../utils/tokens');
const { logAction } = require('../utils/audit');

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
const NAME_RE = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/;

const validate = ({ firstName, lastName, identifier, password }) => {
  if (!firstName || !firstName.trim()) return 'First name is required.';
  if (!lastName || !lastName.trim()) return 'Last name is required.';
  if (!NAME_RE.test(firstName.trim()) || !NAME_RE.test(lastName.trim()) || firstName.length > 50 || lastName.length > 50) {
    return 'Names can only have letters, spaces, apostrophes, periods and hyphens (50 characters max).';
  }
  if (!cleanIdentifier(identifier)) return 'Enter a valid email or a mobile number like 09123456789.';
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must be at least 8 characters with a letter and a number.';
  }
  return null;
};

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
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      identifier,
      password: req.body.password,
      role: 'customer',
    });
    await logAction('Registered new account', user, { affected: user.fullName });

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
      if (user) await logAction('Login attempt', user, { status: 'failed' }); // wrong password for a real account
      return res.status(401).json({ message: 'Incorrect email/phone or password.' });
    }

    // two-factor is on: do not give the login token yet, ask for the code first (POST /api/login/2fa)
    if (user.twoFactorEnabled) {
      return res.json({ twoFactorRequired: true, twoFactorToken: makeTwoFactorTicket(user) });
    }

    await logAction('Login attempt', user);
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
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      identifier,
      password: req.body.password,
      role: req.body.role,
    });
    await logAction('Created new account', req.user, { affected: user.fullName });

    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/users  (admin only) - every account, newest first (passwords are never included)
// ?role=customer|staff|groomer|admin &search= &sort=latest|oldest|alphabetical &page= &pageSize=
const listUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));

    const filter = {};
    if (['admin', 'staff', 'groomer', 'customer'].includes(req.query.role)) filter.role = req.query.role;
    const search = String(req.query.search || '').trim();
    if (search) {
      const text = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: text }, { lastName: text }, { identifier: text }];
    }

    let sort = { createdAt: -1 };
    if (req.query.sort === 'oldest') sort = { createdAt: 1 };
    if (req.query.sort === 'alphabetical') sort = { firstName: 1, lastName: 1 };

    const [users, total] = await Promise.all([
      UserModel.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize),
      UserModel.countDocuments(filter),
    ]);
    res.json({ users, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/check-identifier?identifier=...  (public) - lets the form say "already registered" while typing
const checkIdentifier = async (req, res) => {
  try {
    const identifier = cleanIdentifier(req.query.identifier);
    if (!identifier) return res.json({ available: true }); // wrong format is reported by the form itself
    res.json({ available: !(await UserModel.exists({ identifier })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { register, login, createStaff, listUsers, checkIdentifier };