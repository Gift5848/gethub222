import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = '/api'; // Use static fallback, do not use process.env in frontend

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate(); // useNavigate for navigation
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg('');
    if (!password || !confirm) {
      setMsg('Please enter and confirm your new password.');
      return;
    }
    if (password !== confirm) {
      setMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/reset-password`, { token, password });
      setMsg('Password reset successful! You can now log in.');
      setTimeout(() => navigate('/subadmin'), 1800); // useNavigate push
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error resetting password.');
    }
    setLoading(false);
  };

  return (
    <div className="future-login-bg" style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 60% 40%, #232526 0%, #414345 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
    }}>
      {/* Animated background shapes */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 300, height: 300, background: 'linear-gradient(135deg, #00b89499 0%, #0984e399 100%)', filter: 'blur(60px)', borderRadius: '50%', zIndex: 0, opacity: 0.7, animation: 'float1 8s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 320, height: 320, background: 'linear-gradient(135deg, #3a6cf699 0%, #23252699 100%)', filter: 'blur(70px)', borderRadius: '50%', zIndex: 0, opacity: 0.6, animation: 'float2 10s ease-in-out infinite alternate' }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap');
        .future-login-card { box-sizing: border-box; font-family: 'Montserrat', 'Roboto', Arial, sans-serif; }
        .future-login-card input { box-sizing: border-box; width: 100%; background: none; border: 1.5px solid #bbb; border-radius: 8px; padding: 18px 40px 18px 12px; font-size: 17px; color: #232526; outline: none; transition: border 0.2s; margin: 0; display: block; font-family: 'Roboto', 'Montserrat', Arial, sans-serif; font-weight: 500; letter-spacing: 0.02em; }
        .future-login-card form { width: 100%; box-sizing: border-box; }
        .future-login-card label { position: absolute; left: 18px; top: 18px; color: #888; font-size: 16px; pointer-events: none; transition: all 0.18s; background: none; font-family: 'Montserrat', Arial, sans-serif; font-weight: 700; letter-spacing: 0.03em; }
        .future-login-card input:focus ~ label, .future-login-card input:not(:placeholder-shown) ~ label { top: 2px; left: 12px; font-size: 13px; color: #00b894; background: #fff8; padding: 0 4px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 900; }
        .future-login-card .eye-btn { position: absolute; right: 12px; top: 16px; background: none; border: none; cursor: pointer; color: #888; font-size: 20px; }
        .future-login-card .login-btn { width: 100%; background: linear-gradient(90deg, #00b894 0%, #0984e3 100%); color: #fff; border: none; border-radius: 8px; padding: 14px 0; font-size: 19px; font-family: 'Montserrat', 'Roboto', Arial, sans-serif; font-weight: 900; margin-top: 18px; box-shadow: 0 2px 12px #00b89433; transition: transform 0.12s, box-shadow 0.12s; letter-spacing: 0.04em; }
        .future-login-card .login-btn:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 4px 18px #0984e344; }
        .future-login-card .login-btn:active { transform: scale(0.98); }
        .future-login-card .error-msg { color: #e74c3c; margin-top: 16px; display: flex; align-items: center; font-size: 15px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; letter-spacing: 0.02em; }
        .future-login-card .success-msg { color: #00b894; margin-top: 16px; font-size: 15px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; letter-spacing: 0.02em; }
      `}</style>
      <div className="future-login-card" style={{ maxWidth: 340, width: '100%', margin: '0 auto', background: 'rgba(255,255,255,0.18)', borderRadius: 18, boxShadow: '0 8px 32px 0 rgba(44,62,80,0.18)', padding: '2rem 1.2rem 1.2rem 1.2rem', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(255,255,255,0.22)', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box', fontFamily: 'Montserrat, Roboto, Arial, sans-serif' }}>
        <div style={{fontWeight: 900, fontSize: 28, color: '#232526', letterSpacing: 0.04, marginBottom: 8, textAlign: 'center', fontFamily: 'Montserrat, Arial, sans-serif'}}>Reset Password</div>
        <div style={{fontWeight: 500, fontSize: 16, color: '#888', marginBottom: 24, textAlign: 'center', fontFamily: 'Roboto, Arial, sans-serif'}}>Enter your new password below.</div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{position: 'relative', marginBottom: 24}}>
            <input
              name="password"
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder=" "
              autoComplete="new-password"
              disabled={loading}
            />
            <label htmlFor="reset-password">New Password</label>
            <button type="button" className="eye-btn" tabIndex={-1} aria-label="Show password" onClick={() => setShowPassword(v => !v)} style={{outline: 'none'}}>
              {showPassword ? (
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 1l22 22" /><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.71 3.19-4.96 5.66-6.32" /><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5c1.38 0 2.63-.7 3.35-1.77" /><path d="M14.47 14.47A3.5 3.5 0 0 1 9.53 9.53" /></svg>
              ) : (
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="7" /><circle cx="12" cy="12" r="3.5" /></svg>
              )}
            </button>
          </div>
          <div style={{position: 'relative', marginBottom: 24}}>
            <input
              name="confirm"
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder=" "
              autoComplete="new-password"
              disabled={loading}
            />
            <label htmlFor="reset-confirm">Confirm Password</label>
          </div>
          <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
        {msg && <div className={msg.includes('success') ? 'success-msg' : 'error-msg'}>{msg}</div>}
      </div>
    </div>
  );
};

export default ResetPassword;
