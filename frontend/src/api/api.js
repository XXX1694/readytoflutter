import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL: apiBaseUrl });

export const getTopics = (level) =>
  api.get('/topics', { params: level ? { level } : {} }).then(r => r.data);

export const getTopic = (slug) =>
  api.get(`/topics/${slug}`).then(r => r.data);

export const getQuestions = (params) =>
  api.get('/questions', { params }).then(r => r.data);

export const getStats = () =>
  api.get('/stats').then(r => r.data);

export const updateProgress = (questionId, status, notes) =>
  api.post(`/progress/${questionId}`, { status, notes }).then(r => r.data);

export const resetProgress = () =>
  api.delete('/progress/reset').then(r => r.data);
