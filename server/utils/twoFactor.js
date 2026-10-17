const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');

authenticator.options = { window: 1 }; // also accept the code from 30 seconds before/after (phone clock differences)

const STEP_SECONDS = 30;
const ISSUER = 'My Pet Space';
const RECOVERY_CODE_COUNT = 8;

/* ---------- authenticator app codes ---------- */

const newSecret = () => authenticator.generateSecret(20);

// the text inside the QR code
const keyUri = (account, secret) => authenticator.keyuri(account, ISSUER, secret);

// Returns the 30-second step the code belongs to, or null when the code is wrong.
const checkCode = (secret, code) => {
  try {
    const delta = authenticator.checkDelta(String(code || '').replace(/\s/g, ''), secret);
    if (delta === null || delta === undefined) return null;
    return Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta;
  } catch (err) {
    return null;
  }
};

/* ---------- recovery codes ---------- */

// 8 codes like "a1b2c-3d4e5". The plain text is shown to the user once; only the hashes are stored.
const newRecoveryCodes = async () => {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString('hex');
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  const hashed = await Promise.all(plain.map((code) => bcrypt.hash(code, 10)));
  return { plain, hashed };
};

// index of the matching code in the stored list, or -1
const findRecoveryCode = async (input, hashes) => {
  const clean = String(input || '').trim().toLowerCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(clean, hashes[i])) return i;
  }
  return -1;
};

/* ---------- check an app code OR a recovery code ---------- */

// The user must be loaded with: .select('+twoFactorSecret +twoFactorLastStep +twoFactorRecoveryCodes')
// Returns 'ok', 'used' (a correct code that was already used once) or 'wrong'.
const verifySecondFactor = async (user, input) => {
  const text = String(input || '').trim();

  if (/^\d{3}\s?\d{3}$/.test(text)) {
    const step = checkCode(user.twoFactorSecret, text);
    if (step === null) return 'wrong';
    if (step <= user.twoFactorLastStep) return 'used';
    user.twoFactorLastStep = step;
    await user.save();
    return 'ok';
  }

  const hashes = user.twoFactorRecoveryCodes || [];
  const index = await findRecoveryCode(text, hashes);
  if (index === -1) return 'wrong';
  user.twoFactorRecoveryCodes = hashes.filter((_, i) => i !== index); // each recovery code works once
  await user.save();
  return 'ok';
};

/* ---------- limit wrong guesses ---------- */

// 5 wrong tries per user in 15 minutes. Kept in memory, so it resets when the server restarts.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map(); // user id -> { count, since }

const isLocked = (userId) => {
  const entry = failures.get(String(userId));
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failures.delete(String(userId));
    return false;
  }
  return entry.count >= MAX_FAILURES;
};

const recordFailure = (userId) => {
  const key = String(userId);
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) failures.set(key, { count: 1, since: Date.now() });
  else entry.count += 1;
};

const clearFailures = (userId) => failures.delete(String(userId));

module.exports = {
  newSecret,
  keyUri,
  checkCode,
  newRecoveryCodes,
  verifySecondFactor,
  isLocked,
  recordFailure,
  clearFailures,
};