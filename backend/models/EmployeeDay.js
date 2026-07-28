const mongoose = require("mongoose");

const employeeDaySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    day: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["work", "leave", "absence", ""],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

employeeDaySchema.index(
  {
    employeeId: 1,
    year: 1,
    month: 1,
    day: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("EmployeeDay", employeeDaySchema);