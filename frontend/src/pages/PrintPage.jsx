import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PrintTemplate from '../components/PrintTemplate';

const PrintPage = () => {
  const [data, setData] = useState(null);
  const [dbTemplate, setDbTemplate] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Kunci langsung di awal agar tidak bisa lari dua kali
    if (window.hasTriggeredPrint) return;
    
    const queryParams = new URLSearchParams(location.search);
    const batchId = queryParams.get('batch_id');
    const templateIdParam = queryParams.get('template_id');

    if (batchId) {
      window.hasTriggeredPrint = true;
      // Fetch vouchers from API directly
      Promise.all([
        fetch(`/api/vouchers?filterPrintCode=${batchId}`).then(res => res.json()),
        fetch('/api/settings').then(res => res.json()),
        fetch('/api/profiles').then(res => res.json()),
        templateIdParam ? fetch(`/api/settings/templates/${templateIdParam}`).then(res => res.json()) : Promise.resolve(null)
      ]).then(([vouchersRes, settingsRes, profilesRes, templateRes]) => {
        setData({
          vouchers: Array.isArray(vouchersRes) ? vouchersRes : [],
          settings: settingsRes || {},
          profiles: profilesRes || []
        });
        
        if (templateRes) {
          setDbTemplate(templateRes);
          setTimeout(() => window.print(), 1000);
        } else {
          // Fallback to first template
          fetch(`/api/settings/templates`)
            .then(res => res.json())
            .then(allTemplates => {
              if (allTemplates.length > 0) setDbTemplate(allTemplates[0]);
              setTimeout(() => window.print(), 1000);
            })
            .catch(() => setTimeout(() => window.print(), 1000));
        }
      }).catch(err => {
        console.error('Failed to load from API for print:', err);
        setTimeout(() => window.print(), 1000);
      });
      return;
    }

    // Default: use localStorage
    const printDataStr = localStorage.getItem('print_vouchers_data');
    if (printDataStr) {
      window.hasTriggeredPrint = true;
      const printData = JSON.parse(printDataStr);
      setData(printData);
      
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
            setTimeout(() => window.print(), 1000);
          });
      } else {
        // Fallback to first template
        fetch(`/api/settings/templates`)
          .then(res => res.json())
          .then(allTemplates => {
            if (allTemplates.length > 0) setDbTemplate(allTemplates[0]);
            setTimeout(() => window.print(), 1000);
          })
          .catch(() => setTimeout(() => window.print(), 1000));
      }
    }
  }, [location.search]);

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
