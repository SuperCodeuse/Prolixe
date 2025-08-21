// client/src/services/NoteService.js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const getNotes = async () => {
    const response = await api.get('/notes');
    return response.data;
};

// Modifié pour accepter un objet complet pour plus de flexibilité
const addNote = async ({ text, state, date, time, location }) => {
    const response = await api.post('/notes', { text, state, date, time, location });
    return response.data;
};

const updateNote = async (id, { text, state, date, time, location }) => {
    const response = await api.put(`/notes/${id}`, { text, state, date, time, location });
    return response.data;
};

const deleteNote = async (id) => {
    await api.delete(`/notes/${id}`);
    return id;
};

const NoteService = {
    getNotes,
    addNote,
    updateNote, // Ajout de la nouvelle fonction
    deleteNote,
};

export default NoteService;