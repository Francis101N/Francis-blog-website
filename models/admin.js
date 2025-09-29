const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true, match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]},
  password: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
