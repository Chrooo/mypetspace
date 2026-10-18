import dayBoarding from '../assets/room-day-boarding.jpg';
import dashingDeluxe from '../assets/room-dashing-deluxe.jpg';
import robustRoom from '../assets/room-robust-room.jpg';
import robustKitty from '../assets/room-robust-kitty.jpg';
import royalKitty from '../assets/room-royal-kitty.jpg';
import coupleSuite from '../assets/room-couple-suite.jpg';
import fiveStar from '../assets/room-five-star.jpg';
import staycation from '../assets/room-staycation.jpg';
import peakHoliday from '../assets/room-peak-holiday.jpg';

// Every room a customer can pick on the "Room Type" booking step.
//   id        -> saved with the booking (keep it the same once bookings exist)
//   category  -> used by the Filter dropdown (same headings as the Rooms page)
//   price     -> number used for the Low-High sort and for totals (null = no fixed price)
//   unit      -> 'hour' for Day Boarding, 'night' for the rest
//   priceText -> the line shown on the card
//   kind      -> 'day' (Day Boarding: one day, by the hour) or 'night' (overnight stay)
//   maxPets   -> pets per room type = number of slots (squares) the customer can pick from
// To change a price or a description, edit it here. KEEP maxPets, prices and hours in sync with
// server/utils/rooms.js (the server is the one that checks them when a booking is saved).
export const ROOM_CATEGORIES = ['Boarding', 'Royal and Suite', 'Best-Seller'];

export const ROOM_OPTIONS = [
  {
    id: 'day-boarding',
    kind: 'day',
    maxPets: 5,
    name: 'Day Boarding',
    category: 'Boarding',
    price: 355,
    unit: 'hour',
    extraHour: 75,
    priceText: 'First 3 hours start at ₱355 + ₱75 per succeeding hour',
    img: dayBoarding,
  },
  {
    id: 'dashing-deluxe',
    kind: 'night',
    maxPets: 6,
    name: 'Dashing Deluxe',
    category: 'Boarding',
    price: 689,
    unit: 'night',
    priceText: '₱689/Overnight (fits up to Semi-Medium pets)',
    img: dashingDeluxe,
  },
  {
    id: 'robust-room',
    kind: 'night',
    maxPets: 4,
    name: 'Robust Room',
    category: 'Boarding',
    price: 889,
    unit: 'night',
    priceText: '₱889/Overnight (fits up to Large to Extra Large pets)',
    img: robustRoom,
  },
  {
    id: 'robust-kitty',
    kind: 'night',
    maxPets: 6,
    name: 'Robust Kitty',
    category: 'Royal and Suite',
    price: 789,
    unit: 'night',
    priceText: '₱789/Overnight',
    img: robustKitty,
  },
  {
    id: 'royal-kitty',
    kind: 'night',
    maxPets: 4,
    name: 'Royal Kitty',
    category: 'Royal and Suite',
    price: 689,
    unit: 'night',
    priceText: '₱689/Overnight (fits up to Semi-Medium pets)',
    img: royalKitty,
  },
  {
    id: 'couple-suite',
    kind: 'night',
    maxPets: 2,
    name: 'Couple Suite',
    category: 'Royal and Suite',
    price: 889,
    unit: 'night',
    priceText: '₱889/Overnight (fits up to Large to Extra Large pets)',
    img: coupleSuite,
  },
  {
    id: 'five-star',
    kind: 'night',
    maxPets: 4,
    name: 'Five Star',
    sub: '5 consecutive stay',
    category: 'Best-Seller',
    price: 669,
    unit: 'night',
    priceText: 'Starts at ₱669/Overnight. Includes FREE Quick Rinse Warm Bath.',
    img: fiveStar,
  },
  {
    id: 'staycation',
    kind: 'night',
    maxPets: 4,
    name: 'Staycation',
    sub: '15 consecutive stay',
    category: 'Best-Seller',
    price: 649,
    unit: 'night',
    priceText: 'Starts at ₱649/Overnight. Includes FREE Quick Rinse Warm Bath and Dry Cleansing Bathe.',
    img: staycation,
  },
  {
    id: 'peak-holiday',
    kind: 'night',
    maxPets: 5,
    name: 'Peak/Holiday',
    category: 'Best-Seller',
    price: null,
    unit: 'night',
    priceText: 'Surcharge Applies',
    img: peakHoliday,
  },
];

// ---------- times a customer can choose (same hours as server/utils/rooms.js) ----------
export const OPEN_HOUR = 7;          // earliest check-in / day boarding start
export const LAST_CHECKIN_HOUR = 19; // latest overnight check-in
export const CLOSE_HOUR = 20;        // day boarding must end by 8:00 pm
export const MIN_DAY_HOURS = 3;
export const MAX_DAY_HOURS = 10;

export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
export const timeValue = (h) => `${String(h).padStart(2, '0')}:00`;

// the choices on the Select Slot step
export const checkInHours = (room) => {
  const last = room.kind === 'day' ? CLOSE_HOUR - MIN_DAY_HOURS : LAST_CHECKIN_HOUR;
  return Array.from({ length: last - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i);
};

export const findRoom = (id) => ROOM_OPTIONS.find((r) => r.id === id) || null;

// price of a stay. nights = number of nights, hours = Day Boarding hours. null = no fixed price.
export const stayTotal = (room, nights, hours) => {
  if (room.price === null) return null;
  if (room.kind === 'day') return room.price + room.extraHour * Math.max((hours || MIN_DAY_HOURS) - MIN_DAY_HOURS, 0);
  return room.price * nights;
};