const mongoose = require('mongoose');

const planMealSchema = new mongoose.Schema(
  {
    fitnessPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FitnessPlan',
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Snack', 'Dinner'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    protein: {
      type: Number,
      default: 0,
      min: 0,
    },
    carbs: {
      type: Number,
      default: 0,
      min: 0,
    },
    fat: {
      type: Number,
      default: 0,
      min: 0,
    },
    instructions: {
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

planMealSchema.index({ fitnessPlan: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('PlanMeal', planMealSchema, 'planmeals');
