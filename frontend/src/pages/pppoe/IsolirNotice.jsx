import React from 'react';

const IsolirNotice = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        borderTop: '6px solid #ef4444'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#fef2f2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        
        <h1 style={{ color: '#1e293b', fontSize: '24px', marginBottom: '10px', fontWeight: '700' }}>
          Akses Internet Dihentikan Sementara
        </h1>
        
        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', marginBottom: '25px' }}>
          Mohon maaf, layanan internet Anda (PPPoE) saat ini sedang terisolir. Hal ini biasanya disebabkan oleh tagihan yang belum diselesaikan setelah melewati masa tenggang.
        </p>
        
        <div style={{
          background: '#f1f5f9',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '25px',
          textAlign: 'left'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '0 0 8px' }}>Apa yang harus dilakukan?</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
            <li>Silakan cek tagihan Anda melalui aplikasi pembayaran.</li>
            <li>Segera lakukan pembayaran untuk mengaktifkan kembali layanan.</li>
            <li>Hubungi Admin/CS kami jika Anda sudah melakukan pembayaran.</li>
          </ul>
        </div>
        
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
            Layanan akan otomatis aktif beberapa saat setelah pembayaran terverifikasi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IsolirNotice;