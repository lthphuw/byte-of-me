export const dangerousKeywords = new Set<string>([
  'ignore',
  'system prompt',
  'bypass',
  'secret',
]);

type LLMModel = {
  id: string;
  label: string;
  desc: string;
  disabled?: boolean;
  disableReason?: string;
};

export const llmModels: LLMModel[] = [
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash (Google)',
    desc: 'Fast lightweight LLM by Google, optimized for real-time interactions.',
    disabled: false,
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite (Google)',
    desc: 'Smaller, even faster version of Gemini Flash for low-latency tasks.',
    disabled: false,
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Google)',
    desc: 'Updated fast-response model for interactive tasks, part of Gemini 2.5 series.',
    disabled: false,
  },
];

export const embeddingModels: LLMModel[] = [
  {
    id: 'jina-embedding-v3',
    label: 'Jina Embedding v3 (Jina AI)',
    desc: 'Multilingual embedding model optimized for speed and dense retrieval.',
    // disabled: true,
    // disableReason: 'Out of free tokens',
  },
  {
    id: 'text-embedding-004',
    label: 'Text Embedding 004 (Google)',
    desc: 'High-quality English embedding model for semantic search and retrieval.',
    disabled: false,
  },
];

export const rerankerModels: LLMModel[] = [
  {
    id: 'no-reranker',
    label: 'No reranker',
    desc: '',
  },
  {
    id: 'cohere-rerank-v3.5',
    label: 'Cohere Rerank-v3.5',
    desc: 'Cohere Rerank v3.5 ranks documents by relevance to a query across 100+ languages, boosting RAG and search performance.',
  },
];
