import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

// ── One-time mock data purge ──────────────────────────────────────────────────
// Clears all localStorage keys seeded with mock clinic data on first load of
// this version so the app starts as a clean slate for the client.
const DATA_VERSION = 'v2.0.0-clean';
if (localStorage.getItem('rehab-swat-data-version') !== DATA_VERSION) {
  const keysToPurge = [
    'rehab-swat-notifications',
    'rehab-swat-inventory',
    'rehab-swat-inventory-txs',
    'rehab-swat-settings-services',
    'rehab-swat-settings-templates',
    'rehab-swat-settings-backups',
  ];
  // Also purge any per-patient plan/doc caches
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('rehab-swat-plans-') || key.startsWith('rehab-swat-docs-')) {
      keysToPurge.push(key);
    }
  }
  keysToPurge.forEach(k => localStorage.removeItem(k));
  localStorage.setItem('rehab-swat-data-version', DATA_VERSION);
}
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

