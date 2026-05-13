/**
 * Uygulama giriş noktası.
 * React ağacını DOM'a bağlar ve BrowserRouter ile sarar.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/index.css'
import App from './App.jsx'
import ScrollToTop from './components/common/ScrollToTop.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Sayfa odağı değiştiğinde otomatik yenilemeyi kapat (isteğe bağlı)
      staleTime: 1000 * 60 * 5, // Veriyi 5 dakika boyunca 'taze' kabul et
    },
  },
})

// Tarayıcının otomatik kaydırma hatırlama özelliğini kapatıyoruz.
// Kontrolü ScrollToTop bileşenimize bırakıyoruz.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ScrollToTop />
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
