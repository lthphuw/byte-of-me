import { Document } from '@langchain/core/documents';
import { Annotation } from '@langchain/langgraph';
import { RoleType } from '@ai/types/role';
import { EmbeddingModelName } from '@ai/types/embedding';
import { LLMModelName } from '@ai/types/llm';
import { RerankerModelName } from '@ai/types/reranker';

// annotation
export const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  history: Annotation<Array<{ role: RoleType; content: string }>>(),
  context: Annotation<Document[]>(),
  answer: Annotation<string>(),
  embedding: Annotation<EmbeddingModelName>(),
  llm: Annotation<LLMModelName>(),
  reranker: Annotation<RerankerModelName | null>(),
});
