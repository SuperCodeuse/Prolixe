import ApiService from './api';

export const getEvaluations = () => {
    return ApiService.request(`/evaluations`);
};

export const createEvaluation = (evaluationData) => {
    return ApiService.request(`/evaluations`, {
        method: 'POST',
        body: JSON.stringify(evaluationData),
    });
};

export const updateEvaluation = (id, evaluationData) => {
    return ApiService.request(`/evaluations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(evaluationData),
    });
};

export const deleteEvaluation = (id) => {
    return ApiService.request(`/evaluations/${id}`, {
        method: 'DELETE',
    });
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