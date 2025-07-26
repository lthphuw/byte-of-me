import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '../../env.mjs';
import { LLMModel } from '@ai/enums/llm';

// Standard API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits#current-rate-limits
// RPM: 10
// RPD: 250
export const llm = new ChatGoogleGenerativeAI({
  model: LLMModel.Gemini25Flash,
  temperature: env.MODEL_TEMPERATURE,
  apiKey: env.GEMINI_API_KEY,
});

