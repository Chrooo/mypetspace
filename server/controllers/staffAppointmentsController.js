const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const { STATUSES, NEXT } = require('../models/Appointment');
const UserModel = require('../models/User');
const { logAction } = require('../utils/audit');

const LABELS = { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
const METHODS = ['GCASH', 'MAYA', 'BANK', 'CASH'];

const paging = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

const textPattern = (value) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// ?date=2026-03-01 -> that whole day in Philippine time, or null
const dayRange = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const from = new Date(`${date}T00:00:00+08:00`);
  const to = new Date(`${date}T23:59:59.999+08:00`);
  return isNaN(from) || isNaN(to) ? null : { $gte: from, $lte: to };
};

const refOf = (prefix, id) => `${prefix}-${String(id).slice(-8).toUpperCase()}`;

// GET /api/staff/appointments?status=&date=&search=&page=&pageSize=   (staff and admin)
// Operations view: the grooming schedule, who is grooming, and where each job is at.
const listAppointments = async (req, res) => {
  try {
    const { page, pageSize, skip } = paging(req.query);
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (['paid', 'unpaid'].includes(req.query.payment)) filter.paymentStatus = req.query.payment;
    const range = dayRange(req.query.date);
    if (range) filter.scheduledAt = range;
    if (req.query.search && req.query.search.trim()) {
      const text = textPattern(req.query.search);
      filter.$or = [{ customerName: text }, { petName: text }, { services: text }];
    }

    const [rows, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ scheduledAt: range ? 1 : -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('groomer', 'firstName lastName'),
      Appointment.countDocuments(filter),
    ]);

    const appointments = rows.map((a) => {
      const item = a.toJSON();
      item.groomerName = a.groomer ? `${a.groomer.firstName} ${a.groomer.lastName}` : '';
      item.groomer = a.groomer ? a.groomer._id : null;
      return item;
    });
    res.json({ appointments, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/staff/groomers  - for the "assign a groomer" drop-down
const listGroomers = async (req, res) => {
  try {
    const groomers = await UserModel.find({ role: 'groomer' }).sort({ firstName: 1 });
    res.json({ groomers: groomers.map((g) => ({ _id: g._id, name: `${g.firstName} ${g.lastName}` })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// PUT /api/staff/appointments/:id   body: { status?, groomer? }
const updateAppointment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Appointment not found.' });
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

    const { status, groomer } = req.body || {};
    if (status === undefined && groomer === undefined) return res.status(400).json({ message: 'Nothing to update.' });

    const who = `${appointment.petName} (${appointment.customerName})`;
    const logs = [];

    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'That is not a valid status.' });
      if (!NEXT[appointment.status].includes(status)) {
        return res.status(400).json({ message: `A ${LABELS[appointment.status]} appointment cannot be changed to ${LABELS[status]}.` });
      }
      logs.push(['Appointment Status Updated', `${who}: ${LABELS[appointment.status]} → ${LABELS[status]}`]);
      appointment.status = status;
      if (status === 'completed') appointment.completedAt = new Date();
    }

    if (groomer !== undefined) {
      if (['completed', 'cancelled'].includes(appointment.status)) {
        return res.status(400).json({ message: `The groomer of a ${LABELS[appointment.status]} appointment cannot be changed.` });
      }
      const g = mongoose.isValidObjectId(groomer) ? await UserModel.findOne({ _id: groomer, role: 'groomer' }) : null;
      if (!g) return res.status(400).json({ message: 'Please choose a valid groomer.' });
      if (String(appointment.groomer) !== String(g._id)) {
        logs.push(['Groomer Assigned', `${who}: ${g.firstName} ${g.lastName}`]);
        appointment.groomer = g._id;
      }
    }

    await appointment.save();
    for (const [action, affected] of logs) await logAction(action, req.user, { affected });
    res.json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// PUT /api/staff/bookings/:id/payment   body: { method, total?, confirm? }   (grooming bookings)
//   total   -> the amount; the booking already has one worked out from the pet's weight, staff can correct it
//   confirm -> also move a Pending booking to Confirmed (the Confirm button asks for the payment first)
const recordPayment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Booking not found.' });
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Booking not found.' });
    if (appointment.paymentStatus === 'paid') return res.status(400).json({ message: 'This booking is already paid.' });
    if (appointment.status === 'cancelled') return res.status(400).json({ message: 'A cancelled booking cannot be paid.' });

    const { method, total, confirm } = req.body || {};
    if (!METHODS.includes(method)) return res.status(400).json({ message: 'Please choose how it was paid.' });
    if (total !== undefined) {
      const amount = Number(total);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Enter an amount above zero.' });
      appointment.total = amount;
    }
    if (!(appointment.total > 0)) return res.status(400).json({ message: 'Enter the amount paid.' });

    appointment.paymentStatus = 'paid';
    appointment.paymentMethod = method;
    appointment.paidAt = new Date();
    const confirmed = confirm === true && appointment.status === 'pending';
    if (confirmed) appointment.status = 'confirmed';
    await appointment.save();

    await logAction('Payment Recorded', req.user, {
      affected: `${appointment.petName} (${appointment.customerName}): ₱${appointment.total} via ${method}`,
    });
    if (confirmed) {
      await logAction('Appointment Status Updated', req.user, { affected: `${appointment.petName} (${appointment.customerName}): Pending → Confirmed` });
    }
    res.json({ booking: { _id: appointment._id, total: appointment.total, status: appointment.status, paymentStatus: 'paid', paymentMethod: method } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { listAppointments, listGroomers, updateAppointment, recordPayment };