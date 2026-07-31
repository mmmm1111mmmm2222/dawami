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

module.exports = router;