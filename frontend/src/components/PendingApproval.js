import React from 'react';

const PendingApproval = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'Poppins, Arial, sans-serif'
  }}>
    <h2 style={{ color: '#e74c3c', marginBottom: 24 }}>Account Pending Approval</h2>
    <p style={{ fontSize: '1.3rem', color: '#333', maxWidth: 500, textAlign: 'center' }}>
      Your shop admin account is awaiting approval by the system administrator.<br />
      You will be notified once your account is activated.<br />
      If you believe this is an error, please contact support.
    </p>
  </div>
);

export default PendingApproval;
