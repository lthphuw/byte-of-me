import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '../../config';
import { embeddings } from '../embedding/text-embedding-004';

const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

export const pineconeIndex = pinecone.Index(env.PINECONE_INDEX);

export async function getVectorStore() {
  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
    namespace: env.PINECONE_NAMESPACE,
  });
}
