import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    let endpoint = '/api/auth/login';
    let payload = { ...form };
    if (role === 'admin') {
      endpoint = '/api/auth/admin/login';
      payload = { username: form.username, password: form.password };
    } else {
      payload = { email: form.username, password: form.password };
    }
    if (role === 'subadmin') endpoint = '/api/auth/login';
    try {
      const res = await axios.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (role === 'admin') navigate('/admin');
      else if (role === 'subadmin') navigate('/subadmin-dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-page-container">
      <h2>Login</h2>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="role">Role: </label>
        <select id="role" value={role} onChange={e => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="subadmin">Subadmin</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
      </form>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
};

export default LoginPage;
