const mongoose = require('mongoose');

const workoutLogSchema = new mongoose.Schema(
  {
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      required: true,
      index: true,
    },
    planDay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanDay',
      default: null,
      index: true,
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      default: null,
      index: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    caloriesBurned: {
      type: Number,
      required: true,
      min: 0,
    },
    intensity: {
      type: String,
      default: 'moderate',
      trim: true,
    },
    scheduledDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      enum: ['manual', 'planner'],
      default: 'manual',
    },
  },
  { timestamps: true },
);

workoutLogSchema.index({ userAccount: 1, scheduledDate: -1 });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema, 'workoutlogs');
