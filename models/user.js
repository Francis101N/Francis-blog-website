const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  names: { type: String, required: true },
  email: { type: String, unique: true, required: true, match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]},
  password: { type: String, required: true },
  profilePhoto: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
