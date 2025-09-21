import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiSearch, FiHeart, FiShoppingCart } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import AuthModal from "./AuthModal";
import { useAuth } from "../context/AuthContext";
import { fetchCart, fetchWishlist } from "../utils/api";
export default function Navbar() {
  // Track window width for mobile sidebar logic
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Always close sidebar on initial mount
  useEffect(() => {
    setShowMobileMenu(false);
  }, []);
  const { user, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Helper to logout and redirect
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const fetchCounts = async () => {
      if (user && user._id) {
        try {
          const cart = await fetchCart(user._id);
          const cartArr = Array.isArray(cart?.data) ? cart.data : (Array.isArray(cart) ? cart : []);
          setCartCount(cartArr.length);
        } catch (e) {
          setCartCount(0);
        }
        try {
          const wishlist = await fetchWishlist(user._id);
          const wishlistArr = Array.isArray(wishlist?.data) ? wishlist.data : (Array.isArray(wishlist) ? wishlist : []);
          setWishlistCount(wishlistArr.length);
        } catch (e) {
          setWishlistCount(0);
        }
      } else {
        setCartCount(0);
        setWishlistCount(0);
      }
    };
    fetchCounts();
    // Listen for global cart/wishlist changes
    const handler = () => fetchCounts();
    window.addEventListener('cartWishlistUpdated', handler);
    return () => window.removeEventListener('cartWishlistUpdated', handler);
  }, [user]);
  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-700 hover:text-black transition-colors duration-200">
            MobileStore
          </Link>

          {/* Desktop/tablet nav: visible for all screens >= 760px */}
          {windowWidth >= 760 && (
            <div className="flex space-x-6">
              {['/', '/products', '/accessory', '/review', '/help'].map((path, i) => {
                const labels = ['Home', 'Products', 'Accessory', 'Reviews', 'Help'];
                const isActive =
                  path === '/'
                    ? location.pathname === '/'
                    : location.pathname === path || location.pathname.startsWith(path + '/');
                return (
                  <Link
                    key={i}
                    to={path}
                    className={`px-2 py-1 rounded transition-colors duration-200 font-medium border-b-2 ${
                      isActive
                        ? 'text-blue-700 bg-blue-50 border-blue-700'
                        : 'text-gray-700 hover:text-black hover:bg-gray-100 border-transparent'
                    }`}
                  >
                    {labels[i]}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Mobile: show hamburger (black, right) and all icons */}
          {windowWidth < 760 ? (
            <div className="flex items-center space-x-4 text-xl">
              <form
                className="relative flex items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
              >
                <FiSearch
                  className="cursor-pointer text-black hover:text-blue-700 transition-transform duration-200 hover:scale-110"
                  onClick={() => setShowSearch((v) => !v)}
                />
                {showSearch && (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    placeholder="Search products..."
                    className="ml-2 px-3 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm w-32 transition-all duration-200"
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  />
                )}
              </form>

              <span className="relative cursor-pointer" onClick={() => navigate("/wishlist") }>
                <FiHeart className="text-black hover:text-blue-700 transition-transform duration-200 hover:scale-110" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border border-white">
                    {wishlistCount}
                  </span>
                )}
              </span>

              <span className="relative cursor-pointer" onClick={() => navigate("/cart") }>
                <FiShoppingCart className="text-black hover:text-blue-700 transition-transform duration-200 hover:scale-110" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border border-white">
                    {cartCount}
                  </span>
                )}
              </span>

              <span
                className="cursor-pointer flex items-center gap-2"
                onClick={() => {
                  if (user) {
                    navigate("/profile");
                  } else {
                    setShowAuthModal(true);
                  }
                }}
              >
                <FaUserCircle className="text-2xl text-black hover:text-blue-700" />
              </span>

              {/* Hamburger icon (black, right) */}
              <button
  className="text-2xl text-black hover:text-blue-700 focus:outline-none"
  onClick={() => setShowMobileMenu((v) => !v)}
  aria-label="Open menu"
>
  <svg
    width="28"
    height="28"
    fill="currentColor"
    viewBox="0 0 20 20"
    className="text-black"
  >
    <path d="M3 6h14M3 10h14M3 14h14" />
  </svg>
</button>

            </div>
          ) : (
            <div className={`flex items-center space-x-4 text-xl ${showMobileMenu ? 'hidden' : ''}`}>
              <form
                className="relative flex items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
              >
                <FiSearch
                  className="cursor-pointer text-gray-700 hover:text-blue-700 transition-transform duration-200 hover:scale-110"
                  onClick={() => setShowSearch((v) => !v)}
                />
                {showSearch && (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    placeholder="Search products..."
                    className="ml-2 px-3 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm w-48 md:w-64 transition-all duration-200"
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  />
                )}
              </form>

              <span className="relative cursor-pointer" onClick={() => navigate("/wishlist") }>
                <FiHeart className="text-gray-700 hover:text-blue-700 transition-transform duration-200 hover:scale-110" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border border-white">
                    {wishlistCount}
                  </span>
                )}
              </span>

              <span className="relative cursor-pointer" onClick={() => navigate("/cart") }>
                <FiShoppingCart className="text-gray-700 hover:text-blue-700 transition-transform duration-200 hover:scale-110" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border border-white">
                    {cartCount}
                  </span>
                )}
              </span>

              <span
                className="cursor-pointer flex items-center gap-2"
                onClick={() => {
                  if (user) {
                    navigate("/profile");
                  } else {
                    setShowAuthModal(true);
                  }
                }}
              >
                <FaUserCircle className="text-2xl text-gray-700 hover:text-blue-700" />
              </span>


              {/* Login Dropdown for User/Admin */}
              {!user && (
                <div className="relative">
                  <button
                    className="text-sm bg-gradient-to-r from-blue-700 to-black text-white px-4 py-1.5 rounded shadow-lg hover:from-black hover:to-blue-700 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    onClick={() => setShowLoginDropdown((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={showLoginDropdown}
                  >
                    Login
                  </button>
                  {/* Overlay for closing dropdown on outside click */}
                  {showLoginDropdown && (
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowLoginDropdown(false)}
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`absolute right-0 mt-2 w-48 bg-white border border-blue-100 rounded-xl shadow-2xl z-50 transition-all duration-200 origin-top-right ${showLoginDropdown ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-95 pointer-events-none -translate-y-2"}`}
                    style={{ minWidth: "180px" }}
                  >
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setShowLoginDropdown(false);
                      }}
                      className="block w-full text-left px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-t-xl transition-colors duration-150"
                    >
                      <span className="flex items-center gap-2">
                        <FaUserCircle className="text-lg" />
                        User Login
                      </span>
                    </button>
                    <Link
                      to="/admin/login"
                      className="block px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-b-xl transition-colors duration-150"
                      onClick={() => setShowLoginDropdown(false)}
                    >
                      <span className="flex items-center gap-2">
                        <FaUserCircle className="text-lg" />
                        Admin Login
                      </span>
                    </Link>
                  </div>
                </div>
              )}
    

              {user && (
                <button
                  onClick={handleLogout}
                  className="ml-2 text-sm text-gray-700 hover:text-black hover:underline transition-colors duration-200"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
  </nav>

      {/* Mobile Slide-out Menu: only visible below 760px and when open */}
      {showMobileMenu && windowWidth < 760 && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 transition-all duration-300" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transition-transform duration-300 translate-x-0" style={{maxWidth:'80vw'}}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-xl font-bold text-blue-700">MobileStore</span>
                <button className="text-2xl text-gray-700 hover:text-blue-700" onClick={() => setShowMobileMenu(false)} aria-label="Close menu">
                  &times;
                </button>
              </div>
              <nav className="flex flex-col px-4 py-4 gap-2">
                {['/', '/products', '/accessory', '/review', '/help'].map((path, i) => {
                  const labels = ['Home', 'Products', 'Accessory', 'Reviews', 'Help'];
                  const isActive =
                    path === '/'
                      ? location.pathname === '/'
                      : location.pathname === path || location.pathname.startsWith(path + '/');
                  return (
                    <Link
                      key={i}
                      to={path}
                      className={`px-3 py-2 rounded font-medium border-b-2 ${isActive ? 'text-blue-700 bg-blue-50 border-blue-700' : 'text-gray-700 hover:text-black hover:bg-gray-100 border-transparent'}`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {labels[i]}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}

      {showAuthModal && !user ? (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      ) : null}
    </>
  );
}