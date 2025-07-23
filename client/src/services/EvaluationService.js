import ApiService from './api';

export const getEvaluations = (journalId) => {
    if (!journalId) return Promise.resolve({ data: [] });
    return ApiService.request(`/evaluations?journalId=${journalId}`);
};

export const getEvaluationById = (id) => {
    return ApiService.request(`/evaluations/${id}`);
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

export const getEvaluationTemplates = () => {
    return ApiService.request(`/evaluations/templates`);
};
