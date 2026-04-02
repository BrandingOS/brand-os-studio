import { createRoot } from 'react-dom/client';
import { bootServices } from './core/boot';
import App from './App.tsx';
import './index.css';

// Configure the service container before rendering
bootServices();

createRoot(document.getElementById("root")!).render(<App />);
