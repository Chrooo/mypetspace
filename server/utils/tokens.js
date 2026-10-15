const jwt = require('jsonwebtoken');

// the normal login token (valid for 7 days)
const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// A short ticket given after the password is correct but BEFORE the 2FA code is checked.
// It is signed with a different key, so it can never be used as a login token.
const ticketKey = () => `${process.env.JWT_SECRET}:2fa-login`;

const makeTwoFactorTicket = (user) =>
  jwt.sign({ id: user._id }, ticketKey(), { expiresIn: '5m' });

// throws when the ticket is wrong or older than 5 minutes
const readTwoFactorTicket = (ticket) => jwt.verify(String(ticket || ''), ticketKey());

module.exports = { makeToken, makeTwoFactorTicket, readTwoFactorTicket };