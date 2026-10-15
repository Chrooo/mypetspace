const UserModel = require('../models/User');
const AuditLog = require('../models/AuditLog');

// GET /api/admin/dashboard  (admin only) - the 6 number boxes + the 4 newest activities
const getDashboard = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, customers, staff, groomers, twoFactor, activityToday, recent] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'customer' }),
      UserModel.countDocuments({ role: 'staff' }),
      UserModel.countDocuments({ role: 'groomer' }),
      UserModel.countDocuments({ twoFactorEnabled: true }),
      AuditLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      AuditLog.find().sort({ createdAt: -1 }).limit(4),
    ]);

    res.json({ stats: { totalUsers, customers, staff, groomers, twoFactor, activityToday }, recent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/admin/audit-logs?page=1&pageSize=10&search=&action=&from=2026-10-01&to=2026-10-31  (admin only)
const listAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const search = String(req.query.search || '').trim();
    const action = String(req.query.action || '').trim();

    const filter = {};
    if (action) filter.action = action;
    if (search) {
      const text = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // typed text, not a pattern
      filter.$or = [{ actorName: text }, { details: text }, { action: text }];
    }

    // date range (dates are Philippine time)
    const from = new Date(`${req.query.from}T00:00:00+08:00`);
    const to = new Date(`${req.query.to}T23:59:59.999+08:00`);
    if (!isNaN(from) || !isNaN(to)) {
      filter.createdAt = {};
      if (!isNaN(from)) filter.createdAt.$gte = from;
      if (!isNaN(to)) filter.createdAt.$lte = to;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { getDashboard, listAuditLogs };