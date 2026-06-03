export const formatDateTime = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  
  const pad = (n) => n.toString().padStart(2, '0');
  
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  
  const hh = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  
  return `${dd}/${mm}/${yyyy} ${hh}:${mins}:${ss}`;
};
