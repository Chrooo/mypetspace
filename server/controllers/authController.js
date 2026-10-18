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

const isEmail = (value = '') => EMAIL_RE.test(String(value).trim());
const cleanEmail = (value = '') => {
  const v = String(value).trim().toLowerCase();
  return EMAIL_RE.test(v) ? v : null;
};
const cleanPhone = (value = '') => {
  const v = String(value).trim().replace(/[\s-]/g, '').replace(/^\+63/, '0');
  return /^09\d{9}$/.test(v) ? v : null;
};
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

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
    // an email / phone also counts as taken when somebody saved it as their extra e-mail / contact number
    const taken = await UserModel.exists({ $or: [{ identifier }, { email: identifier }, { contactNumber: identifier }] });
    res.json({ available: !taken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/check-username?username=...  (logged in) - "already taken" while typing on My Profile
const checkUsername = async (req, res) => {
  try {
    const username = String(req.query.username || '').trim().toLowerCase();
    if (!username) return res.json({ available: true });
    res.json({ available: !(await UserModel.exists({ username, _id: { $ne: req.user._id } })) });
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

// PUT /api/me  (any logged-in user) - edit your OWN username, name, e-mail, contact number, photo and password
// The login (email or phone) is the one the account was registered with: changing THAT one, or the
// password, needs the current password. The other one is just an extra detail and can be saved freely.
// The role is never read from req.body.
const updateMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select('+password');
    if (!user) return res.status(401).json({ message: 'Please log in again.' });

    const body = req.body || {};
    const changes = [];
    const taken = (message) => res.status(409).json({ message });
    const takenMessage = 'An account with this email or phone already exists.';

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

    // username (optional, '' removes it)
    let username = user.username || '';
    if (body.username !== undefined) {
      const value = String(body.username).trim().toLowerCase();
      if (value && !USERNAME_RE.test(value)) {
        return res.status(400).json({
          message: 'Username must be 3 to 20 characters: letters, numbers, periods and underscores only.',
        });
      }
      if (value !== username) {
        if (value && (await UserModel.exists({ username: value, _id: { $ne: user._id } }))) {
          return taken('This username is already taken.');
        }
        username = value;
        changes.push('username');
      }
    }

    // email / contact number. The one the account logs in with can never be empty.
    const loginIsEmail = isEmail(user.identifier);
    const currentEmail = user.email || (loginIsEmail ? user.identifier : '');
    const currentPhone = user.contactNumber || (loginIsEmail ? '' : user.identifier);
    let email = currentEmail;
    let contactNumber = currentPhone;
    let identifier = user.identifier;

    // older way (Groomer profile): one box that holds the login email OR phone
    if (body.identifier !== undefined) {
      const cleaned = cleanIdentifier(body.identifier);
      if (!cleaned) return res.status(400).json({ message: 'Enter a valid email or a mobile number like 09123456789.' });
      if (cleaned !== identifier) {
        identifier = cleaned;
        if (isEmail(cleaned)) email = cleaned;
        else contactNumber = cleaned;
      }
    }

    if (body.email !== undefined) {
      const raw = String(body.email).trim();
      if (!raw) {
        if (loginIsEmail) return res.status(400).json({ message: 'Your email is your login, so it cannot be empty.' });
        email = '';
      } else {
        const cleaned = cleanEmail(raw);
        if (!cleaned) return res.status(400).json({ message: 'Enter a valid email address.' });
        email = cleaned;
        if (loginIsEmail) identifier = cleaned;
      }
    }

    if (body.contactNumber !== undefined) {
      const raw = String(body.contactNumber).trim();
      if (!raw) {
        if (!loginIsEmail) return res.status(400).json({ message: 'Your mobile number is your login, so it cannot be empty.' });
        contactNumber = '';
      } else {
        const cleaned = cleanPhone(raw);
        if (!cleaned) return res.status(400).json({ message: 'Enter a valid mobile number like 09123456789.' });
        contactNumber = cleaned;
        if (!loginIsEmail) identifier = cleaned;
      }
    }

    // none of them may belong to somebody else
    for (const value of new Set([identifier, email, contactNumber])) {
      if (!value) continue;
      const isNew = value !== user.identifier && value !== currentEmail && value !== currentPhone;
      if (!isNew) continue;
      if (await UserModel.exists({ _id: { $ne: user._id }, $or: [{ identifier: value }, { email: value }, { contactNumber: value }] })) {
        return taken(takenMessage);
      }
    }
    if (identifier !== user.identifier) changes.push('email/phone');
    if (email !== currentEmail && !(loginIsEmail && identifier !== user.identifier)) changes.push('email');
    if (contactNumber !== currentPhone && !(!loginIsEmail && identifier !== user.identifier)) changes.push('contact number');

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
    user.email = email;
    user.contactNumber = contactNumber;
    user.username = username || undefined; // undefined removes it, so the unique index ignores empty usernames
    user.avatar = avatar;
    await user.save();
    await logAction('Profile Updated', user, { affected: `Changed: ${changes.join(', ')}` });

    res.json({ user, message: 'Your profile was updated.' });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err.keyPattern && err.keyPattern.username) {
        return res.status(409).json({ message: 'This username is already taken.' });
      }
      return res.status(409).json({ message: 'An account with this email or phone already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { register, login, createStaff, listUsers, checkIdentifier, checkUsername, getMe, updateMe };