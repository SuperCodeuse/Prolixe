import React, { useState, useMemo } from 'react';
import { useJournal } from '../../hooks/useJournal';
import { useClasses } from '../../hooks/useClasses';
import { useConseilDeClasse } from '../../hooks/useCC';
import './conseilClasse.scss';


// Indicateur de sauvegarde (inchangé)
const SavingIndicator = ({ status }) => {
    if (status === 'saving') return <span className="saving-indicator">💾 Sauvegarde...</span>;
    if (status === 'saved') return <span className="saving-indicator saved"> ✅ Enregistré !</span>;
    if (status === 'error') return <span className="saving-indicator error">❌ Erreur</span>;
    return null;
};

// Sélecteur de classe
const ClassSelector = ({ classes, selectedClassId, onClassChange, isLoading, isDisabled }) => (
    <div className="conseil-de-classe__header form-group">
        <label htmlFor="class-select">Sélectionnez une classe :</label>
        <select
            id="class-select"
            className="btn-select"
            value={selectedClassId}
            onChange={onClassChange}
            disabled={isLoading || isDisabled}
        >
            <option value="" disabled>-- Choisir une classe --</option>
            {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
        </select>
        {isLoading && <span className="loader">Chargement des classes...</span>}
    </div>
);

// Ligne pour un élève dans le tableau
const StudentRow = React.memo(({ student, onStudentChange, savingStatus }) => (
    <tr className="student-table__row">
        <td data-label="Élève">{`${student.firstname} ${student.lastname}`}</td>
        <td data-label="Avis et notes">
            <textarea
                value={student.notes}
                onChange={e => onStudentChange(student.id, 'notes', e.target.value)}
                placeholder="Synthèse, encouragements, points de vigilance..."
                rows="3"
            />
        </td>
        <td data-label="Décision proposée">
            <select
                value={student.decision}
                onChange={e => onStudentChange(student.id, 'decision', e.target.value)}
            >
                <option value="AO-A">AO-A</option>
                <option value="AO-B">AO-B</option>
                <option value="AO-C">AO-C</option>
            </select>
        </td>
        <td data-label="Statut">
            <SavingIndicator status={savingStatus} />
        </td>
    </tr>
));

// Tableau des élèves
const StudentTable = ({ students, onStudentChange, savingStatus }) => (
    <table className="student-table">
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
            <StudentRow
                key={student.id}
                student={student}
                onStudentChange={onStudentChange}
                savingStatus={savingStatus[student.id]}
            />
        ))}
        </tbody>
    </table>
);

// --- Composant Principal ---

const ConseilDeClasse = () => {
    // 1. État pour la classe sélectionnée
    const [selectedClassId, setSelectedClassId] = useState('');

    // 2. Récupération de l'année scolaire (journal)
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id;

    // 3. Récupération des données (hooks)
    const { classes, loading: loadingClasses, error: errorClasses } = useClasses(journalId);
    const { students, loading: loadingStudents, error: errorStudents, savingStatus, handleStudentChange } = useConseilDeClasse(selectedClassId);

    // 4. Memoization de l'affichage du contenu pour éviter les re-calculs inutiles
    const content = useMemo(() => {
        if (!selectedClassId) {
            return <p className="placeholder-text">Veuillez sélectionner une classe pour afficher les élèves.</p>;
        }
        if (loadingStudents) {
            return <p>Chargement des élèves...</p>;
        }
        if (errorStudents) {
            return <div className="error-message">Erreur de chargement des élèves : {errorStudents}</div>;
        }
        if (students?.length === 0) {
            return <p className="placeholder-text">Aucun élève trouvé pour cette classe.</p>;
        }
        return <StudentTable students={students} onStudentChange={handleStudentChange} savingStatus={savingStatus} />;
    }, [selectedClassId, loadingStudents, errorStudents, students, handleStudentChange, savingStatus]);


    return (
        <div className="conseil-de-classe">
            <header className="page-header">
                <h2>Conseil de classe</h2>
                <ClassSelector
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onClassChange={(e) => setSelectedClassId(e.target.value)}
                    isLoading={loadingClasses}
                    isDisabled={!journalId}
                />
            </header>

            {errorClasses && <div className="error-message">Erreur de chargement des classes : {errorClasses}</div>}

            <main className="conseil-de-classe__content">
                {content}
            </main>
        </div>
    );
};

export default ConseilDeClasse;