const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema(
  {
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    loggedDate: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('WeightLog', weightLogSchema, 'weightlogs');
