const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const connectDB = require("../config/db");


// ===== ĐĂNG KÝ =====
router.post("/register", async (req, res) => {
  try {
    const db = await connectDB();
    const users = db.collection("users");

    const { username, email, password, SDT, address } = req.body;

    // Kiểm tra trùng email
    const existingEmail = await users.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: "Email đã được sử dụng" });

    // Kiểm tra trùng username
    const existingUsername = await users.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: "Username đã tồn tại" });

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = {
      username,
      email,
      password: passwordHash, // chỉ lưu password hash
      SDT,
      address,
      role: "user", // mặc định là user
      ngayTao: new Date(),
    };

    await users.insertOne(newUser);

    res.json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error("💥 Lỗi đăng ký:", err);
    res.status(500).json({ message: "Lỗi server khi đăng ký." });
  }
});

// ===== ĐĂNG NHẬP =====
router.post("/login", async (req, res) => {
  try {

    const db = await connectDB();
    const users = db.collection("users");

    const { identifier, password } = req.body;

    // Cho phép đăng nhập bằng username hoặc email
    const user = await users.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user)
      return res.status(400).json({ message: "Sai email hoặc mật khẩu" });

    // So sánh mật khẩu
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Sai email hoặc mật khẩu" });

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "MY_SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("💥 Lỗi đăng nhập:", err);
    res.status(500).json({ message: "Lỗi server khi đăng nhập." });
  }
});

module.exports = router;
