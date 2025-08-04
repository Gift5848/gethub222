import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './DeliveryLogin.module.css';

const DeliveryLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.user.role !== 'delivery') {
        setError('Not a delivery account.');
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/delivery');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h2 className={styles.loginTitle}>Delivery Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input className={styles.loginInput} value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input className={styles.loginInput} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div style={{color:'red',marginTop:8}}>{error}</div>}
        <button className={styles.loginBtn} type="submit" style={{marginTop:16}}>Login</button>
      </form>
    </div>
  );
};

export default DeliveryLogin;
