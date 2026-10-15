import {createRoot} from 'react-dom/client';
import App from './App';
import {bootstrapWorkspace} from './workspaceApi';
import './styles.css';
bootstrapWorkspace().catch(error=>{console.warn('Mock API initialization failed; browser workspace retained.',error instanceof Error?error.message:'Unavailable')}).finally(()=>createRoot(document.getElementById('root')!).render(<App/>));
import './fidelity.css';

import "./design-tokens.css";
