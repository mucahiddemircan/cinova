/**
 * Application entry point.
 * Binds React tree to DOM and wraps with BrowserRouter.
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
      refetchOnWindowFocus: false, // Disable automatic refresh when page focus changes (optional)
      staleTime: 1000 * 60 * 5, // Accept data as 'fresh' for 5 minutes
    },
  },
})

// We disable the browser's automatic scroll restoration.
// We leave control to our ScrollToTop component.
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
