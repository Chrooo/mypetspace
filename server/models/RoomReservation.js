const mongoose = require('mongoose');

// One hotel booking: one pet, in one slot of one room type, for a stay.
const STATUSES = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'];

const RoomReservationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    petName: { type: String, required: true },
    petType: { type: String, enum: ['Dog', 'Cat'], required: true },
    petBreed: { type: String, default: '' },

    roomId: { type: String, required: true }, // e.g. "dashing-deluxe" (see utils/rooms.js)
    roomName: { type: String, required: true },
    slot: { type: Number, required: true, min: 1 }, // 1 .. maxPets of that room type

    startDate: { type: String, required: true }, // "YYYY-MM-DD" check-in day
    endDate: { type: String, required: true }, // "YYYY-MM-DD" check-out day
    checkInAt: { type: Date, required: true }, // check-in day + the time the customer chose
        checkOutAt: { type: Date }, // check-out day + the time the customer chose
    hours: { type: Number }, // Day Boarding only
    nights: { type: Number, default: 0 },

    // the nights (or day-boarding hours) this booking occupies, see utils/rooms.js
    cells: { type: [String], required: true },

    status: { type: String, enum: STATUSES, default: 'pending' },
    // true while the booking holds its slot. Set it to false when a booking is cancelled or
    // completed, so the slot can be booked again.
    active: { type: Boolean, default: true },
    total: { type: Number, default: 0, min: 0 }, // in pesos
  },
  { timestamps: true }
);

// THE double-booking guard: the same room + slot + night/hour can only belong to ONE active booking.
// If two customers press Confirm at the same moment, the database rejects the second one.
RoomReservationSchema.index(
  { roomId: 1, slot: 1, cells: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
RoomReservationSchema.index({ pet: 1, active: 1 });

module.exports = mongoose.model('RoomReservation', RoomReservationSchema);
module.exports.STATUSES = STATUSES;