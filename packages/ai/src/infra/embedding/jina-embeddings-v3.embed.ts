import { JinaEmbeddings } from '@langchain/community/embeddings/jina';
import { env } from '@ai/env.mjs';

export const embeddings = new JinaEmbeddings({
  apiKey: env.JINA_API_KEY,
  model: 'jina-embeddings-v3',
});
