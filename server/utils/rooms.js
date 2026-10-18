// The hotel rooms, how many pets each type holds, and the rules for working out which
// "cells" a stay occupies. A cell is one unit of time in one slot that only ONE booking can have:
//   overnight rooms  -> one cell per NIGHT            "2026-10-20"
//   Day Boarding     -> one cell per HOUR of the day  "2026-10-20@09"
// The booking is stopped from double-booking by the database itself (unique index on
// room + slot + cell, see models/RoomReservation.js), not only by a check in the code.
//
// KEEP IN SYNC with src/data/roomOptions.js (same ids, maxPets and hours).
const { slotMoment, isValidDate } = require('./slots');

const OPEN_HOUR = 7; // earliest check-in / day boarding start
const LAST_CHECKIN_HOUR = 19; // latest overnight check-in
const CLOSE_HOUR = 20; // day boarding must end by 8:00 pm
const MIN_DAY_HOURS = 3;
const MAX_DAY_HOURS = 12;
const MAX_NIGHTS = 30;

// maxPets = number of slots (squares) in that room type, one pet per slot
const ROOM_TYPES = [
  { id: 'day-boarding', name: 'Day Boarding', kind: 'day', maxPets: 5, price: 355, extraHour: 75 },
  { id: 'dashing-deluxe', name: 'Dashing Deluxe', kind: 'night', maxPets: 6, price: 689 },
  { id: 'robust-room', name: 'Robust Room', kind: 'night', maxPets: 4, price: 889 },
  { id: 'robust-kitty', name: 'Robust Kitty', kind: 'night', maxPets: 6, price: 789 },
  { id: 'royal-kitty', name: 'Royal Kitty', kind: 'night', maxPets: 4, price: 689 },
  { id: 'couple-suite', name: 'Couple Suite', kind: 'night', maxPets: 2, price: 889 },
  { id: 'five-star', name: 'Five Star', kind: 'night', maxPets: 4, price: 669 },
  { id: 'staycation', name: 'Staycation', kind: 'night', maxPets: 4, price: 649 },
  { id: 'peak-holiday', name: 'Peak/Holiday', kind: 'night', maxPets: 5, price: null },
];

const findRoom = (id) => ROOM_TYPES.find((r) => r.id === id) || null;
const pad = (n) => String(n).padStart(2, '0');

// "2026-10-20" + 1 -> "2026-10-21"
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayDiff = (start, end) => Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000);

// today in Philippine time, as "YYYY-MM-DD"
const todayPH = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const hourOf = (time) => {
  const m = /^(\d{2}):00$/.exec(String(time || ''));
  return m ? Number(m[1]) : null;
};

// Works out what a stay takes up.
// strict = false -> only the dates matter (used to show which rooms still have space)
// strict = true  -> the check-in and check-out times are checked too (slots pop-up and saving)
// time = check-in "HH:00", outTime = check-out "HH:00"
// returns { error } or { cells, nights, hours, checkIn, checkOut, total }
const buildStay = (room, { start, end, time, outTime }, strict) => {
  if (!isValidDate(start) || !isValidDate(end)) return { error: 'Choose your check-in and check-out dates.' };
  if (start < todayPH()) return { error: 'That date has already passed. Please choose another date.' };

  if (room.kind === 'day') {
    if (start !== end) return { error: 'Day Boarding is for a single day. Choose the same check-in and check-out date.' };
    if (!strict) return { cells: [], nights: 0 };

    const from = hourOf(time);
    const to = hourOf(outTime);
    if (from === null || from < OPEN_HOUR || from > LAST_CHECKIN_HOUR) return { error: 'Choose a check-in time.' };
    if (to === null || to < OPEN_HOUR || to > CLOSE_HOUR) return { error: 'Choose a check-out time.' };
    const len = to - from;
    if (len < MIN_DAY_HOURS || len > MAX_DAY_HOURS) {
      return { error: `Day Boarding is ${MIN_DAY_HOURS} to ${MAX_DAY_HOURS} hours. Choose a later check-out time.` };
    }

    const cells = [];
    for (let h = from; h < to; h += 1) cells.push(`${start}@${pad(h)}`);
    const checkIn = slotMoment(start, `${pad(from)}:00`);
    if (checkIn.getTime() <= Date.now()) return { error: 'That time has already passed. Please choose another time.' };
    return {
      cells, nights: 0, hours: len, checkIn, checkOut: slotMoment(end, `${pad(to)}:00`),
      total: room.price + room.extraHour * (len - MIN_DAY_HOURS),
    };
  }

  // overnight rooms: the nights are check-in day up to (not including) check-out day
  const nights = dayDiff(start, end);
  if (nights < 1) return { error: 'Choose at least 1 night: check-out must be after check-in.' };
  if (nights > MAX_NIGHTS) return { error: `You can book up to ${MAX_NIGHTS} nights at a time.` };
  const cells = Array.from({ length: nights }, (_, i) => addDays(start, i));
  const total = room.price === null ? 0 : room.price * nights;
  if (!strict) return { cells, nights, total };

  const from = hourOf(time);
  const to = hourOf(outTime);
  if (from === null || from < OPEN_HOUR || from > LAST_CHECKIN_HOUR) return { error: 'Choose a check-in time.' };
  if (to === null || to < OPEN_HOUR || to > CLOSE_HOUR) return { error: 'Choose a check-out time.' };
  const checkIn = slotMoment(start, `${pad(from)}:00`);
  if (checkIn.getTime() <= Date.now()) return { error: 'That time has already passed. Please choose another time.' };
  return { cells, nights, checkIn, checkOut: slotMoment(end, `${pad(to)}:00`), total };
};

// Day Boarding: is there any slot-hour run of MIN_DAY_HOURS free? (takenHours = hours already booked)
const hasFreeWindow = (takenHours) => {
  let run = 0;
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
    run = takenHours.has(h) ? 0 : run + 1;
    if (run >= MIN_DAY_HOURS) return true;
  }
  return false;
};

module.exports = {
  ROOM_TYPES, findRoom, buildStay, hasFreeWindow, addDays, dayDiff, todayPH,
  OPEN_HOUR, LAST_CHECKIN_HOUR, CLOSE_HOUR, MIN_DAY_HOURS, MAX_DAY_HOURS,
};