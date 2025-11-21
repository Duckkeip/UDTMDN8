
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Cart.css";

function Cart() {
  const location = useLocation();
  const user_id = location.state?.user_id || JSON.parse(localStorage.getItem("user"))?.id;

  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null); // lưu phản hồi từ server

  useEffect(() => {
    if (!user_id) return;
    fetchCart();
  }, [user_id]);

  const fetchCart = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/cart/${user_id}`);
      const data = await res.json();
  
      if (data.cart && data.cart.chitietgiohang) {
  
        setCartItems(data.cart.chitietgiohang);
  
        const sum = data.cart.chitietgiohang.reduce(
          (acc, item) => acc + item.quantity * item.price,
          0
        );
  
        setTotal(sum);
      }
    } catch (err) {
      console.error("💥 Lỗi lấy giỏ hàng:", err);
    }
  };
  
// Giảm số lượng 1 sản phẩm
const handleDecrease = async (productId, currentQuantity, name) => {
  try {
    const newQuantity = currentQuantity - 1;
    if (newQuantity < 1) return; // không giảm dưới 1

    const res = await fetch(`http://localhost:5000/api/cart/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user_id, productId, quantity: newQuantity }),
    });
    
    const data = await res.json();
    
    if (data.success) {
      fetchCart();
      window.alert(`Đã giảm 1 ${name}`);
    }
  } catch (err) {
    console.error(err);
  }
};

// Tăng số lượng 1 sản phẩm
const handleIncrease = async (productId, currentQuantity, name) => {
  try {
    const res = await fetch(`http://localhost:5000/api/cart/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user_id, productId, quantity: currentQuantity + 1 }),
    });
    const data = await res.json();
    if (data.success) {
      fetchCart();
      window.alert(`Đã tăng 1 ${name} `);
    }
  } catch (err) {
    console.error(err);
  }
};

// Xoá hoàn toàn sản phẩm
const handleRemoveAll = async (productId, name) => {
  try {
    const res = await fetch(`http://localhost:5000/api/cart/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user_id, productId }),
    });
    const data = await res.json();
    if (data.success) {
      fetchCart();
      window.alert(`Đã xoá ${name} khỏi giỏ`);
    }
  } catch (err) {
    console.error(err);
  }
};


// Thêm hàm xoá toàn bộ giỏ hàng
const handleClearCart = async () => {
  if (!user_id) return;
  const confirm = window.confirm("Bạn có chắc muốn xoá toàn bộ giỏ hàng không?");
  if (!confirm) return;

  try {
    const res = await fetch(`http://localhost:5000/api/cart/${user_id}/clear`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.success) {
      setCartItems([]);
      setTotal(0);
      window.alert("Đã xoá toàn bộ giỏ hàng!");
    }
  } catch (err) {
    console.error("💥 Lỗi xoá toàn bộ giỏ hàng:", err);
  }
};

const handlePlaceOrder = async () => {
  try {
    const resOrder = await fetch(`http://localhost:5000/api/pay/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: user_id,
        chitietdonhang: cartItems,
        tongtien: total,
        thanhtoan: false, 
        status: "dangcho",
        address: "",
      }),
    });

    const data = await resOrder.json();
    if (!data.success) return window.alert("💥 Lỗi tạo đơn hàng");

    setOrderStatus(data.order); // lưu order vừa tạo
    setShowModal(true);         // bật modal hóa đơn
  } catch (err) {
    console.error("💥 Lỗi đặt hàng:", err);
  }
};
  return (
    <div className="cart-container">
      <h3>Giỏ hàng của bạn</h3>
      
      {cartItems.length === 0 ? (
        <p>Giỏ hàng trống.</p>
      ) : (
        <>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Hình</th>
                <th>Sản phẩm</th>
                <th>Giá</th>
                <th>Số lượng</th>
                <th>Tổng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {cartItems.map((item) => (
              <tr key={item.productId}>
                <td>
                  <img src={item.image} alt={item.name} className="cart-img" />
                </td>
                <td>{item.name}</td>
                <td>{item.price ? item.price.toLocaleString("vi-VN") : "0"}₫</td>
                <td>{item.quantity}</td>
                <td>
                  {item.price
                    ? (item.quantity * item.price).toLocaleString("vi-VN")
                    : "0"}₫
                </td>
                <td>
                  <button onClick={() => handleIncrease(item.productId, item.quantity, item.name)}>
                    +
                  </button>
                  <button onClick={() => handleDecrease(item.productId, item.quantity, item.name)}>
                    -
                  </button>
                  <button onClick={() => handleRemoveAll(item.productId, item.name )}>X</button>
                </td>
              </tr>
            ))}
          </tbody>

          </table>
          <h4>Tổng tiền: {total.toLocaleString("vi-VN")}₫</h4>

           {cartItems.length > 0 && (
        <>
          <section className="cart-actions">
          
           <button className="clear-cart-btn" onClick={handleClearCart}>
          Xoá toàn bộ giỏ hàng
        </button>
        </section>
        <section>
        <button className="place-order-btn" onClick={handlePlaceOrder}>
            Đặt hàng
          </button>
        </section>
        </>
      )}
      
        </>
      )}
    {/* Modal hiển thị hóa đơn */}
     {showModal && orderStatus && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Hóa đơn của bạn</h3>
            <p>Order ID: {orderStatus._id}</p>
            <p>Tổng tiền: {orderStatus.tongtien.toLocaleString("vi-VN")}₫</p>
            <p>Trạng thái: {orderStatus.status}</p>

            <table className="cart-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Giá</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {orderStatus.chitietdonhang.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price.toLocaleString("vi-VN")}₫</td>
                    <td>{(item.quantity * item.price).toLocaleString("vi-VN")}₫</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Hành động trong modal */}
            <div className="modal-actions">
              {/* Hủy đơn */}
              <button onClick={async () => {
                await fetch(`http://localhost:5000/api/pay/${orderStatus._id}/cancel`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                });
                setShowModal(false);
              }}>Hủy đơn</button>

              {/* Thanh toán */}
              <button onClick={async () => {
                  try {
                    const orderData = { 
                      amount: orderStatus.tongtien, 
                      order_id: orderStatus._id,
                      bankCode: '', 
                      language: 'vn', 
                      user_id: user_id
                    };

                    const res = await fetch(`http://localhost:5000/api/pay/create_payment_url`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(orderData),
                    });

                    const result = await res.json();
                    if (result.success && result.url) {
                      window.open(result.url, "_blank"); // mở tab mới thanh toán
                    } else {
                      window.alert("💥 Lỗi tạo URL thanh toán VNPAY");
                    }
                  } catch (err) {
                    console.error("💥 Lỗi thanh toán:", err);
                  }
                }}>
                  Thanh toán
                </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;