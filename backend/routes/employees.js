const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

const User = require("../models/User");
const auth = require("../middleware/auth");

router.use(auth);

/* جلب موظفي الشركة */
router.get("/", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب",
      });
    }

    const employees = await User.find({
      companyId: currentUser.companyId,
      role: { $ne: "owner" },
    })
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    console.error("Get employees error:", error);

    res.status(500).json({
      error: "تعذر جلب الموظفين",
    });
  }
});

/* إضافة موظف جديد */
router.post("/", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب",
      });
    }

    const canManage =
      currentUser.role === "owner" ||
      currentUser.role === "manager" ||
      currentUser.permissions?.manageEmployees === true;

    if (!canManage) {
      return res.status(403).json({
        error: "ليس لديك صلاحية إضافة موظفين",
      });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "employee");

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }

    const allowedRoles = ["manager", "accountant", "employee"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: "نوع الموظف غير صالح",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        error: "البريد الإلكتروني مستخدم بالفعل",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const employee = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      companyId: currentUser.companyId,
      isActive: req.body.isActive !== false,

      permissions: {
        manageEmployees:
          req.body.permissions?.manageEmployees === true,
        manageWorkdays:
          req.body.permissions?.manageWorkdays === true,
        manageExpenses:
          req.body.permissions?.manageExpenses === true,
        managePayments:
          req.body.permissions?.managePayments === true,
        viewReports:
          req.body.permissions?.viewReports === true,
      },
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      companyId: employee.companyId,
      isActive: employee.isActive,
      permissions: employee.permissions,
      createdAt: employee.createdAt,
    });
  } catch (error) {
    console.error("Create employee error:", error);

    res.status(500).json({
      error: "تعذر إضافة الموظف",
    });
  }
});

module.exports = router;