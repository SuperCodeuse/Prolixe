// client/src/pages/Register/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserService from '../../services/UserService';
import { useToast } from '../../hooks/useToast';
import './register.scss';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstname, setFirstname] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Correction ici : Renommez la propriété success pour éviter le conflit
    const { success: showSuccessToast, error: showErrorToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await UserService.register(firstname, name, email, password);
            showSuccessToast('Inscription réussie ! Vous pouvez maintenant vous connecter.');
            navigate('/login');
        } catch (err) {
            const errorMessage = err.message || 'Une erreur est survenue lors de l\'inscription.';
            setError(errorMessage);
            showErrorToast(errorMessage);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2>Créer un compte</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="firstname">Prénom</label>
                        <input
                            type="text"
                            id="firstname"
                            value={firstname}
                            onChange={(e) => setFirstname(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="name">Nom</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="register-button">S'inscrire</button>
                </form>
                <p>
                    Déjà un compte? <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;