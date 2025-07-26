import { embeddings as textEmbedding004 } from './text-embedding-004.embed';
import { embeddings as jinaEmbeddingV3 } from './jina-embeddings-v3.embed';
import { embeddings as geminiEmbeddingExp0307 } from './gemini-embedding-exp-03-07.embed';
import { EmbeddingModelName } from '@ai/types/embedding';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import { EmbeddingModel } from '@ai/enums/embedding';

export const embeddingModels: Record<EmbeddingModelName, EmbeddingsInterface> = {
  [EmbeddingModel.TextEmbedding004]: textEmbedding004,
  [EmbeddingModel.JinaEmbeddingV3]: jinaEmbeddingV3,
  [EmbeddingModel.GeminiEmbeddingExp0307]: geminiEmbeddingExp0307,
};
