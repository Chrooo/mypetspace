const UserModel = require('../models/User');
const { makeToken, makeTwoFactorTicket } = require('../utils/tokens');
const { logAction } = require('../utils/audit');
const PetModel = require('../models/Pet');
const { cleanPet } = require('./petController');

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
// A Fur Parent must register at least one pet, so the account and the pet are created together.
const register = async (req, res) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });

    const petResult = cleanPet(req.body.pet);
    if (petResult.error) return res.status(400).json({ message: petResult.error });

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

    // save the pet; if that fails, remove the new account so nobody is left without a pet
    try {
      await PetModel.create({ ...petResult.pet, owner: user._id });
    } catch (petErr) {
      await UserModel.deleteOne({ _id: user._id });
      throw petErr;
    }

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

    // optional photo (a small image data URL, same rules as the profile photo)
    let avatar = '';
    if (req.body.avatar) {
      const value = String(req.body.avatar);
      if (!AVATAR_RE.test(value) || value.length > MAX_AVATAR_CHARS) {
        return res.status(400).json({ message: 'Photo must be a PNG, JPG or WEBP image under 200 KB.' });
      }
      avatar = value;
    }

    const user = await UserModel.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      identifier,
      password: req.body.password,
      role: req.body.role,
      avatar,
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
      UserModel.find(filter).select('-avatar').sort(sort).skip((page - 1) * pageSize).limit(pageSize),
      UserModel.countDocuments(filter),
    ]);
    res.json({ users, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/users/:id  (admin only) - one account to view (a customer also comes with their pets)
const getUserById = async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const pets = user.role === 'customer' ? await PetModel.find({ owner: user._id }).sort({ name: 1 }).select('name type breed') : [];
    res.json({ user, pets });
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

// the profile photo is a small image sent as a data URL (the browser shrinks it first)
const AVATAR_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR_CHARS = 300000; // about 220 KB of image

// GET /api/me  (any logged-in user) - the current account, straight from the database
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PUT /api/me  (any logged-in user) - edit your OWN name, email/phone, photo and password
// Changing the email/phone or the password needs the current password.
// The role is never read from req.body.
const updateMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select('+password');
    if (!user) return res.status(401).json({ message: 'Please log in again.' });

    const body = req.body || {};
    const changes = [];

    // names
    const firstName = body.firstName === undefined ? user.firstName : String(body.firstName).trim();
    const lastName = body.lastName === undefined ? user.lastName : String(body.lastName).trim();
    if (!firstName) return res.status(400).json({ message: 'First name is required.' });
    if (!lastName) return res.status(400).json({ message: 'Last name is required.' });
    if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName) || firstName.length > 50 || lastName.length > 50) {
      return res.status(400).json({
        message: 'Names can only have letters, spaces, apostrophes, periods and hyphens (50 characters max).',
      });
    }
    if (firstName !== user.firstName || lastName !== user.lastName) changes.push('name');

    // email / phone
    let identifier = user.identifier;
    if (body.identifier !== undefined) {
      const cleaned = cleanIdentifier(body.identifier);
      if (!cleaned) return res.status(400).json({ message: 'Enter a valid email or a mobile number like 09123456789.' });
      if (cleaned !== user.identifier) {
        if (await UserModel.exists({ identifier: cleaned, _id: { $ne: user._id } })) {
          return res.status(409).json({ message: 'An account with this email or phone already exists.' });
        }
        identifier = cleaned;
        changes.push('email/phone');
      }
    }

    // photo ('' removes it)
    let avatar = user.avatar || '';
    if (body.avatar !== undefined) {
      const value = String(body.avatar);
      if (value && (!AVATAR_RE.test(value) || value.length > MAX_AVATAR_CHARS)) {
        return res.status(400).json({ message: 'Photo must be a PNG, JPG or WEBP image under 200 KB.' });
      }
      if (value !== avatar) changes.push('photo');
      avatar = value;
    }

    // password
    const wantsNewPassword = body.newPassword !== undefined && body.newPassword !== '';
    if (wantsNewPassword) {
      const pw = String(body.newPassword);
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters with a letter and a number.' });
      }
    }

    // the current password protects the sensitive changes
    if (wantsNewPassword || identifier !== user.identifier) {
      if (!body.currentPassword) {
        return res.status(400).json({ message: 'Enter your current password to change your email/phone or password.' });
      }
      if (!(await user.comparePassword(String(body.currentPassword)))) {
        return res.status(401).json({ message: 'Your current password is incorrect.' });
      }
    }
    if (wantsNewPassword) {
      if (await user.comparePassword(String(body.newPassword))) {
        return res.status(400).json({ message: 'Your new password must be different from the current one.' });
      }
      user.password = String(body.newPassword); // hashed by the model before saving
      changes.push('password');
    }

    if (changes.length === 0) return res.json({ user, message: 'No changes to save.' });

    user.firstName = firstName;
    user.lastName = lastName;
    user.identifier = identifier;
    user.avatar = avatar;
    await user.save();
    await logAction('Profile Updated', user, { affected: `Changed: ${changes.join(', ')}` });

    res.json({ user, message: 'Your profile was updated.' });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email or phone already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { register, login, createStaff, listUsers, getUserById, checkIdentifier, getMe, updateMe };