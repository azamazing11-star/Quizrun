import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Hide and remove the pre-load overlay immediately once React has mounted
const overlay = document.getElementById('pre-load-msg');
if (overlay) {
  overlay.style.display = 'none';
  overlay.remove();
}
