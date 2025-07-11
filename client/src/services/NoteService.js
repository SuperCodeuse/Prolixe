// client/src/services/NoteService.js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });


const getNotes = async () => {
    const response = await api.get('/notes');
    return response.data;
};

// Modifié pour accepter la date optionnelle
const addNote = async (text, state, date) => {
    const response = await api.post('/notes', { text, state, date });
    return response.data;
};

const deleteNote = async (id) => {
    await api.delete(`/notes/${id}`);
    return id;
};

const NoteService = {
    getNotes,
    addNote,
    deleteNote,
};

export default NoteService;