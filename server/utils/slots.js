// The shop's bookable time slots and how many bookings each one can take.
const TZ_OFFSET = '+08:00'; // Philippine time
const MAX_PER_SLOT = 2; // 2 groomers, so 2 appointments per time slot
const HOUR = 60 * 60 * 1000;

const SLOTS = [
  { time: '06:00', label: '6:00 am' },
  { time: '07:00', label: '7:00 am' },
  { time: '08:00', label: '8:00 am' },
  { time: '09:00', label: '9:00 am' },
  { time: '10:00', label: '10:00 am' },
  { time: '11:00', label: '11:00 am' },
  { time: '14:00', label: '2:00 pm' },
  { time: '15:00', label: '3:00 pm' },
];

// date = "YYYY-MM-DD", time = "HH:mm"  ->  the exact moment (a Date) in Philippine time
const slotMoment = (date, time) => new Date(`${date}T${time}:00${TZ_OFFSET}`);

const isValidDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(slotMoment(value, '00:00').getTime());

module.exports = { SLOTS, MAX_PER_SLOT, HOUR, slotMoment, isValidDate };