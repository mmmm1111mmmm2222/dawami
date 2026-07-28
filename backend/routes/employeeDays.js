const express = require("express");

const router = express.Router();

const EmployeeDay = require("../models/EmployeeDay");
const User = require("../models/User");
const auth = require("../middleware/auth");

router.use(auth);

/* جلب حالات أيام موظف لشهر محدد */
router.get("/", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب",
      });
    }

    const { employeeId, year, month } = req.query;

    if (!employeeId || year === undefined || month === undefined) {
      return res.status(400).json({
        error: "بيانات الموظف والشهر والسنة مطلوبة",
      });
    }

    const employee = await User.findOne({
      _id: employeeId,
      companyId: currentUser.companyId,
      role: { $ne: "owner" },
    });

    if (!employee) {
      return res.status(404).json({
        error: "تعذر العثور على الموظف",
      });
    }

    const days = await EmployeeDay.find({
      employeeId,
      companyId: currentUser.companyId,
      year: Number(year),
      month: Number(month),
    }).sort({ day: 1 });

    res.json(days);
  } catch (error) {
    console.error("Get employee days error:", error);

    res.status(500).json({
      error: "تعذر جلب أيام الموظف",
    });
  }
});

/* حفظ أو تعديل حالة يوم */
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
      currentUser.permissions?.manageWorkdays === true;

    if (!canManage) {
      return res.status(403).json({
        error: "ليس لديك صلاحية تعديل أيام الموظفين",
      });
    }

    const { employeeId, year, month, day, status } = req.body;

    const allowedStatuses = ["", "work", "leave", "absence"];

    if (
      !employeeId ||
      year === undefined ||
      month === undefined ||
      day === undefined ||
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        error: "بيانات اليوم غير صالحة",
      });
    }

    const employee = await User.findOne({
      _id: employeeId,
      companyId: currentUser.companyId,
      role: { $ne: "owner" },
    });

    if (!employee) {
      return res.status(404).json({
        error: "تعذر العثور على الموظف",
      });
    }

    if (status === "") {
      await EmployeeDay.deleteOne({
        employeeId,
        companyId: currentUser.companyId,
        year: Number(year),
        month: Number(month),
        day: Number(day),
      });

      return res.json({
        success: true,
        deleted: true,
      });
    }

    const savedDay = await EmployeeDay.findOneAndUpdate(
      {
        employeeId,
        companyId: currentUser.companyId,
        year: Number(year),
        month: Number(month),
        day: Number(day),
      },
      {
        ownerId: req.userId,
        employeeId,
        companyId: currentUser.companyId,
        year: Number(year),
        month: Number(month),
        day: Number(day),
        status,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json(savedDay);
  } catch (error) {
    console.error("Save employee day error:", error);

    res.status(500).json({
      error: "تعذر حفظ حالة اليوم",
    });
  }
});

module.exports = router;