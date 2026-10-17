const { logAction } = require('../utils/audit');
const QRCode = require('qrcode');
const UserModel = require('../models/User');
const { makeToken, readTwoFactorTicket } = require('../utils/tokens');
const tf = require('../utils/twoFactor');

// the secret fields are hidden by default, so they must be asked for
const WITH_SECRETS = '+password +twoFactorSecret +twoFactorLastStep +twoFactorRecoveryCodes';

const TOO_MANY = { message: 'Too many wrong attempts. Please try again in 15 minutes.' };
const CODE_USED = { message: 'That code was already used. Wait for the next code in your app and try again.' };
const SERVER_ERROR = { message: 'Internal Server Error' };

// POST /api/login/2fa  { twoFactorToken, code }
// Second step of logging in: the code is checked, then the real login token is given.
const loginSecondStep = async (req, res) => {
  try {
    let ticket;
    try {
      ticket = readTwoFactorTicket(req.body.twoFactorToken);
    } catch (err) {
      return res.status(401).json({ message: 'Your login session expired. Please log in again.' });
    }

    if (tf.isLocked(ticket.id)) return res.status(429).json(TOO_MANY);

    const user = await UserModel.findById(ticket.id).select(WITH_SECRETS);
    if (!user || !user.twoFactorEnabled) {
      return res.status(401).json({ message: 'Please log in again.' });
    }

    const result = await tf.verifySecondFactor(user, req.body.code);
    if (result !== 'ok') {
      tf.recordFailure(user._id);
      await logAction('Login attempt', user, { status: 'failed' });
      if (result === 'used') return res.status(401).json(CODE_USED);
      return res.status(401).json({ message: 'That code is not correct. Please try again.' });
    }

    tf.clearFailures(user._id);
    await logAction('Login attempt', user);
    res.json({ token: makeToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json(SERVER_ERROR);
  }
};

// GET /api/2fa/status
const status = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select('+twoFactorRecoveryCodes');
    res.json({
      enabled: user.twoFactorEnabled,
      recoveryCodesLeft: user.twoFactorEnabled ? (user.twoFactorRecoveryCodes || []).length : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json(SERVER_ERROR);
  }
};

// POST /api/2fa/setup  { password }
// Step 1 of turning it on: makes a new secret and returns it with the QR code.
// Nothing is active yet; it only turns on after /enable gets a correct code.
const setup = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select(WITH_SECRETS);
    if (tf.isLocked(user._id)) return res.status(429).json(TOO_MANY);
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is already on.' });
    }
    if (!(await user.comparePassword(req.body.password || ''))) {
      tf.recordFailure(user._id);
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const secret = tf.newSecret();
    user.twoFactorSecret = secret;
    user.twoFactorLastStep = 0;
    await user.save();

    const qr = await QRCode.toDataURL(tf.keyUri(user.identifier, secret), { margin: 1, width: 220 });
    res.json({ secret, qr });
  } catch (err) {
    console.error(err);
    res.status(500).json(SERVER_ERROR);
  }
};

// POST /api/2fa/enable  { code }
// Step 2: the user types the code from the app. If it is right, 2FA turns on and the recovery codes are shown once.
const enable = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select(WITH_SECRETS);
    if (tf.isLocked(user._id)) return res.status(429).json(TOO_MANY);
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is already on.' });
    }
    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'Please start the setup first.' });
    }

    const step = tf.checkCode(user.twoFactorSecret, req.body.code);
    if (step === null) {
      tf.recordFailure(user._id);
      return res.status(401).json({ message: 'That code is not correct. Check the time on your phone and try again.' });
    }

    const { plain, hashed } = await tf.newRecoveryCodes();
    user.twoFactorEnabled = true;
    user.twoFactorLastStep = step;
    user.twoFactorRecoveryCodes = hashed;
    await user.save();

    tf.clearFailures(user._id);
    res.json({ recoveryCodes: plain });
  } catch (err) {
    console.error(err);
    res.status(500).json(SERVER_ERROR);
  }
};

// POST /api/2fa/disable  { password, code }   (code = app code or a recovery code)
const disable = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select(WITH_SECRETS);
    if (tf.isLocked(user._id)) return res.status(429).json(TOO_MANY);
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is already off.' });
    }

    const passwordOk = await user.comparePassword(req.body.password || '');
    const result = passwordOk ? await tf.verifySecondFactor(user, req.body.code) : 'wrong';
    if (result !== 'ok') {
      tf.recordFailure(user._id);
      if (result === 'used') return res.status(401).json(CODE_USED);
      return res.status(401).json({ message: 'Incorrect password or code.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = [];
    user.twoFactorLastStep = 0;
    await user.save();

    tf.clearFailures(user._id);
    res.json({ message: 'Two-factor authentication is off.' });
  } catch (err) {
    console.error(err);
    res.status(500).json(SERVER_ERROR);
  }
};

module.exports = { loginSecondStep, status, setup, enable, disable };