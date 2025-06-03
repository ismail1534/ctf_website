const mongoose = require("mongoose");

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["OSINT", "Forensics", "Cryptography", "Web", "Reverse Engineering"],
    default: "Forensics",
  },
  flag: {
    type: String,
    required: true,
  },
  hint: {
    type: String,
    trim: true,
  },
  deadline: {
    type: Date,
  },
  author: {
    type: String,
    trim: true,
  },
  file: {
    filename: String,
    originalName: String,
    path: String,
  },
  fileUrl: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
ChallengeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Challenge", ChallengeSchema);
