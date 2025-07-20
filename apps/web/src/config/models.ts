export const dangerousKeywords = new Set<string>([
  'ignore',
  'system prompt',
  'bypass',
  'secret',
]);

export const llmModels = [
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash (Google)',
    desc: 'Fast lightweight LLM by Google, optimized for real-time interactions.',
  },
];

export const embeddingModels = [
  {
    id: 'text-embedding-004',
    label: 'Text Embedding 004 (Google)',
    desc: 'High-quality English embedding model for semantic search and retrieval.',
  },
  // {
  //   id: 'jina-embedding-v4',
  //   label: 'Jina Embedding v4 (Jina AI)',
  //   desc: 'Multilingual embedding model optimized for speed and dense retrieval.',
  // },
];
