const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const twoFactor = require('../controllers/twoFactorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// two-factor authentication
router.post('/login/2fa', twoFactor.loginSecondStep);
router.get('/2fa/status', protect, twoFactor.status);
router.post('/2fa/setup', protect, twoFactor.setup);
router.post('/2fa/enable', protect, twoFactor.enable);
router.post('/2fa/disable', protect, twoFactor.disable);

router.post('/createStaff', protect, authorize('admin'), authController.createStaff);
router.get('/users', protect, authorize('admin'), authController.listUsers);

module.exports = router;