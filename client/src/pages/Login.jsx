import React, { useState } from "react";
import axios from "axios";
import "./Auth.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [message, setMessage] = useState("");
 
  const navigate = useNavigate();

 
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };// Cập nhật trạng thái form khi người dùng nhập liệu

  const handleSubmit = async (e) => {
    e.preventDefault();
      
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      localStorage.setItem("token", res.data.token);// Lưu token vào localStorage
      localStorage.setItem("user", JSON.stringify(res.data.user));// Lưu thông tin user vào localStorage
      console.log("User lưu vào localStorage:", res.data.user);
      const user = res.data.user;
      console.log("Đăng nhập thành công:", user);
       setTimeout(() => {
        navigate(`/home/${user.id}`);
         //chuyển hướng sau khi đăng ký thành công
      }, 1000); //chờ 1 giây trước khi chuyển hướng
      setMessage("✅ " + res.data.message);
    } catch (err) {
      
      setMessage("❌ " + (err.response?.data?.message || "Đăng nhập thất bại"));
    }
  };// Xử lý khi người dùng submit form

  return (
    <div className="auth-container">
      
      {/* Cột phải: Form đăng nhập */}
      <div className="auth-right">
        <div className="auth-card">
          <h2> Đăng nhập</h2>
          <form onSubmit={handleSubmit}>
            <input type="text" name="identifier" placeholder="Email hoặc username" onChange={handleChange} required />
            <input type="password" name="password" placeholder="Mật khẩu" onChange={handleChange} required />
            <button type="submit">Đăng nhập</button>
          </form>
          <p className="switch">
            Chưa có tài khoản? <a href="/register">Đăng ký</a>
          </p>
          {message && <p className="msg">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default Login;
