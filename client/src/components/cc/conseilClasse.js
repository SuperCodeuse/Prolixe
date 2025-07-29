import React, { useState } from 'react';
import { useJournal } from '../../hooks/useJournal';
import { useClasses } from '../../hooks/useClasses';
import { useConseilDeClasse } from '../../hooks/useCC';
import './conseilClasse.scss';

// --- Composant pour l'indicateur de sauvegarde (aucune modification nécessaire) ---
const SavingIndicator = ({ status }) => {
    if (status === 'saving') return <span className="saving-indicator">Sauvegarde...</span>;
    if (status === 'saved') return <span className="saving-indicator saved">✓ Enregistré</span>;
    if (status === 'error') return <span className="saving-indicator error">! Erreur</span>;
    return null;
};

// --- Composant principal ---
const ConseilDeClasse = () => {
    // 1. État pour la classe sélectionnée
    const [selectedClassId, setSelectedClassId] = useState('');

    // 2. Récupération de l'année scolaire (journal) actuelle
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id;

    // 3. Récupération des classes et de leur état de chargement/erreur
    const { classes, loading: loadingClasses, error: errorClasses } = useClasses(journalId);

    // 4. Récupération des élèves pour la classe sélectionnée
    const { students, loading: loadingStudents, error: errorStudents, savingStatus, handleStudentChange } = useConseilDeClasse(selectedClassId);

    // 5. Gestionnaire pour la sélection d'une classe
    const handleClassSelection = (e) => {
        setSelectedClassId(e.target.value);
    };

    return (
        <div className="conseil-de-classe-container">
            <header className="page-header">
                <h2>Conseil de classe</h2>
                <div className="class-selector-wrapper form-group">
                    <label htmlFor="class-select">Sélectionnez une classe :</label>
                    <select
                        id="class-select"
                        className="btn-select"
                        value={selectedClassId}
                        onChange={handleClassSelection}
                        disabled={loadingClasses || !journalId}
                    >
                        <option value="" disabled>-- Choisir une classe --</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                    {loadingClasses && <span className="loader">Chargement...</span>}
                </div>
            </header>

            {errorClasses && <div className="error-message">Erreur de chargement des classes : {errorClasses}</div>}

            <div className="content-panel">
                {!selectedClassId ? (
                    <p className="placeholder-text">Veuillez sélectionner une classe pour afficher les élèves.</p>
                ) : loadingStudents ? (
                    <p>Chargement des élèves...</p>
                ) : errorStudents ? (
                    <div className="error-message">Erreur : {errorStudents}</div>
                ) : (
                    <table>
                        <thead>
                        <tr>
                            <th>Élève</th>
                            <th>Avis et notes du conseil</th>
                            <th>Décision proposée</th>
                            <th>Statut</th>
                        </tr>
                        </thead>
                        <tbody>
                        {students.map(student => (
                            <tr key={student.id}>
                                <td>{`${student.firstname} ${student.lastname}`}</td>
                                <td>
                                        <textarea
                                            value={student.notes}
                                            onChange={e => handleStudentChange(student.id, 'notes', e.target.value)}
                                            placeholder="Synthèse, encouragements, points de vigilance..."
                                            rows="3"
                                        />
                                </td>
                                <td>
                                    <select
                                        value={student.decision}
                                        onChange={e => handleStudentChange(student.id, 'decision', e.target.value)}
                                    >
                                        <option value="AO-A">AO-A</option>
                                        <option value="AO-B">AO-B</option>
                                        <option value="AO-C">AO-C</option>
                                    </select>
                                </td>
                                <td>
                                    <SavingIndicator status={savingStatus[student.id]} />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ConseilDeClasse;