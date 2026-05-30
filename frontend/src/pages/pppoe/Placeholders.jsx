import React from 'react';

const ComingSoon = ({ title }) => (
  <div className="glass-card" style={{ textAlign: 'center', padding: '5rem' }}>
    <h1 style={{ color: 'var(--accent-primary)' }}>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>Fitur ini sedang dalam pengembangan.</p>
  </div>
);

export const PppoeBillingSettings = () => <ComingSoon title="Pengaturan Billing PPPoE" />;
