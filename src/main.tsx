
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'; // import i18next configuration
import { handleSPARedirect } from './utils/spa-redirect'
// Handle SPA redirect for GitHub Pages
handleSPARedirect()

const rootElement = document.getElementById("root")!;
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />);
} else {
  const root = createRoot(rootElement);
  root.render(<App />);
}
