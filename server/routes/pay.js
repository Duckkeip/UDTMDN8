const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const db = require("../config/db");
const moment = require("moment");
const crypto = require("crypto");
const qs = require("qs");
const config = require("config");

// Hàm sắp xếp object theo key
function sortObject(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// ======================= TẠO ĐƠN HÀNG =======================
router.post("/create", async (req, res) => {
  try {
    const database = await db();
    const { user, chitietdonhang, tongtien, thanhtoan, status, address } = req.body;

    if (!user || !chitietdonhang || !tongtien) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin đơn hàng" });
    }

    const newOrder = {
      user,
      chitietdonhang,
      tongtien,
      thanhtoan: thanhtoan || false,
      status: status || "dangcho",
      address: address || "",
      createdAt: new Date(),
    };

    const result = await database.collection("donhang").insertOne(newOrder);
    const order = await database.collection("donhang").findOne({ _id: result.insertedId });

    res.json({ success: true, order });
  } catch (err) {
    console.error("💥 Lỗi tạo đơn hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ======================= HỦY ĐƠN =======================
router.put("/:orderId/cancel", async (req, res) => {
  try {
    const database = await db();
    const { orderId } = req.params;
    await database.collection("donhang").updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: "huy" } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ======================= THANH TOÁN THỦ CÔNG =======================
router.put("/:orderId/pay", async (req, res) => {
  try {
    const database = await db();
    const { orderId } = req.params;
    await database.collection("donhang").updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { thanhtoan: true, status: "dathanhtoan" } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ======================= TẠO URL THANH TOÁN VNPAY =======================
router.post("/create_payment_url", async (req, res) => {
  try {
    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = moment(date).format("DDHHmmss"); // hoặc dùng _id MongoDB
    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const tmnCode = config.get("vnp_TmnCode");
    const secretKey = config.get("vnp_HashSecret");
    let vnpUrl = config.get("vnp_Url");
    const returnUrl = config.get("vnp_ReturnUrl");

    const amount = req.body.amount; // VNĐ
    const bankCode = req.body.bankCode;
    let locale = req.body.language || "vn";
    const currCode = "VND";

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan cho ma GD: ${orderId}`,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    const paymentUrl = vnpUrl + "?" + qs.stringify(vnp_Params, { encode: false });

    // Trả về URL để frontend redirect
    res.json({ success: true, url: paymentUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ======================= XỬ LÝ RETURN VNPAY =======================
router.get("/vnpay_return", (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const secretKey = config.get("vnp_HashSecret");
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  if (secureHash === signed) {
    res.render("success", { code: vnp_Params["vnp_ResponseCode"] });
  } else {
    res.render("success", { code: "97" });
  }
});

// ======================= IPN VNPAY =======================
router.get("/vnpay_ipn", (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const secretKey = config.get("vnp_HashSecret");
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  if (secureHash === signed) {
    // TODO: kiểm tra orderId, amount, cập nhật trạng thái trong DB
    res.status(200).json({ RspCode: "00", Message: "Success" });
  } else {
    res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
  }
});

module.exports = router;
