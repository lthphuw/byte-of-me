import { getVectorStore } from '@ai/infra/vectorstore/pinecone.vectorstore';
import { fetchAndBuildDocuments } from '../loaders/loader';
import { EmbeddingModelName } from '@ai/types/embedding';
import { EmbeddingModel } from '@ai/enums/embedding';

export async function indexMyPortfolioDocs(embedding?: EmbeddingModelName): Promise<void> {
  console.log('\n[Indexer] Fetching documents...');
  const docs = await fetchAndBuildDocuments();

  if (docs.length === 0) {
    console.warn('[Indexer] No documents found to index.');
    return;
  }

  const selectedEmbedding: EmbeddingModelName = embedding || EmbeddingModel.TextEmbedding004;

  console.log('[Indexer] Documents: ', docs.slice(0, 5));
  console.log(`[Indexer] ${docs.length} documents fetched. Indexing to Pinecone...`);

  try {
    console.log(`[Indexer] Using embedding model: ${selectedEmbedding}`);

    const vectorStore = await getVectorStore(selectedEmbedding);
    await vectorStore.addDocuments(docs); // Index all documents
    console.log('[Indexer] Indexing completed successfully.');
  } catch (err) {
    console.error('[Indexer] Error while indexing documents:', err);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await indexMyPortfolioDocs(EmbeddingModel.TextEmbedding004).catch(console.error);
  await indexMyPortfolioDocs(EmbeddingModel.JinaEmbeddingV3).catch(console.error);
}
