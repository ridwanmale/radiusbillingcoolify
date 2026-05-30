import React from 'react';

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div 
      className="modal-overlay open" 
      onClick={onCancel} 
      style={{ 
        zIndex: 10000,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '400px', 
          width: '95%',
          borderRadius: '12px', 
          background: '#0f1011', 
          border: '1px solid #23252a', 
          padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.25rem' }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            padding: '10px', 
            borderRadius: '50%', 
            display: 'flex',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>help_outline</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
            Konfirmasi
          </h3>
        </div>

        <p style={{ 
          color: '#d0d6e0', 
          fontSize: '0.95rem', 
          lineHeight: '1.6', 
          margin: '0 0 1.75rem 0',
          fontWeight: '500',
          textAlign: 'left'
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            style={{ 
              padding: '8px 14px', 
              fontSize: '0.9rem', 
              background: '#141516', 
              border: '1px solid #23252a', 
              color: '#a0aec0', 
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={onCancel}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#23252a';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#18191a';
              e.currentTarget.style.color = '#a0aec0';
            }}
          >
            Batal
          </button>
          <button
            style={{ 
              padding: '8px 14px', 
              fontSize: '0.9rem', 
              background: '#5e6ad2', 
              border: '1px solid #5e6ad2', 
              color: 'white', 
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(94, 106, 210, 0.2)'
            }}
            onClick={() => {
              if (onConfirm) onConfirm();
              onCancel();
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#828fff';
              e.currentTarget.style.borderColor = '#828fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#5e6ad2';
              e.currentTarget.style.borderColor = '#5e6ad2';
            }}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
