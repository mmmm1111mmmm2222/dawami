const express = require("express");
const router = express.Router();

const Company = require("../models/Company");
const User = require("../models/User");
const auth = require("../middleware/auth");

router.use(auth);

/* جلب شركة المستخدم */
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -resetPasswordToken"
    );

    if (!user) {
      return res.status(404).json({
        error: "المستخدم غير موجود",
      });
    }

    if (!user.companyId) {
      return res.json(null);
    }

    const company = await Company.findById(user.companyId);

    res.json(company || null);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "تعذر جلب بيانات الشركة",
    });
  }
});

/* إنشاء شركة جديدة */
router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        error: "اسم الشركة مطلوب",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: "المستخدم غير موجود",
      });
    }

    if (user.companyId) {
      return res.status(400).json({
        error: "لديك شركة مسجلة بالفعل",
      });
    }

    const company = await Company.create({
      name,
      ownerId: req.userId,
      phone: String(req.body.phone || "").trim(),
      email: String(req.body.email || "").trim(),
      address: String(req.body.address || "").trim(),
      currency: String(req.body.currency || "TRY").trim(),
    });

    user.companyId = company._id;
    user.role = "owner";
    user.permissions.manageEmployees = true;
    user.permissions.manageWorkdays = true;
    user.permissions.manageExpenses = true;
    user.permissions.managePayments = true;
    user.permissions.viewReports = true;

    await user.save();

    res.status(201).json(company);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "تعذر إنشاء الشركة",
    });
  }
});

/* تحديث بيانات الشركة */
router.put("/", async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || !user.companyId) {
      return res.status(404).json({
        error: "لا توجد شركة مرتبطة بالحساب",
      });
    }

    if (user.role !== "owner" && user.role !== "manager") {
      return res.status(403).json({
        error: "ليس لديك صلاحية تعديل الشركة",
      });
    }

    const updates = {
      name: String(req.body.name || "").trim(),
      logoUrl: String(req.body.logoUrl || "").trim(),
      phone: String(req.body.phone || "").trim(),
      email: String(req.body.email || "").trim(),
      address: String(req.body.address || "").trim(),
      currency: String(req.body.currency || "TRY").trim(),
    };

    if (!updates.name) {
      return res.status(400).json({
        error: "اسم الشركة مطلوب",
      });
    }

    const company = await Company.findByIdAndUpdate(
      user.companyId,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json(company);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "تعذر تحديث بيانات الشركة",
    });
  }
});

module.exports = router;