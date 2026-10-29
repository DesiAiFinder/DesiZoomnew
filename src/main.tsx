import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Vercel Web Analytics.
//
// Import from '@vercel/analytics/react', NOT '/next'. The setup page in the
// Vercel dashboard defaults its snippet to Next.js; DesiZoom is Vite + React
// and the /next entrypoint will not build here.
//
// It must be inside BrowserRouter. Outside it, the component cannot see route
// changes, and a single-page app then reports one pageview per session no
// matter how many pages someone actually visits.
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);
