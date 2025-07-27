import { cohereRerank } from './cohere-rerank-v3.5.reranker';
import { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import { RerankerModel } from '@ai/enums/reranker';
import { RerankerModelName } from '@ai/types/reranker';

export const rerankers: Record<RerankerModelName, BaseDocumentCompressor> = {
  [RerankerModel.CohereRerankV35]: cohereRerank,
};
