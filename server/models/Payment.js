const mongoose = require('mongoose');

// One row per payment of a hotel booking.
// Placeholder: nothing creates payments yet. The booking/payment step will save them here.
const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true }, // in pesos
    method: { type: String, enum: ['GCASH', 'MAYA', 'BANK', 'CASH'], required: true }, // MOP
    transactionNo: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);