import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// On crée une instance axios SPÉCIFIQUE pour le conseil de classe
const conseilApi = axios.create({
    // On s'assure que le chemin complet est construit ici !
    baseURL: `${API_BASE_URL}/conseilDeClasse`,
    headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${votre_token}`
    }
});

/**
 * Récupère les données du conseil pour tous les élèves d'une classe.
 */
export const getConseilDataForClass = async (classId) => {
    // On vérifie que classId n'est pas vide pour éviter un appel inutile
    if (!classId) {
        return { success: true, data: [] };
    }

    try {
        // Maintenant, un simple appel à `/${classId}` fonctionnera correctement.
        const response = await conseilApi.get(`/${classId}`);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la récupération des données du conseil:', error.response?.data || error.message);
        throw error.response?.data || new Error('Erreur réseau lors de la récupération des données.');
    }
};

/**
 * Sauvegarde les notes et/ou la décision pour un étudiant.
 */
export const saveStudentConseil = async (studentId, data) => {
    if (!studentId) return;

    try {
        // La route pour la sauvegarde est relative à la baseURL ci-dessus
        const response = await conseilApi.put(`/student/${studentId}`, data);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'avis:', error.response?.data || error.message);
        throw error.response?.data || new Error('Erreur réseau lors de la sauvegarde.');
    }
};