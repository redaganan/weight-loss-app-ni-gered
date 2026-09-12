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
  },
  { timestamps: true },
);

module.exports = mongoose.model('WeightLog', weightLogSchema, 'weightlogs');
