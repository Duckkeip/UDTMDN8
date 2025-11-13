import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaSearch } from "react-icons/fa";
import { GoPersonFill } from "react-icons/go";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  // ✅ Tránh lỗi JSON.parse khi user chưa tồn tại
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userId = user ? user.id : "guest";

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      <div className="navbar">

        {/* Logo bên trái */}
        <div className="navbar-left">
          <Link to="/">
            <img
              src="https://www.coolmate.me/images/logo.png"
              alt="Coolmate"
              className="logo"
            />
          </Link>
        </div>

        {/* Các link chính */}
        <div className="navbar-links">
          <Link to="/products">THỂ THAO</Link>
        </div>

        {/* Khu vực bên phải */}
        <div className="navbar-right">

          {/* Search box */}
          <div className="search-box">
            <input type="text" placeholder="Tìm kiếm..." />
            <FaSearch size={20} color="gray" className="search-icon" />
          </div>

          {/* Nếu chưa đăng nhập */}
          {!user && (
            <Link to="/login" className="login-icon">
              <GoPersonFill size={25} />
            </Link>
          )}

          {/* Nếu đã đăng nhập */}
          {user && (
            <div className="user-info">
              <span className="welcome-text">Xin chào, {user.username}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}

          {/* Giỏ hàng */}
          <Link to={`/cart/${userId}`} className="cart-icon">
            <FaShoppingCart size={25} />
          </Link>
        </div>
      </div>

      {/* Dòng chữ khuyến mãi */}
      <div className="sales">
        <div className="marquee-text">
          NHẬP COOLNEW GIẢM 50K ĐƠN ĐẦU TIÊN TỪ 299K
        </div>
      </div>
    </>
  );
}

export default Navbar;
