import React from "react";
import { useParams, useLocation } from "react-router-dom";
import "./detail.css";

function DetailF(props) {
  const { pid } = useParams();
  const location = useLocation();
  const user_id = location.state?.user_id || JSON.parse(localStorage.getItem("user"))?.id;

  if (!pid) return <p>Sản phẩm không tồn tại</p>;
  return <Detail {...props} id={pid} user_id={user_id} />;
}

class Detail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      product_data: {},
      quantity: 1,
      activeTab: "description",
      selectedImage: null,
      relatedProducts: [],
      cartCount: 0,
    };
  }

  componentDidMount() {
    this.getDetailProduct(this.props.id);
    this.loadCartCount();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.id !== this.props.id) {
      this.getDetailProduct(this.props.id);
    }
  }

  getDetailProduct = (id) => {
    fetch(`http://localhost:5000/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        // fix: dùng data.product nếu API trả về object 'product'
        const product = data.product || data.products; 
        if (!product) return; // tránh lỗi nếu null
  
        const imagesArray = product.images?.length
          ? product.images
          : product.image
          ? [product.image]
          : [];
  
        this.setState({
          product_data: { ...product, images: imagesArray },
          selectedImage: imagesArray[0] || "",
          quantity: 1,
        });
  
        this.getRelatedProducts(product.type);
      })
      .catch((err) => console.error(err));
  };
  getRelatedProducts = (type) => {
    if (!type) return;
    fetch(`http://localhost:5000/api/products/byType/${type}`)
      .then((res) => res.json())
      .then((data) => this.setState({ relatedProducts: data.products || [] }))
      .catch((err) => console.error(err));
  };

  onChangeTabChange = (tab) => this.setState({ activeTab: tab });
  onChangeImageSelect = (img) => this.setState({ selectedImage: img });
  onChangeQuantity = (e) => {
    const value = Number(e.target.value);
    if (value > 0) this.setState({ quantity: value });
  };

  onClickBuyNow = () => alert(`Đặt mua ${this.state.quantity} sản phẩm thành công!`);

  loadCartCount = async () => {
    const { user_id } = this.props;
    try {
      const res = await fetch(`http://localhost:5000/api/cart/${user_id}`);
      const data = await res.json();
      if (data.cart) {
        const total = data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        this.setState({ cartCount: total });
      }
    } catch (err) {
      console.error(err);
    }
  };

  onClickAddToCart = async () => {
    const { user_id } = this.props;
    const { product_data, quantity, cartCount } = this.state;
    const product = {
      product_id: product_data._id,
      name: product_data.name,
      price: product_data.price,
      image: product_data.image,
      quantity: quantity,
    };

    try {
      const res = await fetch("http://localhost:5000/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, product }),
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        this.setState({ cartCount: cartCount + quantity });
      }
    } catch (err) {
      console.error(err);
      alert("💥 Lỗi khi thêm vào giỏ hàng");
    }
  };

  onClickSelectedId = (id) => (window.location.href = `/detail/${id}`);

  render() {
    const { product_data, selectedImage, quantity, activeTab, relatedProducts } = this.state;

    return (
      <div className="product-detail-container">
        <h3>{product_data.name}</h3>

        <div className="row">
          <div className="col-md-6">
            <img
              src={selectedImage}
              alt={product_data.name}
              className="img-fluid rounded mb-3"
              style={{ maxHeight: "240px", objectFit: "contain" }}
            />
            <div className="thumbnail-list">
              {product_data.images?.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`thumb-${idx}`}
                  className={`img-thumbnail ${selectedImage === img ? "border-primary" : ""}`}
                  style={{ width: "80px", height: "80px", cursor: "pointer", objectFit: "contain" }}
                  onClick={() => this.onChangeImageSelect(img)}
                />
              ))}
            </div>
          </div>

          <div className="col-md-6">
            <p>{product_data.description}</p>
            <div className="d-flex align-items-center mb-3">
              <label className="me-2 fw-semibold">Số lượng:</label>
              <input
                type="number"
                className="form-control quantity-input"
                value={quantity}
                min="1"
                style={{ width: "80px" }}
                onChange={this.onChangeQuantity}
              />
            </div>
            <h4 className="fw-bold text-success mb-4">
              {product_data.price ? `${product_data.price.toLocaleString("vi-VN")}₫` : "0₫"}
            </h4>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary" onClick={this.onClickBuyNow}>
                Mua ngay
              </button>
              <button className="btn btn-primary" onClick={this.onClickAddToCart}>
                🛒 Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>

        <ul className="nav nav-tabs mt-5">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === "description" ? "active" : ""}`} onClick={() => this.onChangeTabChange("description")}>Mô tả</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === "review" ? "active" : ""}`} onClick={() => this.onChangeTabChange("review")}>Đánh giá (0)</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === "related" ? "active" : ""}`} onClick={() => this.onChangeTabChange("related")}>Sản phẩm liên quan</button>
          </li>
        </ul>

        <div className="border border-top-0 p-3">
          {activeTab === "description" && (
            <div>
              <h5>Tổng quan</h5>
              <p>{product_data.description}</p>
              <p><strong>Thương hiệu:</strong> {product_data.brand}</p>
            </div>
          )}

          {activeTab === "review" && <p>Chưa có đánh giá nào.</p>}

          {activeTab === "related" && (
            <div className="row related-products">
              {relatedProducts.length === 0 && <p>Không có sản phẩm liên quan.</p>}
              {relatedProducts.map((item) => (
                <div key={item._id} className="col-md-3 mb-3">
                  <div className="card h-100" onClick={() => this.onClickSelectedId(item._id)} style={{ cursor: "pointer" }}>
                    <img src={item.image} alt={item.name} className="card-img-top" style={{ height: "120px", objectFit: "contain" }} />
                    <div className="card-body text-center">
                      <h6>{item.name}</h6>
                      <p className="text-success fw-bold">{item.price.toLocaleString("vi-VN")}₫</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default DetailF;
