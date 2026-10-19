const crypto = require('crypto');
const mongoose = require('mongoose');
const UserModel = require('../models/User');
const PetModel = require('../models/Pet');
const Appointment = require('../models/Appointment');
const RoomReservation = require('../models/RoomReservation');
const Payment = require('../models/Payment');
const { logAction } = require('../utils/audit');
const { sendHotelEmail } = require('../utils/mailer');
const { cleanPet } = require('./petController');
const { cleanIdentifier, validate } = require('./authController');
const { hourFilter, findFreeGroomer, checkSlot, SERVICES, PACKAGES, FULL_MESSAGE: SLOT_FULL } = require('./appointmentController');
const { takenSlots, FULL_MESSAGE: ROOM_FULL } = require('./roomController');
const { receiptFor } = require('./staffReservationsController');
const { numbersFor } = require('./paymentsController');
const { findRoom, buildStay } = require('../utils/rooms');
const { groomingTotal } = require('../utils/pricing');

// Staff and admin book FOR a customer (walk-ins, phone calls). Same rules as the customer booking pages,
// but the customer and the pet are chosen by staff, a payment can be recorded on the spot (cash by default),
// and the booking starts as Confirmed because the shop is the one making it.
const METHODS = ['CASH', 'GCASH', 'MAYA', 'BANK'];

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};
const textPattern = (value) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// GET /api/staff/customers?search=     -> up to 15 customers with their pets (for the "Customer" drop-down)
const listCustomers = async (req, res) => {
  try {
    const filter = { role: 'customer' };
    const search = String(req.query.search || '').trim();
    if (search) {
      const text = textPattern(search);
      filter.$or = [{ firstName: text }, { lastName: text }, { identifier: text }];
    }
    const users = await UserModel.find(filter).sort({ firstName: 1, lastName: 1 }).limit(15);
    const pets = await PetModel.find({ owner: { $in: users.map((u) => u._id) } }).select('name type breed weight owner photo');
    res.json({
      customers: users.map((u) => ({
        _id: u._id,
        name: u.fullName,
        identifier: u.identifier,
        pets: pets.filter((p) => String(p.owner) === String(u._id)).map((p) => ({ _id: p._id, name: p.name, type: p.type, breed: p.breed, weight: p.weight })),
      })),
    });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /api/staff/customers     body: { firstName, lastName, identifier, pet: { name, type, breed, age, gender, notes } }
// Registers a walk-in customer (account + first pet). A temporary password is made and shown to staff ONCE,
// so the customer can log in later and see their bookings and receipts.
const createCustomer = async (req, res) => {
  try {
    const body = req.body || {};
    const tempPassword = `${crypto.randomBytes(4).toString('hex')}A1`; // 8 hex characters + a capital letter and a number
    const error = validate({ ...body, password: tempPassword });
    if (error) return res.status(400).json({ message: error });
    const petResult = cleanPet(body.pet);
    if (petResult.error) return res.status(400).json({ message: petResult.error });

    const identifier = cleanIdentifier(body.identifier);
    if (await UserModel.findOne({ identifier })) {
      return res.status(409).json({ message: 'This email or phone is already registered. Search for the customer instead.' });
    }

    const user = await UserModel.create({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      identifier,
      password: tempPassword,
      role: 'customer',
    });
    let pet;
    try {
      pet = await PetModel.create({ ...petResult.pet, owner: user._id });
    } catch (petErr) {
      await UserModel.deleteOne({ _id: user._id });
      throw petErr;
    }
    await logAction('Walk-in Customer Registered', req.user, { affected: user.fullName });
    res.status(201).json({
      customer: { _id: user._id, name: user.fullName, identifier, pets: [{ _id: pet._id, name: pet.name, type: pet.type, breed: pet.breed, weight: pet.weight }] },
      tempPassword,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// finds the customer and one of THEIR pets
const loadCustomerPet = async (customerId, petId) => {
  if (!mongoose.isValidObjectId(customerId)) return { error: [400, 'Choose a customer.'] };
  const customer = await UserModel.findOne({ _id: customerId, role: 'customer' });
  if (!customer) return { error: [404, 'Customer not found.'] };
  if (!mongoose.isValidObjectId(petId)) return { error: [400, 'Choose a pet.'] };
  const pet = await PetModel.findOne({ _id: petId, owner: customer._id });
  if (!pet) return { error: [404, 'Pet not found for this customer.'] };
  return { customer, pet };
};

// POST /api/staff/appointments
// body: { customerId, petId, services, date, time, groomerId?, total?, paymentMethod? }
// total = only needed when the price cannot be worked out (a package for a pet that has no weight yet).
//         Otherwise the price comes from the services and the pet's weight.
// paymentMethod ("CASH", ...) = the customer paid now. Leave it out to collect later.
const createAppointmentFor = async (req, res) => {
  try {
    const { customerId, petId, services, date, time, groomerId, total, paymentMethod } = req.body || {};
    const found = await loadCustomerPet(customerId, petId);
    if (found.error) return res.status(found.error[0]).json({ message: found.error[1] });
    const { customer, pet } = found;

    const list = Array.isArray(services) ? [...new Set(services.map(String))] : [];
    if (list.length === 0 || !list.every((n) => SERVICES.includes(n) || PACKAGES.includes(n)) || list.filter((n) => PACKAGES.includes(n)).length > 1) {
      return res.status(400).json({ message: 'Choose at least one service, or one package.' });
    }

    const slot = checkSlot(String(date || ''), String(time || ''));
    if (slot.error) return res.status(400).json({ message: slot.error });

    let amount = groomingTotal(list, pet.weight);
    if (!(amount > 0) && total !== undefined && total !== null && total !== '') {
      amount = Number(total);
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Enter a valid amount.' });
    }
    if (paymentMethod) {
      if (!METHODS.includes(paymentMethod)) return res.status(400).json({ message: 'Please choose how it was paid.' });
      if (!(amount > 0)) return res.status(400).json({ message: 'Enter the amount paid.' });
    }

    if (await Appointment.exists({ pet: pet._id, ...hourFilter(slot.at) })) {
      return res.status(409).json({ message: `${pet.name} already has an appointment at that time.` });
    }
    const groomer = await findFreeGroomer(slot.at, mongoose.isValidObjectId(groomerId) ? groomerId : null);
    if (!groomer) return res.status(409).json({ message: SLOT_FULL });

    const appointment = await Appointment.create({
      customer: customer._id,
      customerName: customer.fullName,
      pet: pet._id,
      petName: pet.name,
      petType: pet.type,
      petBreed: pet.breed,
      petAge: pet.age,
      petWeight: pet.weight,
      petGender: pet.gender,
      petNotes: pet.notes,
      services: list,
      groomer: groomer._id,
      scheduledAt: slot.at,
      status: 'confirmed',
      total: amount,
      ...(paymentMethod ? { paymentStatus: 'paid', paymentMethod, paidAt: new Date() } : {}),
    });

    await logAction('Appointment Booked by Staff', req.user, { affected: `${pet.name} (${customer.fullName})` });
    if (paymentMethod) await logAction('Payment Recorded', req.user, { affected: `${pet.name} (${customer.fullName}): ₱${amount} via ${paymentMethod}` });
    res.status(201).json({ appointment, groomerName: `${groomer.firstName} ${groomer.lastName}` });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /api/staff/reservations
// body: { customerId, petId, roomId, slot, start, end, time, outTime, price?, paymentMethod?, payment? }
// price      = Peak/Holiday only (the shop sets it)
// payment    = "full" | "half" (needs paymentMethod). Leave both out to collect later.
const createReservationFor = async (req, res) => {
  try {
    const { customerId, petId, roomId, slot, start, end, time, outTime, price, paymentMethod, payment } = req.body || {};
    const found = await loadCustomerPet(customerId, petId);
    if (found.error) return res.status(found.error[0]).json({ message: found.error[1] });
    const { customer, pet } = found;

    const room = findRoom(String(roomId || ''));
    if (!room) return res.status(400).json({ message: 'Choose a room type.' });
    const slotNo = Number(slot);
    if (!Number.isInteger(slotNo) || slotNo < 1 || slotNo > room.maxPets) return res.status(400).json({ message: 'Choose a slot.' });

    const stay = buildStay(room, { start: String(start || ''), end: String(end || ''), time, outTime }, true);
    if (stay.error) return res.status(400).json({ message: stay.error });

    let total = stay.total;
    if (room.price === null) {
      total = Number(price);
      if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ message: 'Enter the price of this Peak/Holiday stay.' });
    }

    let paid = 0;
    if (paymentMethod) {
      if (!METHODS.includes(paymentMethod)) return res.status(400).json({ message: 'Please choose how it was paid.' });
      if (!['full', 'half'].includes(payment)) return res.status(400).json({ message: 'Choose how much was paid.' });
      paid = payment === 'full' ? total : Math.round(total / 2);
    }

    if (await RoomReservation.exists({ pet: pet._id, active: true, cells: { $in: stay.cells } })) {
      return res.status(409).json({ message: `${pet.name} already has a room booked for these dates.` });
    }
    if ((await takenSlots(room, stay.cells)).has(slotNo)) return res.status(409).json({ message: ROOM_FULL });

    let reservation;
    try {
      reservation = await RoomReservation.create({
        customer: customer._id,
        customerName: customer.fullName,
        pet: pet._id,
        petName: pet.name,
        petType: pet.type,
        petBreed: pet.breed,
        roomId: room.id,
        roomName: room.name,
        slot: slotNo,
        startDate: start,
        endDate: end,
        checkInAt: stay.checkIn,
        checkOutAt: stay.checkOut,
        hours: stay.hours,
        nights: stay.nights,
        cells: stay.cells,
        total,
        status: 'confirmed',
      });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: ROOM_FULL });
      throw err;
    }

    let receiptNo = null;
    if (paymentMethod) {
      const numbers = numbersFor(reservation._id);
      receiptNo = numbers.receiptNo;
      await Payment.create({
        user: customer._id,
        customerName: customer.fullName,
        amount: paid,
        method: paymentMethod,
        transactionNo: receiptNo,
        reservation: reservation._id,
        receiptNo,
        bookingNo: numbers.bookingNo,
        total,
        receipt: await receiptFor(reservation, paid, paymentMethod, paid !== total ? paid : null),
      });
      await logAction('Payment Recorded', req.user, { affected: `${pet.name} (${customer.fullName}): ₱${paid} via ${paymentMethod}` });
    }

    await logAction('Room Booked by Staff', req.user, { affected: `${pet.name} (${customer.fullName}) - ${room.name} #${slotNo}` });
    sendHotelEmail('booked', reservation, customer);
    res.status(201).json({ reservation, receiptNo });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = { listCustomers, createCustomer, createAppointmentFor, createReservationFor };