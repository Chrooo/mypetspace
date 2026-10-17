const UserModel = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Payment = require('../models/Payment');

// shared by the admin lists: ?page=1&pageSize=10
const paging = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

// text typed in a search box -> a safe, case-insensitive pattern
const textPattern = (value) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// ?from=2026-10-01&to=2026-10-31 -> a createdAt filter (dates are Philippine time), or null
const dateRange = (query) => {
  const from = new Date(`${query.from}T00:00:00+08:00`);
  const to = new Date(`${query.to}T23:59:59.999+08:00`);
  if (isNaN(from) && isNaN(to)) return null;
  const range = {};
  if (!isNaN(from)) range.$gte = from;
  if (!isNaN(to)) range.$lte = to;
  return range;
};

// "Sort by" choices: latest (also the default), oldest, alphabetical (by the given field)
const sortBy = (sort, nameField) => {
  if (sort === 'oldest') return { createdAt: 1 };
  if (sort === 'alphabetical') return { [nameField]: 1, createdAt: -1 };
  return { createdAt: -1 };
};

// GET /api/admin/audit-logs?role=&search=&sort=&from=&to=&page=&pageSize=  (admin only)
const listAuditLogs = async (req, res) => {
  try {
    const { page, pageSize, skip } = paging(req.query);
    const filter = {};
    if (['admin', 'staff', 'groomer', 'customer'].includes(req.query.role)) filter.actorRole = req.query.role;
    if (req.query.search && req.query.search.trim()) {
      const text = textPattern(req.query.search);
      filter.$or = [{ actorName: text }, { affected: text }, { action: text }];
    }
    const range = dateRange(req.query);
    if (range) filter.createdAt = range;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort(sortBy(req.query.sort, 'actorName')).skip(skip).limit(pageSize),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ logs, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/admin/payments?search=&sort=&from=&to=&page=&pageSize=  (admin only)
const listPayments = async (req, res) => {
  try {
    const { page, pageSize, skip } = paging(req.query);
    const filter = {};
    if (req.query.search && req.query.search.trim()) {
      const text = textPattern(req.query.search);
      filter.$or = [{ customerName: text }, { transactionNo: text }, { method: text }];
    }
    const range = dateRange(req.query);
    if (range) filter.createdAt = range;

    const [payments, total] = await Promise.all([
      Payment.find(filter).sort(sortBy(req.query.sort, 'customerName')).skip(skip).limit(pageSize),
      Payment.countDocuments(filter),
    ]);
    res.json({ payments, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/admin/summary  (admin only) - the live numbers and the newest activity for the Admin Dashboard
const getSummary = async (req, res) => {
  try {
    const now = Date.now();
    const lastDay = new Date(now - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalUsers, newSignups, failedLogins, paid, recent] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'customer', createdAt: { $gte: lastWeek } }),
      AuditLog.countDocuments({ action: /login/i, status: 'failed', createdAt: { $gte: lastDay } }),
      Payment.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AuditLog.find().sort({ createdAt: -1 }).limit(4),
    ]);

    res.json({ totalUsers, newSignups, failedLogins, paymentsThisMonth: paid[0]?.total || 0, recent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { listAuditLogs, listPayments, getSummary };