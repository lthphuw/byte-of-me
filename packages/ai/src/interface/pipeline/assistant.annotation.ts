import { Document } from '@langchain/core/documents';
import { Annotation } from '@langchain/langgraph';

// annotation
export const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  history: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>(),
  context: Annotation<Document[]>(),
  answer: Annotation<string>(),
});
