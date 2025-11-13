
const db = require("../config/db");
const express = require("express");
const router = express.Router();
const { ObjectId } = require('mongodb');

// /api/products/man
router.get("/sanpham", async (req, res) => {
  try {
    const database = await db();
   
    const products = await database.collection("products")

    const result = await products.find({}).toArray();
    res.json({products:result});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/products/:id
router.get("/:id", async (req, res) => {
  const database = await db();
  const { id } = req.params;

  if (!id) return res.status(400).json({ success: false, message: "ID sản phẩm không hợp lệ" });

  try {
    const product = await database.collection("products").findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});
// GET /api/products/byType/:type
router.get("/byType/:type", async (req, res) => {
  try {
    const database = await db();
   
    const { type } = req.params;
    const products = await database.collection(`products`) // giới hạn 10 sản phẩm
    const result = await products.find({ type }).limit(10).toArray(); // ← chuyển cursor thành mảng
    res.json({ success: true, products: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});


// POST /api/products/add
router.post("/cart/add", async (req, res) => {
  try {
    const { user_id, product } = req.body;
    if (!user_id || !product?.product_id)
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });

    const { product_id, quantity } = product;
    const database = await db();
    const cartCol = database.collection("giohang");

    // 🔹 Kiểm tra sản phẩm có tồn tại trong collection "products"
    const productData = await database
      .collection("products")
      .findOne({ _id: new ObjectId(product_id) });

    if (!productData)
      return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });

    // 🔹 Kiểm tra xem user đã có sản phẩm này trong giỏ chưa
    const existing = await cartCol.findOne({
      user: user_id,
      productId: product_id,
    });

    if (existing) {
      // ✅ Nếu có rồi → tăng số lượng
      await cartCol.updateOne(
        { _id: existing._id },
        { $inc: { quantity: quantity } }
      );
      return res.json({ success: true, message: "Đã cập nhật số lượng sản phẩm trong giỏ hàng" });
    }

    // 🔹 Nếu chưa có → thêm mới
    const cartItem = {
      productId: product_id,
      quantity,
      user: user_id,
      name: productData.name,
      price: productData.price,
      image: productData.image,
      createdAt: new Date(),
    };

    await cartCol.insertOne(cartItem);
    return res.json({ success: true, message: "Thêm sản phẩm vào giỏ hàng thành công" });
  } catch (err) {
    console.error("💥 Lỗi thêm giỏ hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});
// ✅ Lấy giỏ hàng theo user_id
router.get("/cart/:user_id", async (req, res) => {
  try {
    const database = await db();
    const { user_id } = req.params;

    // Lấy tất cả sản phẩm trong giỏ của user
    const cartItems = await database.collection("giohang").find({ user: user_id }).toArray();

    if (!cartItems.length) {
      return res.json({ success: true, cart: { items: [], total: 0 } });
    }

    const total = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

    res.json({
      success: true,
      cart: {
        items: cartItems,
        total,
      },
    });
  } catch (err) {
    console.error("💥 Lỗi lấy giỏ hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// POST /api/cart/remove
router.post("/cart/remove", async (req, res) => {
  
    const database = await db();
    const { user_id, productId, quantity = 1 } = req.body; // quantity mặc định 1

    if (!user_id || !productId) {
      return res.status(400).json({ success: false, message: "Thiếu user_id hoặc productId" });
    }

    const cartCol = database.collection("giohang");

    // 🔹 Lấy sản phẩm trong giỏ
    const item = await cartCol.findOne({ user: user_id, productId });

    if (!item) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    if (item.quantity > quantity) {
      // 🔹 Giảm số lượng
      await cartCol.updateOne(
        { _id: item._id },
        { $inc: { quantity: -quantity } }
      );
      return res.json({ success: true, message: `Đã giảm ${quantity} sản phẩm khỏi giỏ` });
    } else {
      // 🔹 Xoá luôn nếu quantity >= số lượng hiện có
      await cartCol.deleteOne({ _id: item._id });
      return res.json({ success: true, message: "Đã xóa sản phẩm khỏi giỏ hàng" });
    }
  }
);


module.exports = router;