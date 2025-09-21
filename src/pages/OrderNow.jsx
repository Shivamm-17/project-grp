// Always update wishlistProducts when modal is opened
  //  useEffect(() => {
  //   if (showWishlistModal) {
  //     try {
  //       const user = JSON.parse(localStorage.getItem("user"));
  //       const raw = localStorage.getItem(`wishlist_${user?.email}`);
  //       if (raw) {
  //         const parsed = JSON.parse(raw);
  //         if (Array.isArray(parsed)) setWishlistProducts(parsed);
  //         else setWishlistProducts([]);
  //       } else {
  //         setWishlistProducts([]);
  //       }
  //     } catch (e) {
  //       setWishlistProducts([]);
  //     }
  //   } else {
  //     setWishlistProducts([]);
  //   }
  // }, [showWishlistModal, wishlistModalKey]);
  //   // Order products state
  //   const [orderProducts, setOrderProducts] = useState(() => {
  //     if (products && Array.isArray(products)) {
  //       return products.map(p => ({ ...p, quantity: p.quantity || 1 }));
  //     }
  //     if (product) return [{ ...product, quantity: amount || 1 }];
  //     return [];
  //   });

import React, { useState, useEffect } from "react";
import { FaHeart, FaRegHeart, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { placeOrder, fetchWishlist } from '../utils/api';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';

const ORDER_STEPS = ["Shipping Info", "Address", "Payment"];

export default function OrderNow() {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const { product, amount, products } = location.state || {};
  
  const [step, setStep] = useState(0);
  const [shipping, setShipping] = useState({ name: "", address: "", pincode: "", phone: "" });
  const [addressError, setAddressError] = useState("");
  const [payment, setPayment] = useState({ method: "UPI", upi: "" });
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [wishlistModalKey, setWishlistModalKey] = useState(0);
  const [orderError, setOrderError] = useState("");
  const [wishlistError, setWishlistError] = useState("");

  const [orderProducts, setOrderProducts] = useState(() => {
    if (products && Array.isArray(products)) {
      return products.map(p => ({ ...p, quantity: p.quantity || 1 }));
    }
    if (product) return [{ ...product, quantity: amount || 1 }];
    return [];
  });

  useEffect(() => {
    const fetchUserWishlist = async () => {
      if (showWishlistModal) {
        try {
          setWishlistError("");
          // Debug: Modal open, fetching wishlist
          console.log("Wishlist modal opened, fetching wishlist for user:", user?.id);
          const res = await axios.get(`http://localhost:5000/api/users/by-external-id/${user.id}`);
          const mongoUser = res.data?.data;
          const wishlistData = await fetchWishlist(mongoUser._id);
          if (wishlistData && Array.isArray(wishlistData.data)) {
            setWishlistProducts(wishlistData.data);
          } else if (Array.isArray(wishlistData)) {
            setWishlistProducts(wishlistData);
          } else {
            setWishlistProducts([]);
            setWishlistError("No products found in your wishlist.");
          }
        } catch (e) {
          setWishlistProducts([]);
          setWishlistError("Could not load wishlist. Please try again later.");
        }
      } else {
        setWishlistProducts([]);
        setWishlistError("");
      }
    };
    fetchUserWishlist();
  }, [showWishlistModal, wishlistModalKey, user]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.email) {
      navigate("/ordernow");
      return;
    }
    if (!shipping.address && !shipping.pincode) {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const profile = users.find(u => u.email === user.email);
      if (profile && (profile.address || profile.pincode)) {
        setShipping(s => ({
          ...s,
          address: profile.address || "",
          pincode: profile.pincode || ""
        }));
      }
    }
  }, [navigate]);

  const handleNext = () => setStep(s => Math.min(s + 1, ORDER_STEPS.length - 1));
  const handlePrev = () => setStep(s => Math.max(s - 1, 0));

  const getEstimatedDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString();
  };
  const [deliveryDate] = useState(getEstimatedDeliveryDate());

  const saveOrder = async () => {
    setLoading(true);
    try {
      // Prepare order payload for backend
      const items = orderProducts.map(p => ({
        product: p._id || p.id,
        quantity: p.quantity || 1,
        price: p.price,
        productType: p.category && p.category.toLowerCase() === 'accessory' ? 'Accessory' : 'Product'
      }));
      const total = orderProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0) + orderProducts.reduce((sum, p) => sum + (p.deliveryPrice || 0) * (p.quantity || 1), 0);
      const newOrder = {
        items,
        total,
        address: shipping.address,
        paymentInfo: payment,
        deliveryDate
      };
      // Call backend order API (placeOrder)
      await placeOrder(newOrder);
      localStorage.setItem("cart", JSON.stringify([]));
      setShowPopup(true);
    } catch (err) {
      setOrderError("Error placing order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (payment.method === 'UPI') {
      const grandTotal = orderProducts.reduce((sum, p) => 
        sum + ((p.price || 0) + (p.deliveryPrice || 0)) * (p.quantity || 1), 0
      );
      try {
        const orderRes = await fetch('http://localhost:5000/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: grandTotal })
        });
        const orderData = await orderRes.json();
        if (!orderData.id) {
          alert('Failed to create payment order');
          return;
        }
        const options = {
          key: 'rzp_test_uNl7K4UX0VyScu', // replace with your test key_id
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Mobile Shop',
          description: 'Order Payment',
          order_id: orderData.id,
          handler: async function (response) {
            const verifyRes = await fetch('http://localhost:5000/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // After payment, call backend order API
              await saveOrder();
            } else {
              alert('Payment verification failed!');
            }
          },
          prefill: {
            name: shipping.name || 'Customer',
            email: 'customer@example.com',
            contact: shipping.phone || '9999999999'
          },
          theme: { color: '#3399cc' }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error('Payment error:', err);
        alert('Something went wrong with payment');
      }
    } else {
      await saveOrder();
    }
  };

  if (!isLoaded) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-6 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-6 text-center">Order Now</h2>
        <div className="flex items-center gap-2 text-blue-600 text-lg">
          <span className="animate-spin">🔄</span>
          Loading user information...
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Order Now</h2>
      {/* Modern Stepper */}
      <div className="flex items-center justify-between mb-10 relative">
        {ORDER_STEPS.map((s, idx) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center z-10 min-w-[80px]">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${step >= idx
                  ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg'
                  : 'bg-gray-200 border-gray-300 text-gray-500'
                } font-bold text-lg`}>
                {idx + 1}
              </div>
              <span className={`mt-2 text-xs font-semibold ${step === idx ? 'text-blue-600' : 'text-gray-500'}`}>{s}</span>
            </div>
            {idx < ORDER_STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-1 transition-all duration-300 ${step >= idx + 1
                  ? 'bg-blue-400'
                  : 'bg-gray-300'
                }`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
      {step === 0 && (
        <div className="animate-fade-in space-y-4">
          <h3 className="font-semibold mb-2">Shipping Information</h3>
          {/* <div className="flex gap-4 mb-4">
            <button
              className="flex items-center gap
              -2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-transform hover:scale-105"
              onClick={() => {
                setWishlistModalKey(k => k + 1);
                setShowWishlistModal(true);
              }}
              disabled={!isLoaded || !user || !user.id}
            >
              <FaHeart className="text-lg animate-pulse" /> Add from Wishlist
            </button>
          </div> */}
          <div className="mb-4 p-4 bg-white rounded-xl shadow border">
            {orderProducts.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {orderProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-4 border-b pb-3 last:border-b-0">
                      <img src={p.image} alt={p.name} className="w-16 h-16 object-contain rounded bg-gray-100" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2 items-center">
                          <span>Price: <span className="font-semibold text-green-700">₹{p.price}</span></span>
                          {p.deliveryPrice && p.deliveryPrice > 0 ? (
                            <span>Delivery: <span className="font-semibold text-blue-700">₹{p.deliveryPrice}</span></span>
                          ) : (
                            <span className="text-green-600">Free Delivery</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => setOrderProducts(orderProducts.map((item, i) => i === idx && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item))} disabled={p.quantity <= 1}>-</button>
                        <span className="font-semibold w-6 text-center">{p.quantity}</span>
                        <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => setOrderProducts(orderProducts.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item))}>+</button>
                      </div>
                      <button className="ml-2 text-xl text-red-400 hover:text-red-600" title="Remove from Order" onClick={() => setOrderProducts(orderProducts.filter(item => item.id !== p.id))}><FaTimes /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between"><span>Total Price:</span> <span className="font-semibold">₹{orderProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0)}</span></div>
                  <div className="flex justify-between"><span>Total Delivery:</span> <span className="font-semibold">₹{orderProducts.reduce((sum, p) => sum + (p.deliveryPrice || 0) * (p.quantity || 1), 0)}</span></div>
                  <div className="flex justify-between text-base mt-1"><span>Grand Total:</span> <span className="font-bold text-blue-700">₹{orderProducts.reduce((sum, p) => sum + ((p.price || 0) + (p.deliveryPrice || 0)) * (p.quantity || 1), 0)}</span></div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No products selected for order.</p>
            )}
          </div>
          {/* Wishlist Modal */}
          {showWishlistModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl flex flex-col" style={{ zIndex: 9999, maxHeight: '90vh' }}>
                {/* Modal Header (fixed) */}
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2">
                  <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2"><FaHeart /> Select Products from Wishlist</h3>
                  <button className="text-2xl text-gray-400 hover:text-red-500" onClick={() => { setShowWishlistModal(false); setWishlistProducts([]); setWishlistError(""); }}><FaTimes /></button>
                </div>
                {/* Modal Body (scrollable) */}
                <div className="flex-1 min-h-[120px] h-[60vh] overflow-y-auto">
                  {/* Debug output for wishlistProducts */}
                  <pre style={{ background: '#f8f8ff', color: '#333', fontSize: '12px', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                    {JSON.stringify(wishlistProducts, null, 2)}
                  </pre>
                  {wishlistError && (
                    <div className="text-red-500 text-center font-semibold mb-4">{wishlistError}</div>
                  )}
                  {wishlistProducts.length === 0 && !wishlistError ? (
                    <div className="flex flex-col items-center justify-center min-h-[120px] text-gray-500 text-lg font-semibold">
                      <FaRegHeart className="text-4xl mb-2 text-blue-300" />
                      No products added in wishlist. Please add products to wishlist first.
                    </div>
                  ) : wishlistProducts.length > 0 ? (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-2">
                        {wishlistProducts.map((p) => {
                          const isInOrder = orderProducts.some(item => item.id === p._id);
                          return (
                            <div key={p._id} className={`rounded-xl border shadow hover:shadow-lg transition p-0 bg-white flex flex-col ${isInOrder ? 'ring-2 ring-blue-400' : ''}`}>
                              {/* Product image */}
                              <div className="h-40 w-full bg-gray-100 flex items-center justify-center rounded-t-xl overflow-hidden">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="object-contain h-full w-full" />
                                ) : (
                                  <span className="text-gray-300 text-6xl"><FaRegHeart /></span>
                                )}
                              </div>
                              <div className="p-4 flex flex-col flex-1">
                                <div className="font-semibold text-gray-800 text-base mb-1 line-clamp-2 min-h-[2.5em]">{p.name}</div>
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <span className="font-semibold text-green-700">₹{p.price}</span>
                                  {p.deliveryPrice && p.deliveryPrice > 0 ? (
                                    <span className="text-blue-700">+ Delivery ₹{p.deliveryPrice}</span>
                                  ) : (
                                    <span className="text-green-600">Free Delivery</span>
                                  )}
                                </div>
                                <div className="flex-1" />
                                <div className="flex justify-end mt-2 gap-2">
                                  {!isInOrder ? (
                                    <button
                                      className="px-3 py-1 rounded-lg text-xs font-semibold shadow transition bg-blue-600 text-white hover:bg-blue-700"
                                      onClick={() => setOrderProducts([...orderProducts, { ...p, quantity: 1, id: p._id }])}
                                    >
                                      Add to Order
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        className="px-3 py-1 rounded-lg text-xs font-semibold shadow transition bg-gray-300 text-gray-500 cursor-not-allowed"
                                        disabled
                                      >
                                        Added
                                      </button>
                                      <button
                                        className="px-3 py-1 rounded-lg text-xs font-semibold shadow transition bg-red-500 text-white hover:bg-red-600 ml-2"
                                        onClick={() => setOrderProducts(orderProducts.filter(item => item.id !== p._id))}
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                {/* Modal Footer */}
                <div className="flex justify-end mt-6">
                  <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition" onClick={() => { setShowWishlistModal(false); setWishlistProducts([]); setWishlistError(""); }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={handleNext} className="bg-blue-600 text-white px-4 py-2 rounded">Next</button>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-semibold mb-2">Address</h3>
          <div className="mb-4 p-4 bg-white rounded-xl shadow border">
            {orderProducts.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {orderProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 border-b pb-3 last:border-b-0">
                      <img src={p.image} alt={p.name} className="w-12 h-12 object-contain rounded bg-gray-100" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2 items-center">
                          <span>Price: <span className="font-semibold text-green-700">₹{p.price}</span></span>
                          <span>Qty: <span className="font-semibold">{p.quantity}</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between"><span>Total Price:</span> <span className="font-semibold">₹{orderProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0)}</span></div>
                  <div className="flex justify-between"><span>Total Delivery:</span> <span className="font-semibold">₹{orderProducts.reduce((sum, p) => sum + (p.deliveryPrice || 0) * (p.quantity || 1), 0)}</span></div>
                  <div className="flex justify-between text-base mt-1"><span>Grand Total:</span> <span className="font-bold text-blue-700">₹{orderProducts.reduce((sum, p) => sum + ((p.price || 0) + (p.deliveryPrice || 0)) * (p.quantity || 1), 0)}</span></div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No products selected for order.</p>
            )}
          </div>
          {/* Address & Pincode UI */}
          <div className="mb-4 p-4 bg-white rounded-xl shadow border">
            <div className="mb-4">
              <label className="block font-semibold mb-1">Address</label>
              <input
                type="text"
                className="border px-3 py-2 rounded w-full mb-2 focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Enter address"
                value={shipping.address}
                onChange={e => setShipping(s => ({ ...s, address: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-1">Pincode</label>
              <input
                type="text"
                className="border px-3 py-2 rounded w-full mb-2 focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Enter 6-digit pincode"
                value={shipping.pincode}
                maxLength={6}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "");
                  setShipping(s => ({ ...s, pincode: val }));
                }}
              />
              {addressError && <span className="text-red-500 text-xs">{addressError}</span>}
            </div>
          </div>
          <div className="flex justify-between gap-2 mt-4">
            <button onClick={handlePrev} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition">Back</button>
            <button
              onClick={() => {
                if (!shipping.address || !shipping.pincode || shipping.pincode.length !== 6) {
                  setAddressError("Please enter valid address and 6-digit pincode.");
                  return;
                }
                setAddressError("");
                handleNext();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all shadow-md"
            >Next</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-semibold mb-2">Payment</h3>
          <div className="space-y-4">
            {/* Modern Payment Option Cards */}
            <div
              className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm text-lg font-semibold 
                ${payment.method === 'COD' ? 'border-blue-600 bg-blue-50 scale-[1.02] ring-2 ring-blue-300' : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'}
              `}
              onClick={() => setPayment({ ...payment, method: 'COD' })}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setPayment({ ...payment, method: 'COD' }); }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={payment.method === 'COD'}
                onChange={() => setPayment({ ...payment, method: 'COD' })}
                className="accent-blue-600 w-5 h-5 mr-2"
              />
              <span className="flex-1">Cash on Delivery</span>
              <span className="text-blue-600 font-bold">COD</span>
            </div>
            <div
              className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm text-lg font-semibold 
                ${payment.method === 'UPI' ? 'border-blue-600 bg-blue-50 scale-[1.02] ring-2 ring-blue-300' : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'}
              `}
              onClick={() => setPayment({ ...payment, method: 'UPI' })}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setPayment({ ...payment, method: 'UPI' }); }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="UPI"
                checked={payment.method === 'UPI'}
                onChange={() => setPayment({ ...payment, method: 'UPI' })}
                className="accent-blue-600 w-5 h-5 mr-2"
              />
              <span className="flex-1">Online UPI</span>
              <span className="text-green-600 font-bold">UPI</span>
            </div>
            {/* UPI Input */}
            {/* {payment.method === "UPI" && (
              <div className="mb-2 animate-fade-in">
                <label className="block font-semibold mb-1 text-blue-700">UPI ID</label>
                <input
                  type="text"
                  placeholder="Enter UPI ID"
                  value={payment.upi}
                  onChange={e => setPayment({ ...payment, upi: e.target.value })}
                  className="border-2 border-blue-300 px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-400 transition-all text-lg"
                  autoFocus
                />
              </div>
            )} */}
          </div>
          {/* Delivery Date Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-800 text-center">
            <span className="font-semibold">Estimated Delivery Date: </span>
            <span>{deliveryDate}</span>
          </div>
          <div className="flex justify-between gap-2 mt-4">
          <button onClick={handlePrev} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition">Back</button>
          <button
            onClick={handlePlaceOrder}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-all shadow-md text-lg font-semibold"
            disabled={loading}
          >
            {loading ? (payment.method === 'UPI' ? "Paying..." : "Placing...") : (payment.method === 'UPI' ? "Pay & Place Order" : "Place Order")}
          </button>
        </div>
        </div> //might give error
      )}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 relative min-w-[320px]">
            <span className="text-5xl animate-bounce" role="img" aria-label="sticker">🎉🛍️</span>
            <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
              Order placed successfully!
              <span className="text-2xl" role="img" aria-label="success">✅</span>
            </h2>
            <p className="text-gray-600">Thank you for your purchase. You can view your order in your profile.</p>
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-3xl"
              onClick={() => { setShowPopup(false); navigate('/profile'); }}
              title="Go to Profile"
            >
              <span role="img" aria-label="close">❌</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
