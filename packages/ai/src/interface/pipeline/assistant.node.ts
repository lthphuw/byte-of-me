import { llm } from '../../infra/llm/gemini';
import { getVectorStore } from '../../infra/vectorstore/pinecone';
import { assistantPrompt } from '../prompts/assistant';
import { StateAnnotation } from './assistant.annotation';

// graph nodes
export const retrieve = async (state: typeof StateAnnotation.State) => {
  const vectorStore = await getVectorStore();
  const docs = await vectorStore.similaritySearch(state.question, 4);
  return { context: docs };
};

export const generate = async (state: typeof StateAnnotation.State) => {
  const contextText = state.context.map((doc) => doc.pageContent).join('\n\n');
  const messages = await assistantPrompt.formatMessages({
    context: contextText,
    question: state.question,
    history: state.history.map((msg) => ({
      type: msg.role,
      content: msg.content,
    })),
  });

  const response = await llm.invoke(messages);

  return {
    answer: response.content,
    history: [
      ...state.history,
      { role: 'user', content: state.question },
      { role: 'assistant', content: response.content },
    ],
  };
};
