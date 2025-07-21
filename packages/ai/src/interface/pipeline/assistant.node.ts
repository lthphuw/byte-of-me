import { getVectorStore } from '@ai/infra/vectorstore/pinecone';
import { assistantPrompt } from '../prompts/assistant-v2';
import { StateAnnotation } from './assistant.annotation';
import { getLLM } from '@ai/infra/llm';
import { Role } from '@ai/enums/role';
import { EmbeddingModel } from '@ai/enums/embedding';

// graph nodes
export const retrieve = async (state: typeof StateAnnotation.State) => {
  try {
    if (!state.question) {
      throw new Error('Missing question in state');
    }
    const embedding = state.embedding ?? EmbeddingModel.TextEmbedding004;
    const vectorStore = await getVectorStore(embedding);

    const docs = await vectorStore.similaritySearch(state.question, 4);

    return {
      context: docs.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
    };
  } catch (error) {
    console.error(`Error in retrieve: ${error}`);
    throw error;
  }
};

export const generate = async (state: typeof StateAnnotation.State) => {
  try {
    if (!state.context || !state.question || !state.llm) {
      throw new Error('Missing required state: context, question, or llm');
    }

    const contextText = state.context.map((doc) => {
      const metadataStr = JSON.stringify(doc.metadata, null, 2);
      return `Content: ${doc.pageContent}\nMetadata: ${metadataStr}`;
    }).join('\n\n');

    const messages = await assistantPrompt.formatMessages({
      context: contextText,
      question: state.question,
      history: state.history.map((msg) => ({
        type: msg.role,
        content: msg.content,
      })),
    });

    const llm = getLLM(state.llm);
    const response = await llm.invoke(messages);

    return {
      answer: response.content,
      history: [
        ...state.history,
        { role: Role.User, content: state.question },
        { role: Role.Assistant, content: response.content },
      ],
    };
  } catch (error) {
    console.error(`Error in generate: ${error}`);
    throw error;
  }
};
