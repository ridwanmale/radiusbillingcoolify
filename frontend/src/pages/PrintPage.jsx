import React, { useEffect, useState } from 'react';
import PrintTemplate from '../components/PrintTemplate';

const PrintPage = () => {
  const [data, setData] = useState(null);
  const [dbTemplate, setDbTemplate] = useState(null);

  useEffect(() => {
    // Kunci langsung di awal agar tidak bisa lari dua kali
    if (window.hasTriggeredPrint) return;
    window.hasTriggeredPrint = true;

    const printDataStr = localStorage.getItem('print_vouchers_data');
    if (printDataStr) {
      const printData = JSON.parse(printDataStr);
      setData(printData);
      
      const host = window.location.hostname;
      const templateId = printData.templateId;

      if (templateId) {
        fetch(`/api/settings/templates/${templateId}`)
          .then(res => res.json())
          .then(tData => {
            setDbTemplate(tData);
            setTimeout(() => window.print(), 1000);
          })
          .catch(err => {
            console.error('Failed to fetch selected template:', err);
            window.hasTriggeredPrint = true;
            setTimeout(() => window.print(), 1000);
          });
      } else {
        // Fallback to first template
        fetch(`/api/settings/templates`)
          .then(res => res.json())
          .then(allTemplates => {
            if (allTemplates.length > 0) setDbTemplate(allTemplates[0]);
            window.hasTriggeredPrint = true;
            setTimeout(() => window.print(), 1000);
          })
          .catch(() => {
            window.hasTriggeredPrint = true;
            setTimeout(() => window.print(), 1000);
          });
      }
    }
  }, []);

  if (!data) return <div style={{ padding: '20px' }}>Memuat data cetak...</div>;

  return (
    <div className="print-page-layout">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
        }
        body { background: white; margin: 0; padding: 0; }
      `}</style>

      <PrintTemplate 
        vouchers={data.vouchers} 
        settings={data.settings} 
        profiles={data.profiles}
        forcedTemplate={dbTemplate}
      />
    </div>
  );
};

export default PrintPage;
