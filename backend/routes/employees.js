const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
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
await ActivityLog.create({
  userId: req.userId,
  companyId: currentUser.companyId,
  action: "إضافة موظف",
  details: `تمت إضافة الموظف ${employee.name}`,
  entityType: "employee",
  entityId: String(employee._id)
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
/* تعديل موظف */
router.put("/:id", async (req, res) => {
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
        error: "ليس لديك صلاحية تعديل الموظفين",
      });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      companyId: currentUser.companyId,
      role: { $ne: "owner" },
    });

    if (!employee) {
      return res.status(404).json({
        error: "تعذر العثور على الموظف",
      });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "employee");

    if (!name || !email) {
      return res.status(400).json({
        error: "الاسم والبريد الإلكتروني مطلوبان",
      });
    }

    const allowedRoles = ["manager", "accountant", "employee"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: "نوع الموظف غير صالح",
      });
    }

    const existingUser = await User.findOne({
      email,
      _id: { $ne: employee._id },
    });

    if (existingUser) {
      return res.status(400).json({
        error: "البريد الإلكتروني مستخدم بالفعل",
      });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }

    employee.name = name;
    employee.email = email;
    employee.role = role;
    employee.isActive = req.body.isActive !== false;

    employee.permissions = {
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
    };

    if (password) {
      employee.password = await bcrypt.hash(password, 12);
    }

    await employee.save();

    await ActivityLog.create({
      userId: req.userId,
      companyId: currentUser.companyId,
      action: "تعديل موظف",
      details: `تم تعديل الموظف ${employee.name}`,
      entityType: "employee",
      entityId: String(employee._id),
    });

    res.json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      companyId: employee.companyId,
      isActive: employee.isActive,
      permissions: employee.permissions,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    res.status(500).json({
      error: "تعذر تعديل الموظف",
    });
  }
});
/* حذف موظف */
router.delete("/:id", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب"
      });
    }

    const canManage =
      currentUser.role === "owner" ||
      currentUser.role === "manager" ||
      currentUser.permissions?.manageEmployees === true;

    if (!canManage) {
      return res.status(403).json({
        error: "ليس لديك صلاحية حذف الموظفين"
      });
    }

    const deletedEmployee = await User.findOneAndDelete({
      _id: req.params.id,
      companyId: currentUser.companyId,
      role: { $ne: "owner" }
    });

    if (!deletedEmployee) {
      return res.status(404).json({
        error: "تعذر العثور على الموظف"
      });
    }

    await ActivityLog.create({
      userId: req.userId,
      companyId: currentUser.companyId,
      action: "حذف موظف",
      details: `تم حذف الموظف ${deletedEmployee.name}`,
      entityType: "employee",
      entityId: String(deletedEmployee._id)
    });

    res.json({
      success: true
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    res.status(500).json({
      error: "تعذر حذف الموظف"
    });
  }
});
module.exports = router;