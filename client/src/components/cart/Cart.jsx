
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Cart.css";

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
        </>
      )}
    </div>
  );
}

export default Cart;