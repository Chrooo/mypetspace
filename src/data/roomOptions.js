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
//   desc, amenities -> the text on the left of the Slots section
//   priceText -> the line shown on the card
//   kind      -> 'day' (Day Boarding: one day, by the hour) or 'night' (overnight stay)
//   maxPets   -> pets per room type = number of slots (squares) the customer can pick from
// To change a price or a description, edit it here. KEEP maxPets, prices and hours in sync with
// server/utils/rooms.js (the server is the one that checks them when a booking is saved).
export const ROOM_CATEGORIES = ['Boarding', 'Royal and Suite', 'Best-Seller'];

export const ROOM_OPTIONS = [
  {
    id: 'day-boarding',
    desc: 'A comfortable daytime stay for pets who need a safe and welcoming place while their owners are away. Perfect for short visits, playtime, relaxation, and supervised care throughout the day.',
    amenities: ["Comfortable resting area", "Supervised daytime stay", "Clean and pet-friendly environment", "Feeding according to the owner's instructions", "Optional pet grooming and salon services"],
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
    desc: 'A cozy overnight room for small to semi-medium pets, with a soft bed, fresh air and caring staff keeping watch through the night.',
    amenities: ["Air-conditioned room", "Comfortable bed", "Play area access", "24/7 CCTV monitoring", "Feeding according to the owner's instructions"],
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
    desc: 'A spacious overnight room made for large to extra large pets who need extra space to stretch, rest and feel at home.',
    amenities: ["Air-conditioned room", "Extra-roomy comfortable bed", "Play area access", "24/7 CCTV monitoring", "Feeding according to the owner's instructions"],
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
    desc: 'A calm, roomy overnight space designed for cats, with a quiet corner to relax and plenty of room to climb and lounge.',
    amenities: ["Air-conditioned room", "Comfortable bed and lounging area", "Quiet, cat-friendly environment", "24/7 CCTV monitoring", "Feeding according to the owner's instructions"],
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
    desc: 'A cozy overnight suite for cats and small to semi-medium pets, with a soft bed and a peaceful, clean environment.',
    amenities: ["Air-conditioned room", "Comfortable bed", "Clean and pet-friendly environment", "24/7 CCTV monitoring", "Feeding according to the owner's instructions"],
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
    desc: 'A generous suite for two large to extra large pets who love to stay together, with room for both to rest and play.',
    amenities: ["Air-conditioned suite", "Comfortable beds for two", "Play area access", "24/7 CCTV monitoring", "Feeding according to the owner's instructions"],
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
    desc: 'Our best-seller for longer stays: a comfortable overnight room with a special rate when your pet stays 5 consecutive nights.',
    amenities: ["Air-conditioned room", "Comfortable bed", "FREE Quick Rinse Warm Bath", "Play area access", "24/7 CCTV monitoring"],
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
    desc: 'The best value for extended stays: a comfortable overnight room with a special rate when your pet stays 15 consecutive nights.',
    amenities: ["Air-conditioned room", "Comfortable bed", "FREE Quick Rinse Warm Bath", "FREE Dry Cleansing Bathe", "24/7 CCTV monitoring"],
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
    desc: 'A comfortable overnight room for holidays and peak seasons, when special rates and a surcharge apply.',
    amenities: ["Air-conditioned room", "Comfortable bed", "Play area access", "24/7 CCTV monitoring", "Surcharge applies on holidays and peak seasons"],
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
export const MAX_DAY_HOURS = 12;

// the check-in and check-out times offered in the Slots section
export const CHOICE_HOURS = [7, 10, 13, 16, 19];

export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
export const timeValue = (h) => `${String(h).padStart(2, '0')}:00`;

export const findRoom = (id) => ROOM_OPTIONS.find((r) => r.id === id) || null;

// price of a stay. nights = number of nights, hours = Day Boarding hours. null = no fixed price.
export const stayTotal = (room, nights, hours) => {
  if (room.price === null) return null;
  if (room.kind === 'day') return room.price + room.extraHour * Math.max((hours || MIN_DAY_HOURS) - MIN_DAY_HOURS, 0);
  return room.price * nights;
};