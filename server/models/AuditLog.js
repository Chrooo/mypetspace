const mongoose = require('mongoose');

// one row for every important thing that happens (shown in Audit Logs and Recent Activity)
const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // e.g. "New User Registered"
    details: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);