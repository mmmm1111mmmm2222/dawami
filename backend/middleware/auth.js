const jwt  = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح، يرجى تسجيل الدخول" });
  }
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "رمز المصادقة غير صالح أو منتهي الصلاحية" });
  }

  // If the token carries a version (tv), verify it still matches the user record.
  // Tokens without tv (legacy) are allowed through for backward compatibility.
  if (decoded.tv !== undefined) {
    const user = await User.findById(decoded.userId).select("tokenVersion").lean();
    if (!user || decoded.tv !== user.tokenVersion) {
      return res.status(401).json({ error: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً" });
    }
  }

  req.userId = decoded.userId;
  next();
};
