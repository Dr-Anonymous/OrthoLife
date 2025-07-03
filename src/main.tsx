
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { handleSPARedirect } from './utils/spa-redirect'
import { useScrollToHash } from './utils/useScrollToHash'
// Handle SPA redirect for GitHub Pages
handleSPARedirect()

useScrollToHash(80); // adjust offset if you have a fixed navbar

createRoot(document.getElementById("root")!).render(<App />);
