const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const { Resend } = require("resend");
const User     = require("../models/User");
const WorkDay  = require("../models/WorkDay");
const Employer = require("../models/Employer");
const Payment  = require("../models/Payment");
const authMW   = require("../middleware/auth");

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Dawami <onboarding@resend.dev>";

/* ── helpers ── */
function issueToken(user) {
  return jwt.sign(
    { userId: user._id, tv: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ─────────────────────────────────────────
   POST /auth/register
───────────────────────────────────────── */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || !name.trim())
      return res.status(400).json({ error: "الاسم مطلوب" });
    if (!email || typeof email !== "string")
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    if (!password || typeof password !== "string")
      return res.status(400).json({ error: "كلمة المرور مطلوبة" });
    if (password.length < 8)
      return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(400).json({ error: "البريد الإلكتروني مسجّل مسبقاً" });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
    });

    const token = issueToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, darkMode: user.darkMode },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   POST /auth/login
───────────────────────────────────────── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      // Don't reveal whether the email exists
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    const match = await bcrypt.compare(String(password), user.password);
    if (!match)
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    const token = issueToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, darkMode: user.darkMode },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   POST /auth/forgot-password
   Always returns 200 to avoid email enumeration
───────────────────────────────────────── */
router.post("/forgot-password", async (req, res) => {
  const SAFE_MSG = "إذا كان البريد الإلكتروني مسجلاً، ستصل رسالة خلال دقائق.";
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string")
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ message: SAFE_MSG }); // silent — no enumeration

    // Generate token
    const plainToken  = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");
    const expires     = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = expires;
    await user.save();

    // Build reset URL
    const host     = req.headers.host || "localhost";
    const protocol = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
    const resetUrl = `${protocol}://${host}/reset.html?token=${plainToken}`;

    // Send email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to:   user.email,
        subject: "إعادة تعيين كلمة المرور — داوامي",
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1a6b4a">🗓️ داوامي</h2>
            <p>مرحباً <strong>${user.name}</strong>،</p>
            <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
            <p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#1a6b4a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                إعادة تعيين كلمة المرور
              </a>
            </p>
            <p style="color:#888;font-size:.85rem">الرابط صالح لمدة ساعة واحدة فقط.<br>إن لم تطلب هذا، يمكنك تجاهل هذه الرسالة.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
            <p style="color:#aaa;font-size:.75rem">داوامي — تطبيق تتبع أيام العمل</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
      // Still return success so the UI doesn't expose info
    }

    res.json({ message: SAFE_MSG });
  } catch (err) {
    console.error("Forgot-password error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   POST /auth/reset-password
───────────────────────────────────────── */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "الرمز وكلمة المرور مطلوبان" });
    if (password.length < 8)
      return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });

    const hashed = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user   = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ error: "الرابط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد." });

    user.password             = await bcrypt.hash(password, 12);
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    user.tokenVersion         = (user.tokenVersion || 0) + 1; // invalidate all existing sessions
    await user.save();

    res.json({ message: "تم تعيين كلمة المرور الجديدة بنجاح. يمكنك تسجيل الدخول الآن." });
  } catch (err) {
    console.error("Reset-password error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   POST /auth/change-password   (requires auth)
───────────────────────────────────────── */
router.post("/change-password", authMW, async (req, res) => {
  try {
    const { currentPassword, newPassword, logoutAll } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "كلمة المرور الحالية والجديدة مطلوبتان" });
    if (newPassword.length < 8)
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    const match = await bcrypt.compare(String(currentPassword), user.password);
    if (!match)
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });

    user.password = await bcrypt.hash(newPassword, 12);
    if (logoutAll) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    await user.save();

    // Issue a fresh token so this session stays alive
    const newToken = issueToken(user);
    res.json({ message: "تم تغيير كلمة المرور بنجاح", token: newToken });
  } catch (err) {
    console.error("Change-password error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   POST /auth/logout-all   (requires auth)
───────────────────────────────────────── */
router.post("/logout-all", authMW, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const newToken = issueToken(user);
    res.json({ message: "تم تسجيل الخروج من جميع الأجهزة", token: newToken });
  } catch (err) {
    console.error("Logout-all error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   GET /auth/me   (requires auth)
───────────────────────────────────────── */
router.get("/me", authMW, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -resetPasswordToken -resetPasswordExpires -tokenVersion");
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    res.json({ id: user._id, name: user.name, email: user.email, darkMode: user.darkMode });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   PATCH /auth/preferences   (requires auth)
   Update darkMode preference
───────────────────────────────────────── */
router.patch("/preferences", authMW, async (req, res) => {
  try {
    const { darkMode } = req.body;
    const allowed = ["light","dark","system"];
    if (darkMode && !allowed.includes(darkMode))
      return res.status(400).json({ error: "قيمة غير صالحة" });

    const update = {};
    if (darkMode) update.darkMode = darkMode;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true })
      .select("-password -resetPasswordToken -resetPasswordExpires -tokenVersion");
    res.json({ id: user._id, name: user.name, email: user.email, darkMode: user.darkMode });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   DELETE /auth/account   (requires auth)
   Permanently delete account and ALL user data
───────────────────────────────────────── */
router.delete("/account", authMW, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ error: "تأكيد كلمة المرور مطلوب" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    const match = await bcrypt.compare(String(password), user.password);
    if (!match)
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });

    // Delete all user data
    await Promise.all([
      WorkDay.deleteMany({ userId: req.userId }),
      Employer.deleteMany({ userId: req.userId }),
      Payment.deleteMany({ userId: req.userId }),
      User.findByIdAndDelete(req.userId),
    ]);

    res.json({ message: "تم حذف الحساب وجميع البيانات بشكل نهائي" });
  } catch (err) {
    console.error("Delete-account error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

/* ─────────────────────────────────────────
   POST /auth/request-deletion   (public — no auth)
   For the public account deletion request page
───────────────────────────────────────── */
router.post("/request-deletion", async (req, res) => {
  const SAFE_MSG = "إذا كان البريد الإلكتروني مسجلاً، سيتم حذف الحساب عند تأكيد الهوية.";
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.json({ message: SAFE_MSG });

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) return res.json({ message: SAFE_MSG });

    // Delete everything
    await Promise.all([
      WorkDay.deleteMany({ userId: user._id }),
      Employer.deleteMany({ userId: user._id }),
      Payment.deleteMany({ userId: user._id }),
      User.findByIdAndDelete(user._id),
    ]);

    res.json({ message: "تم حذف الحساب وجميع البيانات بنجاح." });
  } catch (err) {
    console.error("Request-deletion error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

module.exports = router;
