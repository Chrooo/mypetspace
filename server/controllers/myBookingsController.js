const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const RoomReservation = require('../models/RoomReservation');
const { NEXT: ROOM_NEXT } = require('../models/RoomReservation');
const Payment = require('../models/Payment');
const { logAction } = require('../utils/audit');

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

// "G-1A2B3C4D" / "H-1A2B3C4D": short booking number made from the end of the _id
const refOf = (prefix, id) => `${prefix}-${String(id).slice(-8).toUpperCase()}`;

// A grooming appointment that is already paid (and not started yet) shows as "paid", like the design.
const appointmentStatus = (a) =>
  a.status !== 'cancelled' && a.paymentStatus === 'paid' && ['pending', 'confirmed'].includes(a.status) ? 'paid' : a.status;

const fromAppointment = (a) => ({
  _id: a._id,
  kind: 'grooming',
  ref: refOf('G', a._id),
  createdAt: a.createdAt,
  petName: a.petName,
  petType: a.petType,
  petBreed: a.petBreed || '',
  services: a.services || [],
  scheduledAt: a.scheduledAt,
  groomerName: a.groomer ? `${a.groomer.firstName} ${a.groomer.lastName}` : '',
  total: a.total || 0,
  status: a.status,
  displayStatus: appointmentStatus(a),
  paymentStatus: a.paymentStatus,
  paymentMethod: a.paymentMethod || '',
  paidAt: a.paidAt || null,
  receiptId: a.paymentStatus === 'paid' ? refOf('G', a._id) : null, // a receipt exists once the shop recorded the payment
  canCancel: ['pending', 'confirmed'].includes(a.status) && new Date(a.scheduledAt) > new Date(),
});

const fromReservation = (r, payment) => ({
  _id: r._id,
  kind: 'room',
  ref: refOf('H', r._id),
  createdAt: r.createdAt,
  petName: r.petName,
  petType: r.petType,
  petBreed: r.petBreed || '',
  roomId: r.roomId,
  roomName: r.roomName,
  slot: r.slot,
  startDate: r.startDate,
  endDate: r.endDate,
  checkInAt: r.checkInAt,
  checkOutAt: r.checkOutAt || null,
  nights: r.nights || 0,
  hours: r.hours || 0,
  total: r.total || 0,
  status: r.status,
  displayStatus: r.status,
  paid: payment ? payment.amount : 0,
  receiptId: payment ? payment.receiptNo : null, // the page address of the receipt: /receipts/r-1234567890
  canCancel: ['pending', 'confirmed'].includes(r.status) && new Date(r.checkInAt) > new Date(),
});

// GET /api/my/bookings?page=1&pageSize=5      (customer only)
// Every booking the logged-in customer made: hotel reservations and grooming appointments in ONE list,
// newest booking first. Read straight from the database on every call, so it is always current.
const listMyBookings = async (req, res) => {
  try {
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
    const wanted = Math.max(1, parseInt(req.query.page, 10) || 1);

    const [appointments, reservations, payments] = await Promise.all([
      Appointment.find({ customer: req.user._id })
        .select('-petNotes -groomingNotes -__v')
        .populate('groomer', 'firstName lastName')
        .lean(),
      RoomReservation.find({ customer: req.user._id }).select('-cells -__v').lean(),
      Payment.find({ user: req.user._id, reservation: { $exists: true } }).select('amount receiptNo reservation').lean(),
    ]);
    const paymentOf = new Map(payments.map((p) => [String(p.reservation), p]));

    const all = [...appointments.map(fromAppointment), ...reservations.map((r) => fromReservation(r, paymentOf.get(String(r._id))))].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt) || String(b._id).localeCompare(String(a._id))
    );

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(wanted, totalPages); // asking for a page that no longer exists gives the last one
    const bookings = all.slice((page - 1) * pageSize, page * pageSize);

    res.set('Cache-Control', 'no-store');
    res.json({ bookings, total, page, pageSize, totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// POST /api/my/bookings/:kind/:id/cancel      (customer only; kind = "room" or "grooming")
// A customer can cancel their own booking while it is still Pending or Confirmed and has not started.
// A cancelled hotel stay gives its slot back, so someone else can book it.
// (Refunds are not automated yet: the shop handles them with the customer.)
const cancelMyBooking = async (req, res) => {
  try {
    const { kind, id } = req.params;
    if (!['room', 'grooming'].includes(kind) || !mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Booking not found.' });

    if (kind === 'room') {
      const r = await RoomReservation.findOne({ _id: id, customer: req.user._id }); // only YOUR bookings
      if (!r) return res.status(404).json({ message: 'Booking not found.' });
      if (!ROOM_NEXT[r.status].includes('cancelled') || r.status === 'checked_in') {
        return res.status(400).json({ message: 'This booking can no longer be cancelled. Please contact the shop.' });
      }
      if (new Date(r.checkInAt) <= new Date()) return res.status(400).json({ message: 'This stay has already started. Please contact the shop.' });
      r.status = 'cancelled';
      r.active = false;
      await r.save();
      await logAction('Room Booking Cancelled', req.user, { affected: `${r.petName} - ${r.roomName} #${r.slot}` });
      return res.json({ status: 'cancelled' });
    }

    const a = await Appointment.findOne({ _id: id, customer: req.user._id });
    if (!a) return res.status(404).json({ message: 'Booking not found.' });
    if (!['pending', 'confirmed'].includes(a.status)) return res.status(400).json({ message: 'This appointment can no longer be cancelled. Please contact the shop.' });
    if (new Date(a.scheduledAt) <= new Date()) return res.status(400).json({ message: 'This appointment has already started. Please contact the shop.' });
    a.status = 'cancelled';
    await a.save();
    await logAction('Appointment Cancelled', req.user, { affected: `${a.petName} - ${a.services.join(', ')}` });
    res.json({ status: 'cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { listMyBookings, cancelMyBooking };