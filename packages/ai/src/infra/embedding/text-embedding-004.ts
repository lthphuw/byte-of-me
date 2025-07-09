import { TaskType } from '@google/generative-ai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { env } from '../../env.mjs';

// https://ai.google.dev/gemini-api/docs/models#text-embedding
//
// Token limits:
// Input token limit: 2,048
// Output dimension size: 768
//
// Rate limits:	1,500 requests per minute
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'text-embedding-004', 
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: 'Document title',
  apiKey: env.GOOGLE_API_KEY,
});
