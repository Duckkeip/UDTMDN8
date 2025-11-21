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
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');

    const ipAddr = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress?.replace('::ffff:', '') || 
               '127.0.0.1';

    const tmnCode = config.get('vnp_TmnCode');
    const secretKey = config.get('vnp_HashSecret');
    let vnpUrl = config.get('vnp_Url');
    const returnUrl = config.get('vnp_ReturnUrl');
    const url = require('url');
    let { amount, bankCode, language, user_id } = req.body;
    if (!language) language = 'vn';
    const currCode = 'VND';

    const database = await db();

    // 1️⃣ Lấy giỏ hàng
    const cart = await database.collection("giohang").findOne({ user: user_id });
    if (!cart || !cart.chitietgiohang || cart.chitietgiohang.length === 0) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống hoặc không tồn tại" });
    }
    console.log("cart:", cart);
    // 2️⃣ Tính tổng tiền
    const totalAmount = cart.chitietgiohang.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 3️⃣ Tạo order trong DB
    const newOrder = {
      user_id,
      items: cart.chitietgiohang.map(item => ({
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      status: 0, // chưa thanh toán
      total_amount: totalAmount,
      created_at: new Date()
    };

    const result = await database.collection('donhang').insertOne(newOrder);

    // 4️⃣ TxnRef max 20 ký tự → lấy 12 ký tự cuối của ObjectId
    const orderId = String(result.insertedId).slice(-12);

    // 5️⃣ Tạo params VNPAY
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: language,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan ma GD ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: totalAmount * 100, // *100 theo VNPAY
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };
    console.log("vnp_Params:", vnp_Params);
    if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

    // 6️⃣ Sort params
    vnp_Params = sortObject(vnp_Params);

    // 7️⃣ Tạo hash
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;

    // 8️⃣ Tạo URL
    vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

    res.json({
      success: true,
      url: vnpUrl
    });

  } catch (err) {
    console.error("💥 Lỗi tạo URL VNPAY:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
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
