import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global Fetch Interceptor for Demo Mode
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
  try {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const isDemo = adminUser.role === 'demo' || adminUser.username === 'demo';

    if (isDemo) {
      const method = (options.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        const path = typeof url === 'string' ? url : (url.url || '');
        if (!path.includes('/api/auth/login')) {
          alert('Fitur dinonaktifkan pada akun demo.');
          return Promise.reject(new Error('Fitur dinonaktifkan pada akun demo.'));
        }
      }
      
      if (!options.headers) {
        options.headers = {};
      }
      if (options.headers instanceof Headers) {
        options.headers.set('X-Demo-Mode', 'true');
      } else if (Array.isArray(options.headers)) {
        options.headers.push(['X-Demo-Mode', 'true']);
      } else {
        options.headers['X-Demo-Mode'] = 'true';
      }
    }
  } catch (e) {
    console.error('Fetch intercept error:', e);
  }
  return originalFetch.apply(this, [url, options]);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Auto-reload the page when a new Service Worker takes over
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

