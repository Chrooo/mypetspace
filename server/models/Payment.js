const mongoose = require('mongoose');

// One row per payment.
//  - Hotel stays: saved from the Receipt page right after "Pay Now" (see controllers/paymentsController.js).
//    These rows carry the booking they belong to and a copy of the receipt, so the receipt can be opened again later.
//  - Rows without a reservation are older / manual entries.
const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true }, // in pesos: what was paid in THIS payment
    method: { type: String, enum: ['GCASH', 'MAYA', 'BANK', 'CASH', 'CARD'], required: true }, // MOP
    transactionNo: { type: String, default: '' },

    // hotel stay payments only
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomReservation' },
    receiptNo: { type: String }, // e.g. "r-1234567890" (the number in the receipt page address)
    bookingNo: { type: String }, // e.g. "b-123456789012345"
    total: { type: Number, default: null }, // price of the whole stay, null = the shop has not set it yet
    receipt: { type: mongoose.Schema.Types.Mixed }, // what the receipt page shows
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ user: 1, createdAt: -1 });
// a booking has one payment record, and a receipt number belongs to one payment
PaymentSchema.index({ reservation: 1 }, { unique: true, partialFilterExpression: { reservation: { $type: 'objectId' } } });
PaymentSchema.index({ receiptNo: 1 }, { unique: true, partialFilterExpression: { receiptNo: { $type: 'string' } } });

module.exports = mongoose.model('Payment', PaymentSchema);