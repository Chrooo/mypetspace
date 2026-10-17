const AuditLog = require('../models/AuditLog');

// logAction('Login attempt', user)
// logAction('Created new account', admin, { affected: 'Ewan Cruz' })
// logAction('Login attempt', user, { status: 'failed' })
// Never breaks the request if saving the log fails.
const logAction = async (action, user, { affected = '', status = 'success' } = {}) => {
  try {
    await AuditLog.create({
      action,
      status,
      affected,
      actor: user ? user._id : undefined,
      actorName: user ? user.fullName : 'System',
      actorRole: user ? user.role : '',
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAction };