import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductForm from '../components/ProductForm';
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
import { FaBell, FaHome, FaBoxOpen, FaUsers, FaRegListAlt, FaFileAlt, FaChartBar, FaRegCommentDots, FaCog } from 'react-icons/fa';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const API_BASE = `http://${window.location.hostname}:5000/api`;

// --- Seller Privileges Default ---
const defaultPrivileges = {
  canAddProducts: true,
  canEditProducts: true,
  canDeleteProducts: true,
  canViewOrders: true,
  canManageProfile: true
};

const SubAdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [users, setUsers] = useState([]); // Users state
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userEdit, setUserEdit] = useState(null);
  const [userEditForm, setUserEditForm] = useState({ username: '', email: '', role: '' });
  const [userMessage, setUserMessage] = useState('');
  const [managedProducts, setManagedProducts] = useState([]);
  // Subadmin login state
  const [login, setLogin] = useState({ email: '', password: '', role: '' }); // Add role
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Show password state

  // --- Notifications State ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');

  // --- Activity Log State ---
  const [activityLog, setActivityLog] = useState([]);

  // --- Password Change Modal State ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  // --- Profile Modal State ---
  const [showProfileModal, setShowProfileModal] = useState(false);

  // --- Real analytics and orders state ---
  const [analytics, setAnalytics] = useState({ totalOrders: 0, totalRevenue: 0, bestSeller: null });
  const [orders, setOrders] = useState([]);

  // --- Seller Management State (move to top level) ---
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerPage, setSellerPage] = useState(1);
  const sellersPerPage = 8;
  const [sellerProductCounts, setSellerProductCounts] = useState({});
  const [viewSellerProducts, setViewSellerProducts] = useState(null);
  const [resetSellerId, setResetSellerId] = useState(null);
  const [resetSellerMsg, setResetSellerMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmEditId, setConfirmEditId] = useState(null);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  // --- Toast State ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  // Collapsible sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSection, setSidebarSection] = useState('dashboard');
  const sidebarLinks = [
    { key: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { key: 'products', label: 'Products', icon: <FaBoxOpen /> },
    { key: 'sellers', label: 'Sellers', icon: <FaUsers /> },
    { key: 'orders', label: 'Orders', icon: <FaRegListAlt /> },
    { key: 'reports', label: 'Reports', icon: <FaFileAlt /> },
    { key: 'ratings', label: 'Ratings', icon: <FaChartBar /> },
    { key: 'comments', label: 'Comments', icon: <FaRegCommentDots /> },
    { key: 'settings', label: 'Settings', icon: <FaCog /> },
    { key: 'products-managed', label: 'Products Managed', icon: <FaBoxOpen /> },
  ];

  // Hide 'sellers' section for seller role
  const filteredSidebarLinks = user?.role === 'seller'
    ? sidebarLinks.filter(link => link.key !== 'sellers')
    : sidebarLinks;

  // --- Responsive sidebar collapse on small screens ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900 && !sidebarCollapsed) setSidebarCollapsed(true);
      if (window.innerWidth >= 900 && sidebarCollapsed) setSidebarCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  // --- Shop-based data isolation helpers ---
  // Helper to generate unique sellerId (e.g., se1, se2, ...)
  function generateSellerId(existingSellers = []) {
    // Find max seN in current shop
    const ids = existingSellers.map(s => s.sellerId).filter(Boolean);
    let max = 0;
    ids.forEach(id => {
      const match = /^se(\d+)$/.exec(id);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return `se${max + 1}`;
  }
  function generateManagerId(shopId, existingManagers = []) {
    // Find max smN for this shop
    const ids = existingManagers.map(m => m.managerId).filter(Boolean);
    let max = 0;
    ids.forEach(id => {
      const match = /^sm(\d+)$/.exec(id);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return `sm${max + 1}`;
  }

  useEffect(() => {
    // Robustly parse user from localStorage
    let userData = localStorage.getItem('subadmin_user');
    let parsed = null;
    if (userData && userData !== 'undefined') {
      try {
        parsed = JSON.parse(userData);
        // If parsed is not an object or has no valid role, treat as not logged in
        if (!parsed || typeof parsed !== 'object' || !parsed.role || typeof parsed.role !== 'string') {
          parsed = null;
        }
      } catch (e) {
        parsed = null;
      }
    }
    setUser(parsed);
    if (parsed && parsed.role === 'subadmin') {
      const token = parsed.token;
      // Fetch only products for this subadmin's shop
      axios.get(`${API_BASE}/products?shopId=${parsed.shopId}`,
        { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setProducts(res.data.filter(p => p.shopId === parsed.shopId)))
        .catch(() => setProducts([]));
    } else if (parsed && parsed.role === 'user') {
      // Seller: fetch only their own products
      const token = parsed.token;
      axios.get(`${API_BASE}/products`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setProducts(res.data.filter(p => p.owner === parsed._id && p.shopId === parsed.shopId)))
        .catch(() => setProducts([]));
    }
  }, [showEditModal, loginError, loggingIn]); // Add loginError and loggingIn to dependencies

  // Remove redirect to /login, show login form instead
  // ...existing code...

  // Fetch sellers for user management section
  useEffect(() => {
    if (section === 'sellers' && user && user.token) {
      setLoadingUsers(true);
      axios.get(`${API_BASE}/auth/subadmin/sellers?shopId=${user.shopId}`,
        { headers: { Authorization: `Bearer ${user.token}` } })
        .then(res => {
          setUsers(res.data.filter(u => u.shopId === user.shopId));
          setLoadingUsers(false);
        })
        .catch(() => {
          setUsers([]);
          setLoadingUsers(false);
        });
    }
  }, [section, user]);

  // Fetch real analytics and orders for subadmin
  useEffect(() => {
    if (user && user.token) {
      axios.get(`${API_BASE}/admin/subadmin/analytics`, { headers: { Authorization: `Bearer ${user.token}` } })
        .then(res => setAnalytics(res.data))
        .catch(() => setAnalytics({ totalOrders: 0, totalRevenue: 0, bestSeller: null }));
      axios.get(`${API_BASE}/admin/subadmin/orders`, { headers: { Authorization: `Bearer ${user.token}` } })
        .then(res => setOrders(res.data))
        .catch(() => setOrders([]));
    }
  }, [user]);

  // Fetch product counts for sellers
  useEffect(() => {
    if (users.length > 0 && user && user.token) {
      Promise.all(users.map(u =>
        axios.get(`${API_BASE}/products?seller=${u._id}&shopId=${user.shopId}`,
          { headers: { Authorization: `Bearer ${user.token}` } })
          .then(res => ({ id: u._id, count: res.data.length }))
          .catch(() => ({ id: u._id, count: 0 }))
      )).then(results => {
        const counts = {};
        results.forEach(r => { counts[r.id] = r.count; });
        setSellerProductCounts(counts);
      });
    }
  }, [users, user]);

  const handleEdit = (product) => {
    setEditProduct(product ? { ...product, shopId: user.shopId, managerId: user._id } : { shopId: user.shopId, managerId: user._id });
    setShowEditModal(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const userData = localStorage.getItem('subadmin_user');
      const token = userData ? JSON.parse(userData).token : '';
      await axios.delete(`${API_BASE}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(prev => prev.filter(p => p._id !== productId));
    } catch (err) {
      alert('Failed to delete product.');
    }
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    setShowEditModal(false);
    setEditProduct(null);
  };

  // User management handlers
  const handleUserEdit = (u) => {
    setUserEdit(u);
    setUserEditForm({ username: u.username, email: u.email, role: u.role });
    setUserMessage('');
  };
  const handleUserEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('privileges.')) {
      const privKey = name.split('.')[1];
      setUserEditForm(f => ({ ...f, privileges: { ...f.privileges, [privKey]: type === 'checkbox' ? checked : value } }));
    } else {
      setUserEditForm(f => ({ ...f, [name]: value }));
    }
  };
  const handleUserEditSubmit = async (e) => {
    e.preventDefault();
    if (!userEdit) return;
    try {
      await axios.put(`${API_BASE}/auth/subadmin/sellers/${userEdit._id}`, userEditForm, { headers: { Authorization: `Bearer ${user.token}` } });
      setUserMessage('User updated!');
      setUsers(users.map(u => u._id === userEdit._id ? { ...u, ...userEditForm } : u));
      setUserEdit(null);
    } catch (err) {
      setUserMessage('Error updating user.');
    }
  };
  const handleUserDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API_BASE}/auth/subadmin/sellers/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      setUserMessage('Error deleting user.');
    }
  };

  // Add seller creation
  const [newSeller, setNewSeller] = useState({ username: '', email: '', password: '', privileges: { ...defaultPrivileges } });
  const [sellerMsg, setSellerMsg] = useState('');
  const handleNewSellerChange = e => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('privileges.')) {
      const privKey = name.split('.')[1];
      setNewSeller(f => ({ ...f, privileges: { ...f.privileges, [privKey]: type === 'checkbox' ? checked : value } }));
    } else {
      setNewSeller(f => ({ ...f, [name]: value }));
    }
  };
  const handleCreateSeller = async e => {
    e.preventDefault();
    setSellerMsg('');
    try {
      // Assign shopId and unique sellerId
      const shopId = user?.shopId;
      const sellerId = generateSellerId(users.filter(u => u.shopId === shopId));
      const payload = { ...newSeller, shopId, sellerId };
      await axios.post(`${API_BASE}/auth/subadmin/sellers`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      setSellerMsg('Seller created!');
      setNewSeller({ username: '', email: '', password: '', privileges: { ...defaultPrivileges } });
      setLoadingUsers(true);
      const res = await axios.get(`${API_BASE}/auth/subadmin/sellers`, { headers: { Authorization: `Bearer ${user.token}` } });
      setUsers(res.data);
      setLoadingUsers(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error creating seller.';
      setSellerMsg(msg);
    }
  };

  // Login handlers
  const handleLoginChange = e => {
    const { name, value } = e.target;
    setLogin(l => ({ ...l, [name]: value }));
  };
  const handleLoginSubmit = async e => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      // Send role in login request
      const res = await axios.post(`${API_BASE}/auth/login`, login);
      const userObj = {
        _id: res.data.user?._id,
        token: res.data.token,
        role: res.data.user?.role || res.data.role || login.role, // fallback to selected role
        shopId: res.data.user?.shopId || res.data.shopId || null,
        username: res.data.user?.username || '',
        email: res.data.user?.email || login.email
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('subadmin_user', JSON.stringify(userObj));
      localStorage.setItem('subadmin_token', userObj.token);
      setUser(userObj);
      setLogin({ email: '', password: '', role: '' });
    } catch (err) {
      setLoginError('Wrong credentials or role. Please check your email, password, and selected role.');
    }
    setLoggingIn(false);
  };

  // Add logout handler for subadmin
  const handleSubadminLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/subadmin';
  };

  // Custom logout logic for subadmin
  const handleLogout = async () => {
    // Optionally call backend to invalidate token (if endpoint exists)
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, { headers: { Authorization: `Bearer ${user?.token}` } });
    } catch (e) {
      // Ignore errors, proceed with local cleanup
    }
    localStorage.removeItem('user');
    setUser(null); // Best practice: clear user state
    // Optionally show a goodbye message (toast or alert)
    // alert('You have been logged out. See you next time!');
  };

  // Custom profile logic for subadmin
  const handleProfileClick = () => setShowProfileModal(true);

  // Fetch notifications (placeholder)
  const fetchNotifications = async () => {
    setNotifLoading(true);
    setNotifError('');
    try {
      // Replace with your backend endpoint for subadmin notifications
      setNotifications([
        { id: 1, message: 'Low stock on product X', read: false, createdAt: new Date().toISOString() },
        { id: 2, message: 'New order received', read: false, createdAt: new Date().toISOString() }
      ]);
    } catch (err) {
      setNotifError('Failed to load notifications');
    }
    setNotifLoading(false);
  };
  const handleNotifClick = () => {
    setShowNotifDropdown(v => !v);
    if (!notifications.length) fetchNotifications();
  };
  const markNotificationRead = id => {
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif));
  };

  // Fetch activity log (placeholder)
  const fetchActivityLog = async () => {
    // Replace with your backend endpoint for subadmin activity log
    setActivityLog([
      { time: new Date().toLocaleString(), action: 'Edited product X' },
      { time: new Date().toLocaleString(), action: 'Created seller Y' }
    ]);
  };
  useEffect(() => { fetchActivityLog(); }, []);

  // Password change handlers
  const handlePasswordChangeInput = e => {
    const { name, value } = e.target;
    setPasswordForm(f => ({ ...f, [name]: value }));
  };
  const handlePasswordChangeSubmit = async e => {
    e.preventDefault();
    setPasswordMsg('');
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg('New passwords do not match.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/auth/change-password`, {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new
      }, { headers: { Authorization: `Bearer ${user?.token}` } });
      setPasswordMsg('Password changed successfully!');
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setShowPasswordModal(false), 1200);
    } catch (err) {
      setPasswordMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Forgot password handler
  const handleForgotSubmit = async e => {
    e.preventDefault();
    setForgotMsg('');
    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, { email: forgotEmail });
      setForgotMsg('Password reset link sent! Check your email.');
      setForgotEmail('');
    } catch (err) {
      setForgotMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Export helpers
  function exportProductsCSV() {
    const headers = ['Name', 'Price', 'Stock'];
    const rows = products.map(p => [p.name, p.price, p.stock]);
    let csv = headers.join(',') + '\n';
    csv += rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_products.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportSellersCSV() {
    const headers = ['Username', 'Email'];
    const rows = users.map(u => [u.username, u.email]);
    let csv = headers.join(',') + '\n';
    csv += rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_sellers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Handler for deleting a product in Products Managed section
  const handleDeleteProduct = async (productId) => {
    if (!user || !user.token) return;
    try {
      await axios.delete(`${API_BASE}/products/${productId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setManagedProducts(managedProducts.filter(p => p._id !== productId));
      setEditProduct(null);
      showToast('Product deleted!', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error deleting product';
      showToast(errorMsg, 'error');
    }
  };

  // Helper: get seller privileges (for current user)
  const sellerPrivileges = user?.role === 'user' ? user?.privileges || {} : {};

  // Helper: get subadmin privilege mask for seller creation
  const subadminPrivileges = user?.role === 'subadmin' ? user?.privileges || {} : {};

  // --- Advanced Filtering State ---
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out, in
  const [sortBy, setSortBy] = useState('name'); // name, price, stock
  const [sortDir, setSortDir] = useState('asc');
  const [orderViewType, setOrderViewType] = useState('table');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSortOrder, setOrderSortOrder] = useState('desc'); // 'desc' for newest first

  // --- Filtering and Sorting Logic ---
  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    .filter(p => {
      if (stockFilter === 'low') return p.stock <= 5 && p.stock > 0;
      if (stockFilter === 'out') return p.stock === 0;
      if (stockFilter === 'in') return p.stock > 5;
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortBy], valB = b[sortBy];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // --- Inline Inventory History State ---
  const [expandedHistory, setExpandedHistory] = useState({}); // { [productId]: true/false }

  const toggleHistory = async (product) => {
    setExpandedHistory(prev => ({
      ...prev,
      [product._id]: !prev[product._id]
    }));
    // Optionally fetch latest product data if not already loaded
    if (!product.stockHistory) {
      try {
        const userData = localStorage.getItem('subadmin_user');
        const token = userData ? JSON.parse(userData).token : '';
        const res = await axios.get(`${API_BASE}/products/${product._id}`,
          { headers: { Authorization: `Bearer ${token}` } });
        setProducts(prev => prev.map(p => p._id === product._id ? res.data : p));
      } catch (err) {
        // Optionally show error
      }
    }
  };

  // Fetch products managed by subadmin
  useEffect(() => {
    if (section === 'products-managed' && user && user.token) {
      axios.get(`${API_BASE}/auth/subadmin/products-managed`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setManagedProducts(res.data);
          } else {
            // Fallback: fetch products by shopId if managedProducts is empty
            axios.get(`${API_BASE}/products?shopId=${user.shopId}`, {
              headers: { Authorization: `Bearer ${user.token}` }
            })
              .then(res2 => setManagedProducts(res2.data))
              .catch(() => setManagedProducts([]));
          }
        })
        .catch(() => {
          // Fallback: fetch products by shopId if managedProducts API fails
          axios.get(`${API_BASE}/products?shopId=${user.shopId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          })
            .then(res2 => setManagedProducts(res2.data))
            .catch(() => setManagedProducts([]));
        });
    }
  }, [section, user, showEditModal]);

  // Section content renderers
  const renderSection = () => {
    switch (section) {
      case 'dashboard':
        return (
          <>
            {/* Summary Cards with real analytics */}
            <div className="future-dashboard-cards" style={{display: 'flex', gap: 24, marginBottom: 32}}>
              <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                <div style={{fontSize: 14, color: '#888'}}>Products Managed</div>
                <div style={{fontWeight: 700, fontSize: 28, color: '#00b894'}}>{products.length}</div>
              </div>
              <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                <div style={{fontSize: 14, color: '#888'}}>Total Orders</div>
                <div style={{fontWeight: 700, fontSize: 28, color: '#0984e3'}}>{analytics.totalOrders}</div>
              </div>
              <div className="future-card" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                <div style={{fontSize: 14, color: '#888'}}>Total Revenue</div>
                <div style={{fontWeight: 700, fontSize: 28, color: '#27ae60'}}>ETB {analytics.totalRevenue?.toLocaleString?.() ?? 0}</div>
              </div>
              <div className="future-card future-glow" style={{flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                <div style={{fontSize: 14, color: '#888'}}>Best Seller</div>
                <div className="future-best-seller" style={{fontSize: 22}}>{analytics.bestSeller || 'N/A'}</div>
              </div>
            </div>
            {/* Chart & Timeline Row */}
            <div className="future-dashboard-row" style={{display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap'}}>
              {/* Revenue by Month Bar Chart */}
              <div className="future-chart-container" style={{flex: 2, padding: '1.5rem', minWidth: 320}}>
                <div style={{fontWeight: 600, marginBottom: 12}}>Revenue by Month</div>
                {analytics.revenueByMonth && Array.isArray(analytics.revenueByMonth) && analytics.revenueByMonth.length === 12 ? (
                  <Bar
                    data={{
                      labels: Array.from({length: 12}, (_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - (11 - i));
                        return d.toLocaleString('default', { month: 'short', year: '2-digit' });
                      }),
                      datasets: [{
                        label: 'Revenue (ETB)',
                        data: analytics.revenueByMonth,
                        backgroundColor: '#3a6cf6',
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false }, title: { display: false } },
                      scales: { y: { beginAtZero: true } }
                    }}
                    height={180}
                  />
                ) : (
                  <div style={{height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 18, border: '1px dashed #eee', borderRadius: 8}}>
                    No data available
                  </div>
                )}
              </div>
              {/* Orders by Status Pie Chart */}
              <div className="future-chart-container" style={{flex: 1, padding: '1.5rem'}}>
                <div style={{fontWeight: 600, marginBottom: 12}}>Orders by Status</div>
                {analytics.statusCounts && Object.keys(analytics.statusCounts).length > 0 ? (
                  <Pie
                    data={{
                      labels: Object.keys(analytics.statusCounts),
                      datasets: [{
                        data: Object.values(analytics.statusCounts),
                        backgroundColor: ['#3a6cf6', '#27ae60', '#f7c948', '#e74c3c', '#888'],
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: 'bottom' } }
                    }}
                    height={180}
                  />
                ) : (
                  <div style={{height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 18, border: '1px dashed #eee', borderRadius: 8}}>
                    No data available
                  </div>
                )}
              </div>
            </div>
            {/* Top Products & Timeline Row */}
            <div style={{display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap'}}>
              {/* Top Products Bar Chart */}
              <div className="future-chart-container" style={{flex: 2, padding: '1.5rem', minWidth: 320}}>
                <div style={{fontWeight: 600, marginBottom: 12}}>Top Selling Products</div>
                {analytics.topProducts && analytics.topProducts.length > 0 ? (
                  <Bar
                    data={{
                      labels: analytics.topProducts.map(p => p.name),
                      datasets: [{
                        label: 'Quantity Sold',
                        data: analytics.topProducts.map(p => p.qty),
                        backgroundColor: '#00b894',
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false }, title: { display: false } },
                      scales: { y: { beginAtZero: true } }
                    }}
                    height={180}
                  />
                ) : (
                  <div style={{height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 18, border: '1px dashed #eee', borderRadius: 8}}>
                    No data available
                  </div>
                )}
              </div>
              {/* Timeline/Notifications */}
              <div style={{flex: 1, background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)', minWidth: 260}}>
                <div style={{fontWeight: 600, marginBottom: 12}}>Horizontal Timeline</div>
                <div style={{color: '#888', fontSize: 15, marginBottom: 8}}>No recent activity.</div>
                <div style={{color: '#888', fontSize: 15}}>More features coming soon.</div>
                <button className="button" style={{marginTop: 16, background: '#00b894', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600}}>Read More</button>
              </div>
            </div>
            {/* Top Products Bar Chart */}
            <div className="future-chart-container" style={{padding: '1.5rem', marginBottom: 32}}>
              <div style={{fontWeight: 600, marginBottom: 12}}>Top Selling Products</div>
              {analytics.topProducts && analytics.topProducts.length > 0 ? (
                <Bar
                  data={{
                    labels: analytics.topProducts.map(p => p.name),
                    datasets: [{
                      label: 'Quantity Sold',
                      data: analytics.topProducts.map(p => p.qty),
                      backgroundColor: '#00b894',
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false }, title: { display: false } },
                    scales: { y: { beginAtZero: true } }
                  }}
                  height={180}
                />
              ) : (
                <div style={{height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 18, border: '1px dashed #eee', borderRadius: 8}}>
                  No data available
                </div>
              )}
            </div>
            {/* Timeline/Notifications */}
            <div style={{flex: 1, background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)'}}>
              <div style={{fontWeight: 600, marginBottom: 12}}>Horizontal Timeline</div>
              <div style={{color: '#888', fontSize: 15, marginBottom: 8}}>No recent activity.</div>
              <div style={{color: '#888', fontSize: 15}}>More features coming soon.</div>
              <button className="button" style={{marginTop: 16, background: '#00b894', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600}}>Read More</button>
            </div>
          </>
        );
      case 'products':
        // Privilege checks for seller
        const canAdd = user?.role === 'user' ? sellerPrivileges.canAddProducts : true;
        const canEdit = user?.role === 'user' ? sellerPrivileges.canEditProducts : true;
        const canDelete = user?.role === 'user' ? sellerPrivileges.canDeleteProducts : true;
        return (
          <div style={{background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)', marginBottom: 32}}>
            <div style={{fontWeight: 600, marginBottom: 12}}>My Products</div>
            {/* --- Advanced Filters --- */}
            <div style={{display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center'}}>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                style={{width: 180}}
              />
              <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                <option value="all">All Stock</option>
                <option value="low">Low Stock (≤5)</option>
                <option value="out">Out of Stock</option>
                <option value="in">In Stock (&gt;5)</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="stock">Sort by Stock</option>
              </select>
              <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
            {/* Debug Info: Show user and products for troubleshooting */}
            <div style={{background:'#ffe',padding:'10px',marginBottom:'10px'}}>
              <strong>Debug Info:</strong><br/>
              User shopId: {user?.shopId ? user.shopId : 'N/A'}<br/>
              Products: <pre>{JSON.stringify(products, null, 2)}</pre>
            </div>
            {products.length === 0 ? (
              <div style={{color: '#888', textAlign: 'center', padding: 32}}>No products found.</div>
            ) : (
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 8}}>
              <thead>
                <tr style={{background: '#f4f4f4'}}>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Name</th>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Stock</th>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Price</th>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Actions</th>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Inventory</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => [
                  <tr key={p._id} style={p.stock === 0 ? {background: '#ffeaea'} : p.stock <= 5 ? {background: '#fffbe6'} : {}}>
                    <td style={{padding: 8, border: '1px solid #eee'}}>{p.name}</td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>
                      {p.stock}
                      {p.stock === 0 && <span style={{color: '#e74c3c', fontWeight: 700, marginLeft: 6}} title="Out of stock">⚠️</span>}
                      {p.stock > 0 && p.stock <= 5 && <span style={{color: '#f7b731', fontWeight: 700, marginLeft: 6}} title="Low stock">!</span>}
                    </td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>ETB {p.price}</td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>
                      <button className="button" style={{marginRight: 8}} onClick={() => handleEdit(p)} disabled={!canEdit} title={canEdit ? 'Edit product' : 'No privilege'}>Edit</button>
                      <button className="button" onClick={() => handleDelete(p._id)} disabled={!canDelete} title={canDelete ? 'Delete product' : 'No privilege'}>Delete</button>
                    </td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>
                      <button className="button" style={{background: '#eee', color: '#0984e3', fontWeight: 600, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 14}} onClick={() => toggleHistory(p)}>
                        {expandedHistory[p._id] ? 'Hide History' : 'Show History'}
                      </button>
                    </td>
                  </tr>,
                  expandedHistory[p._id] && (
                    <tr key={p._id + '-history'}>
                      <td colSpan={5} style={{background: '#f9f9f9', padding: 0, border: '1px solid #eee'}}>
                        {p.stockHistory && p.stockHistory.length > 0 ? (
                          <table style={{width: '100%', borderCollapse: 'collapse', margin: 0}}>
                            <thead>
                              <tr style={{background: '#f4f4f4'}}>
                                <th style={{padding: 6, border: '1px solid #eee'}}>Date</th>
                                <th style={{padding: 6, border: '1px solid #eee'}}>Change</th>
                                <th style={{padding: 6, border: '1px solid #eee'}}>Reason</th>
                                <th style={{padding: 6, border: '1px solid #eee'}}>User</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.stockHistory.slice().reverse().map((h, idx) => (
                                <tr key={idx}>
                                  <td style={{padding: 6, border: '1px solid #eee'}}>{h.date ? new Date(h.date).toLocaleString() : ''}</td>
                                  <td style={{padding: 6, border: '1px solid #eee'}}>{h.change > 0 ? '+' : ''}{h.change}</td>
                                  <td style={{padding: 6, border: '1px solid #eee'}}>{h.reason || '-'}</td>
                                  <td style={{padding: 6, border: '1px solid #eee'}}>{h.user || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{color: '#888', padding: 12}}>No inventory history found for this product.</div>
                        )}
                      </td>
                    </tr>
                  )
                ])}
              </tbody>
            </table>
            )}
            {canAdd && <button className="button" style={{marginTop: 16}} onClick={() => { setEditProduct({}); setShowEditModal(true); }}>+ Add Product</button>}
            {/* Product Edit/Add Modal */}
            {showEditModal && (
              <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditProduct(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                  <button className="modal-close" onClick={() => { setShowEditModal(false); setEditProduct(null); }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>{editProduct && editProduct._id ? `Edit Product: ${editProduct.name}` : 'Add Product'}</div>
                  <ProductForm
                    product={editProduct}
                    onClose={() => { setShowEditModal(false); setEditProduct(null); }}
                    onProductUpdated={handleProductUpdated}
                    shopId={user?.shopId}
                    managerId={user?._id}
                  />
                </div>
              </div>
            )}
            {/* Edit Product Modal */}
            {showEditModal && typeof showEditModal !== 'string' && editProduct && !editProduct.delete && !editProduct.view && (
              <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditProduct(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                  <button className="modal-close" onClick={() => { setShowEditModal(false); setEditProduct(null); }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                  <ProductForm user={user} product={editProduct} onProductAdded={handleProductUpdated} />
                </div>
              </div>
            )}
            {/* Delete Product Modal */}
            {editProduct && editProduct.delete && (
              <div className="modal-overlay" onClick={() => { setEditProduct(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                  <button className="modal-close" onClick={() => setEditProduct(null)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                  <h3>Delete Product</h3>
                  <p>Are you sure you want to delete <b>{editProduct.name}</b>?</p>
                  <button onClick={() => { handleDeleteProduct(editProduct._id); setEditProduct(null); }} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, marginRight: 12 }}>Delete</button>
                  <button onClick={() => setEditProduct(null)} style={{ background: '#636e72', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            )}
            {/* View Modal */}
            {editProduct && editProduct.view && (
              <div className="modal-overlay" onClick={() => { setEditProduct(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                  <button className="modal-close" onClick={() => setEditProduct(null)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                  <h3>Product Details</h3>
                  <p><b>Name:</b> {editProduct.name}</p>
                  <p><b>Category:</b> {editProduct.category}</p>
                  <p><b>Price:</b> ${editProduct.price}</p>
                  <p><b>Stock:</b> {editProduct.stock}</p>
                  <button onClick={() => setEditProduct(null)} style={{ background: '#636e72', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 600 }}>Close</button>
                </div>
              </div>
            )}
          </div>
        );
      case 'sellers': {
        // --- Seller Management Features ---
        const filteredSellers = users.filter(u =>
          u.username.toLowerCase().includes(sellerSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(sellerSearch.toLowerCase())
        );
        const totalPages = Math.ceil(filteredSellers.length / sellersPerPage);
        const pagedSellers = filteredSellers.slice((sellerPage - 1) * sellersPerPage, sellerPage * sellersPerPage);
        const handleResetSellerPassword = async (id) => {
          setResetSellerMsg('');
          try {
            await axios.post(`${API_BASE}/auth/subadmin/sellers/${id}/reset-password`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setResetSellerMsg('Password reset! New password sent to seller email.');
            setResetSellerId(null);
          } catch (err) {
            setResetSellerMsg('Error resetting password.');
          }
        };
        const handleViewSellerProducts = async (seller) => {
          setViewSellerProducts(seller);
        };
        const getSellerStatus = (u) => u.active ? 'Active' : 'Inactive';
        return (
          <div className="future-card" style={{padding: '1.5rem', marginBottom: 32}}>
            <div style={{fontWeight: 600, marginBottom: 12}}>My Sellers</div>
            <form onSubmit={handleCreateSeller} style={{marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center'}}>
              <input name="username" value={newSeller.username} onChange={handleNewSellerChange} placeholder="Username" required style={{width: 120}} />
              <input name="email" value={newSeller.email} onChange={handleNewSellerChange} placeholder="Email" required style={{width: 180}} />
              <input name="password" type="password" value={newSeller.password} onChange={handleNewSellerChange} placeholder="Password" required style={{width: 120}} />
              <div style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center', minWidth: 320}}>
                <label title="Allow seller to add new products">
                  <input type="checkbox" name="privileges.canAddProducts" checked={newSeller.privileges.canAddProducts} onChange={handleNewSellerChange} disabled={user?.role === 'subadmin' && !subadminPrivileges.canAddProducts} /> Add Products
                </label>
                <label title="Allow seller to edit their products">
                  <input type="checkbox" name="privileges.canEditProducts" checked={newSeller.privileges.canEditProducts} onChange={handleNewSellerChange} disabled={user?.role === 'subadmin' && !subadminPrivileges.canEditProducts} /> Edit Products
                </label>
                <label title="Allow seller to delete their products">
                  <input type="checkbox" name="privileges.canDeleteProducts" checked={newSeller.privileges.canDeleteProducts} onChange={handleNewSellerChange} disabled={user?.role === 'subadmin' && !subadminPrivileges.canDeleteProducts} /> Delete Products
                </label>
                <label title="Allow seller to view orders for their products">
                  <input type="checkbox" name="privileges.canViewOrders" checked={newSeller.privileges.canViewOrders} onChange={handleNewSellerChange} disabled={user?.role === 'subadmin' && !subadminPrivileges.canViewOrders} /> View Orders
                </label>
                <label title="Allow seller to manage their profile (change password)">
                  <input type="checkbox" name="privileges.canManageProfile" checked={newSeller.privileges.canManageProfile} onChange={handleNewSellerChange} disabled={user?.role === 'subadmin' && !subadminPrivileges.canManageProfile} /> Manage Profile
                </label>
              </div>
              <button type="submit" className="btn btn-primary">Create Seller</button>
            </form>
            {sellerMsg && <div style={{color: '#00b894', marginBottom: 10}}>{sellerMsg}</div>}
            {/* Search/filter sellers */}
            <input
              type="text"
              value={sellerSearch}
              onChange={e => { setSellerSearch(e.target.value); setSellerPage(1); }}
              placeholder="Search by username or email"
              style={{marginBottom: 12, width: 220}}
            />
            {/* Pagination controls */}
            <div style={{marginBottom: 10}}>
              <button disabled={sellerPage === 1} onClick={() => setSellerPage(sellerPage - 1)} style={{marginRight: 8}}>Prev</button>
              <span>Page {sellerPage} of {totalPages}</span>
              <button disabled={sellerPage === totalPages} onClick={() => setSellerPage(sellerPage + 1)} style={{marginLeft: 8}}>Next</button>
            </div>
            {loadingUsers ? (
              <div>Loading sellers...</div>
            ) : (
              <table className="future-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Products</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSellers.map(u => (
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{getSellerStatus(u)}</td>
                      <td>{sellerProductCounts[u._id] ?? '-'}</td>
                      <td>
                        <button className="btn btn-secondary" style={{marginRight: 8}} onClick={() => setConfirmEditId(u._id)}>Edit</button>
                        <button className="btn btn-outline" style={{color: 'red', marginRight: 8}} onClick={() => setConfirmDeleteId(u._id)}>Delete</button>
                        <button className="btn btn-info" style={{marginRight: 8}} onClick={() => handleViewSellerProducts(u)}>View Products</button>
                        <button className="btn btn-warning" onClick={() => setResetSellerId(u._id)}>Reset Password</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Confirmation dialogs */}
            {confirmDeleteId && (
              <div className="future-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                <div className="future-modal-content" onClick={e => e.stopPropagation()}>
                  <button className="future-modal-close" onClick={() => setConfirmDeleteId(null)}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>Confirm Delete</div>
                  <div>Are you sure you want to delete this seller?</div>
                  <div style={{display: 'flex', gap: 12, marginTop: 12}}>
                    <button className="btn btn-danger" onClick={() => { handleUserDelete(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</button>
                    <button className="btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {confirmEditId && (
              <div className="future-modal-overlay" onClick={() => setConfirmEditId(null)}>
                <div className="future-modal-content" onClick={e => e.stopPropagation()}>
                  <button className="future-modal-close" onClick={() => setConfirmEditId(null)}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>Edit Seller</div>
                  <form onSubmit={handleUserEditSubmit}>
                    <input name="username" value={userEditForm.username} onChange={handleUserEditChange} placeholder="Username" required style={{marginBottom: 12, width: '100%'}} />
                    <input name="email" value={userEditForm.email} onChange={handleUserEditChange} placeholder="Email" required style={{marginBottom: 12, width: '100%'}} />
                    <div style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center', minWidth: 320, marginBottom: 12}}>
                      <label title="Allow seller to add new products"><input type="checkbox" name="privileges.canAddProducts" checked={userEditForm.privileges?.canAddProducts ?? true} onChange={handleUserEditChange} /> Add Products</label>
                      <label title="Allow seller to edit their products"><input type="checkbox" name="privileges.canEditProducts" checked={userEditForm.privileges?.canEditProducts ?? true} onChange={handleUserEditChange} /> Edit Products</label>
                      <label title="Allow seller to delete their products"><input type="checkbox" name="privileges.canDeleteProducts" checked={userEditForm.privileges?.canDeleteProducts ?? true} onChange={handleUserEditChange} /> Delete Products</label>
                      <label title="Allow seller to view orders for their products"><input type="checkbox" name="privileges.canViewOrders" checked={userEditForm.privileges?.canViewOrders ?? true} onChange={handleUserEditChange} /> View Orders</label>
                      <label title="Allow seller to manage their profile (change password)"><input type="checkbox" name="privileges.canManageProfile" checked={userEditForm.privileges?.canManageProfile ?? true} onChange={handleUserEditChange} /> Manage Profile</label>
                    </div>
                    <div style={{display: 'flex', gap: 12}}>
                      <button type="submit" className="btn btn-primary">Save</button>
                      <button type="button" className="btn" onClick={() => setConfirmEditId(null)}>Cancel</button>
                    </div>
                  </form>
                  {userMessage && <div style={{color: '#e74c3c', marginTop: 10}}>{userMessage}</div>}
                </div>
              </div>
            )}
            {/* Reset password dialog */}
            {resetSellerId && (
              <div className="future-modal-overlay" onClick={() => setResetSellerId(null)}>
                <div className="future-modal-content" onClick={e => e.stopPropagation()}>
                  <button className="future-modal-close" onClick={() => setResetSellerId(null)}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>Reset Seller Password</div>
                  <div>Are you sure you want to reset this seller's password?</div>
                  <div style={{display: 'flex', gap: 12, marginTop: 12}}>
                    <button className="btn btn-warning" onClick={() => handleResetSellerPassword(resetSellerId)}>Reset Password</button>
                    <button className="btn" onClick={() => setResetSellerId(null)}>Cancel</button>
                  </div>
                  {resetSellerMsg && <div style={{color: '#00b894', marginTop: 10}}>{resetSellerMsg}</div>}
                </div>
              </div>
            )}
            {/* View/manage seller products modal */}
            {viewSellerProducts && (
              <div className="future-modal-overlay" onClick={() => setViewSellerProducts(null)}>
                <div className="future-modal-content" onClick={e => e.stopPropagation()}>
                  <button className="future-modal-close" onClick={() => setViewSellerProducts(null)}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>Products for {viewSellerProducts.username}</div>
                  {/* Could show a list of products for this seller, or link to product management */}
                  <div>Feature coming soon: manage seller's products here.</div>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'reports': {
        // Calculate revenue for subadmin's products
        const totalRevenue = products.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
        return (
          <div style={{background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)', marginBottom: 32}}>
            <div style={{fontWeight: 600, marginBottom: 12}}>My Product Reports</div>
            <div style={{marginBottom: 10}}>Total Revenue: <span style={{color: '#00b894', fontWeight: 700}}>ETB {totalRevenue.toLocaleString()}</span></div>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 8}}>
              <thead>
                <tr style={{background: '#f4f4f4'}}>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Product</th>
                  <th style={{padding: 8, border: '1px solid #eee'}}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td style={{padding: 8, border: '1px solid #eee'}}>{p.name}</td>
                    <td style={{padding: 8, border: '1px solid #eee'}}>ETB {Number(p.revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      // --- Delivery Orders Section ---
      case 'orders': {
        // Privilege check for seller
        const canViewOrders = user?.role === 'user' ? sellerPrivileges.canViewOrders : true;
        if (!canViewOrders) return <div style={{color: '#888', textAlign: 'center', padding: 32}}>You do not have privilege to view orders.</div>;
        // --- Filtering and Sorting ---
        let filteredOrders = orders;
        if (orderStatusFilter !== 'all') {
          filteredOrders = filteredOrders.filter(order => order.status === orderStatusFilter);
        }
        filteredOrders = [...filteredOrders].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return orderSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        return (
          <div style={{background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)', marginBottom: 32}}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Orders</div>
            <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:16}}>
              <button
                onClick={() => setOrderViewType(v => v === 'table' ? 'card' : 'table')}
                style={{padding:'8px 18px', borderRadius:6, border:'1px solid #3a6cf6', background:'#fff', color:'#3a6cf6', fontWeight:600, cursor:'pointer'}}
              >
                Switch to {orderViewType === 'table' ? 'Card View' : 'Table View'}
              </button>
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
            {filteredOrders.length === 0 ? (
              <div style={{ color: '#888' }}>No orders found.</div>
            ) : orderViewType === 'table' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8faff' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Order ID</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Buyer</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Shop</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{order._id}</td>
                      <td style={{ padding: '8px' }}>{(() => {
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
                      })()}</td>
                      <td style={{ padding: '8px' }}>{(() => {
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
                      })()}</td>
                      <td style={{ padding: '8px' }}>{order.status}</td>
                      <td style={{ padding: '8px' }}>
                        {order.status === 'accepted' || order.status === 'delivery_accepted' ? (
                          <button
                            onClick={async () => {
                              const token = user.token;
                              try {
                                await axios.patch(`/api/orders/${order._id}/handedover`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                setOrders(orders => orders.map(o => o._id === order._id ? { ...o, status: 'handedover' } : o));
                              } catch (err) {
                                alert('Failed to hand over: ' + (err.response?.data?.error || err.message));
                              }
                            }}
                            style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600 }}
                          >
                            Hand Over
                          </button>
                        ) : order.status === 'handedover' ? (
                          <button
                            disabled
                            style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600 }}
                          >
                            Confirmed
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div>
                {filteredOrders.map(order => (
                  <div key={order._id} style={{border:'1px solid #eee',borderRadius:8,padding:16,marginBottom:18,background:'#fff'}}>
                    <div style={{marginTop:8}}>
                      <b>Order ID:</b> {order._id}<br/>
                      <b>Status:</b> {order.status || 'N/A'}<br/>
                      <b>Total:</b> ${order.total || order.totalPrice || '-'}<br/>
                      <b>Date:</b> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'ratings':
        return (
          <div style={{background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)', marginBottom: 32}}>
            <div style={{fontWeight: 600, marginBottom: 12}}>Ratings</div>
            <div style={{color: '#888'}}>Ratings and reviews coming soon.</div>
          </div>
        );
      case 'comments':
        return (
          <div style={{background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)', marginBottom: 32}}>
            <div style={{fontWeight: 600, marginBottom: 12}}>Comments</div>
            <div style={{color: '#888'}}>Comments and feedback coming soon.</div>
          </div>
        );
      case 'products-managed':
        if (section === 'products-managed') {
          return (
            <div style={{background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(44,62,80,0.06)'}}>
              <h2 style={{fontWeight: 700, fontSize: 22, marginBottom: 18}}>Products Managed</h2>
              <button onClick={() => setShowEditModal('add')} style={{marginBottom: 18, background: '#00b894', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600}}>Add Product</button>
              {managedProducts.length === 0 ? (
                <div style={{color: '#888'}}>No products managed yet.</div>
              ) : (
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{background: '#f8faff'}}>
                      <th style={{padding: '10px 8px', textAlign: 'left'}}>Name</th>
                      <th style={{padding: '10px 8px', textAlign: 'left'}}>Category</th>
                      <th style={{padding: '10px 8px', textAlign: 'left'}}>Price</th>
                      <th style={{padding: '10px 8px', textAlign: 'left'}}>Stock</th>
                      <th style={{padding: '10px 8px', textAlign: 'left'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedProducts.map(product => (
                      <tr key={product._id} style={{borderBottom: '1px solid #eee'}}>
                        <td style={{padding: '8px'}}>{product.name}</td>
                        <td style={{padding: '8px'}}>{product.category}</td>
                        <td style={{padding: '8px'}}>${product.price}</td>
                        <td style={{padding: '8px'}}>{product.stock}</td>
                        <td style={{padding: '8px'}}>
                          <button onClick={() => setEditProduct(product)} style={{marginRight: 8, background: '#0984e3', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px'}}>Edit</button>
                          <button onClick={() => setEditProduct({ ...product, delete: true })} style={{marginRight: 8, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px'}}>Delete</button>
                          <button onClick={() => setEditProduct({ ...product, view: true })} style={{background: '#636e72', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px'}}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
             
              {/* Add/Edit Modal */}
              {showEditModal === 'add' && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>

                  <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                    <button className="modal-close" onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                    <ProductForm user={user} onProductAdded={() => { setShowEditModal(false); setSection('products-managed'); }} />
                  </div>
                </div>
              )}
              {/* Edit Modal */}
              {showEditModal && typeof showEditModal !== 'string' && editProduct && !editProduct.delete && !editProduct.view && (
                <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditProduct(null); }}>
                  <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                    <button className="modal-close" onClick={() => { setShowEditModal(false); setEditProduct(null); }} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                    <ProductForm user={user} product={editProduct} onProductAdded={handleProductUpdated} />
                  </div>
                </div>
              )}
              {/* Delete Modal */}
              {editProduct && editProduct.delete && (
                <div className="modal-overlay" onClick={() => { setEditProduct(null); }}>
                  <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                    <button className="modal-close" onClick={() => setEditProduct(null)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                    <h3>Delete Product</h3>
                    <p>Are you sure you want to delete <b>{editProduct.name}</b>?</p>
                    <button onClick={() => { handleDeleteProduct(editProduct._id); setEditProduct(null); }} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, marginRight: 12 }}>Delete</button>
                    <button onClick={() => setEditProduct(null)} style={{ background: '#636e72', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600 }}>Cancel</button>
                  </div>
                </div>
              )}
              {/* View Modal */}
              {editProduct && editProduct.view && (
                <div className="modal-overlay" onClick={() => { setEditProduct(null); }}>
                  <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                    <button className="modal-close" onClick={() => setEditProduct(null)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                    <h3>Product Details</h3>
                    <p><b>Name:</b> {editProduct.name}</p>
                    <p><b>Category:</b> {editProduct.category}</p>
                    <p><b>Price:</b> ${editProduct.price}</p>
                    <p><b>Stock:</b> {editProduct.stock}</p>
                    <button onClick={() => setEditProduct(null)} style={{ background: '#636e72', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 600 }}>Close</button>
                  </div>
                </div>
              )}
            </div>
          );
        }
        break;
      default:
        return null;
    }
  };

  // --- AUTH/ROLE GATE ---
  const validRoles = ['subadmin', 'seller'];
  const isLoggedIn = user && typeof user === 'object' && user.role && typeof user.role === 'string';
  const hasValidRole = isLoggedIn && validRoles.includes(user.role);

  // --- Render logic for authentication and role-based access control ---
  if (!user) {
    // Not authenticated: show login form
    return (
      <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form className="login-form" onSubmit={handleLoginSubmit} style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 8px rgba(44,62,80,0.10)', minWidth: 320 }}>
          <img src="/mekina-mart-logo.png.png" alt="Mekina Mart Logo" style={{ height: 70, marginBottom: 18, marginTop: -10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          <h2 style={{ marginBottom: 18 }}>Subadmin / Seller Login</h2>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={login.email}
            onChange={handleLoginChange}
            required
            style={{ marginBottom: 12, width: '100%' }}
          />
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={login.password}
              onChange={handleLoginChange}
              required
              style={{ width: '100%' }}
            />
            <span
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 10, top: 10, cursor: 'pointer', color: '#888' }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>
          <select
            name="role"
            value={login.role}
            onChange={handleLoginChange}
            required
            style={{ marginBottom: 16, width: '100%' }}
          >
            <option value="">Select Role</option>
            <option value="subadmin">Subadmin</option>
            <option value="seller">Seller</option>
          </select>
          {loginError && <div style={{ color: '#e74c3c', marginBottom: 10 }}>{loginError}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loggingIn}>
            {loggingIn ? 'Logging in...' : 'Login'}
          </button>
          <div style={{ marginTop: 12 }}>
            <span style={{ color: '#0984e3', cursor: 'pointer' }} onClick={() => setShowForgot(v => !v)}>
              Forgot password?
            </span>
          </div>
          {showForgot && (
            <form onSubmit={handleForgotSubmit} style={{ marginTop: 12 }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                required
                style={{ marginBottom: 8, width: '100%' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>Send Reset Link</button>
              {forgotMsg && <div style={{ color: forgotMsg.startsWith('Error') ? '#e74c3c' : '#00b894', marginTop: 8 }}>{forgotMsg}</div>}
            </form>
          )}
        </form>
      </div>
    );
  }
  if (user && !['subadmin', 'seller'].includes(user.role)) {
    // Authenticated but wrong role: show error message
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
        <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 8px rgba(44,62,80,0.10)', minWidth: 320, textAlign: 'center' }}>
          <h2 style={{ color: '#e74c3c', marginBottom: 16 }}>Access Denied</h2>
          <div style={{ color: '#e74c3c', marginBottom: 18, fontWeight: 500 }}>
            Only subadmin and seller can access this page.
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{minHeight: '100vh', background: '#f4f7fa', padding: 0, margin: 0}}>
        {/* <SubAdminHeader user={user} onLogout={handleSubadminLogout} /> */}
        <div style={{display: 'flex', minHeight: '100vh'}}>
          {/* --- Sidebar --- */}
          <div
            className="future-sidebar"
            style={{
              width: sidebarCollapsed ? 68 : 240,
              background: '#232946',
              color: '#e0e6ff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '2px 0 12px #23294622',
              transition: 'width 0.2s',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              style={{
                position: 'absolute',
                top: 18,
                right: sidebarCollapsed ? -18 : -22,
                background: '#3a6cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                cursor: 'pointer',
                boxShadow: '0 2px 8px #23294644',
                zIndex: 20,
                transition: 'right 0.2s',
              }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
            {/* User Profile Section */}
            <div
              style={{
                padding: sidebarCollapsed ? '1.2rem 0.5rem' : '2rem 1.5rem',
                borderBottom: '1px solid #2d3652',
                display: 'flex',
                alignItems: 'center',
                gap: sidebarCollapsed ? 0 : 12,
                cursor: 'pointer',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}
              title="Show Profile"
              onClick={handleProfileClick}
            >
              <div style={{width: 40, height: 40, borderRadius: '50%', background: '#3a6cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, color: '#fff'}}>
                {user?.username ? user.username[0].toUpperCase() : 'S'}
              </div>
              {!sidebarCollapsed && <span style={{fontWeight: 700, fontSize: 20, letterSpacing: 1}}>{user?.username || 'Subadmin'}</span>}
            </div>
            {/* Sidebar Navigation */}
            <nav style={{flex: 1, padding: sidebarCollapsed ? '1rem 0.5rem' : '2rem 1.5rem 0 1.5rem'}}>
              {filteredSidebarLinks.map(item => (
                <div
                  key={item.key}
                  className={section === item.key ? 'active' : ''}
                  style={{
                    marginBottom: 18,
                    fontWeight: section === item.key ? 600 : 400,
                    color: section === item.key ? '#3a6cf6' : '#e0e6ff',
                    background: section === item.key ? '#263159' : 'none',
                    borderRadius: 6,
                    padding: sidebarCollapsed ? '10px 0' : '8px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: sidebarCollapsed ? 0 : 12,
                    position: 'relative',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }}
                  onClick={() => setSection(item.key)}
                  title={item.label}
                  onMouseEnter={e => {
                    if (sidebarCollapsed) e.currentTarget.style.background = '#3a6cf6';
                  }}
                  onMouseLeave={e => {
                    if (sidebarCollapsed) e.currentTarget.style.background = section === item.key ? '#263159' : 'none';
                  }}
                >
                  <span style={{fontSize: 20}}>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {/* Tooltip for collapsed sidebar */}
                  {sidebarCollapsed && (
                    <span style={{
                      position: 'absolute',
                      left: 60,
                      background: '#263159',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      opacity: 0,
                      pointerEvents: 'none',
                      transition: 'opacity 0.2s',
                      zIndex: 100,
                    }}
                      className="sidebar-tooltip"
                    >{item.label}</span>
                  )}
                </div>
              ))}
            </nav>
            {/* Sidebar Footer (optional) */}
            <div style={{padding: sidebarCollapsed ? '0.5rem' : '1.5rem', borderTop: '1px solid #2d3652', textAlign: 'center', fontSize: 13, color: '#bbb'}}>
              {!sidebarCollapsed && <span>© {new Date().getFullYear()} Shop Manager</span>}
            </div>
          </div>
          {/* --- Main Content --- */}
          <div style={{flex: 1, padding: '2.5rem 3rem', minHeight: '100vh', boxSizing: 'border-box', overflowY: 'auto'}}>
            {/* --- HEADER --- */}
            <div className="subadmin-dashboard-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
              <div className="subadmin-header-left" style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <span className="subadmin-dashboard-logo" style={{fontWeight: 700, fontSize: 22, color: '#00b894'}}>AutoPartsPro</span>
                <span className="subadmin-dashboard-title" style={{fontWeight: 600, fontSize: 18, color: '#222'}}>Subadmin Dashboard</span>
              </div>
              <div className="subadmin-header-actions" style={{display: 'flex', alignItems: 'center', gap: 16}}>
                {/* --- Notification Bell UI and Dropdown --- */}
                <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 18}}>
                  <div style={{position: 'relative'}}>
                    <button
                      onClick={handleNotifClick}
                      style={{background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 0}}
                      aria-label="Notifications"
                    >
                      <FaBell size={22} color={showNotifDropdown ? '#0984e3' : '#888'} />
                      {notifications.some(n => !n.read) && (
                        <span style={{position: 'absolute', top: -4, right: -4, background: '#e74c3c', color: '#fff', borderRadius: '50%', fontSize: 11, padding: '2px 6px', fontWeight: 700}}>
                          {notifications.filter(n => !n.read).length}
                        </span>
                      )}
                    </button>
                    {showNotifDropdown && (
                      <div style={{position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 12px #0984e322', minWidth: 260, zIndex: 100}}>
                        <div style={{fontWeight: 700, fontSize: 15, padding: '10px 16px', borderBottom: '1px solid #eee', background: '#f8faff'}}>Notifications</div>
                        {notifLoading ? (
                          <div style={{padding: 16, color: '#888'}}>Loading...</div>
                        ) : notifError ? (
                          <div style={{padding: 16, color: '#e74c3c'}}>{notifError}</div>
                        ) : notifications.length === 0 ? (
                          <div style={{padding: 16, color: '#888'}}>No notifications.</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              style={{
                                padding: '10px 16px',
                                background: n.read ? '#fff' : '#eaf6ff',
                                borderBottom: '1px solid #f2f2f2',
                                fontWeight: n.read ? 400 : 700,
                                color: n.read ? '#444' : '#0984e3',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                              }}
                              onClick={() => markNotificationRead(n.id)}
                            >
                              {!n.read && <span style={{width: 8, height: 8, background: '#0984e3', borderRadius: '50%', display: 'inline-block', marginRight: 6}} />}

                              <span>{n.message}</span>
                              <span style={{marginLeft: 'auto', fontSize: 11, color: '#aaa'}}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button className="subadmin-export-btn" onClick={exportProductsCSV} style={{background: '#00b894', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600}}>Export Products</button>
                <button className="subadmin-export-btn" onClick={exportSellersCSV} style={{background: '#0984e3', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600}}>Export Sellers</button>
                <button className="subadmin-logout-btn" onClick={handleLogout} style={{background: 'none', color: '#e74c3c', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600}}>Logout</button>
                <span className="subadmin-header-avatar" title="Profile" onClick={handleProfileClick} style={{width: 36, height: 36, borderRadius: '50%', background: '#00b894', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18}}>
                  {user?.username?.[0]?.toUpperCase() || 'S'}
                </span>
              </div>
            </div>
            {/* Profile Modal */}
            {showProfileModal && (
              <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                  <button className="modal-close" onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>Profile</div>
                  <div><b>Username:</b> {user?.username}</div>
                  <div><b>Email:</b> {user?.email}</div>
                  <div><b>Role:</b> {user?.role}</div>
                </div>
                           </div>
            )}
            {/* Password Change Modal */}
            {showPasswordModal && (
              <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '95vw', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '2rem', position: 'relative' }}>
                  <button className="modal-close" onClick={() => setShowPasswordModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>&times;</button>
                  <div style={{marginBottom: '1rem', fontWeight: 600}}>Change Password</div>
                  <form onSubmit={handlePasswordChangeSubmit}>
                    <input name="current" type="password" value={passwordForm.current} onChange={handlePasswordChangeInput} placeholder="Current Password" required style={{marginBottom: 12, width: '100%'}} />
                    <input name="new" type="password" value={passwordForm.new} onChange={handlePasswordChangeInput} placeholder="New Password" required style={{marginBottom: 12, width: '100%'}} />
                    <input name="confirm" type="password" value={passwordForm.confirm} onChange={handlePasswordChangeInput} placeholder="Confirm New Password" required style={{marginBottom: 12, width: '100%'}} />
                    <button type="submit" className="button" style={{width: '100%'}}>Change Password</button>
                  </form>
                  {passwordMsg && <div style={{color: passwordMsg.includes('success') ? '#00b894' : '#e74c3c', marginTop: 10}}>{passwordMsg}</div>}
                </div>
              </div>
            )}
            <div className="dashboard-root">
              {renderSection()}
              {/* Activity Log Section */}
              {section === 'dashboard' && (
                <div style={{background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: 32, boxShadow: '0 2px 8px rgba(44,62,80,0.06)'}}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Recent Activity</div>
                  <ul>
                    {activityLog.length === 0 ? (
                      <li style={{ color: '#888' }}>No recent activity.</li>
                    ) : activityLog.map((log, idx) => (
                      <li key={idx}>
                        <span style={{ fontWeight: 600 }}>{log.time}:</span> {log.action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        {toast.show && (
          <div style={{position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.type === 'success' ? '#00b894' : '#e74c3c', color: '#fff', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 16, boxShadow: '0 2px 12px #23252633', transition: 'all 0.2s'}}>
            {toast.message}
          </div>
        )}
        {/* Spinner CSS */}
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

// ErrorBoundary component to catch errors in dashboard
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // You can log errorInfo to an error reporting service here
    // console.error(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: 'red', background: '#fff', borderRadius: 12, margin: 32 }}>
          <h2>Something went wrong in the dashboard.</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// At the very end of the file, ensure the export uses ErrorBoundary
export default function DashboardWithBoundary(props) {
  return (
    <ErrorBoundary>
      <SubAdminDashboard {...props} />
    </ErrorBoundary>
  );
}
