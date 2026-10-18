const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const petController = require('../controllers/petController');
const appointmentController = require('../controllers/appointmentController');
const roomController = require('../controllers/roomController');
const myBookingsController = require('../controllers/myBookingsController');
const paymentsController = require('../controllers/paymentsController');
const twoFactor = require('../controllers/twoFactorController');
const adminController = require('../controllers/adminController');
const groomerController = require('../controllers/groomerController');
const staffAppointmentsController = require('../controllers/staffAppointmentsController');
const { protect, authorize } = require('../middleware/authMiddleware');


router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/check-identifier', authController.checkIdentifier);
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateMe);
// my pets (the pets you registered)
router.get('/pets', protect, petController.listMyPets);
router.post('/pets', protect, petController.createPet);
router.post('/pets/delete', protect, petController.deletePets);
router.put('/pets/:id', protect, petController.updatePet);

// my bookings: every hotel reservation and grooming appointment of the logged-in customer
router.get('/my/bookings', protect, authorize('customer'), myBookingsController.listMyBookings);
// my payments and receipts (the receipt of a hotel booking is saved right after Pay Now)
router.get('/my/payments', protect, authorize('customer'), paymentsController.listMyPayments);
router.post('/my/payments/receipt', protect, authorize('customer'), paymentsController.saveRoomReceipt);
router.get('/receipts/:id', protect, authorize('customer', 'staff', 'admin'), paymentsController.getReceipt);

// booking: which time slots are still open on a date (same roles that can open the booking pages)
router.get('/appointments/availability', protect, authorize('customer', 'staff', 'admin'), appointmentController.getAvailability);
router.get('/appointments/assignment', protect, authorize('customer', 'staff', 'admin'), appointmentController.getAssignment);
router.post('/appointments', protect, authorize('customer', 'staff', 'admin'), appointmentController.createAppointment);
// hotel rooms: which slots are free, and saving a room booking
router.get('/rooms/availability', protect, authorize('customer', 'staff', 'admin'), roomController.getAvailability);
router.get('/rooms/slots', protect, authorize('customer', 'staff', 'admin'), roomController.getSlots);
router.post('/rooms/reservations', protect, authorize('customer', 'staff', 'admin'), roomController.createReservation);

// two-factor authentication
router.post('/login/2fa', twoFactor.loginSecondStep);
router.get('/2fa/status', protect, twoFactor.status);
router.post('/2fa/setup', protect, twoFactor.setup);
router.post('/2fa/enable', protect, twoFactor.enable);
router.post('/2fa/disable', protect, twoFactor.disable);

// groomer: only the appointments assigned to me
router.get('/groomer/appointments', protect, authorize('groomer'), groomerController.listMyAppointments);
router.put('/groomer/appointments/:id', protect, authorize('groomer'), groomerController.updateMyAppointment);

// staff and admin: every grooming appointment, and the bookings/payments list
router.get('/staff/appointments', protect, authorize('staff', 'admin'), staffAppointmentsController.listAppointments);
router.put('/staff/appointments/:id', protect, authorize('staff', 'admin'), staffAppointmentsController.updateAppointment);
router.get('/staff/groomers', protect, authorize('staff', 'admin'), staffAppointmentsController.listGroomers);
router.get('/staff/bookings', protect, authorize('staff', 'admin'), staffAppointmentsController.listBookings);
router.put('/staff/bookings/:id/payment', protect, authorize('staff', 'admin'), staffAppointmentsController.recordPayment);

router.post('/createStaff', protect, authorize('admin'), authController.createStaff);
router.get('/users', protect, authorize('admin'), authController.listUsers);
router.get('/admin/summary', protect, authorize('admin'), adminController.getSummary);
router.get('/admin/payments', protect, authorize('admin'), adminController.listPayments);
router.get('/admin/audit-logs', protect, authorize('admin'), adminController.listAuditLogs);

module.exports = router;