import React, { useState, useEffect } from 'react';

const PrintTemplate = ({ vouchers, settings, profiles, forcedTemplate }) => {
  const [dbTemplate, setDbTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Jika ada forcedTemplate (dari PrintPage), gunakan itu dan jangan fetch lagi
    if (forcedTemplate) {
      setDbTemplate(forcedTemplate);
      setIsLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      try {
        const host = window.location.hostname;
        // Ambil daftar template dan gunakan yang pertama (default)
        const res = await fetch(`http://${host}:5000/api/settings/templates`);
        const data = await res.json();
        if (data.length > 0) {
          setDbTemplate(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch print template:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [forcedTemplate]);

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>Menyiapkan Template Cetak...</div>;
  if (!vouchers || vouchers.length === 0) return null;

  // Use state dbTemplate for rendering
  const template = dbTemplate || {
    header_html: '<html><body>',
    row_html: '<div>Voucher: #username# | Pass: #password#</div>',
    footer_html: '</body></html>'
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const getProfileData = (groupname) => {
    return profiles.find(p => p.groupname === groupname) || {};
  };

  const renderVouchers = () => {
    const now = new Date();
    const printDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const printTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < vouchers.length; i += chunkSize) {
      chunks.push(vouchers.slice(i, i + chunkSize));
    }

    let fullHtml = '';

    chunks.forEach((chunk, chunkIndex) => {
      const htmlRows = chunk.map((v, index) => {
        const absoluteIndex = (chunkIndex * chunkSize) + index;
        const pData = getProfileData(v.profile);
        const harga = pData.harga || 0;
        const masaAktif = pData.masa_aktif ? `${pData.masa_aktif} ${pData.satuan}` : v.profile;
        
        let row = template.row_html || '';

        // Basic replacements
        row = row.replace(/#username#/g, v.voucher_code || v.username || '');
        row = row.replace(/#password#/g, v.password || '');
        row = row.replace(/#profile#/g, v.profile || '');
        row = row.replace(/#harga#/g, formatRupiah(harga));
        row = row.replace(/#aktif#/g, masaAktif);
        row = row.replace(/#durasi#/g, v.total_duration ? `${Math.floor(v.total_duration / 60)}m` : '-');
        row = row.replace(/#kuota#/g, v.total_quota ? (v.total_quota / 1024 / 1024).toFixed(2) + ' MB' : '-');
        row = row.replace(/#color#/g, pData.warna || '#3b82f6');
        row = row.replace(/#dns#/g, settings?.dns_name || 'hotspot.local');
        row = row.replace(/#hsname#/g, settings?.hotspot_name || 'Hotspot Name');
        row = row.replace(/#printdate#/g, printDate);
        row = row.replace(/#printtime#/g, printTime);
        row = row.replace(/#outlet#/g, v.outlet_name || '-');
        row = row.replace(/#nomor#/g, absoluteIndex + 1);
        row = row.replace(/#kode#/g, v.kode_print || v.batch_id || '-');
        row = row.replace(/#csphone#/g, settings?.cs_phone || '-');
        row = row.replace(/#shared#/g, pData.shared_users ? `${pData.shared_users} User` : '1 User');
        
        // Logo Replacement
        const logoData = settings?.logo_base64 || '';
        row = row.replace(/#logo#/g, logoData);

        // Special Combined Tags
        row = row.replace(/#kodevoucher#/g, `<div style="font-family:monospace;letter-spacing:2px;font-weight:bold;font-size:1.2rem;">${v.voucher_code}</div>`);
        row = row.replace(/#usernamepassword#/g, `<div style="display:flex;justify-content:center;gap:10px;"><b>U:</b> ${v.voucher_code} <b>P:</b> ${v.password}</div>`);

        return row;
      }).join('');

      fullHtml += `${template.header_html || ''}${htmlRows}${template.footer_html || ''}`;
      
      if (chunkIndex < chunks.length - 1) {
        fullHtml += `<div style="page-break-before: always; height: 0; line-height: 0; margin: 0; padding: 0;"></div>`;
      }
    });
    
    return <div dangerouslySetInnerHTML={{ __html: fullHtml }} />;
  };

  return <div className="print-template-wrapper">{renderVouchers()}</div>;
};

export default PrintTemplate;
