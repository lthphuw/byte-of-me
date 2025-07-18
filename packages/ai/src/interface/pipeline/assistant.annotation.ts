import { Document } from '@langchain/core/documents';
import { Annotation } from '@langchain/langgraph';
import { RoleType } from '@ai/types/role';

// annotation
export const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  history: Annotation<Array<{ role: RoleType; content: string }>>(),
  context: Annotation<Document[]>(),
  answer: Annotation<string>(),
});
