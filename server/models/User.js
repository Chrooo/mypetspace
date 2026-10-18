const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    identifier: { type: String, required: true, unique: true }, // email OR phone number
    password: { type: String, required: true, select: false },

    // two-factor authentication (an authenticator app such as Google Authenticator)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false }, // the key shared with the authenticator app
    twoFactorLastStep: { type: Number, default: 0, select: false }, // newest 30-second step already used, so a code can't be used twice
    twoFactorRecoveryCodes: { type: [String], select: false }, // hashed one-time recovery codes
    avatar: { type: String, default: '' }, // profile photo as a small data URL (resized by the browser)
    // extra profile details (optional). The login stays "identifier"; for older accounts email /
    // contactNumber are filled from the identifier when they are sent to the browser (see toJSON below)
    username: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    contactNumber: { type: String, default: '', trim: true },
    role: {
      type: String,
      enum: ['admin', 'staff', 'groomer', 'customer'],
      default: 'customer',
    },
  },
  { timestamps: true }
);

// hash the password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// never send the password or the 2FA secrets back to the browser
// fullName is not stored: it is firstName + lastName
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.twoFactorSecret;
    delete ret.twoFactorLastStep;
    delete ret.twoFactorRecoveryCodes;
    delete ret.__v;
    delete ret.id;
    // the e-mail / contact number shown on My Profile: the login one is always filled in
    const loginIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ret.identifier || '');
    if (!ret.email && loginIsEmail) ret.email = ret.identifier;
    if (!ret.contactNumber && !loginIsEmail) ret.contactNumber = ret.identifier;
    ret.username = ret.username || '';
    return ret;
  },
});

const UserModel = mongoose.model('User', UserSchema); // collection name: "users"

module.exports = UserModel;