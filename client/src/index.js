// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // <-- Importez BrowserRouter
import { AuthProvider } from './hooks/useAuth';      // Assurez-vous que le chemin est correct
import { ToastProvider } from './hooks/useToast';
import { JournalProvider } from './hooks/useJournal';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <JournalProvider>
                        <App />
                    </JournalProvider>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);

reportWebVitals();