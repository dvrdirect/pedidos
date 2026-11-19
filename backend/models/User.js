const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    // dueno: dueño/a de la moto. repartidor: quien hace los repartos.
    role: { type: String, enum: ['dueno', 'repartidor'], required: true },
    isAdmin: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    // true hasta que el usuario cambie su contraseña por primera vez.
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
