const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const db = require("../config/db");
const moment = require("moment");
const crypto = require("crypto");
const qs = require("qs");

let config = require("config");

// Hàm sắp xếp object theo key
function sortObject(obj) {
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
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
router.post('/create_payment_url', async (req, res) => {
  try {
    console.log("===== 📥 NHẬN YÊU CẦU TẠO URL THANH TOÁN =====");
    console.log("Body FE gửi lên:", req.body);

    process.env.TZ = 'Asia/Ho_Chi_Minh';

    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress?.replace("::ffff:", "") ||
      "127.0.0.1";

    const tmnCode = config.get("vnp_TmnCode");
    const secretKey = config.get("vnp_HashSecret");
    let vnpUrl = config.get("vnp_Url");
    const returnUrl = config.get("vnp_ReturnUrl");

    // ===== LẤY DỮ LIỆU =====
    let { amount, bankCode, language, user_id, order_id } = req.body;

    console.log("👉 amount:", amount);
    console.log("👉 user_id:", user_id);
    console.log("👉 order_id:", order_id);

    if (!order_id) {
      console.log("❌ ERROR: Thiếu order_id từ FE");
      return res.status(400).json({
        success: false,
        message: "Thiếu order_id"
      });
    }

    if (!language) language = "vn";

    // Rút gọn orderId
    const shortOrderId = order_id.slice(-20);
    console.log("👉 shortOrderId (gửi VNPAY):", shortOrderId);
    // Tạo TxnRef mới mỗi lần
const vnp_TxnRef = moment().format("HHmmss") + Math.floor(Math.random() * 10000);

    // ===== TẠO PARAMS VNPAY =====
    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: language,
      vnp_CurrCode: "VND",
      vnp_TxnRef: shortOrderId,
      vnp_OrderInfo: "Thanh toan don hang " + order_id,
      vnp_OrderType: "other",
      vnp_Amount: amount * 1000,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      console.log("👉 Có bankCode:", bankCode);
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    console.log("📌 Params trước sort:", vnp_Params);

    // ===== Sort Params =====
    vnp_Params = sortObject(vnp_Params);

    console.log("📌 Params sau sort:", vnp_Params);

    // ===== Tạo secure hash =====
    const signData = qs.stringify(vnp_Params, { encode: false });
    console.log("🔐 signData trước hash:", signData);

    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("🔐 Secure Hash tạo ra:", signed);

    vnp_Params["vnp_SecureHash"] = signed;

    // ===== Tạo URL =====
    const finalUrl = vnpUrl + "?" + qs.stringify(vnp_Params, { encode: false });

    console.log("🚀 URL gửi VNPAY:", finalUrl);

    return res.json({
      success: true,
      url: finalUrl
    });

  } catch (err) {
    console.error("💥 Lỗi tạo URL VNPAY:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message
    });
  }
});


// ======================= XỬ LÝ RETURN VNPAY =======================
router.get('/vnpay_return', async function (req, res, next) { 
    let vnp_Params = req.query; 
 
    let secureHash = vnp_Params['vnp_SecureHash']; 
 
    delete vnp_Params['vnp_SecureHash']; 
    delete vnp_Params['vnp_SecureHashType']; 
 
    vnp_Params = sortObject(vnp_Params); 
 
    let config = require('config'); 
    let tmnCode = config.get('vnp_TmnCode'); 
    let secretKey = config.get('vnp_HashSecret'); 
 
    let querystring = require('qs'); 
    let signData = querystring.stringify(vnp_Params, { encode: false });let crypto = require("crypto"); 
    let hmac = crypto.createHmac("sha512", secretKey); 
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex"); 
 
    if (secureHash === signed) { 
        //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua 
 
        // Cap nhat lai status của order 
        const database = await db(); 
 
        const orderId = req.query.vnp_TxnRef; 
        const _id = new ObjectId(orderId); 
 
        const order = await database.collection("donhang").findOne({ _id }); 
 
        if (order) { 
            await database.collection("donhang").updateOne( 
                { _id }, 
                { $set: { status: 1 } } // đã thanh toán 
            ); 
 
            // Xóa dữ liệu giỏ hàng 
            const user_id = order.user_id; 
            await database.collection("giohang").deleteOne({ user_id: user_id }) 
        } 
 
        // res.render('success', { code: vnp_Params['vnp_ResponseCode'] }) 
 
    } else { 
        // res.render('success', { code: '97' }) 
    } 
    res.redirect('http://localhost:5173/vnpay_return?' + querystring.stringify(vnp_Params, { encode: 
false })); 
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
