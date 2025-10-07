// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth'; // Assurez-vous du chemin
import { useToast } from '../../hooks/useToast'; // Pour les notifications
import './login.scss';
import {Link} from "react-router-dom"; // Votre fichier CSS pour le formulaire de connexion

const Login = () => {
    const { login } = useAuth();
    const { success, error: showError } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // Ajout du nouvel état pour la case à cocher

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!email || !password) {
            showError('Veuillez entrer votre email et votre mot de passe.', 'error');
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await login(email, password);
            if (!result.success) {
                showError(result.message || 'Échec de la connexion. Veuillez réessayer.', 'error');
            }
        } catch (err) {
            showError(err.message || 'Une erreur est survenue.', 'error');
        }

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
                        <label htmlFor="email">Adresse e-mail</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    <div className="form-group remember-me-group">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="rememberMe">Rester connecté</label>
                    </div>
                    <button type="submit" className="btn btn-primary login-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                    </button>
                </form>
                <p>
                    Créer un compte? <Link to="/register">S'inscrire</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;