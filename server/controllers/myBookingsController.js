const Appointment = require('../models/Appointment');
const RoomReservation = require('../models/RoomReservation');

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
});

const fromReservation = (r) => ({
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
});

// GET /api/my/bookings?page=1&pageSize=5      (customer only)
// Every booking the logged-in customer made: hotel reservations and grooming appointments in ONE list,
// newest booking first. Read straight from the database on every call, so it is always current.
const listMyBookings = async (req, res) => {
  try {
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
    const wanted = Math.max(1, parseInt(req.query.page, 10) || 1);

    const [appointments, reservations] = await Promise.all([
      Appointment.find({ customer: req.user._id })
        .select('-petNotes -groomingNotes -__v')
        .populate('groomer', 'firstName lastName')
        .lean(),
      RoomReservation.find({ customer: req.user._id }).select('-cells -__v').lean(),
    ]);

    const all = [...appointments.map(fromAppointment), ...reservations.map(fromReservation)].sort(
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

module.exports = { listMyBookings };