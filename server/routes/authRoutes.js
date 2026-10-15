const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const twoFactor = require('../controllers/twoFactorController');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/check-identifier', authController.checkIdentifier);

// two-factor authentication
router.post('/login/2fa', twoFactor.loginSecondStep);
router.get('/2fa/status', protect, twoFactor.status);
router.post('/2fa/setup', protect, twoFactor.setup);
router.post('/2fa/enable', protect, twoFactor.enable);
router.post('/2fa/disable', protect, twoFactor.disable);

router.post('/createStaff', protect, authorize('admin'), authController.createStaff);
router.get('/users', protect, authorize('admin'), authController.listUsers);
router.get('/admin/dashboard', protect, authorize('admin'), adminController.getDashboard);
router.get('/admin/audit-logs', protect, authorize('admin'), adminController.listAuditLogs);

module.exports = router;