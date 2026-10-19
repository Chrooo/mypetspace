const mongoose = require('mongoose');
const RoomReservation = require('../models/RoomReservation');
const { STATUSES, NEXT } = require('../models/RoomReservation');
const Payment = require('../models/Payment');
const UserModel = require('../models/User');
const { logAction } = require('../utils/audit');
const { sendHotelEmail } = require('../utils/mailer');
const { ROOM_TYPES, todayPH } = require('../utils/rooms');
const { numbersFor, METHOD_LABELS, manila } = require('./paymentsController');

const LABELS = { pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In', completed: 'Completed', cancelled: 'Cancelled' };
const METHODS = ['CASH', 'GCASH', 'MAYA', 'BANK', 'CARD'];

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};

const paging = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};
const textPattern = (value) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// one reservation + its payment, in the shape the staff pages show
const serialize = (r, payment) => {
  const { bookingNo } = numbersFor(r._id);
  const paid = payment ? payment.amount : 0;
  return {
    _id: r._id,
    ref: bookingNo,
    receiptNo: payment ? payment.receiptNo : null,
    customerName: r.customerName,
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
    total: r.total || 0, // 0 = Peak/Holiday: the shop has not set the price yet
    paid,
    balance: r.total > 0 ? Math.max(r.total - paid, 0) : null,
    paymentMethod: payment ? payment.method : '',
    status: r.status,
    nextStatuses: NEXT[r.status] || [],
    createdAt: r.createdAt,
  };
};

// GET /api/staff/reservations?status=&date=&search=&page=&pageSize=     (staff and admin)
// date = "YYYY-MM-DD": every stay that covers that day. Used by Hotel Stays and by the hotel tab of Bookings.
const listReservations = async (req, res) => {
  try {
    const { page, pageSize, skip } = paging(req.query);
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '')) {
      filter.startDate = { $lte: req.query.date };
      filter.endDate = { $gte: req.query.date };
    }
    if (req.query.search && req.query.search.trim()) {
      const text = textPattern(req.query.search);
      filter.$or = [{ customerName: text }, { petName: text }, { roomName: text }];
    }

    const [rows, total] = await Promise.all([
      RoomReservation.find(filter).sort({ checkInAt: -1 }).skip(skip).limit(pageSize).select('-cells -__v').lean(),
      RoomReservation.countDocuments(filter),
    ]);
    const payments = await Payment.find({ reservation: { $in: rows.map((r) => r._id) } }).select('amount method receiptNo reservation').lean();
    const byReservation = new Map(payments.map((p) => [String(p.reservation), p]));

    res.set('Cache-Control', 'no-store');
    res.json({ reservations: rows.map((r) => serialize(r, byReservation.get(String(r._id)))), total, page, pageSize });
  } catch (err) {
    serverError(res, err);
  }
};

