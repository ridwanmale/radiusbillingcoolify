import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const PayInvoice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const orderId = searchParams.get('order_id');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // If returning from successful payment
    if (status === 'success') {
      setLoading(false);
      return;
    }

    const checkInvoice = async () => {
      try {
        const res = await fetch('/api/pppoe/invoice-check');
        const json = await res.json();
        
        if (res.ok) {
          setData(json);
          if (json.payment_methods && json.payment_methods.length > 0) {
            setSelectedMethod(json.payment_methods[0].id);
          }
        } else {
          toast.error(json.message || json.error || 'Gagal mengecek tagihan');
          setData({ error: json.message || json.error });
        }
      } catch (err) {
        console.error(err);
        setData({ error: 'Terjadi kesalahan sistem saat mengecek tagihan' });
      } finally {
        setLoading(false);
      }
    };
    checkInvoice();
  }, [status]);

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/pppoe/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: data.invoice.id,
          method: selectedMethod
        })
      });
      const result = await res.json();

      if (res.ok && result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        toast.error(result.error || 'Gagal memproses pembayaran');
      }
    } catch (err) {
      toast.error('Koneksi terputus');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontWeight: '600', color: '#94a3b8' }}>Mengecek Tagihan Anda...</span>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '20px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '40px' }}>check_circle</span>
          </div>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Pembayaran Berhasil</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Terima kasih! Pembayaran Anda dengan ID {orderId} sedang diproses. Layanan internet Anda akan kembali normal dalam waktu maksimal 3 menit.
          </p>
          <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '14px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  if (data?.error || data?.status === 'paid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '20px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '80px', height: '80px', background: data?.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-symbols-rounded" style={{ color: data?.status === 'paid' ? '#10b981' : '#ef4444', fontSize: '40px' }}>
              {data?.status === 'paid' ? 'check_circle' : 'error'}
            </span>
          </div>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>
            {data?.status === 'paid' ? 'Tagihan Lunas' : 'Gagal Memuat'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
            {data?.message || data?.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#1e293b', padding: '35px', borderRadius: '24px', maxWidth: '450px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: 'white', fontSize: '1.6rem', margin: '0 0 5px 0', fontWeight: '800' }}>Pembayaran Tagihan</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Layanan Internet PPPoE Anda</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Nama Pelanggan</span>
            <span style={{ color: 'white', fontWeight: '600' }}>{data?.customer?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Nomor Invoice</span>
            <span style={{ color: 'white', fontWeight: '600' }}>#{data?.invoice?.invoice_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Tagihan</span>
            <span style={{ color: '#38bdf8', fontSize: '1.4rem', fontWeight: '800' }}>Rp {parseInt(data?.invoice?.amount).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 15px 0' }}>Pilih Metode Pembayaran</h3>
          {data?.payment_methods?.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {data.payment_methods.map(method => (
                <div 
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: selectedMethod === method.id ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${selectedMethod === method.id ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ 
                    width: '20px', height: '20px', borderRadius: '50%', 
                    border: `2px solid ${selectedMethod === method.id ? '#38bdf8' : '#64748b'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {selectedMethod === method.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }}></div>}
                  </div>
                  <span style={{ color: selectedMethod === method.id ? 'white' : '#94a3b8', fontWeight: selectedMethod === method.id ? '600' : '500' }}>
                    {method.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.9rem' }}>
              Belum ada metode pembayaran yang diaktifkan oleh Admin. Silakan hubungi Customer Service.
            </div>
          )}
        </div>

        <button 
          onClick={handlePayment}
          disabled={!selectedMethod || isProcessing}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: (!selectedMethod || isProcessing) ? '#334155' : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            color: (!selectedMethod || isProcessing) ? '#94a3b8' : 'white',
            border: 'none',
            fontSize: '1.05rem',
            fontWeight: '800',
            cursor: (!selectedMethod || isProcessing) ? 'not-allowed' : 'pointer',
            boxShadow: (!selectedMethod || isProcessing) ? 'none' : '0 10px 20px rgba(2, 132, 199, 0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isProcessing ? 'Memproses...' : (
            <>
              Bayar Sekarang <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PayInvoice;
