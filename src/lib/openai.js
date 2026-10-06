import { apiPost } from './apiClient';

export async function generateAIResponse(prompt) {
  try {
    const res = await apiPost('/ai/tutor', { prompt });
    return res;
  } catch (err) {
    throw new Error(err.message || 'AI request failed.');
  }
}

