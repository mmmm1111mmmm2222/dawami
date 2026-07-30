const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
companyId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  required: true
},
    action: {
      type: String,
      required: true,
      trim: true
    },
details: {
  type: String,
  default: "",
  trim: true
},

entityType: {
  type: String,
  default: "",
  trim: true
},

entityId: {
  type: String,
  default: ""
}

  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);