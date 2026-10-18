const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const RoomReservation = require('../models/RoomReservation');
const Appointment = require('../models/Appointment');
const UserModel = require('../models/User');
const { logAction } = require('../utils/audit');

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

const METHOD_LABELS = { CARD: 'Card', GCASH: 'GCash', MAYA: 'Maya', BANK: 'Bank transfer', CASH: 'Cash' };
const METHOD_FROM_TEXT = { card: 'CARD', gcash: 'GCASH' }; // what the Payment page offers

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};

// "G-1A2B3C4D": short number of a grooming booking (same as the My Bookings page)
const refOf = (prefix, id) => `${prefix}-${String(id).slice(-8).toUpperCase()}`;

// KEEP IN SYNC with src/components/Receipt/receiptData.js: the receipt and booking numbers of a hotel booking
const digitsOf = (text) => text.split('').map((c) => String(parseInt(c, 16) % 10)).join('');
const numbersFor = (reservationId) => {
  const hex = String(reservationId).replace(/[^0-9a-f]/gi, '0');
  const padded = hex.padEnd(24, '0');
  return {
    receiptNo: `r-${digitsOf(padded.slice(0, 12)).slice(0, 10)}`,
    bookingNo: `b-${digitsOf(padded.slice(-15)).slice(0, 15)}`,
  };
};

// text that came from the browser: trimmed and kept short
const clean = (value, fallback = '') => {
  const text = typeof value === 'string' ? value.trim().slice(0, 120) : '';
  return text || fallback;
};

const manila = (value, options) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', ...options }).format(new Date(value));

