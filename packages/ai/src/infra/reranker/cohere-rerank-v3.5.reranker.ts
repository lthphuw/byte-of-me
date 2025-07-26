import { CohereRerank } from '@langchain/cohere';

export const cohereRerank = new CohereRerank({
  apiKey: process.env.COHERE_API_KEY,
  model: 'rerank-v3.5',
});
