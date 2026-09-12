const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    target: {
      type: String,
      trim: true,
    },
    equipment: {
      type: String,
      trim: true,
    },
    images: [{ type: String }],
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Exercise', exerciseSchema, 'exercises');
