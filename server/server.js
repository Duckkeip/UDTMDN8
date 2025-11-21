const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const payRoutes = require("./routes/pay");
const db = require("./config/db");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

db();

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes); // 🔹 mount route giỏ hàng
app.use("/api/pay", payRoutes); // 🔹 mount route thanh toán

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});