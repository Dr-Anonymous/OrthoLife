
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { handleSPARedirect } from './utils/spa-redirect'

// Handle SPA redirect for GitHub Pages
handleSPARedirect()

createRoot(document.getElementById("root")!).render(<App />);
