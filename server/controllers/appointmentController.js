const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const PetModel = require('../models/Pet');
const UserModel = require('../models/User');
const { logAction } = require('../utils/audit');
const { SLOTS, MAX_PER_SLOT, HOUR, slotMoment, isValidDate } = require('../utils/slots');

// the names the booking page can send (same names the groomer pages use)
const SERVICES = ['Bath-Dry', 'Tear Strain', 'Eye Cleaning', 'Nail Trimming', 'Ear Cleaning', 'Dematting'];
const PACKAGES = ['Basic Groom', 'Full Groom', 'Groom & Massage'];

// appointments (not cancelled) that sit in the hour starting at "at"
const hourFilter = (at) => ({
  scheduledAt: { $gte: at, $lt: new Date(at.getTime() + HOUR) },
  status: { $ne: 'cancelled' },
});

// the first groomer with nothing booked in that hour (preferId is tried first)
// returns null when the slot is full (2 appointments, or every groomer is busy)
const findFreeGroomer = async (at, preferId) => {
  const [groomers, busy] = await Promise.all([
    UserModel.find({ role: 'groomer' }).sort({ _id: 1 }),
    Appointment.distinct('groomer', hourFilter(at)),
  ]);
  if (busy.length >= MAX_PER_SLOT) return null;
  const busyIds = new Set(busy.map(String));
  const free = groomers.filter((g) => !busyIds.has(String(g._id)));
  return free.find((g) => String(g._id) === String(preferId)) || free[0] || null;
};

// checks a date ("YYYY-MM-DD") and a time ("09:00") -> { at } or { error }
const checkSlot = (date, time) => {
  if (!isValidDate(date) || !SLOTS.some((s) => s.time === time)) return { error: 'Choose a valid date and time.' };
  const at = slotMoment(date, time);
  if (at.getTime() <= Date.now()) return { error: 'That time has already passed. Please choose another time.' };
  return { at };
};

const FULL_MESSAGE = 'That time slot is full. Please choose another time.';
const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};

// GET /api/appointments/availability?date=2026-10-20
// Every time slot of that day. A slot is "full" when it has as many bookings as groomers (2 at most).
const getAvailability = async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!isValidDate(date)) return res.status(400).json({ message: 'Choose a valid date.' });

    const dayStart = slotMoment(date, '00:00');
    const dayEnd = new Date(dayStart.getTime() + 24 * HOUR);
    const [booked, groomerCount] = await Promise.all([
      Appointment.find({ scheduledAt: { $gte: dayStart, $lt: dayEnd }, status: { $ne: 'cancelled' } }).select('scheduledAt'),
      UserModel.countDocuments({ role: 'groomer' }),
    ]);
    const capacity = Math.min(MAX_PER_SLOT, groomerCount);

    const now = Date.now();
    const slots = SLOTS.map((s) => {
      const start = slotMoment(date, s.time).getTime();
      const taken = booked.filter((a) => {
        const t = a.scheduledAt.getTime();
        return t >= start && t < start + HOUR;
      }).length;
      return {
        time: s.time,
        label: s.label,
        booked: taken,
        capacity,
        full: taken >= capacity,
        past: start <= now, // a slot that has already started today
      };
    });

    res.json({ date, slots });
  } catch (err) {
    serverError(res, err);
  }
};

// GET /api/appointments/assignment?date=2026-10-20&time=09:00
// Which groomer would get this booking (shown on the Confirmation page before the customer confirms).
const getAssignment = async (req, res) => {
  try {
    const slot = checkSlot(String(req.query.date || ''), String(req.query.time || ''));
    if (slot.error) return res.status(400).json({ message: slot.error });

    const groomer = await findFreeGroomer(slot.at);
    if (!groomer) return res.status(409).json({ message: FULL_MESSAGE });
    res.json({ groomer: { id: groomer._id, name: `${groomer.firstName} ${groomer.lastName}` } });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /api/appointments
// body: { petId, services: ["Full Groom"], date: "2026-10-20", time: "09:00", groomerId? }
// Saves the grooming appointment for the logged-in user's own pet (status starts as "pending").
const createAppointment = async (req, res) => {
  try {
    const { petId, services, date, time, groomerId } = req.body || {};

    if (!mongoose.isValidObjectId(petId)) return res.status(400).json({ message: 'Choose a pet.' });
    const pet = await PetModel.findOne({ _id: petId, owner: req.user._id }); // only YOUR pets
    if (!pet) return res.status(404).json({ message: 'Pet not found.' });

    const list = Array.isArray(services) ? [...new Set(services.map(String))] : [];
    const validNames = list.every((n) => SERVICES.includes(n) || PACKAGES.includes(n));
    if (list.length === 0 || !validNames || list.filter((n) => PACKAGES.includes(n)).length > 1) {
      return res.status(400).json({ message: 'Choose at least one service, or one package.' });
    }

    const slot = checkSlot(String(date || ''), String(time || ''));
    if (slot.error) return res.status(400).json({ message: slot.error });
    // the same pet cannot have two appointments in the same hour
    const petBusy = await Appointment.exists({ pet: pet._id, ...hourFilter(slot.at) });
    if (petBusy) return res.status(409).json({ message: `${pet.name} already has an appointment at that time.` });
    // checked again here, in case the slot filled up while the customer was confirming
    const groomer = await findFreeGroomer(slot.at, mongoose.isValidObjectId(groomerId) ? groomerId : null);
    if (!groomer) return res.status(409).json({ message: FULL_MESSAGE });

    const appointment = await Appointment.create({
      customer: req.user._id,
      customerName: req.user.fullName,
      pet: pet._id,
      petName: pet.name,
      petType: pet.type,
      petBreed: pet.breed,
      petAge: pet.age,
      petGender: pet.gender,
      petNotes: pet.notes,
      services: list,
      groomer: groomer._id,
      scheduledAt: slot.at,
    });

    await logAction('Appointment Booked', req.user, { affected: pet.name });
    res.status(201).json({ appointment, groomerName: `${groomer.firstName} ${groomer.lastName}` });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = { getAvailability, getAssignment, createAppointment, hourFilter, findFreeGroomer, checkSlot, SERVICES, PACKAGES, FULL_MESSAGE };