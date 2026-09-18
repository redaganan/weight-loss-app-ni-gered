const mongoose = require('mongoose');

const planDaySchema = new mongoose.Schema(
  {
    fitnessPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FitnessPlan',
      required: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
      trim: true,
    },
    workoutFocus: {
      type: String,
      default: '',
      trim: true,
    },
    duration: {
      type: String,
      default: '',
      trim: true,
    },
    repetitions: {
      type: String,
      default: '',
      trim: true,
    },
    timeScope: {
      type: String,
      default: '',
      trim: true,
    },
    rest: {
      type: String,
      default: '',
      trim: true,
    },
    meal: {
      type: String,
      default: '',
      trim: true,
    },
    nutritionStrategy: {
      type: String,
      default: '',
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    missed: {
      type: Boolean,
      default: false,
    },
    status: {
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

planDaySchema.index({ fitnessPlan: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('PlanDay', planDaySchema, 'plandays');
