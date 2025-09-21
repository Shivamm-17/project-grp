import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AdminCustomers() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Use relative API paths for proxy setup
        const usersRes = await axios.get("/api/users", { withCredentials: true });
        setUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
        const ordersRes = await axios.get("/api/admin/orders", { withCredentials: true });
        setOrders(Array.isArray(ordersRes.data.data) ? ordersRes.data.data : []);
      } catch (err) {
        setUsers([]);
        setOrders([]);
        // Debug: show error in UI
        window.alert("Error fetching users or orders: " + (err.response?.data?.message || err.message));
      }
    }
    fetchData();
  }, []);

  // (Optional) Fetch reviews/feedbacks from backend if implemented
  useEffect(() => {
    setReviews([]);
    setFeedbacks([]);
  }, [selectedUser]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Customer Management</h1>
      <ul className="space-y-2 mb-6">
        {/* Debug: show raw user data */}
        {users.length === 0 ? (
          <li className="text-gray-500">No registered users found.</li>
        ) : (
          <>
            <li className="text-base font-semibold text-blue-700 mb-2">Total Users: {users.length}</li>
            {users.map((u) => (
              <li key={u._id} className="bg-gray-50 p-4 rounded flex justify-between items-center cursor-pointer hover:bg-blue-50" onClick={() => setSelectedUser(u)}>
                <span className="font-semibold text-blue-800">{u.name}</span>
                <span className="text-sm text-gray-500">{u.email}</span>
              </li>
            ))}
          </>
        )}
      </ul>
      {selectedUser && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Profile Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-2">
            <p><strong>Name:</strong> {selectedUser.name || selectedUser.profile?.name || ''}</p>
            <p><strong>Age:</strong> {selectedUser.profile?.age || ''}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Mobile:</strong> {selectedUser.profile?.phone || selectedUser.phone || ''}</p>
            <p><strong>Address:</strong> {selectedUser.profile?.address || ''}</p>
            <p><strong>Gender:</strong> {selectedUser.profile?.gender || ''}</p>
            <p><strong>Password Status:</strong> {selectedUser.password === "clerk" ? "Password not set" : "Password set"}</p>
          </div>
          <h3 className="font-semibold mt-4 mb-2">Order History <span className='text-xs text-blue-600'>(Total: {orders.filter(o => o.user && o.user.email === selectedUser.email).length})</span></h3>
          <ul className="space-y-1 mb-2">
            {orders.filter(o => o.user && o.user.email === selectedUser.email).length === 0 ? (
              <li className="text-gray-500">No orders.</li>
            ) : (
              orders.filter(o => o.user && o.user.email === selectedUser.email).map(o => (
                <li key={o._id} className="text-sm">Order #{o._id} - {o.status}</li>
              ))
            )}
          </ul>
          <div className="flex gap-2 mt-4">
            <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setSelectedUser(null)}>Back</button>
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={async () => {
              if(window.confirm('Are you sure you want to delete this user?')) {
                try {
                  await axios.delete(`/api/admin/users/${selectedUser._id}`, { withCredentials: true });
                  // Re-fetch users after delete
                  const usersRes = await axios.get("/api/users", { withCredentials: true });
                  setUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
                  setSelectedUser(null);
                } catch {}
              }
            }}>Delete User</button>
          </div>
        </div>
      )}
    </div>
  );
}
