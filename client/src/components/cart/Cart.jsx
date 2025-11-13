
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Products.css";

function Cart() {
  const location = useLocation();
  const user_id = location.state?.user_id || JSON.parse(localStorage.getItem("user"))?.id;

  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user_id) return;
    fetchCart();
  }, [user_id]);

  const fetchCart = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/cart/${user_id}`);
      const data = await res.json();
      if (data.cart) {
        setCartItems(data.cart.items);
        const sum = data.cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
        setTotal(sum);
      }
    } catch (err) {
      console.error("💥 Lỗi lấy giỏ hàng:", err);
    }
  };

  // 🔹 Giảm số lượng 1 sản phẩm
  const handleDecrease = async (productId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/cart/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, productId, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCart();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 Xoá hoàn toàn sản phẩm
  const handleRemoveAll = async (productId, quantity) => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/cart/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, productId, quantity }), // gửi quantity = tổng số lượng để xoá hết
      });
      const data = await res.json();
      if (data.success) {
        fetchCart();
      }
    } catch (err) {
      console.error(err);
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
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <img src={item.image} alt={item.name} className="cart-img" />
                  </td>
                  <td>{item.name}</td>
                  <td>{item.price.toLocaleString("vi-VN")}₫</td>
                  <td>{item.quantity}</td>
                  <td>{(item.quantity * item.price).toLocaleString("vi-VN")}₫</td>
                  <td>
                    <button onClick={() => handleDecrease(item.productId)}>-</button>
                    <button onClick={() => handleRemoveAll(item.productId, item.quantity)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Tổng tiền: {total.toLocaleString("vi-VN")}₫</h4>
        </>
      )}
    </div>
  );
}

export default Cart;