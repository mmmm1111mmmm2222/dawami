const mongoose = require("mongoose");

const MonthlyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    year: {
      type: Number,
      required: true
    },

    month: {
      type: Number,
      required: true
    },

    note: {
      type: String,
      default: ""
    },

    days: [
      {
        day: {
          type: Number,
          required: true
        },

        status: {
          type: String,
          enum: ["work", "holiday"],
          default: "work"
        },

        amount: {
          type: Number,
          default: 0
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

MonthlyPlanSchema.index(
  {
    userId: 1,
    year: 1,
    month: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "MonthlyPlan",
  MonthlyPlanSchema
);