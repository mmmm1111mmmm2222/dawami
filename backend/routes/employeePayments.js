const express = require("express");

const router = express.Router();

const EmployeePayment = require("../models/EmployeePayment");
const User = require("../models/User");
const auth = require("../middleware/auth");

router.use(auth);

/* جلب دفعات موظف */
router.get("/", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب",
      });
    }

    const { employeeId, year, month } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        error: "معرف الموظف مطلوب",
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

    const filter = {
      employeeId,
      companyId: currentUser.companyId,
    };

    if (year !== undefined && month !== undefined) {
      const startDate = new Date(
        Number(year),
        Number(month),
        1
      );

      const endDate = new Date(
        Number(year),
        Number(month) + 1,
        1
      );

      filter.date = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const payments = await EmployeePayment.find(filter)
      .sort({ date: -1, createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error(
      "Get employee payments error:",
      error
    );

    res.status(500).json({
      error: "تعذر جلب دفعات الموظف",
    });
  }
});

/* إضافة دفعة جديدة */
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
      currentUser.permissions?.managePayments === true;

    if (!canManage) {
      return res.status(403).json({
        error: "ليس لديك صلاحية إضافة دفعات",
      });
    }

    const {
      employeeId,
      amount,
      currency,
      date,
      note,
    } = req.body;

    if (
      !employeeId ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !date
    ) {
      return res.status(400).json({
        error: "بيانات الدفعة غير صالحة",
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

    const payment = await EmployeePayment.create({
      ownerId: req.userId,
      employeeId,
      companyId: currentUser.companyId,
      amount: Number(amount),
      currency: String(currency || "USD")
        .trim()
        .toUpperCase(),
      date: new Date(date),
      note: String(note || "").trim(),
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error(
      "Create employee payment error:",
      error
    );

    res.status(500).json({
      error: "تعذر إضافة الدفعة",
    });
  }
});

/* حذف دفعة */
router.delete("/:id", async (req, res) => {
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
      currentUser.permissions?.managePayments === true;

    if (!canManage) {
      return res.status(403).json({
        error: "ليس لديك صلاحية حذف الدفعات",
      });
    }

    const deletedPayment =
      await EmployeePayment.findOneAndDelete({
        _id: req.params.id,
        companyId: currentUser.companyId,
      });

    if (!deletedPayment) {
      return res.status(404).json({
        error: "تعذر العثور على الدفعة",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete employee payment error:",
      error
    );

    res.status(500).json({
      error: "تعذر حذف الدفعة",
    });
  }
});

module.exports = router;