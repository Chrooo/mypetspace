const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    identifier: { type: String, required: true, unique: true }, // email OR phone number
    password: { type: String, required: true, select: false },
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

// never send the password back to the browser
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const UserModel = mongoose.model('User', UserSchema); // collection name: "users"

module.exports = UserModel;