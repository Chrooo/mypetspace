const mongoose = require('mongoose');
const RoomReservation = require('../models/RoomReservation');
const PetModel = require('../models/Pet');
const { logAction } = require('../utils/audit');
const { sendHotelEmail } = require('../utils/mailer');
const { ROOM_TYPES, findRoom, buildStay, hasFreeWindow } = require('../utils/rooms');

const FULL_MESSAGE = 'That slot was just booked by someone else. Please choose another slot.';
const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};

// the slot numbers of a room type that are taken: for the given cells (nights / hours)
const takenSlots = async (room, cells) => {
  if (cells.length === 0) return new Set();
  const rows = await RoomReservation.find({ roomId: room.id, active: true, cells: { $in: cells } }).select('slot');
  return new Set(rows.map((r) => r.slot));
};

// GET /api/rooms/availability                       -> every room type with its size
// GET /api/rooms/availability?start=...&end=...     -> also how many slots are free for those dates
// A room type with free = 0 is FULL and cannot be chosen.
const getAvailability = async (req, res) => {
  try {
    const start = String(req.query.start || '');
    const end = String(req.query.end || '');

    if (!start && !end) {
      return res.json({ rooms: ROOM_TYPES.map((r) => ({ id: r.id, maxPets: r.maxPets, free: r.maxPets })) });
    }

    const rooms = await Promise.all(
      ROOM_TYPES.map(async (room) => {
        const stay = buildStay(room, { start, end }, false);
        if (stay.error) return { id: room.id, maxPets: room.maxPets, free: 0, reason: stay.error };

        if (room.kind === 'night') {
          const taken = await takenSlots(room, stay.cells);
          return { id: room.id, maxPets: room.maxPets, free: room.maxPets - taken.size };
        }

        // Day Boarding: a slot still counts as free while it has a free run of 3 hours that day
        const rows = await RoomReservation.find({ roomId: room.id, active: true, cells: { $regex: `^${start}@` } }).select('slot cells');
        const bySlot = new Map();
        rows.forEach((r) => {
          const set = bySlot.get(r.slot) || new Set();
          r.cells.filter((c) => c.startsWith(`${start}@`)).forEach((c) => set.add(Number(c.slice(-2))));
          bySlot.set(r.slot, set);
        });
        let free = 0;
        for (let s = 1; s <= room.maxPets; s += 1) if (hasFreeWindow(bySlot.get(s) || new Set())) free += 1;
        return { id: room.id, maxPets: room.maxPets, free };
      })
    );
    res.json({ rooms });
  } catch (err) {
    serverError(res, err);
  }
};

// GET /api/rooms/slots?roomId=dashing-deluxe&start=2026-10-20&end=2026-10-22[&time=09:00&hours=4]
// Every slot (square) of one room type and whether it is already booked for that stay.
// Day Boarding needs time and hours, because the same slot can be booked again at another hour.
const getSlots = async (req, res) => {
  try {
    const room = findRoom(String(req.query.roomId || ''));
    if (!room) return res.status(404).json({ message: 'Room type not found.' });

    const { start, end, time, outTime } = req.query;
    const stay = buildStay(room, { start: String(start || ''), end: String(end || ''), time, outTime }, room.kind === 'day');
    if (stay.error) return res.status(400).json({ message: stay.error });

    const taken = await takenSlots(room, stay.cells);
    const slots = Array.from({ length: room.maxPets }, (_, i) => ({ slot: i + 1, taken: taken.has(i + 1) }));
    res.json({ roomId: room.id, maxPets: room.maxPets, free: room.maxPets - taken.size, slots });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /api/rooms/reservations
// body: { petId, roomId, slot, start, end, time, hours? }
const createReservation = async (req, res) => {
  try {
        const { petId, roomId, slot, start, end, time, outTime } = req.body || {};

    if (!mongoose.isValidObjectId(petId)) return res.status(400).json({ message: 'Choose a pet.' });
    const pet = await PetModel.findOne({ _id: petId, owner: req.user._id }); // only YOUR pets
    if (!pet) return res.status(404).json({ message: 'Pet not found.' });

    const room = findRoom(String(roomId || ''));
    if (!room) return res.status(400).json({ message: 'Choose a room type.' });

    const slotNo = Number(slot);
    if (!Number.isInteger(slotNo) || slotNo < 1 || slotNo > room.maxPets) {
      return res.status(400).json({ message: 'Choose a slot.' });
    }

        const stay = buildStay(room, { start: String(start || ''), end: String(end || ''), time, outTime }, true);
    if (stay.error) return res.status(400).json({ message: stay.error });

    // the same pet cannot be in two rooms at the same time
    const petBusy = await RoomReservation.exists({ pet: pet._id, active: true, cells: { $in: stay.cells } });
    if (petBusy) return res.status(409).json({ message: `${pet.name} already has a room booked for these dates.` });

    // friendly check first ...
    const taken = await takenSlots(room, stay.cells);
    if (taken.has(slotNo)) return res.status(409).json({ message: FULL_MESSAGE });

    // ... and the unique index is the real guard if two people confirm at the same moment
    let reservation;
    try {
      reservation = await RoomReservation.create({
        customer: req.user._id,
        customerName: req.user.fullName,
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
        total: stay.total,
      });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: FULL_MESSAGE });
      throw err;
    }

    await logAction('Room Booked', req.user, { affected: `${pet.name} - ${room.name} #${slotNo}` });
    sendHotelEmail('booked', reservation, req.user); // not awaited: the booking never waits for the email
    res.status(201).json({ reservation });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = { getAvailability, getSlots, createReservation, takenSlots, FULL_MESSAGE };