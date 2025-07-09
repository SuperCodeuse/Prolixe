import ApiService from './api';

export const getEvaluations = () => {
    return ApiService.request(`/evaluations`);
};

export const getEvaluationForGrading = (id) => {
    return ApiService.request(`/evaluations/${id}/grading`);
};

export const saveGrades = (evaluationId, grades) => {
    return ApiService.request(`/evaluations/${evaluationId}/grades`, {
        method: 'POST',
        body: JSON.stringify({ grades }),
    });
};