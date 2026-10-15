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
    return ret;
  },
});

const UserModel = mongoose.model('User', UserSchema); // collection name: "users"

module.exports = UserModel;