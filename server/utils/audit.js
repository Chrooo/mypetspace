const AuditLog = require('../models/AuditLog');

// logAction('New User Registered', user, 'details')  -  never breaks the request if saving the log fails
const logAction = async (action, user, details = '') => {
  try {
    await AuditLog.create({
      action,
      details,
      actor: user ? user._id : undefined,
      actorName: user ? user.fullName : 'System',
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAction };