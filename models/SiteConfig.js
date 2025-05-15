const mongoose = require("mongoose");

const SiteConfigSchema = new mongoose.Schema({
  siteMode: {
    type: String,
    enum: ["live", "leaderboard_only"],
    default: "live",
  },
  submissionCount: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// We'll use a singleton pattern - only one document will exist
SiteConfigSchema.statics.getConfig = async function () {
  const config = await this.findOne();

  if (config) {
    return config;
  }

  // If no config exists, create one with default values
  return await this.create({});
};

module.exports = mongoose.model("SiteConfig", SiteConfigSchema);
