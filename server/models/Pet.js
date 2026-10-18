const mongoose = require('mongoose');

// one row per pet; "owner" is the Fur Parent (customer) the pet belongs to
const PetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    type: { type: String, required: true, enum: ['Dog', 'Cat'] },
    breed: { type: String, required: true, trim: true, maxlength: 50 },
    age: { type: Number, required: true, min: 0, max: 40 }, // in years
    weight: { type: Number, min: 0.1, max: 100 }, // in kg; grooming prices depend on it (older pets may not have one yet)
    gender: { type: String, required: true, enum: ['Male', 'Female'] },
    notes: { type: String, default: '', trim: true, maxlength: 300 }, // allergies, special care, etc.
    photo: { type: String, default: '' }, // small photo as a data URL (resized by the browser)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pet', PetSchema);