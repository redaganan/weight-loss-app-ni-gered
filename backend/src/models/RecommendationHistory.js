const mongoose = require('mongoose');

const recommendationHistorySchema = new mongoose.Schema(
  {
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAccount',
      required: true,
    },
    type: {
      type: String,
      enum: ['meal_plan', 'workout_plan', 'fitness_summary', 'ai_plan_regen', 'workout_log', 'weight_log', 'meal_log'],
      default: 'meal_plan',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('RecommendationHistory', recommendationHistorySchema, 'recommendationhistories');
