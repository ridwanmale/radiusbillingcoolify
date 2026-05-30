import { useState, useEffect } from 'react';

export const useUISync = (pageId) => {
  const [uiConfig, setUiConfig] = useState({});
  const [isSynced, setIsSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tablePosition, setTablePosition] = useState('center');
  const host = window.location.hostname;

  const fetchSyncData = async () => {
    try {
      const resSync = await fetch(`/api/vouchers/ui-page-sync`);
      const dataSync = await resSync.json();
      const syncArray = Array.isArray(dataSync) ? dataSync : [];
      const pageSetting = syncArray.find(p => p.page_id === pageId);
      
      const synced = pageSetting?.is_synced === 1 || pageSetting?.is_synced === true;
      setIsSynced(synced);
      setTablePosition(pageSetting?.table_position || 'center');

      if (synced) {
        const resConfig = await fetch(`/api/vouchers/ui-config`);
        const dataConfig = await resConfig.json();
        const configArray = Array.isArray(dataConfig) ? dataConfig : [];
        const configMap = configArray.reduce((acc, curr) => {
          if (curr.field_id) {
            acc[curr.field_id] = curr;
          }
          return acc;
        }, {});
        setUiConfig(configMap);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching UI Sync data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
  }, [pageId]);

  const getLabel = (fieldId, defaultLabel) => {
    if (!isSynced) return defaultLabel;
    return uiConfig[fieldId]?.display_label || defaultLabel;
  };

  const isVisible = (fieldId) => {
    if (!isSynced) return true;
    return uiConfig[fieldId]?.is_visible !== 0;
  };

  return { getLabel, isVisible, isSynced, loading, tablePosition };
};
