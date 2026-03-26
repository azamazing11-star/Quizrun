import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Hide the pre-load overlay once React has mounted
const overlay = document.getElementById('pre-load-msg');
if (overlay) overlay.classList.add('hidden');
