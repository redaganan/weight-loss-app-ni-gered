const mongoose = require('mongoose');

const planExerciseSchema = new mongoose.Schema(
  {
    planDay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanDay',
      required: true,
      index: true,
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
      index: true,
    },
    sets: {
      type: Number,
      min: 0,
    },
    reps: {
      type: Number,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      min: 0,
    },
    restSeconds: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

planExerciseSchema.index({ planDay: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('PlanExercise', planExerciseSchema, 'planexercises');
