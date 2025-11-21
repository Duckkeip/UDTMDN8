import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'

import Products from './components/products/Products.jsx'

import Cart from './components/cart/Cart.jsx'
import Navbar from './components/Navbar.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import DetailF from './components/products/detail/detail.jsx'
import VnpayReturn from './components/vnpay/vnpayReturn'
function App() {

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home/:id" element={<Home />} />

        {/* Sản phẩm */}
        <Route path="/products" element={<Products />} />

        {/* ✅ Route Detail xem chi tiết */}
        <Route path="/detail/:pid" element={<DetailF />} />
        
        {/* Giỏ hàng */}
        <Route path="/cart/:id" element={<Cart />} />
        
        {/* VNPAY RETURN */}
        <Route path="/vnpay_return" element={<VnpayReturn />} /> 

        {/* LOGIN/OUT */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
