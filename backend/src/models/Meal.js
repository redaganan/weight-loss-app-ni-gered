const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema(
  {
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      required: true,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    calories: {
      type: Number,
      required: true,
    },
    protein: {
      type: Number,
      default: 0,
    },
    carbs: {
      type: Number,
      default: 0,
    },
    fat: {
      type: Number,
      default: 0,
    },
    portionSize: {
      type: String,
      default: '1 portion',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Meal', mealSchema, 'meals');
