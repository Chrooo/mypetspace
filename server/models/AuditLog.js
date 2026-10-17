const mongoose = require('mongoose');

// one row for every important thing that happens (shown in Audit Logs)
const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // "Login attempt", "Created new account", "Registered new account"
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who did it
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: '' }, // admin, staff, groomer or customer
    affected: { type: String, default: '' }, // who it was done to (e.g. the new account's name)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);