import { getVectorStore } from '../../infra/vectorstore/pinecone';
import { fetchAndBuildDocuments } from '../loaders/loader';

export async function indexMyPortfolioDocs() {
  console.log('\n[Indexer] Fetching documents...');
  const docs = await fetchAndBuildDocuments();

  if (docs.length === 0) {
    console.warn('[Indexer] No documents found to index.');
    return;
  }

  console.log(
    `[Indexer] ${docs.length} documents fetched. Indexing to Pinecone...`,
  );

  try {
    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(docs);
    console.log('[Indexer] Indexing completed successfully.');
  } catch (err) {
    console.error('[Indexer] Error while indexing documents:', err);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  indexMyPortfolioDocs().catch(console.error);
}
