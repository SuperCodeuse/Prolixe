// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth'; // Assurez-vous du chemin
import { useToast } from '../../hooks/useToast'; // Pour les notifications
import './login.scss'; // Votre fichier CSS pour le formulaire de connexion

const Login = () => {
    const { login } = useAuth();
    const { toasts, removeToast, success, error: showError, warning } = useToast();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!username || !password) {
            showError('Veuillez entrer votre nom d\'utilisateur et votre mot de passe.', 3000);
            setIsSubmitting(false);
            return;
        }

        const result = await login(username, password);
        if (!result.success) {
            showError(result.message || 'Échec de la connexion. Veuillez réessayer.', 3000);
        }
        // Si succès, useAuth mettra à jour l'état et App.jsx redirigera
        setIsSubmitting(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Connexion</h1>
                    <p>Accédez à votre espace Prolixe</p>
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Nom d'utilisateur</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isSubmitting}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary login-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;