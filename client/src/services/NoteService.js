// client/src/services/NoteService.js
//test
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const getNotes = async () => {
    const response = await api.get('/notes');
    return response.data;
};

const addNote = async (text, state, date, time, location) => {
    const response = await api.post('/notes', { text, state, date, time, location });
    return response.data;
};

const updateNote = async (id, updatedFields) => {
    const response = await api.put(`/notes/${id}`, updatedFields);
    return response.data;
};

const deleteNote = async (id) => {
    await api.delete(`/notes/${id}`);
    return id;
};

const NoteService = {
    getNotes,
    addNote,
    updateNote,
    deleteNote,
};

export default NoteService;