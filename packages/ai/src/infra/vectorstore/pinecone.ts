import { PineconeStore } from '@langchain/pinecone';
import { Index, Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { env } from '../../env.mjs';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import { EmbeddingModelName } from '@ai/types/embedding';
import { embeddingModels } from '@ai/infra/embedding';
import { EmbeddingModel } from '@ai/enums/embedding';

const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

const cache = new Map<string, PineconeStore>();

const pineconeIndexes: Record<EmbeddingModelName, Index<RecordMetadata>> = {
  [EmbeddingModel.TextEmbedding004]: pinecone.Index(env.PINECONE_INDEX_768),
  [EmbeddingModel.JinaEmbeddingV3]: pinecone.Index(env.PINECONE_INDEX_1024),
  [EmbeddingModel.GeminiEmbeddingExp0307]: (env.PINECONE_NAMESPACE_1024),

};
const pineconeNamespaces: Record<EmbeddingModelName, string> = {
  [EmbeddingModel.TextEmbedding004]: (env.PINECONE_NAMESPACE_768),
  [EmbeddingModel.JinaEmbeddingV3]: (env.PINECONE_NAMESPACE_1024),
  [EmbeddingModel.GeminiEmbeddingExp0307]: (env.PINECONE_NAMESPACE_1024),
};

function resolveEmbeddingModel(name: EmbeddingModelName): EmbeddingsInterface {
  return embeddingModels[name] ?? embeddingModels[EmbeddingModel.TextEmbedding004];
}

/**
 * Get or create a cached Pinecone vector store for a specific embedding model
 * @param embeddingName Name of the embedding model
 * @returns Cached PineconeStore instance
 */
export async function getVectorStore(
  embeddingName: EmbeddingModelName = EmbeddingModel.TextEmbedding004,
): Promise<PineconeStore> {
  const resolvedModel = embeddingName ?? EmbeddingModel.TextEmbedding004;
  const cacheKey = `${embeddingName}:${pineconeNamespaces[resolvedModel]}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const embedding = resolveEmbeddingModel(resolvedModel);
  const store = await PineconeStore.fromExistingIndex(embedding, {
    pineconeIndex: pineconeIndexes[resolvedModel],
    maxConcurrency: 5,
    namespace: pineconeNamespaces[resolvedModel],
  });

  cache.set(cacheKey, store);
  return store;
}
