const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const { STATUSES, NEXT } = require('../models/Appointment');
const { logAction } = require('../utils/audit');

const LABELS = { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

// GET /api/groomer/appointments?status=pending&page=1&pageSize=10  (groomer only)
// Only the appointments assigned to the logged-in groomer.
const listMyAppointments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const filter = { groomer: req.user._id };
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ scheduledAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Appointment.countDocuments(filter),
    ]);
    res.json({ appointments, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// PUT /api/groomer/appointments/:id  (groomer only)  body: { status?, groomingNotes? }
// Change the status and/or write the grooming notes of one of YOUR appointments.
const updateMyAppointment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Appointment not found.' });
    const appointment = await Appointment.findOne({ _id: req.params.id, groomer: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

    const { status, groomingNotes } = req.body || {};
    if (status === undefined && groomingNotes === undefined) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    let statusChange = null;
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'That is not a valid status.' });
      if (!NEXT[appointment.status].includes(status)) {
        return res.status(400).json({
          message: `A ${LABELS[appointment.status]} appointment cannot be changed to ${LABELS[status]}.`,
        });
      }
      statusChange = `${LABELS[appointment.status]} → ${LABELS[status]}`;
      appointment.status = status;
      if (status === 'completed') appointment.completedAt = new Date();
    }

    let notesChanged = false;
    if (groomingNotes !== undefined) {
      const notes = String(groomingNotes).trim();
      if (notes.length > 500) return res.status(400).json({ message: 'Grooming notes can be up to 500 characters.' });
      notesChanged = notes !== appointment.groomingNotes;
      appointment.groomingNotes = notes;
    }

    await appointment.save();

    const who = `${appointment.petName} (${appointment.customerName})`;
    if (statusChange) {
      const action = appointment.status === 'completed' ? 'Grooming Completed' : 'Appointment Status Updated';
      await logAction(action, req.user, { affected: `${who}: ${statusChange}` });
    }
    if (notesChanged) await logAction('Grooming Notes Updated', req.user, { affected: who });

    res.json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { listMyAppointments, updateMyAppointment };