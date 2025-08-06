import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import '../styles/admin.css';
import '../pages/styles/main.css';
import '../AdminLogin.css';
import { FaHome, FaBoxOpen, FaUsers, FaChartBar, FaFileAlt, FaRegBell, FaCog, FaRegCommentDots, FaRegListAlt } from 'react-icons/fa';
import { io } from 'socket.io-client';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const API_BASE = `http://${window.location.hostname}:5000/api`;
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123'; // Change to your secure password

const AdminPage = () => {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', category: '', image: '', description: '' });
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', phone: '', role: 'subadmin' });
  const [message, setMessage] = useState('');
  const [auth, setAuth] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState('');
  const [productSearch, setProductSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  // --- User filter state for role and approval status ---
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userApprovalFilter, setUserApprovalFilter] = useState('');
  // --- Product filter state for category and stock status ---
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productStockFilter, setProductStockFilter] = useState('');
  // --- Product filter state for shop and seller ---
  const [productShopFilter, setProductShopFilter] = useState('');
  const [productSellerFilter, setProductSellerFilter] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ username: '', email: '', role: 'subadmin', password: '' });
  // For product image upload
  const [imageFile, setImageFile] = useState(null);
  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState(null);
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  // --- Analytics and Activity Log State ---
  const [analytics, setAnalytics] = useState({ productCount: 0, userCount: 0, totalSales: 0, totalRevenue: 0 });
  const [activityLog, setActivityLog] = useState([]);

  // --- Notifications State ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');

  // --- User Dropdown State ---
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHeaderUserDropdown, setShowHeaderUserDropdown] = useState(false); // NEW: header avatar dropdown
  const [adminProfile, setAdminProfile] = useState(null);

  // --- Fix: Dropdown click-away hooks must always be called, never conditionally ---
  useEffect(() => {
    if (!showHeaderUserDropdown) return;
    const close = () => setShowHeaderUserDropdown(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showHeaderUserDropdown]);

  useEffect(() => {
    if (!showUserDropdown) return;
    function handleClickAway(e) {
      const avatar = document.getElementById('admin-header-avatar');
      const dropdown = document.getElementById('admin-header-avatar-dropdown');
      if (avatar && dropdown && !avatar.contains(e.target) && !dropdown.contains(e.target)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [showUserDropdown]);

  // Pagination state for products
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 10;

  // --- Real-Time & Custom Analytics Data (mocked for demo) ---
  const [activeUsers, setActiveUsers] = useState(12);
  const [salesTicker, setSalesTicker] = useState([
    { id: 1, msg: 'Order #1001: ETB 2,500' },
    { id: 2, msg: 'Order #1002: ETB 1,200' },
    { id: 3, msg: 'Order #1003: ETB 3,800' },
  ]);
  const [tickerIndex, setTickerIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(u => u + (Math.random() > 0.5 ? 1 : -1));
      setTickerIndex(i => (i + 1) % salesTicker.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [salesTicker.length]);
  // Product/category heatmap (mocked)
  const heatmapData = products.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + (Number(p.sales) || 0);
    return acc;
  }, {});
  const heatmapLabels = Object.keys(heatmapData);
  const heatmapValues = Object.values(heatmapData);
  // Recent logins (mocked)
  const recentLogins = [
    { user: 'admin', role: 'admin', time: '2025-07-14 09:12' },
    { user: 'subadmin1', role: 'subadmin', time: '2025-07-14 08:55' },
    { user: 'user123', role: 'user', time: '2025-07-14 08:40' },
  ];
  // Live server status (mocked)
  const liveStatus = [
    { label: 'API', status: 'online' },
    { label: 'DB', status: 'online' },
    { label: 'Worker', status: 'idle' },
    { label: 'Cache', status: 'online' },
  ];
  // Toast notification state
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  const handleApproveProduct = async (productId) => {
  try {
    const res = await fetch(`/api/products/${productId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      fetchProducts(); // Refresh the product list
    } else {
      alert('Failed to approve product');
    }
  } catch (err) {
    alert('Error approving product');
  }
};

const handleRejectProduct = async (productId) => {
  try {
    const res = await fetch(`/api/products/${productId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      fetchProducts();
    } else {
      alert('Failed to reject product');
    }
  } catch (err) {
    alert('Error rejecting product');
  }
};

  useEffect(() => {
    if (auth) {
      fetchProducts();
      fetchUsers();
      fetchAnalytics();
      fetchActivityLog();
      fetchShopRequests();
      fetchOrders();
    }
  }, [auth]);

  // Restore token and auth from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      setToken(storedToken);
      setAuth(true);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
      setProducts(res.data);
    } catch (err) {
      setMessage('Failed to fetch products');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
      // Debug output
      // console.log('Fetched users:', res.data);
    } catch (err) {
      setMessage('Failed to fetch users');
      // Debug output
      // console.error('Fetch users error:', err.response ? err.response.data : err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      setAnalytics(res.data);
    } catch (err) {
      setMessage('Failed to fetch analytics');
    }
  };
  const fetchActivityLog = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/activity-log`, { headers: { Authorization: `Bearer ${token}` } });
      setActivityLog(res.data.map(log => ({
        ...log,
        time: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
        action: log.action || ''
      })));
    } catch (err) {
      setMessage('Failed to fetch activity log');
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setNotifLoading(true);
    setNotifError('');
    try {
      const res = await axios.get(`${API_BASE}/admin/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data);
    } catch (err) {
      setNotifError('Failed to load notifications');
    }
    setNotifLoading(false);
  };

  // Fetch admin profile for dropdown
  const fetchAdminProfile = async () => {
    if (!token) return; // Don't fetch if no token
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setAdminProfile(res.data);
    } catch (err) {
      // If unauthorized or bad request, force logout
      if (err.response && (err.response.status === 401 || err.response.status === 400)) {
        setAuth(false);
        setToken('');
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
  };

  // --- Shop Requests State ---
  const [shopRequests, setShopRequests] = useState([]);
  const [shopRequestsLoading, setShopRequestsLoading] = useState(false);
  const [shopRequestsError, setShopRequestsError] = useState('');
  const [shopRequestActionMsg, setShopRequestActionMsg] = useState('');
  // NEW: State for viewing requester details
  const [viewingRequest, setViewingRequest] = useState(null);

  // Fetch shop registration requests
  const fetchShopRequests = async () => {
    setShopRequestsLoading(true);
    setShopRequestsError('');
    // Debug: print token and payload
    try {
      // console.log('fetchShopRequests: token', token);
      if (!token) {
        alert('Admin token missing. Please log in again.');
        window.location.reload();
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // console.log('fetchShopRequests: token payload', payload);
      } catch (e) {
        // console.log('fetchShopRequests: token decode error', e);
      }
      const res = await axios.get(`${API_BASE}/admin/shop-requests`, { headers: { Authorization: `Bearer ${token}` } });
      setShopRequests(res.data);
    } catch (err) {
      setShopRequestsError('Failed to load shop requests.');
      // Debug: print error details
      if (err.response) {
        // console.log('fetchShopRequests: error response', err.response.status, err.response.data);
      } else {
        // console.log('fetchShopRequests: error', err);
      }
    }
    setShopRequestsLoading(false);
  };

  // Handle approve/reject/request-info actions
  const handleShopRequestAction = async (id, action, extra = {}) => {
    setShopRequestActionMsg('');
    try {
      const res = await axios.patch(
        `${API_BASE}/admin/shop-requests/${id}`,
        { action, ...extra },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShopRequestActionMsg(res.data.message || 'Action successful.');
      fetchShopRequests();
      if (action === 'approve') {
        fetchUsers(); // Refresh users list after approval
      }
    } catch (err) {
      setShopRequestActionMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // --- Orders State and Fetch ---
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [orderViewType, setOrderViewType] = useState('table');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSortOrder, setOrderSortOrder] = useState('desc'); // 'desc' for newest first

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    if (!token) {
      setOrdersError('Not authenticated. Please log in as admin.');
      setOrdersLoading(false);
      setAuth(false);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data);
    } catch (err) {
      if (err.response && (err.response.status === 400 || err.response.status === 401)) {
        setOrdersError('Session expired or unauthorized. Please log in again.');
        setAuth(false);
        setToken('');
        localStorage.removeItem('admin_token');
      } else {
        setOrdersError('Failed to fetch orders');
      }
    }
    setOrdersLoading(false);
  };

  // --- Order Delivery Progress Table (Admin View) ---
  const renderOrderProgress = (order) => {
    // These fields should exist in the order object from backend
    // status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered'
    // shopHandover, deliveryReceived, buyerReceived, deliveryConfirmed: boolean
    // --- Use a stepper/progress bar for clarity ---
    const steps = [
      { key: 'accepted', label: 'Accepted' },
      { key: 'handedover', label: 'Shop Handover' },
      { key: 'deliveryreceived', label: 'Delivery Received' },
      { key: 'buyerreceived', label: 'Buyer Received' },
      { key: 'delivered', label: 'Delivered' },
    ];
    // Support both legacy boolean fields and new status string
    let currentStep = 0;
    if (order.status === 'delivered') currentStep = 4;
    else if (order.buyerReceived || order.status === 'buyerreceived') currentStep = 3;
    else if (order.deliveryReceived || order.status === 'deliveryreceived') currentStep = 2;
    else if (order.shopHandover || order.status === 'handedover') currentStep = 1;
    else if (order.status === 'accepted' || order.status === 'picked_up' || order.status === 'in_transit') currentStep = 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: idx <= currentStep ? '#00b894' : '#dfe6e9',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
            }}>{idx + 1}</div>
            {idx < steps.length - 1 && <div style={{ width: 32, height: 4, background: idx < currentStep ? '#00b894' : '#dfe6e9' }} />}
          </React.Fragment>
        ))}
        <span style={{ marginLeft: 12, fontWeight: 600 }}>{steps[currentStep]?.label || 'Pending'}</span>
      </div>
    );
  };

  // --- Orders Table in Admin UI ---
  const OrdersSection = () => {
    let filteredOrders = orders;
    if (orderStatusFilter !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === orderStatusFilter);
    }
    filteredOrders = [...filteredOrders].sort((a, b) => {
      // Put unapproved/pending orders at the top
      const statusOrder = (order) => {
        if (order.status === 'pending' || order.status === 'unapproved') return 0;
        return 1;
      };
      if (statusOrder(a) !== statusOrder(b)) {
        return statusOrder(a) - statusOrder(b);
      }
      // If same group, sort by createdAt
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return orderSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return (
      <div style={{ margin: '2rem 0' }}>
        <h2>Orders Delivery Progress</h2>
        <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:16}}>
          <label>Status:
            <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} style={{marginLeft:8}}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="handedover">Handed Over</option>
              <option value="deliveryreceived">Delivery Received</option>
              <option value="buyerreceived">Buyer Received</option>
              <option value="delivered">Delivered</option>
            </select>
          </label>
          <label>Sort by:
            <select value={orderSortOrder} onChange={e => setOrderSortOrder(e.target.value)} style={{marginLeft:8}}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </label>
        </div>
        {ordersLoading ? <div>Loading orders...</div> : ordersError ? <div style={{ color: 'red' }}>{ordersError}</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f7f7f7' }}>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>Order ID</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>Buyer</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>Shop</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>Delivery Person</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>Progress</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order._id}>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{order._id}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>
                    {(() => {
                      const b = order.buyer;
                      if (typeof order.buyerName === 'string') return order.buyerName;
                      if (typeof order.buyerId === 'string') return order.buyerId;
                      if (b && typeof b === 'object') {
                        if (typeof b.name === 'string') return b.name;
                        if (typeof b.username === 'string') return b.username;
                        if (typeof b.email === 'string') return b.email;
                        return '[object]';
                      }
                      if (typeof b === 'string') return b;
                      return 'N/A';
                    })()
                  }</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>
                    {(() => {
                      const s = order.shop;
                      if (typeof s === 'object' && s !== null) {
                        if (typeof s.shopName === 'string') return s.shopName;
                        if (typeof s.name === 'string') return s.name;
                        if (typeof s._id === 'string') return s._id;
                        return '[object]';
                      }
                      if (typeof order.shopName === 'string') return order.shopName;
                      if (typeof order.shopId === 'string') return order.shopId;
                      if (typeof s === 'string') return s;
                      return 'N/A';
                    })()
                  }</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>
                    {(() => {
                      const d = order.deliveryPerson;
                      if (typeof order.deliveryPersonName === 'string') return order.deliveryPersonName;
                      if (typeof order.deliveryPersonId === 'string') return order.deliveryPersonId;
                      if (d && typeof d === 'object') {
                        if (typeof d.name === 'string') return d.name;
                        if (typeof d.username === 'string') return d.username;
                        if (typeof d.email === 'string') return d.email;
                        return '[object]';
                      }
                      if (typeof d === 'string') return d;
                      return 'N/A';
                    })()
                  }</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{renderOrderProgress(order)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>
                    <button onClick={() => setViewingOrder(order)} style={{background:'#2980b9',color:'#fff',border:'none',borderRadius:4,padding:'4px 10px',cursor:'pointer',marginRight:6}}>View</button>
                    {order.receiptUrl && (
                      <a href={order.receiptUrl.startsWith('http') ? order.receiptUrl : `${process.env.REACT_APP_API_URL}${order.receiptUrl}`} target="_blank" rel="noopener noreferrer">
                        <button style={{background:'#27ae60',color:'#fff',border:'none',borderRadius:4,padding:'4px 10px',cursor:'pointer'}}>View Receipt</button>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (auth) {
      fetchProducts();
      fetchUsers();
      fetchAnalytics();
      fetchActivityLog();
      fetchShopRequests();
      fetchOrders();
    }
  }, [auth]);

  // CSV export helpers
  function exportProductsCSV() {
    const headers = ['Name', 'Price', 'Category', 'Image', 'Description'];
    const rows = products.map(p => [p.name, p.price, p.category, p.image, p.description]);
    let csv = headers.join(',') + '\n';
    csv += rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportUsersCSV() {
    const headers = ['Username', 'Email', 'Role'];
    const rows = users.map(u => [u.username, u.email, u.role]);
    let csv = headers.join(',') + '\n';
    csv += rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Stock alert for low-stock products
  const lowStockProducts = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 5);

  // Sales summary and analytics (from backend)
  const salesSummary = {
    totalOrders: analytics.totalSales || 0,
    totalRevenue: analytics.totalRevenue || 0,
    topProduct: products[0]?.name || 'N/A',
    productCount: analytics.productCount || 0,
    userCount: analytics.userCount || 0
  };

  // Login input change handler
  const handleLoginChange = e => {
    const { name, value } = e.target;
    setLogin(prev => ({ ...prev, [name]: value }));
  };

  // Product form handlers
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };
  const handleImageChange = e => {
    setImageFile(e.target.files[0]);
  };
  const handleReceiptChange = e => {
    setReceiptFile(e.target.files[0]);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (imageFile) formData.append('image', imageFile);
    if (receiptFile) formData.append('receipt', receiptFile);
    try {
      let imageUrl = form.image;
      if (imageFile) {
        const data = new FormData();
        data.append('image', imageFile);
        const uploadRes = await axios.post(`${API_BASE.replace('/api','')}/upload`, data, { headers: { Authorization: `Bearer ${token}` } });
        imageUrl = uploadRes.data.url || uploadRes.data.path || uploadRes.data.filename || uploadRes.data.image;
      }
      if (editing) {
        await axios.put(`${API_BASE}/products/${editing._id}`, { ...form, image: imageUrl }, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Product updated!');
      } else {
        // Assign a uniqueId to every new product and link to seller and subadmin/shop manager
        let sellerId = null;
        let managerId = null;
        // If the current user is a seller, use their uniqueId
        if (adminProfile && adminProfile.role === 'seller' && adminProfile.uniqueId) {
          sellerId = adminProfile.uniqueId;
        }
        // If the current user is a subadmin, use their uniqueId as managerId
        if (adminProfile && adminProfile.role === 'subadmin' && adminProfile.uniqueId) {
          managerId = adminProfile.uniqueId;
        }
        // If the current user is a seller and has a managerId, use it
        if (adminProfile && adminProfile.role === 'seller' && adminProfile.managerId) {
          managerId = adminProfile.managerId;
        }
        const productData = {
          ...form,
          image: imageUrl,
          uniqueId: 'product-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          sellerId,
          managerId
        };
        await axios.post(`${API_BASE}/products`, productData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Product added!');
      }
      setForm({ name: '', price: '', category: '', image: '', description: '' });
      setImageFile(null);
      setEditing(null);
      fetchProducts();
    } catch (err) {
      setMessage('Error saving product: ' + (err.response?.data?.message || err.message));
    }
  };
  const handleEdit = product => {
    setEditing(product);
    setForm({
      name: product.name || '',
      price: product.price || '',
      category: product.category || '',
      image: product.image || '',
      description: product.description || ''
    });
  };
  const handleDelete = async id => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API_BASE}/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Product deleted!');
      fetchProducts();
    } catch (err) {
      setMessage('Error deleting product: ' + (err.response?.data?.message || err.message));
    }
  };
  // User form handlers
  const handleUserChange = e => {
    const { name, value } = e.target;
    setUserForm(f => ({ ...f, [name]: value }));
  };
  const handleUserSubmit = async e => {
    e.preventDefault();
    if (!userForm.phone) {
      setMessage('Phone is required.');
      return;
    }
    try {
      let submitData = { ...userForm };
      // Assign a unique id to every subadmin (shop manager) if role is subadmin
      if (userForm.role === 'subadmin') {
        submitData.uniqueId = 'subadmin-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        await axios.post(`${API_BASE}/auth/register`, submitData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Sub-admin created!');
      } else if (userForm.role === 'seller') {
        // Only allow subadmin or admin to create sellers
        if (!(adminProfile && (adminProfile.role === 'subadmin' || adminProfile.role === 'admin'))) {
          setMessage('Only subadmin (shop manager) or admin can create sellers.');
          return;
        }
        submitData.uniqueId = 'seller-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        if (adminProfile && adminProfile.role === 'subadmin' && adminProfile.uniqueId) {
          submitData.managerId = adminProfile.uniqueId;
        }
        delete submitData.owner;
        await axios.post(`${API_BASE}/auth/subadmin/sellers`, submitData, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Seller created!');
      } else {
        // fallback for any other roles
        await axios.post(`${API_BASE}/auth/register`, userForm, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('User created!');
      }
      setUserForm({ username: '', email: '', password: '', phone: '', role: 'subadmin' });
      fetchUsers();
    } catch (err) {
      setMessage('Error creating user: ' + (err.response?.data?.message || err.message));
    }
  };
  const handleUserDelete = async id => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API_BASE}/auth/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('User deleted!');
      fetchUsers();
    } catch (err) {
      setMessage('Error deleting user: ' + (err.response?.data?.message || err.message));
    }
  };

  // --- Delivery Person Creation State ---
  const [deliveryForm, setDeliveryForm] = useState({ username: '', email: '', password: '' });
  const [deliveryMsg, setDeliveryMsg] = useState('');
  const handleDeliveryChange = e => {
    const { name, value } = e.target;
    setDeliveryForm(f => ({ ...f, [name]: value }));
  };
  const handleDeliverySubmit = async e => {
    e.preventDefault();
    setDeliveryMsg('');
    try {
      const res = await axios.post(`${API_BASE}/admin/create-delivery`, deliveryForm, { headers: { Authorization: `Bearer ${token}` } });
      setDeliveryMsg('Delivery person created!');
      setDeliveryForm({ username: '', email: '', password: '' });
      fetchUsers();
    } catch (err) {
      setDeliveryMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // --- Chart Data Preparation ---
  const ordersByMonth = analytics.ordersByMonth || Array(12).fill(0);
  const revenueByMonth = analytics.revenueByMonth || Array(12).fill(0);
  const usersByRole = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
  const topProducts = analytics.topProducts || [];

  // --- Chart.js Data ---
  const ordersByMonthData = {
    labels: Array.from({length: 12}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'Orders',
      data: ordersByMonth,
      backgroundColor: '#3a6cf6',
    }]
  };
  const revenueByMonthData = {
    labels: ordersByMonthData.labels,
    datasets: [{
      label: 'Revenue (ETB)',
      data: revenueByMonth,
      backgroundColor: '#27ae60',
    }]
  };
  const usersByRoleData = {
    labels: Object.keys(usersByRole),
    datasets: [{
      data: Object.values(usersByRole),
      backgroundColor: ['#3a6cf6', '#27ae60', '#f7c948', '#e74c3c', '#888'],
    }]
  };
  const topProductsData = {
    labels: topProducts.map(p => p.name),
    datasets: [{
      label: 'Quantity Sold',
      data: topProducts.map(p => p.qty),
      backgroundColor: '#f7c948',
    }]
  };

  // --- More Analytics Data Preparation ---
  // Product Stock Distribution
  const stockStats = products.reduce((acc, p) => {
    if (Number(p.stock) === 0) acc.outOfStock++;
    else if (Number(p.stock) <= 5) acc.lowStock++;
    else acc.inStock++;
    return acc;
  }, { inStock: 0, lowStock: 0, outOfStock: 0 });
  const stockDistData = {
    labels: ['In Stock', 'Low Stock (≤5)', 'Out of Stock'],
    datasets: [{
      data: [stockStats.inStock, stockStats.lowStock, stockStats.outOfStock],
      backgroundColor: ['#27ae60', '#f7c948', '#e74c3c'],
    }]
  };
  // New Users by Month (mocked if not in analytics)
  const newUsersByMonth = analytics.newUsersByMonth || Array(12).fill(0);
  const newUsersByMonthData = {
    labels: Array.from({length: 12}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'New Users',
      data: newUsersByMonth,
      backgroundColor: '#3a6cf6',
    }]
  };
  // Revenue per Category
  const revenuePerCategory = products.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + (Number(p.revenue) || 0);
    return acc;
  }, {});
  const revenuePerCategoryData = {
    labels: Object.keys(revenuePerCategory),
    datasets: [{
      label: 'Revenue (ETB)',
      data: Object.values(revenuePerCategory),
      backgroundColor: '#00b894',
    }]
  };
  // System Health (mocked)
  const systemHealth = {
    db: 'Online',
    api: 'Healthy',
    disk: 'OK',
    cpu: 'Normal',
    memory: 'Normal',
    uptime: '99.99%'
  };
  // Announcements (mocked)
  const announcements = [
    { id: 1, message: 'System maintenance scheduled for Sunday 2AM.' },
    { id: 2, message: 'New analytics features released!' }
  ];

  // --- Sidebar Navigation State ---
  const [sidebarSection, setSidebarSection] = useState('dashboard');
  // --- Enhanced Sidebar Links with Icons ---
  const sidebarLinks = [
    { key: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { key: 'products', label: 'Products', icon: <FaBoxOpen /> },
    { key: 'orders', label: 'Orders', icon: <FaRegListAlt /> },
    { key: 'users', label: 'Users', icon: <FaUsers /> },
    { key: 'analytics', label: 'Analytics', icon: <FaChartBar /> },
    { key: 'reports', label: 'Reports', icon: <FaFileAlt /> },
    { key: 'activity', label: 'Activity Log', icon: <FaRegListAlt /> },
    { key: 'notifications', label: 'Notifications', icon: <FaRegBell /> },
    { key: 'shopRequests', label: 'Shop Requests', icon: <FaRegCommentDots /> },
    { key: 'support', label: 'Support', icon: <FaRegCommentDots /> },
    { key: 'settings', label: 'Settings', icon: <FaCog /> },
  ];

  // --- All hooks and function definitions above this line ---

  // --- Login handler ---
  const [loginRole, setLoginRole] = useState('admin'); // Add role selection for login
const handleLogin = async e => {
  e.preventDefault();
  try {
    let endpoint = `${API_BASE}/auth/login`;
    if (loginRole === 'seller') {
      endpoint = `${API_BASE}/auth/subadmin/login`;
    }
    const res = await axios.post(endpoint, { email: login.email, password: login.password });
    setToken(res.data.token);
    localStorage.setItem('admin_token', res.data.token);
    localStorage.setItem('admin_user', JSON.stringify(res.data.user));
    // Decode token to get role and user info
    let payload = {};
    try {
      payload = JSON.parse(atob(res.data.token.split('.')[1]));
    } catch {}
    if (payload.role !== 'admin') {
      setAuth(false);
      setToken('');
      localStorage.removeItem('token');
      setLoginError('Access denied: Only admin can access this dashboard.');
      setTimeout(() => window.location.reload(), 1200);
      return;
    }
    setAuth(true);
    setLoginError('');
  } catch (err) {
    setLoginError('Login failed: ' + (err.response?.data?.message || err.message));
  }
};

  // If not authenticated, show login form
  if (!auth) {
    return (
      <div className="admin-login-bg">
        <div className="admin-login-card">
          <img src="/mekina-mart-logo.png.png" alt="Mekina Mart Logo" style={{ height: 70, marginBottom: 18, marginTop: -10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          <div className="admin-login-title">Admin Login</div>
          <form className="admin-login-form" onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            {loginError && <div className="admin-login-error">{loginError}</div>}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={login.email}
              onChange={e => setLogin(l => ({ ...l, email: e.target.value }))}
              required
              style={{width: '100%', boxSizing: 'border-box'}}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={login.password}
              onChange={e => setLogin(l => ({ ...l, password: e.target.value }))}
              required
              style={{width: '100%', boxSizing: 'border-box'}}
            />
            <select
              value={loginRole}
              onChange={e => setLoginRole(e.target.value)}
              style={{marginBottom: '1rem', width: '100%', boxSizing: 'border-box'}}
            >
              <option value="admin">Admin</option>
              <option value="subadmin">Sub-Admin</option>
              <option value="seller">Seller</option>
            </select>
            <button type="submit" style={{width: '100%', padding: '12px 0', fontSize: '1.1rem'}}>Login</button>
          </form>
        </div>
      </div>
    );
  }

  // --- Handler stubs to prevent runtime errors ---
const handleNotifClick = () => {
  setShowNotifDropdown(v => !v);
  if (!showNotifDropdown) fetchNotifications();
};
const handleUserClick = () => {
  setShowUserDropdown(v => !v);
  if (!adminProfile) fetchAdminProfile();
};
const handleLogout = () => {
  setAuth(false);
  setToken('');
  localStorage.removeItem('token');
  window.location.reload();
};
 // --- User edit handlers (stubs, expand as needed) ---
const handleEditUserChange = e => {
  const { name, value } = e.target;
  setEditUserForm(f => ({ ...f, [name]: value }));
};
const handleEditUserSubmit = e => {
  e.preventDefault && e.preventDefault();
  // Implement user update logic here
  setEditingUser(null);
};
const handleCancelEditUser = () => {
  setEditingUser(null);
};
const handleEditUser = user => {
  setEditingUser(user._id);
  setEditUserForm({ username: user.username, email: user.email, role: user.role, password: '' });
};
  // --- Pagination helpers ---
const filteredProducts = products.filter(p => {
  const matchesName = p.name && p.name.toLowerCase().includes(productSearch.toLowerCase());
  const matchesCategory = productCategoryFilter ? (p.category || 'Uncategorized') === productCategoryFilter : true;
  let matchesStock = true;
  if (productStockFilter === 'in_stock') matchesStock = Number(p.stock) > 5;
  else if (productStockFilter === 'low_stock') matchesStock = Number(p.stock) > 0 && Number(p.stock) <= 5;
  else if (productStockFilter === 'out_of_stock') matchesStock = Number(p.stock) === 0;
  // Shop filter: match by managerId or shopId (string or objectId)
  const matchesShop = productShopFilter ? (
    (p.managerId && String(p.managerId) === productShopFilter) ||
    (p.shopId && String(p.shopId) === productShopFilter)
  ) : true;
  // Seller filter: match by sellerId (string or objectId)
  const matchesSeller = productSellerFilter ? (
    (p.sellerId && String(p.sellerId) === productSellerFilter)
  ) : true;
  return matchesName && matchesCategory && matchesStock && matchesShop && matchesSeller;
});
const paginatedProducts = filteredProducts.slice((productPage - 1) * productsPerPage, productPage * productsPerPage);
const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
const filteredUsers = users.filter(u => {
  const matchesName = u.username.toLowerCase().includes(userSearch.toLowerCase());
  const matchesRole = userRoleFilter ? u.role === userRoleFilter : true;
  const matchesApproval = userApprovalFilter ? ((userApprovalFilter === 'approved' && u.approved) || (userApprovalFilter === 'not_approved' && !u.approved)) : true;
  return matchesName && matchesRole && matchesApproval;
});
  // DEBUG: Render check
  // console.log('AdminPage render', { auth, token, login, loginError });

  // Fallback: decode username/email/role from JWT if adminProfile is not loaded
  function getProfileFallback(token) {
    if (!token) return { username: 'Admin', email: '', role: 'admin' };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        username: payload.username || payload.name || 'Admin',
        email: payload.email || '',
        role: payload.role || 'admin',
      };
    } catch {
      return { username: 'Admin', email: '', role: 'admin' };
    }
  }

  // Helper functions to get user names by uniqueId or _id
function getUserNameByUniqueId(uniqueId) {
  const user = users.find(u => u.uniqueId === uniqueId);
  return user ? user.username : '-';
}
function getShopNameById(shopId) {
  if (!shopId) return 'Shop missing';
  // Debug: log all subadmin IDs and the shopId being searched
  if (typeof window !== 'undefined' && window.console) {
    const subadmins = users.filter(u => u.role === 'subadmin');
    console.log('[DEBUG] getShopNameById:', { shopId, subadminIds: subadmins.map(u => u._id), subadmins });
  }
  // Match by _id for subadmin/shop
  const user = users.find(u => String(u._id) === String(shopId) && u.role === 'subadmin');
  if (user) return user.username + (user.email ? ` (${user.email})` : '');
  return 'Shop data missing';
}
function getSellerNameById(sellerId) {
  if (!sellerId) return 'Seller missing';
  // Match by sellerId field
  const user = users.find(u => u.sellerId === sellerId && u.role === 'seller');
  if (user) return user.username + (user.email ? ` (${user.email})` : '');
  return 'Seller data missing';
}
// New: Get shop (subadmin) name for a product, even if posted by seller
function getShopNameForProduct(product) {
  // If shopId is populated as an object with shopName, use it
  if (product.shopId && typeof product.shopId === 'object' && product.shopId.shopName) {
    return product.shopId.shopName;
  }
  if (product.sellerId) {
    const seller = users.find(u => u.sellerId === product.sellerId && u.role === 'seller');
    if (seller) {
      if (seller.managerId) {
        return getShopNameById(seller.managerId);
      }
      if (seller.shopId) {
        return getShopNameById(seller.shopId);
      }
      return 'Shop data missing';
    }
    return 'Seller data missing';
  }
  if (product.managerId) return getShopNameById(product.managerId);
  if (product.shopId) return getShopNameById(product.shopId);
  return 'Shop data missing';
}

  return (
    <div className="admin-dashboard">
      {/* --- Admin Header --- */}
      <div className="admin-dashboard-header">
        <div className="header-left">
          <span className="dashboard-logo">Admin</span>
          <span className="future-title">E-Commerce Management</span>
          {/* Home link removed as requested */}
        </div>
        <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: 18}}>
          {/* Date/Time */}
          <span style={{color: '#e0e6ff', fontSize: 15, marginRight: 10}}>{new Date().toLocaleString()}</span>
          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(dm => !dm)} style={{background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer'}} title="Toggle Dark Mode">{darkMode ? '🌙' : '☀️'}</button>
          {/* Notification bell with badge */}
          <span className="notification-bell" title="Notifications" onClick={handleNotifClick} style={{position: 'relative'}}>
            <FaRegBell />
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={{position: 'absolute', top: -4, right: -4, background: '#e74c3c', color: '#fff', borderRadius: '50%', fontSize: 11, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700}}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </span>
          {/* Admin info dropdown */}
          <div
            id="admin-header-avatar"
            className="user-avatar"
            title="Profile"
            onClick={e => {
              e.stopPropagation();
              handleUserClick();
            }}
            style={{position: 'relative', cursor: 'pointer'}}
          >
            {adminProfile?.username ? adminProfile.username[0].toUpperCase() : 'A'}
            {showUserDropdown && (
              <div
                id="admin-header-avatar-dropdown"
                style={{position: 'absolute', right: 0, top: 50, background: '#263159', color: '#fff', borderRadius: 10, boxShadow: '0 2px 12px #23294655', minWidth: 180, zIndex: 100, padding: 16}}
                onClick={e => e.stopPropagation()}
              >
                {adminProfile ? (
                  <>
                    <div style={{fontWeight: 700, fontSize: 17, marginBottom: 4}}>{adminProfile.username}</div>
                    <div style={{fontSize: 13, color: '#bbb', marginBottom: 4}}>{adminProfile.email}</div>
                    <div style={{fontSize: 13, color: '#bbb', marginBottom: 8}}>{adminProfile.role}</div>
                  </>
                ) : (
                  (() => { const fallback = getProfileFallback(token); return (
                    <>
                      <div style={{fontWeight: 700, fontSize: 17, marginBottom: 4}}>{fallback.username}</div>
                      <div style={{fontSize: 13, color: '#bbb', marginBottom: 4}}>{fallback.email}</div>
                      <div style={{fontSize: 13, color: '#bbb', marginBottom: 8}}>{fallback.role}</div>
                    </>
                  ); })()
                )}
                <button className="btn btn-outline" style={{width: '100%'}} onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* --- Futuristic Sidebar Navigation --- */}
      <div style={{display: 'flex', minHeight: '100vh'}}>
        <div className="future-sidebar" style={{width: 260, height: '100vh', background: '#232946', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 12px #23294622', position: 'relative'}}>
          {/* Collapsible user profile section */}
          {/* Duplicate removed: was rendering a second dropdown/profile section */}
          <nav style={{flex: 1, padding: '2rem 1.5rem 0 1.5rem'}}>
            {sidebarLinks.map(item => (
              <div
                key={item.key}
                className={sidebarSection === item.key ? 'active' : ''}
                style={{
                  marginBottom: 18,
                  fontWeight: sidebarSection === item.key ? 600 : 400,
                  color: sidebarSection === item.key ? '#3a6cf6' : '#e0e6ff',
                  background: sidebarSection === item.key ? '#263159' : 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  position: 'relative',
                }}
                onClick={() => setSidebarSection(item.key)}
                title={item.label}
                onMouseEnter={e => e.currentTarget.style.background = '#3a6cf6'}
                onMouseLeave={e => e.currentTarget.style.background = sidebarSection === item.key ? '#263159' : 'none'}
              >
                <span style={{fontSize: 20}}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>
        <div style={{flex: 1, padding: '2.5rem 3rem', background: '#f4f7fa', minHeight: '100vh', boxSizing: 'border-box', overflowY: 'auto'}}>
          {/* --- Main dashboard content goes here, conditionally rendered by sidebarSection --- */}
          {(sidebarSection === 'analytics' || sidebarSection === 'dashboard') && (
            <div style={{width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 24}}>
              {/* Sales summary and analytics (from backend) */}
              <div className="future-dashboard-cards" style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, width: '100%'}}>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Total Orders</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#0984e3'}}>{salesSummary.totalOrders}</div>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Total Revenue</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#27ae60'}}>ETB {salesSummary.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Products</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#f7c948'}}>{salesSummary.productCount}</div>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Users</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#888'}}>{salesSummary.userCount}</div>
                </div>
              </div>
              {/* --- Advanced Analytics Charts --- */}
              <div className="future-dashboard-row" style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, width: '100%'}}>
                <div className="future-chart-container" style={{flex: 2, padding: '1.5rem'}}>
                  <div style={{fontWeight: 600, marginBottom: 12}}>Orders by Month</div>
                  <Bar data={ordersByMonthData} options={{responsive: true, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}} height={180} />
                </div>
                <div className="future-chart-container" style={{flex: 2, padding: '1.5rem'}}>
                  <div style={{fontWeight: 600, marginBottom: 12}}>Revenue by Month</div>
                  <Bar data={revenueByMonthData} options={{responsive: true, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}} height={180} />
                </div>
                <div className="future-chart-container" style={{flex: 1, padding: '1.5rem'}}>
                  <div style={{fontWeight: 600, marginBottom: 12}}>Users by Role</div>
                  <Pie data={usersByRoleData} options={{responsive: true, plugins: {legend: {position: 'bottom'}}}} height={180} />
                </div>
              </div>
              <div className="future-chart-container" style={{padding: '1.5rem', marginBottom: 32, width: '100%', boxSizing: 'border-box'}}>
                <div style={{fontWeight: 600, marginBottom: 12}}>Top Selling Products</div>
                <Bar data={topProductsData} options={{responsive: true, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}} height={180} />
              </div>
              {/* --- Real-Time & Custom Analytics Widgets --- */}
              <div className="future-dashboard-row" style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, alignItems: 'stretch', width: '100%'}}>
                <div className="future-card future-glow" style={{flex: 1, padding: '1.5rem', minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}} title="Real-Time Active Users">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Active Users</div>
                  <div style={{fontSize: 38, fontWeight: 900, color: '#3a6cf6', transition: 'all 0.5s'}}>{activeUsers}</div>
                  <div style={{fontSize: 13, color: '#888'}}>in the last 5 min</div>
                </div>
                <div className="future-card" style={{flex: 2, padding: '1.5rem', minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center'}} title="Live Sales Ticker">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Live Sales</div>
                  <div style={{fontSize: 18, color: '#27ae60', minHeight: 32, transition: 'all 0.5s'}}>
                    {salesTicker[tickerIndex]?.msg}
                  </div>
                </div>
                <div className="future-card" style={{flex: 3, padding: '1.5rem', minWidth: 220}} title="Product/Category Heatmap">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Product/Category Heatmap</div>
                  <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    {heatmapLabels.map((cat, i) => {
                      const rawOpacity = 0.8 + 0.2 * (heatmapValues[i] / Math.max(...heatmapValues || [1]));
                      const safeOpacity = isNaN(rawOpacity) ? 1 : Math.max(0, Math.min(1, rawOpacity));
                      return (
                        <div
                          key={cat}
                          style={{
                            background: '#3a6cf6',
                            color: '#fff',
                            borderRadius: 8,
                            padding: '8px 16px',
                            marginBottom: 6,
                            fontWeight: 600,
                            opacity: safeOpacity
                          }}
                        >
                          {cat}: {heatmapValues[i]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="future-card" style={{flex: 2, padding: '1.5rem', minWidth: 220}} title="Recent Logins">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Recent Logins</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 15}}>
                    {recentLogins.map(l => <li key={l.user}><b>{l.user}</b> <span style={{color: '#888'}}>({l.role})</span> <span style={{float: 'right', color: '#3a6cf6'}}>{l.time}</span></li>)}
                  </ul>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', minWidth: 220}} title="Live Server Status">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Live Server Status</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 15}}>
                    {liveStatus.map(s => <li key={s.label}><b>{s.label}:</b> <span style={{color: s.status === 'online' ? '#27ae60' : '#f7c948', fontWeight: 700, animation: s.status === 'online' ? 'glowPulse 1.5s infinite alternate' : undefined}}>{s.status}</span></li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {sidebarSection === 'products' && (
            <div>
              <h2>Manage Products</h2>
              <div style={{display:'flex',gap:12,marginBottom:16}}>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{flex:2,padding:'10px',borderRadius:8,border:'1px solid #3a6cf6'}}
                />
                <select value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)} style={{flex:1,padding:'10px',borderRadius:8}}>
                  <option value="">All Categories</option>
                  {[...new Set(products.map(p => p.category || 'Uncategorized'))].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select value={productStockFilter} onChange={e => setProductStockFilter(e.target.value)} style={{flex:1,padding:'10px',borderRadius:8}}>
                  <option value="">All Stock</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock (≤5)</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
                <select value={productShopFilter} onChange={e => setProductShopFilter(e.target.value)} style={{flex:1,padding:'10px',borderRadius:8}}>
                  <option value="">All Shops</option>
                  {[...new Set(users.filter(u => u.role === 'subadmin').map(u => u.uniqueId || u._id))].map(id => {
                    const user = users.find(u => (u.uniqueId === id || u._id === id) && u.role === 'subadmin');
                    return <option key={id} value={id}>{user ? user.username : id}</option>;
                  })}
                </select>
                <select value={productSellerFilter} onChange={e => setProductSellerFilter(e.target.value)} style={{flex:1,padding:'10px',borderRadius:8}}>
                  <option value="">All Sellers</option>
                  {[...new Set(users.filter(u => u.role === 'seller').map(u => u.uniqueId || u._id))].map(id => {
                    const user = users.find(u => (u.uniqueId === id || u._id === id) && u.role === 'seller');
                    return <option key={id} value={id}>{user ? user.username : id}</option>;
                  })}
                </select>
              </div>
              <button onClick={exportProductsCSV} className="btn btn-outline" style={{marginBottom: 16, float: 'right'}}>Export CSV</button>
              <form onSubmit={handleSubmit} encType="multipart/form-data" style={{display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18, background: '#232946', borderRadius: 12, padding: 16}}>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required style={{flex: 1}} />
                <input name="price" value={form.price} onChange={handleChange} placeholder="Price" required style={{flex: 1}} />
                <input name="category" value={form.category} onChange={handleChange} placeholder="Category" style={{flex: 1}} />
                <input name="image" value={form.image} onChange={handleChange} placeholder="Image URL or filename" style={{flex: 2}} />
                <input type="file" accept="image/*" onChange={handleImageChange} style={{flex: 2}} />
                <input name="description" value={form.description} onChange={handleChange} placeholder="Description" style={{flex: 2}} />
                {/* Receipt upload section */}
                <label style={{flex: 2, color: '#fff'}}>Upload Receipt (optional):
                  <input type="file" accept="image/*,application/pdf" name="receipt" onChange={handleReceiptChange} style={{marginLeft: 8}} />
                </label>
                <button type="submit" style={{flex: 1}}>{editing ? 'Update' : 'Add'} Product</button>
                {editing && <button type="button" onClick={() => { setEditing(null); setForm({ name: '', price: '', category: '', image: '', description: '' }); setImageFile(null); }} style={{flex: 1, background: '#e74c3c'}}>Cancel</button>}
              </form>
              {lowStockProducts.length > 0 && (
                <div className="low-stock-alert">
                  <span>⚠️ Low Stock Alert: </span>
                  {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
                </div>
              )}
              <div style={{overflowX: 'auto'}}>
                <table className="future-table" style={{minWidth: 1000}}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Category</th>
                      <th>Image</th>
                      <th>Description</th>
                      <th>Shop (Subadmin)</th>
                      <th>Seller</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(product => (
                      <tr key={product._id} style={{background: editing && editing._id === product._id ? '#353b48' : undefined}}>
                        <td>{product.name}</td>
                        <td>${product.price}</td>
                        <td>{product.category}</td>
                        <td>{product.image ? <img src={product.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, boxShadow: '0 1px 4px #2222' }} /> : ''}</td>
                        <td>{product.description}</td>
                        <td>{getShopNameForProduct(product)}</td>
                        <td>{getSellerNameById(product.sellerId)}</td>
                        <td>
                          {/* Approve/Reject for pendingApproval products */}
                          {product.status === 'pendingApproval' ? (
                            <>
                              <button className="btn btn-success" style={{marginRight: 6, background: '#27ae60', color: '#fff'}} onClick={() => handleApproveProduct(product._id)}>Approve</button>
                              <button className="btn btn-danger" style={{marginRight: 6, background: '#e74c3c', color: '#fff'}} onClick={() => handleRejectProduct(product._id)}>Reject</button>
                            </>
                          ) : null}
                          <button className="btn btn-secondary" onClick={() => handleEdit(product)} style={{marginRight: 6}}>Edit</button>
                          <button className="btn btn-outline" onClick={() => handleDelete(product._id)} style={{ color: '#e74c3c' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, gap: 12 }}>
                <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}>&lt; Prev</button>
                <span>Page {productPage} of {totalProductPages}</span>
                <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages}>Next &gt;</button>
              </div>
            </div>
          )}
          {sidebarSection === 'users' && (
            <div>
              <h2 style={{color:'#00b894',marginBottom:8}}>Subadmin - Users</h2>
              <h3>Manage Users (Create Sellers)</h3>
              {/* User Filters */}
              <div style={{display:'flex',gap:12,marginBottom:16}}>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{flex:2,padding:'10px',borderRadius:8,border:'1px solid #3a6cf6'}}
                />
                <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} style={{flex:1,padding:'10px',borderRadius:8}}>
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="subadmin">Sub-Admin</option>
                  <option value="seller">Seller</option>
                  <option value="delivery">Delivery</option>
                  <option value="user">User</option>
                </select>
                <select value={userApprovalFilter} onChange={e => setUserApprovalFilter(e.target.value)} style={{flex:1,padding:'10px',borderRadius:8}}>
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="not_approved">Not Approved</option>
                </select>
              </div>
              <button onClick={exportUsersCSV} className="btn btn-outline" style={{marginBottom: 16, float: 'right'}}>Export CSV</button>
              <form onSubmit={handleUserSubmit} style={{display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18, background: '#232946', borderRadius: 12, padding: 16}}>
                <input name="username" value={userForm.username} onChange={handleUserChange} placeholder="Username" required style={{flex: 1}} />
                <input name="email" value={userForm.email} onChange={handleUserChange} placeholder="Email" required style={{flex: 1}} />
                <input name="password" type="password" value={userForm.password} onChange={handleUserChange} placeholder="Password" required style={{flex: 1}} />
                <input name="phone" value={userForm.phone} onChange={handleUserChange} placeholder="Phone" required style={{flex: 1}} />
                <select name="role" value={userForm.role} onChange={handleUserChange} style={{flex: 1}}>
                  <option value="seller">Seller</option>
                  <option value="subadmin">Sub-Admin</option>
                </select>
                <button type="submit" style={{flex: 1}}>Create User</button>
              </form>
              {/* Delivery Person Creation Form */}
              <div style={{margin:'2rem 0',padding:'1.5rem',background:'#f8f9fa',borderRadius:8,maxWidth:500}}>
                <h3>Create Delivery Person</h3>
                <form onSubmit={handleDeliverySubmit} style={{display:'flex',flexDirection:'column',gap:10}}>
                  <input name="username" value={deliveryForm.username} onChange={handleDeliveryChange} placeholder="Username" required />
                  <input name="email" value={deliveryForm.email} onChange={handleDeliveryChange} placeholder="Email" required />
                  <input name="password" type="password" value={deliveryForm.password} onChange={handleDeliveryChange} placeholder="Password" required />
                  <button type="submit">Create Delivery Account</button>
                  {deliveryMsg && <div style={{color:deliveryMsg.startsWith('Error')?'red':'green'}}>{deliveryMsg}</div>}
                </form>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table className="future-table" style={{minWidth: 700}}>
                  <thead>
                    <tr>
                      <th>Username</th><th>Email</th><th>Role</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      editingUser === user._id ? (
                        <tr key={user._id} style={{ background: '#353b48' }}>
                          <td><input name="username" value={editUserForm.username} onChange={handleEditUserChange} /></td>
                          <td><input name="email" value={editUserForm.email} onChange={handleEditUserChange} /></td>
                          <td>
                            <select name="role" value={editUserForm.role} onChange={handleEditUserChange}>
                              <option value="seller">Seller</option>
                              <option value="subadmin">Sub-Admin</option>
                            </select>
                          </td>
                          <td>
                            <input name="password" type="password" value={editUserForm.password} onChange={handleEditUserChange} placeholder="New password (optional)" />
                            <button onClick={handleEditUserSubmit}>Save</button>
                            <button onClick={handleCancelEditUser}>Cancel</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={user._id}>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{user.role}</td>
                          <td>
                            <button onClick={() => handleEditUser(user)} style={{marginRight: 6}}>Edit</button>
                            <button onClick={() => handleUserDelete(user._id)} style={{ background: '#e74c3c', color: '#fff', marginRight: 6 }}>Delete</button>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {sidebarSection === 'analytics' && (
            <div>
              {/* Sales summary and analytics (from backend) */}
              <div className="future-dashboard-cards" style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32}}>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Total Orders</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#0984e3'}}>{salesSummary.totalOrders}</div>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Total Revenue</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#27ae60'}}>ETB {salesSummary.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Products</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#f7c948'}}>{salesSummary.productCount}</div>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 14, color: '#888'}}>Users</div>
                  <div style={{fontWeight: 700, fontSize: 28, color: '#888'}}>{salesSummary.userCount}</div>
                </div>
              </div>
              {/* --- Advanced Analytics Charts --- */}
              <div className="future-dashboard-row" style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, width: '100%'}}>
                <div className="future-chart-container" style={{flex: 2, padding: '1.5rem'}}>
                  <div style={{fontWeight: 600, marginBottom: 12}}>Orders by Month</div>
                  <Bar data={ordersByMonthData} options={{responsive: true, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}} height={180} />
                </div>
                <div className="future-chart-container" style={{flex: 2, padding: '1.5rem'}}>
                  <div style={{fontWeight: 600, marginBottom: 12}}>Revenue by Month</div>
                  <Bar data={revenueByMonthData} options={{responsive: true, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}} height={180} />
                </div>
                <div className="future-chart-container" style={{flex: 1, padding: '1.5rem'}}>
                  <div style={{fontWeight: 600, marginBottom: 12}}>Users by Role</div>
                  <Pie data={usersByRoleData} options={{responsive: true, plugins: {legend: {position: 'bottom'}}}} height={180} />
                </div>
              </div>
              <div className="future-chart-container" style={{padding: '1.5rem', marginBottom: 32, width: '100%', boxSizing: 'border-box'}}>
                <div style={{fontWeight: 600, marginBottom: 12}}>Top Selling Products</div>
                <Bar data={topProductsData} options={{responsive: true, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}} height={180} />
              </div>
              {/* --- Real-Time & Custom Analytics Widgets --- */}
              <div className="future-dashboard-row" style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, alignItems: 'stretch', width: '100%'}}>
                <div className="future-card future-glow" style={{flex: 1, padding: '1.5rem', minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}} title="Real-Time Active Users">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Active Users</div>
                  <div style={{fontSize: 38, fontWeight: 900, color: '#3a6cf6', transition: 'all 0.5s'}}>{activeUsers}</div>
                  <div style={{fontSize: 13, color: '#888'}}>in the last 5 min</div>
                </div>
                <div className="future-card" style={{flex: 2, padding: '1.5rem', minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center'}} title="Live Sales Ticker">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Live Sales</div>
                  <div style={{fontSize: 18, color: '#27ae60', minHeight: 32, transition: 'all 0.5s'}}>
                    {salesTicker[tickerIndex]?.msg}
                  </div>
                </div>
                <div className="future-card" style={{flex: 3, padding: '1.5rem', minWidth: 220}} title="Product/Category Heatmap">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Product/Category Heatmap</div>
                  <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    {heatmapLabels.map((cat, i) => {
                      const rawOpacity = 0.8 + 0.2 * (heatmapValues[i] / Math.max(...heatmapValues || [1]));
                      const safeOpacity = isNaN(rawOpacity) ? 1 : Math.max(0, Math.min(1, rawOpacity));
                      return (
                        <div
                          key={cat}
                          style={{
                            background: '#3a6cf6',
                            color: '#fff',
                            borderRadius: 8,
                            padding: '8px 16px',
                            marginBottom: 6,
                            fontWeight: 600,
                            opacity: safeOpacity
                          }}
                        >
                          {cat}: {heatmapValues[i]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="future-card" style={{flex: 2, padding: '1.5rem', minWidth: 220}} title="Recent Logins">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Recent Logins</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 15}}>
                    {recentLogins.map(l => <li key={l.user}><b>{l.user}</b> <span style={{color: '#888'}}>({l.role})</span> <span style={{float: 'right', color: '#3a6cf6'}}>{l.time}</span></li>)}
                  </ul>
                </div>
                <div className="future-card" style={{flex: 1, padding: '1.5rem', minWidth: 220}} title="Live Server Status">
                  <div style={{fontWeight: 600, marginBottom: 8}}>Live Server Status</div>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: 15}}>
                    {liveStatus.map(s => <li key={s.label}><b>{s.label}:</b> <span style={{color: s.status === 'online' ? '#27ae60' : '#f7c948', fontWeight: 700, animation: s.status === 'online' ? 'glowPulse 1.5s infinite alternate' : undefined}}>{s.status}</span></li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;