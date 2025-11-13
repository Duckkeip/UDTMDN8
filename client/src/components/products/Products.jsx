import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Products.css";

const priceRanges = [
  { label: "< 100.000đ", min: 0, max: 100000 },
  { label: "100.000đ - 200.000đ", min: 100000, max: 200000 },
  { label: "200.000đ - 300.000đ", min: 200000, max: 300000 },
  { label: "300.000đ - 400.000đ", min: 300000, max: 400000 },
  { label: "400.000đ - 500.000đ", min: 400000, max: 500000 },
  { label: "> 500.000đ", min: 500000, max: Infinity }
];

function Products() {
  const location = useLocation(); 
  const user_id = location.state?.user_id || JSON.parse(localStorage.getItem("user"))?.id;
  const userId = user_id || "1";

  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    types: "",
    colors: "",
    sizes: "",
    priceRange: null,
    rating: 0,
    gender: ""
  });
  const [dropdownOpen, setDropdownOpen] = useState({
    type: false,
    color: false,
    size: false,
    price: false,
    gender: false
  });

  // Lấy dữ liệu sản phẩm từ API
  useEffect(() => {
    fetch("http://localhost:5000/api/products/sanpham")
      .then(res => res.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch((err) => console.log("Lỗi fetch sản phẩm:", err));
  }, []);

  const handleSelect = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? "" : value
    }));
  };

  const handlePriceSelect = (range) => {
    setFilters((prev) => ({
      ...prev,
      priceRange: prev.priceRange === range ? null : range
    }));
  };

  const handleRatingFilter = () => {
    setFilters((prev) => ({
      ...prev,
      rating: prev.rating === 5 ? 0 : 5
    }));
  };

  // Lọc sản phẩm dựa trên filters
  const filteredProducts = products.filter((p) => {
    const matchType = !filters.types || p.type === filters.types;
    const matchColor = !filters.colors || p.color === filters.colors;
    const matchSize = !filters.sizes || p.size === filters.sizes;
    const matchPrice =
      !filters.priceRange ||
      (p.price >= filters.priceRange.min && p.price <= filters.priceRange.max);
    const matchRating = !filters.rating || (p.rating || 0) >= filters.rating;

    // lọc theo gender
    let matchGender = true;
    if (filters.gender) {
      matchGender = p.gender === filters.gender;
    }

    return matchType && matchColor && matchSize && matchPrice && matchRating && matchGender;
  });

  return (
    <div className="p-product-container">
      <aside className="p-product-sidebar">
        <h2>Bộ lọc</h2>

        <FilterDropdown
          label="Danh mục"
          open={dropdownOpen.type}
          toggle={() => setDropdownOpen((p) => ({ ...p, type: !p.type }))}
          options={["Áo Hoodie Nam", "Áo Khoác Gió", "Áo Phao Nam"]}
          active={filters.types}
          onSelect={(v) => handleSelect("types", v)}
        />

        <FilterDropdown
          label="Màu sắc"
          open={dropdownOpen.color}
          toggle={() => setDropdownOpen((p) => ({ ...p, color: !p.color }))}
          options={["Đen", "Xám", "Đỏ", "Trắng", "Xanh", "Vàng"]}
          active={filters.colors}
          onSelect={(v) => handleSelect("colors", v)}
        />

        <FilterDropdown
          label="Kích thước"
          open={dropdownOpen.size}
          toggle={() => setDropdownOpen((p) => ({ ...p, size: !p.size }))}
          options={["M", "L", "XL"]}
          active={filters.sizes}
          onSelect={(v) => handleSelect("sizes", v)}
        />

        <FilterPriceDropdown
          open={dropdownOpen.price}
          toggle={() => setDropdownOpen((p) => ({ ...p, price: !p.price }))}
          ranges={priceRanges}
          active={filters.priceRange}
          onSelect={handlePriceSelect}
        />

        <FilterDropdown
          label="Giới tính"
          open={dropdownOpen.gender}
          toggle={() => setDropdownOpen((p) => ({ ...p, gender: !p.gender }))}
          options={["Nam", "Nữ", "Unisex"]}
          active={filters.gender ? filters.gender : ""}
          onSelect={(v) => {
            let genderValue = "";
            if (v === "Nam") genderValue = "man";
            else if (v === "Nữ") genderValue = "woman";
            else if (v === "Unisex") genderValue = "unisex";
            handleSelect("gender", genderValue);
          }}
        />

        <button className="p-dropdown-toggle" onClick={handleRatingFilter}>
          ⭐ 5 sao trở lên
        </button>
        <button
          className="p-btn-reset"
          onClick={() =>
            setFilters({
              types: "",
              colors: "",
              sizes: "",
              priceRange: null,
              rating: 0,
              gender: ""
            })
          }
        >
          🔄 Xóa bộ lọc
        </button>
      </aside>

      <main className="p-product-list">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => (
            <div className="p-product-card" key={p._id}>
              <img src={p.image || "/no-image.png"} alt={p.name} />
              <div className="p-product-name">{p.name}</div>
              <div className="p-product-info">{p.brand}</div>
              <div className="p-product-info text-warning">⭐ {p.rating || 0}</div>
              <div className="p-product-info text-success">
                {p.price.toLocaleString("vi-VN")} ₫
              </div>
              <button className="btn-cart">
                <i className="bi bi-cart"></i> Add to cart
              </button>
              <Link
                to={`/detail/${p._id}`}
                state={{ user_id: userId }}
                className="btn-detail"
              >
                <i className="bi bi-eye"></i> Xem chi tiết
              </Link>
            </div>
          ))
        ) : (
          <p>Không tìm thấy sản phẩm phù hợp.</p>
        )}
      </main>
    </div>
  );
}

// Component dropdown giá tiền
const FilterPriceDropdown = ({ open, toggle, ranges, active, onSelect }) => (
  <div className="p-filter-group">
    <button className="p-dropdown-toggle" onClick={toggle}>
      Giá tiền <span>▼</span>
    </button>
    {open && (
      <div className="p-dropdown-menu no-checkbox">
        {ranges.map((r, i) => (
          <div
            key={i}
            className={`p-dropdown-option ${active === r ? "active" : ""}`}
            onClick={() => onSelect(r)}
          >
            {r.label}
          </div>
        ))}
      </div>
    )}
  </div>
);

// Component dropdown chung (type, color, size, gender)
const FilterDropdown = ({ label, open, toggle, options, active, onSelect }) => (
  <div className="p-filter-group">
    <button className="p-dropdown-toggle" onClick={toggle}>
      {label} <span>▼</span>
    </button>
    {open && (
      <div className="p-dropdown-menu">
        {options.map((option, i) => (
          <div
            key={i}
            className={`p-dropdown-option ${active === option || active === mapGender(option) ? "active" : ""}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </div>
        ))}
      </div>
    )}
  </div>
);

// mapGender để highlight đúng giá trị khi filter gender
const mapGender = (text) => {
  if (text === "Nam") return "man";
  if (text === "Nữ") return "woman";
  if (text === "Unisex") return "unisex";
  return "";
};

export default Products;
