import React, { useState } from 'react';
import Footer from '../components/Footer';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';
import Checkout from '../components/Checkout';
import SearchBar from '../components/SearchBar';
import '../pages/styles/main.css';

const Home = ({ onAddToCart, cartCount, setCartCount }) => {
    const [filters, setFilters] = useState({ make: '', model: '', year: '', search: '' });
    const [searchTrigger, setSearchTrigger] = useState(0);
    const [showCart, setShowCart] = useState(false);

    const handleSearch = () => {
        setSearchTrigger(prev => prev + 1);
    };

    const handleAddToCart = () => {
        setShowCart(true);
    };

    return (
        <>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h2 className="section-title">Find Quality Spare Parts for Your Vehicle</h2>
                    <div className="hero-search-bar">
                        <SearchBar filters={filters} setFilters={setFilters} onSearch={handleSearch} />
                    </div>
                    <p className="hero-subtitle">Browse our extensive catalog of automotive spare parts and accessories. Fast delivery, trusted sellers, and the best prices online.</p>
                </div>
            </section>

            {/* Categories Section */}
            <section className="categories-section">
                <h2 className="section-title">Shop by Category</h2>
                <div className="section-divider"></div>
                <div className="categories-grid">
                    {/* Engine Parts */}
                    <div className="category-card">
                        <div className="category-icon" aria-label="engine">🔋</div>
                        <div className="category-title">Engine Parts</div>
                        <div className="category-desc">Filters, pumps, belts and more</div>
                        <button className="btn btn-outline">Browse</button>
                    </div>
                    {/* Brake System */}
                    <div className="category-card">
                        <div className="category-icon" aria-label="brake">🔴</div>
                        <div className="category-title">Brake System</div>
                        <div className="category-desc">Pads, rotors, calipers</div>
                        <button className="btn btn-outline">Browse</button>
                    </div>
                    {/* Cooling System */}
                    <div className="category-card">
                        <div className="category-icon" aria-label="cooling">🌀</div>
                        <div className="category-title">Cooling System</div>
                        <div className="category-desc">Radiators, thermostats, hoses</div>
                        <button className="btn btn-outline">Browse</button>
                    </div>
                    {/* Lighting */}
                    <div className="category-card">
                        <div className="category-icon" aria-label="lighting">💡</div>
                        <div className="category-title">Lighting</div>
                        <div className="category-desc">Headlights, bulbs, assemblies</div>
                        <button className="btn btn-outline">Browse</button>
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <div className="home" id="products-section">
                <div style={{ flex: 1 }}>
                  <ProductList filters={filters} searchTrigger={searchTrigger} onAddToCart={handleAddToCart} onCartCountChange={setCartCount} />
                </div>
            </div>

            {/* Benefits Section */}
            <section className="benefits-section">
                <h2 className="section-title">Why Choose Us?</h2>
                <div className="benefits-grid">
                    <div className="benefit-card"><i className="fas fa-shipping-fast"></i><h3>Fast Delivery</h3><p>Get your parts delivered quickly and reliably.</p></div>
                    <div className="benefit-card"><i className="fas fa-shield-alt"></i><h3>Trusted Sellers</h3><p>Buy from verified and reputable sellers only.</p></div>
                    <div className="benefit-card"><i className="fas fa-tags"></i><h3>Best Prices</h3><p>Competitive prices on all products.</p></div>
                    <div className="benefit-card"><i className="fas fa-headset"></i><h3>Support</h3><p>24/7 customer support for all your needs.</p></div>
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="cta-section">
                <h2>Ready to find your part?</h2>
                <p>Sign up now and get access to exclusive deals and fast shipping!</p>
                <div className="cta-buttons">
                    <a href="#products-section" className="btn btn-primary">Browse Products</a>
                    <a href="/auth" className="btn btn-secondary">Register</a>
                </div>
            </section>
            <Footer />

            {/* Cart Sidebar Popup */}
            {showCart && <Cart show={showCart} onClose={() => setShowCart(false)} />}
        </>
    );
};

export default Home;