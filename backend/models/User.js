const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    /* نوع المستخدم داخل الشركة */
    role: {
      type: String,
      enum: ["owner", "manager", "accountant", "employee"],
      default: "owner",
    },

    /* الشركة المرتبط بها المستخدم */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    /* هل الحساب فعّال */
    isActive: {
      type: Boolean,
      default: true,
    },

    /* صلاحيات إضافية */
    permissions: {
      manageEmployees: {
        type: Boolean,
        default: false,
      },

      manageWorkdays: {
        type: Boolean,
        default: true,
      },

      manageExpenses: {
        type: Boolean,
        default: true,
      },

      managePayments: {
        type: Boolean,
        default: true,
      },

      viewReports: {
        type: Boolean,
        default: true,
      },
    },

    /* استعادة كلمة المرور */
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    /* تسجيل الخروج من جميع الأجهزة */
    tokenVersion: {
      type: Number,
      default: 0,
    },

    /* المظهر */
    darkMode: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);