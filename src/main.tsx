
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'; // import i18next configuration
import { handleSPARedirect } from './utils/spa-redirect'
import { injectPrerenderMeta, isPrerendering } from './utils/prerender-meta'

// Handle SPA redirect for GitHub Pages
handleSPARedirect()

// Inject meta tags for pre-rendering
if (isPrerendering()) {
  injectPrerenderMeta(window.location.pathname);
}

const rootElement = document.getElementById("root")!;

// Use hydrate for pre-rendered content, render for normal SPA
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />);
} else {
  createRoot(rootElement).render(<App />);
}
