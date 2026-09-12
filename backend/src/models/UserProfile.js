const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    goalWeight: {
      type: Number,
      required: true,
    },
    timelineWeeks: {
      type: Number,
      required: true,
    },
    activityLevel: {
      type: String,
      required: true,
    },
    dietPreference: {
      type: String,
      required: true,
    },
    targetCalories: {
      type: Number,
      default: 0,
    },
    proteinTarget: {
      type: Number,
      default: 0,
    },
    carbsTarget: {
      type: Number,
      default: 0,
    },
    fatTarget: {
      type: Number,
      default: 0,
    },
    startWeight: {
      type: Number,
      default: 0,
    },
    lastWeightUpdate: Date,
    currentPlan: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    weeklyRhythm: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    planSummary: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserProfile', userProfileSchema, 'userprofiles');
