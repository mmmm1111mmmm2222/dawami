const express = require("express");
const router = express.Router();

const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");
const auth = require("../middleware/auth");
router.use((req, res, next) => {
  console.log("Activity route reached");
  next();
});
router.use(auth);
// جلب آخر سجلات النشاط
router.get("/", async (req, res) => {
  try {
const currentUser = await User.findById(req.userId);

if (!currentUser || !currentUser.companyId) {
  return res.status(400).json({
    error: "لا توجد شركة مرتبطة بالحساب"
  });
}
const canViewActivityLogs =
  currentUser.role === "owner" ||
  currentUser.permissions?.viewActivityLogs === true;

if (!canViewActivityLogs) {
  return res.status(403).json({
    error: "ليس لديك صلاحية مشاهدة سجل النشاط"
  });
}
const logs = await ActivityLog.find({
  companyId: currentUser.companyId
})
  .sort({ createdAt: -1 })
  .limit(100)
  .lean();

const userIds = [
  ...new Set(
    logs
      .map((log) => String(log.userId || ""))
      .filter(Boolean)
  )
];

const users = await User.find({
  _id: { $in: userIds }
})
  .select("name email")
  .lean();

const usersMap = new Map(
  users.map((user) => [String(user._id), user])
);

const logsWithUsers = logs.map((log) => ({
  ...log,
  userId:
    usersMap.get(String(log.userId)) || null,
}));

console.log("Activity logs count:", logs.length);

res.json(logsWithUsers);
  } catch (error) {
    res.status(500).json({
      error: "تعذر جلب سجل النشاط"
    });
  }
});

// إضافة سجل نشاط جديد
router.post("/", async (req, res) => {
  try {
const {
  action,
  details,
  entityType,
  entityId
} = req.body;

if (!action) {
      return res.status(400).json({
        error: "action مطلوب"
      });
    }
const currentUser = await User.findById(req.userId);

if (!currentUser || !currentUser.companyId) {
  return res.status(400).json({
    error: "لا توجد شركة مرتبطة بالحساب"
  });
}
    const log = await ActivityLog.create({
userId: req.userId,
companyId: currentUser.companyId,
      action,
      details: details || "",
      entityType: entityType || "",
      entityId: entityId || ""
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({
      error: "تعذر حفظ سجل النشاط"
    });
  }
});
// حذف سجل النشاط بالكامل - للمالك فقط
router.delete("/", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب"
      });
    }

    if (currentUser.role !== "owner") {
      return res.status(403).json({
        error: "هذه العملية متاحة لصاحب الشركة فقط"
      });
    }

    const result = await ActivityLog.deleteMany({
      companyId: currentUser.companyId
    });

    res.json({
      message: "تم حذف سجل النشاط بالكامل",
      deletedCount: result.deletedCount || 0
    });
  } catch (error) {
    console.error("Delete activity logs error:", error);

    res.status(500).json({
      error: "تعذر حذف سجل النشاط"
    });
  }
});


// حذف سجل نشاط واحد - للمالك فقط
router.delete("/:id", async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({
        error: "لا توجد شركة مرتبطة بالحساب"
      });
    }

    if (currentUser.role !== "owner") {
      return res.status(403).json({
        error: "هذه العملية متاحة لصاحب الشركة فقط"
      });
    }

    const deletedLog = await ActivityLog.findOneAndDelete({
      _id: req.params.id,
      companyId: currentUser.companyId
    });

    if (!deletedLog) {
      return res.status(404).json({
        error: "سجل النشاط غير موجود"
      });
    }

    res.json({
      message: "تم حذف سجل النشاط"
    });
  } catch (error) {
    console.error("Delete activity log error:", error);

    res.status(500).json({
      error: "تعذر حذف سجل النشاط"
    });
  }
});
module.exports = router;