const when = (date) => `${manila(date, { month: 'long', day: 'numeric', year: 'numeric' })} ${manila(date, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
const dayText = (day, withYear) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', ...(withYear ? { year: 'numeric' } : {}) }).format(new Date(`${day}T00:00:00Z`));

// a receipt for a stay whose customer never reached the receipt page (so no payment was saved)
const receiptFor = async (r, paid, method, downpayment = null) => {
  const owner = await UserModel.findById(r.customer).select('identifier').lean();
  const isDay = r.nights === 0;
  return {
    customerName: r.customerName,
    contact: owner ? owner.identifier : '',
    roomName: r.roomName,
    datesText: isDay ? `${dayText(r.startDate, true)}` : `${dayText(r.startDate)} - ${dayText(r.endDate, true)}`,
    petText: `${r.petName}${r.petBreed ? ` (${r.petBreed})` : ''}`,
    slot: r.slot,
    checkIn: when(r.checkInAt),
    checkOut: r.checkOutAt ? when(r.checkOutAt) : '',
    priceText: isDay ? `${r.hours} ${r.hours === 1 ? 'hour' : 'hours'}` : `${r.nights} ${r.nights === 1 ? 'night' : 'nights'} x ₱${r.nights ? r.total / r.nights : r.total}`,
    total: r.total,
    paid,
    downpayment,
    method: METHOD_LABELS[method],
  };
};

// PUT /api/staff/reservations/:id     body: { status?, total?, payBalance? }     (staff and admin)
//   status      -> move the stay along (see NEXT in models/RoomReservation.js). Cancel / complete free the slot.
//   total       -> Peak/Holiday only: the shop sets the price once
//   payBalance  -> "CASH" | "GCASH" | ...: the customer paid what was left. The receipt is updated too.
const updateReservation = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Reservation not found.' });
    const r = await RoomReservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Reservation not found.' });

    const { status, total, payBalance } = req.body || {};
    if (status === undefined && total === undefined && payBalance === undefined) return res.status(400).json({ message: 'Nothing to update.' });

    const who = `${r.petName} (${r.customerName})`;
    const logs = [];
    let payment = await Payment.findOne({ reservation: r._id });

    // ---- check everything first, change things after ----
    let newTotal = null;
    if (total !== undefined) {
      if (r.total > 0) return res.status(400).json({ message: 'The price of this stay is already set.' });
      const amount = Number(total);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Enter a price above zero.' });
      newTotal = Math.round(amount * 100) / 100;
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'That is not a valid status.' });
      if (!NEXT[r.status].includes(status)) {
        return res.status(400).json({ message: `A ${LABELS[r.status]} stay cannot be changed to ${LABELS[status]}.` });
      }
    }

    const finalStatus = status !== undefined ? status : r.status;
    const finalTotal = newTotal !== null ? newTotal : r.total;
    let balance = 0;
    if (payBalance !== undefined) {
      if (!METHODS.includes(payBalance)) return res.status(400).json({ message: 'Please choose how it was paid.' });
      if (finalStatus === 'cancelled') return res.status(400).json({ message: 'A cancelled stay cannot be paid.' });
      if (!(finalTotal > 0)) return res.status(400).json({ message: 'Set the price of this stay first.' });
      balance = finalTotal - (payment ? payment.amount : 0);
      if (balance <= 0) return res.status(400).json({ message: 'This stay is already fully paid.' });
    }

    // ---- apply ----
    if (newTotal !== null) {
      r.total = newTotal;
      logs.push(['Reservation Price Set', `${who}: ₱${newTotal}`]);
      if (payment) {
        payment.total = newTotal;
        payment.receipt = { ...(payment.receipt || {}), total: newTotal };
      }
    }
    if (status !== undefined) {
      logs.push(['Reservation Status Updated', `${who}: ${LABELS[r.status]} → ${LABELS[status]}`]);
      r.status = status;
      if (['cancelled', 'completed'].includes(status)) r.active = false; // the slot can be booked again
    }
    await r.save();

    if (payBalance !== undefined) {
      if (payment) {
        payment.amount = finalTotal;
        payment.total = finalTotal;
        payment.receipt = { ...(payment.receipt || {}), total: finalTotal, paid: finalTotal };
      } else {
        const { receiptNo, bookingNo } = numbersFor(r._id);
        payment = new Payment({
          user: r.customer,
          customerName: r.customerName,
          amount: finalTotal,
          method: payBalance,
          transactionNo: receiptNo,
          reservation: r._id,
          receiptNo,
          bookingNo,
          total: finalTotal,
          receipt: await receiptFor(r, finalTotal, payBalance),
        });
      }
      logs.push(['Payment Recorded', `${who}: ₱${balance} via ${payBalance}`]);
    }
    if (payment) await payment.save();

    for (const [action, affected] of logs) await logAction(action, req.user, { affected });

    // the stay just became Completed: tell the customer (only if they have an email)
    if (status === 'completed') sendHotelEmail('completed', r, await UserModel.findById(r.customer).select('firstName lastName identifier email'));

    res.json({ reservation: serialize(r, payment) });
  } catch (err) {
    serverError(res, err);
  }
};

// GET /api/staff/rooms?date=YYYY-MM-DD      (staff and admin)
// Every room type, and who is in each slot on that day (default: today). Day Boarding slots can hold several stays.
const roomsOccupancy = async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayPH();
    const rows = await RoomReservation.find({
      active: true,
      $or: [{ cells: date }, { cells: { $regex: `^${date}@` } }],
    })
      .select('roomId slot petName customerName status checkInAt checkOutAt')
      .lean();

    const rooms = ROOM_TYPES.map((room) => {
      const mine = rows.filter((r) => r.roomId === room.id);
      const slots = Array.from({ length: room.maxPets }, (_, i) => {
        const here = mine.filter((r) => r.slot === i + 1);
        return {
          slot: i + 1,
          stays: here.map((r) => ({ _id: r._id, petName: r.petName, customerName: r.customerName, status: r.status, checkInAt: r.checkInAt, checkOutAt: r.checkOutAt || null })),
        };
      });
      const occupied = slots.filter((s) => s.stays.length > 0).length;
      return { id: room.id, name: room.name, kind: room.kind, maxPets: room.maxPets, occupied, free: room.maxPets - occupied, slots };
    });

    res.set('Cache-Control', 'no-store');
    res.json({ date, rooms });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = { listReservations, updateReservation, roomsOccupancy, serialize, receiptFor };