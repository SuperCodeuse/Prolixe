import api from './api'; // En supposant que vous avez un client axios configuré dans './api'

export const getEvaluationForGrading = (id) => {
    return api.get(`/evaluations/${id}/grading`);
};

export const saveGrades = (evaluationId, grades) => {
    return api.post(`/evaluations/${evaluationId}/grades`, { grades });
};