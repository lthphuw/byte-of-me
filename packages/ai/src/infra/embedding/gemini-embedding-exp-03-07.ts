import { TaskType } from '@google/generative-ai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { env } from '../../env.mjs';

// https://ai.google.dev/gemini-api/docs/models#text-embedding
//
// Token limits:
// Input token limit: 8,192
//
// Output dimension size: 3072, 1536, or 768
//
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-exp-03-07',
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: 'Document title',
  apiKey: env.GOOGLE_API_KEY,
});
