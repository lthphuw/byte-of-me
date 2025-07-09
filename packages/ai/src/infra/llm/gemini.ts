import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '../../env.mjs';

// Standard API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits#current-rate-limits
// RPM: 15
// RPD: 200
export const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  temperature: 0.3,
  apiKey: env.GEMINI_API_KEY,
});
