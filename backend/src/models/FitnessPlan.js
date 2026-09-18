const mongoose = require('mongoose');

const fitnessPlanSchema = new mongoose.Schema(
  {
    userProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      required: true,
      index: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      enum: ['gemini', 'fallback', 'manual'],
      default: 'fallback',
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

fitnessPlanSchema.index({ userProfile: 1, version: -1 });
fitnessPlanSchema.index({ userProfile: 1, status: 1 });

module.exports = mongoose.model('FitnessPlan', fitnessPlanSchema, 'fitnessplans');
