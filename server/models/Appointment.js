const mongoose = require('mongoose');

// A grooming appointment. The booking step will create these; the assigned groomer works on them.
// The customer's and the pet's details are copied in, so the groomer's list needs no extra lookups.
const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

// which status can follow which (completed and cancelled are final)
const NEXT = {
  pending: ['confirmed', 'in_progress', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const AppointmentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
    petName: { type: String, required: true },
    petType: { type: String, enum: ['Dog', 'Cat'], required: true },
    petBreed: { type: String, default: '' },
    petAge: { type: Number },
    petGender: { type: String, default: '' },
    petNotes: { type: String, default: '' }, // from the owner: allergies, special care
    services: { type: [String], required: true }, // e.g. ["Full Groom"] or ["Bath-Dry", "Nail Trimming"]
    groomer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    groomingNotes: { type: String, default: '', maxlength: 500 }, // written by the groomer
    completedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.id; delete ret.__v; return ret; } } }
);

AppointmentSchema.index({ groomer: 1, status: 1, scheduledAt: -1 });

// the statuses this appointment can move to next (sent to the browser so it shows the right buttons)
AppointmentSchema.virtual('nextStatuses').get(function () {
  return NEXT[this.status] || [];
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
module.exports.STATUSES = STATUSES;
module.exports.NEXT = NEXT;