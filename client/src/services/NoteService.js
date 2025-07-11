// client/src/services/NoteService.js
import axios from 'axios';

// Configurez axios avec l'URL de base de votre API et les headers nécessaires
// Le token JWT doit être récupéré (ex: depuis le localStorage) et ajouté aux headers
const api = axios.create({
    baseURL: '/api', // ou http://localhost:5000/api si sur des ports différents
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token'); // Adaptez selon où vous stockez le token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


const getNotes = async () => {
    const response = await api.get('/notes');
    return response.data;
};

const addNote = async (text) => {
    const response = await api.post('/notes', { text });
    return response.data;
};

const deleteNote = async (id) => {
    await api.delete(`/notes/${id}`);
    return id; // Retourne l'id pour faciliter la mise à jour du state
};

const NoteService = {
    getNotes,
    addNote,
    deleteNote,
};

export default NoteService;