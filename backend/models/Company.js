const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    logoUrl: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    currency: {
      type: String,
      default: "TRY",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    settings: {
      allowEmployeeExpenseEntry: {
        type: Boolean,
        default: false,
      },

      allowEmployeePaymentEntry: {
        type: Boolean,
        default: false,
      },

      allowEmployeeReportView: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Company", companySchema);