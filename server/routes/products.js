
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




module.exports = router;