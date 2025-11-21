const db = require("../config/db");
const express = require("express");
const router = express.Router();
const { ObjectId } = require('mongodb');

// POST /api/products/add
router.post("/add", async (req, res) => {
    try {
      const { user_id, product } = req.body;
  
      if (!user_id || !product?.product_id)
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  
      const { product_id, quantity } = product;
      const database = await db();
      const cartCol = database.collection("giohang");
  
      // 🔹 Lấy thông tin sản phẩm từ bảng products
      const productData = await database
        .collection("products")
        .findOne({ _id: new ObjectId(product_id) });
  
      if (!productData)
        return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
  
      // 🔹 Kiểm tra user đã có giỏ hàng chưa
      let cart = await cartCol.findOne({ user: user_id });
  
      // Nếu chưa có giỏ → tạo giỏ mới
      if (!cart) {
        const newCart = {
          user: user_id,
          chitietgiohang: [
            {
              productId: product_id,
              quantity,
              name: productData.name,
              price: productData.price,
              image: productData.image,
            }
          ],
          tongtien: productData.price * quantity,
          createdAt: new Date()
        };
  
        await cartCol.insertOne(newCart);
        return res.json({ success: true, message: "Đã tạo giỏ hàng và thêm sản phẩm" });
      }
  
      // 🔹 Nếu đã có giỏ → kiểm tra sản phẩm đã có trong chitietgiohang chưa
      const exists = cart.chitietgiohang.find(
        (item) => item.productId === product_id
      );
  
      if (exists) {
        // cập nhật số lượng trong array
        await cartCol.updateOne(
          { user: user_id, "chitietgiohang.productId": product_id },
          { $inc: { "chitietgiohang.$.quantity": quantity, tongtien: productData.price * quantity } }
        );
  
        return res.json({ success: true, message: "Tăng số lượng sản phẩm trong giỏ" });
      }
  
      // 🔹 Nếu chưa có trong array → push vào chitietgiohang
      const newItem = {
        productId: product_id,
        quantity,
        name: productData.name,
        price: productData.price,
        image: productData.image
      };
  
      await cartCol.updateOne(
        { user: user_id },
        {
          $push: { chitietgiohang: newItem },
          $inc: { tongtien: productData.price * quantity }
        }
      );
  
      return res.json({ success: true, message: "Đã thêm sản phẩm mới vào giỏ hàng" });
  
    } catch (err) {
      console.error("💥 Lỗi thêm giỏ hàng:", err);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  });
    // ✅ Lấy giỏ hàng theo user_id
// GET giỏ hàng của user
router.get("/:user_id", async (req, res) => {
    try {
      const database = await db();
      const { user_id } = req.params;
  
      let cart = await database.collection("giohang").findOne({ user: user_id });
  
      if (!cart) {
        // tạo giỏ hàng trống nếu chưa có
        cart = { user: user_id, chitietgiohang: [] };
        await database.collection("giohang").insertOne(cart);
      }
  
      // Tính tổng tiền
      const total = cart.chitietgiohang.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
  
      res.json({ success: true, cart: { ...cart, total } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // PUT cập nhật số lượng sản phẩm
  router.put("/update", async (req, res) => {
    try {
      const database = await db();
      const { user, productId, quantity } = req.body;
  
      if (!user || !productId || quantity == null)
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  
      const cart = await database.collection("giohang").findOne({ user });
      if (!cart) return res.status(404).json({ success: false, message: "Không có giỏ" });
  
      const index = cart.chitietgiohang.findIndex((item) => item.productId === productId);
      if (index === -1)
        return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
  
      cart.chitietgiohang[index].quantity = quantity;
      await database.collection("giohang").updateOne(
        { user },
        { $set: { chitietgiohang: cart.chitietgiohang } }
      );
  
      res.json({ success: true, cart });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });
  
  // DELETE xóa sản phẩm khỏi giỏ
  router.delete("/remove", async (req, res) => {
    try {
      const database = await db();
      const { user, productId } = req.body;
  
      if (!user || !productId)
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  
      const cart = await database.collection("giohang").findOne({ user });
      if (!cart) return res.status(404).json({ success: false, message: "Không có giỏ" });
  
      cart.chitietgiohang = cart.chitietgiohang.filter((item) => item.productId !== productId);
  
      await database.collection("giohang").updateOne(
        { user },
        { $set: { chitietgiohang: cart.chitietgiohang } }
      );
  
      res.json({ success: true, cart });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  router.delete("/:userId/clear", async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await db();
    
    // Xoá tất cả sản phẩm trong giỏ của user
    await database.collection("giohang").deleteMany({ user: userId });
    
    res.json({ success: true, message: "Đã xoá toàn bộ giỏ hàng!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});
  
  module.exports = router;