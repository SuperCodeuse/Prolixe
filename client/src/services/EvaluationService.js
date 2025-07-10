import ApiService from './api';

export const getEvaluations = () => {
    // Utilise ApiService.request au lieu de api.get
    return ApiService.request(`/evaluations`);
};

export const createEvaluation = (evaluationData) => {
    return ApiService.request(`/evaluations`, {
        method: 'POST',
        body: JSON.stringify(evaluationData),
    });
};

export const getEvaluationForGrading = (id) => {
    // Utilise ApiService.request au lieu de api.get
    return ApiService.request(`/evaluations/${id}/grading`);
};

export const saveGrades = (evaluationId, grades) => {
    // Utilise ApiService.request au lieu de api.post
    return ApiService.request(`/evaluations/${evaluationId}/grades`, {
        method: 'POST',
        body: JSON.stringify({ grades }),
    });
};