// POST /api/my/payments/receipt      body: { receipt }   (customer only)
// Called by the Receipt page right after "Pay Now". Saves the payment of a hotel booking together with its receipt.
// The amounts are checked against the booking's price on the server, and calling it again does nothing new.
const saveRoomReceipt = async (req, res) => {
  try {
    const input = (req.body && req.body.receipt) || {};
    if (!mongoose.isValidObjectId(input.reservationId)) return res.status(400).json({ message: 'This receipt is missing its booking.' });

    const reservation = await RoomReservation.findOne({ _id: input.reservationId, customer: req.user._id }); // only YOUR bookings
    if (!reservation) return res.status(404).json({ message: 'Booking not found.' });

    const existing = await Payment.findOne({ reservation: reservation._id });
    if (existing) return res.json({ receiptNo: existing.receiptNo, created: false });

    const method = METHOD_FROM_TEXT[String(input.method || '').toLowerCase()];
    if (!method) return res.status(400).json({ message: 'Choose how it was paid.' });

    // the price comes from the booking, never from the browser. Full payment or half (downpayment) only.
    const total = reservation.total > 0 ? reservation.total : null; // null = Peak/Holiday: the shop sets the price
    let paid = 0;
    if (total !== null) {
      paid = Number(input.paid);
      if (![total, Math.round(total / 2)].includes(paid)) {
        return res.status(400).json({ message: 'That amount does not match the price of the booking.' });
      }
    }

    const { receiptNo, bookingNo } = numbersFor(reservation._id);
    const receipt = {
      customerName: req.user.fullName,
      contact: req.user.identifier,
      roomName: clean(input.roomName, reservation.roomName),
      datesText: clean(input.datesText),
      petText: clean(input.petText, `${reservation.petName} (${reservation.petBreed})`),
      slot: reservation.slot,
      checkIn: clean(input.checkIn),
      checkOut: clean(input.checkOut),
      priceText: clean(input.priceText),
      total,
      paid,
      downpayment: total !== null && paid !== total ? paid : null,
      method: METHOD_LABELS[method],
    };

    let payment;
    try {
      payment = await Payment.create({
        user: req.user._id,
        customerName: req.user.fullName,
        amount: paid,
        method,
        transactionNo: receiptNo,
        reservation: reservation._id,
        receiptNo,
        bookingNo,
        total,
        receipt,
      });
      await logAction('Payment Recorded', req.user, {
        affected: `${reservation.petName} (${req.user.fullName}): ₱${paid} via ${METHOD_LABELS[method]}`,
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      payment = await Payment.findOne({ reservation: reservation._id }); // two calls at once: the other one won
      return res.json({ receiptNo: payment.receiptNo, created: false });
    }

    res.status(201).json({ receiptNo: payment.receiptNo, created: true });
  } catch (err) {
    serverError(res, err);
  }
};

const roomStatus = (p) => {
  if (!(p.total > 0)) return 'pending'; // the shop has not set the price, nothing was paid yet
  return p.amount < p.total ? 'partial' : 'paid';
};

const fromPayment = (p) => {
  const r = p.reservation || {};
  return {
    _id: p._id,
    kind: 'room',
    receiptId: p.receiptNo,
    paidAt: p.createdAt,
    amount: p.amount,
    total: p.total,
    method: p.method,
    status: roomStatus(p),
    roomName: r.roomName || (p.receipt && p.receipt.roomName) || 'Room',
    startDate: r.startDate || '',
    endDate: r.endDate || '',
    checkInAt: r.checkInAt || null,
    checkOutAt: r.checkOutAt || null,
    nights: r.nights || 0,
    hours: r.hours || 0,
    datesText: (p.receipt && p.receipt.datesText) || '',
  };
};

const fromAppointment = (a) => ({
  _id: a._id,
  kind: 'grooming',
  receiptId: refOf('G', a._id),
  paidAt: a.paidAt || a.updatedAt,
  amount: a.total,
  total: a.total,
  method: a.paymentMethod,
  status: 'paid',
  services: a.services || [],
  scheduledAt: a.scheduledAt,
});

// GET /api/my/payments?page=1&pageSize=5      (customer only)
// Every payment the customer made: hotel stays (paid on the booking page) and grooming appointments the shop
// marked as paid, newest first. Read straight from the database on every call, so it is always current.
const listMyPayments = async (req, res) => {
  try {
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
    const wanted = Math.max(1, parseInt(req.query.page, 10) || 1);

    const [payments, appointments] = await Promise.all([
      Payment.find({ user: req.user._id, reservation: { $exists: true } })
        .select('amount method total receiptNo receipt.roomName receipt.datesText reservation createdAt')
        .populate('reservation', 'roomName startDate endDate checkInAt checkOutAt nights hours')
        .lean(),
      Appointment.find({ customer: req.user._id, paymentStatus: 'paid' })
        .select('services scheduledAt total paymentMethod paidAt updatedAt')
        .lean(),
    ]);

    const all = [...payments.map(fromPayment), ...appointments.map(fromAppointment)].sort(
      (a, b) => new Date(b.paidAt) - new Date(a.paidAt) || String(b._id).localeCompare(String(a._id))
    );

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(wanted, totalPages);

    res.set('Cache-Control', 'no-store');
    res.json({ payments: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages });
  } catch (err) {
    serverError(res, err);
  }
};

// GET /api/receipts/:id      (customer: own receipts only. staff and admin: any)
// id is "r-1234567890" (a hotel booking) or "G-1A2B3C4D" (a paid grooming appointment).
const getReceipt = async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const seeAll = req.user.role !== 'customer';

    if (/^r-\d{10}$/.test(id)) {
      const filter = { receiptNo: id };
      if (!seeAll) filter.user = req.user._id;
      const payment = await Payment.findOne(filter).lean();
      if (!payment || !payment.receipt) return res.status(404).json({ message: 'Receipt not found.' });
      return res.json({
        receipt: { ...payment.receipt, kind: 'room', receiptNo: payment.receiptNo, bookingNo: payment.bookingNo, issuedAt: payment.createdAt },
      });
    }

    const grooming = /^G-([0-9A-F]{8})$/i.exec(id);
    if (grooming) {
      const filter = {
        paymentStatus: 'paid',
        $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${grooming[1].toLowerCase()}$` } },
      };
      if (!seeAll) filter.customer = req.user._id;
      const a = await Appointment.findOne(filter).populate('groomer', 'firstName lastName').lean();
      if (!a) return res.status(404).json({ message: 'Receipt not found.' });

      const owner = await UserModel.findById(a.customer).select('identifier').lean();
      const when = `${manila(a.scheduledAt, { month: 'long', day: 'numeric', year: 'numeric' })} ${manila(a.scheduledAt, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      return res.json({
        receipt: {
          kind: 'grooming',
          receiptNo: refOf('G', a._id),
          bookingNo: refOf('G', a._id),
          issuedAt: a.paidAt || a.updatedAt,
          customerName: a.customerName,
          contact: owner ? owner.identifier : '',
          serviceText: (a.services || []).join(', '),
          petText: `${a.petName}${a.petBreed ? ` (${a.petBreed})` : ''}`,
          scheduleText: when,
          groomerName: a.groomer ? `${a.groomer.firstName} ${a.groomer.lastName}` : '',
          total: a.total,
          paid: a.total,
          downpayment: null,
          method: METHOD_LABELS[a.paymentMethod] || a.paymentMethod,
        },
      });
    }

    res.status(404).json({ message: 'Receipt not found.' });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = { saveRoomReceipt, listMyPayments, getReceipt, numbersFor, METHOD_LABELS, manila };