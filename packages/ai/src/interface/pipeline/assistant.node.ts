import { getVectorStore } from '@ai/infra/vectorstore/pinecone.vectorstore';
import { assistantPrompt } from '../prompts/assistant-v3';
import { getLLM } from '@ai/infra/chat';
import { Role } from '@ai/enums/role';
import { EmbeddingModel } from '@ai/enums/embedding';
import { StateAnnotation } from './assistant.annotation';
import { RerankerModel } from '@ai/enums/reranker';
import { logger as _logger } from '@logger/logger';
import { rerankers } from '@ai/infra/reranker';
import { env } from '@ai/env.mjs';

// Create a named logger for the assistant graph
const logger = _logger('assistant-graph');

export const retrieve = async (state: typeof StateAnnotation.State) => {
  try {
    if (!state.question) {
      throw new Error('Missing question in state');
    }
    const embedding = state.embedding ?? EmbeddingModel.TextEmbedding004;
    logger.debug('Retrieving documents', { question: state.question, embedding });
    const vectorStore = await getVectorStore(embedding);

    const docs = await vectorStore.similaritySearch(state.question,
      state.reranker ? env.MODEL_TOP_K_INITIAL_DOCS : env.MODEL_TOP_K_DOCS,
    );

    logger.debug('Retrieved documents by similarity', { documentCount: docs.length, documents: docs });
    return {
      context: docs.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
    };
  } catch (error) {
    logger.error('Error in retrieve', { error: String(error) });
    throw error;
  }
};

export const rerank = async (state: typeof StateAnnotation.State) => {
  try {
    if (!state.context || !state.question) {
      throw new Error('Missing required state: context or question');
    }

    if (!state.reranker) {
      logger.warn('No reranker found, skipping reranker');
      return { context: state.context };
    }

    const rerankerModel = state.reranker ?? RerankerModel.CohereRerankV35;
    const reranker = rerankers[rerankerModel];

    if (!reranker) {
      logger.warn('No reranker specified or available, skipping reranking', { rerankerModel });
      return { context: state.context };
    }

    logger.debug('Reranking documents', { documentCount: state.context.length, rerankerModel });
    const rerankedDocs = await reranker.compressDocuments(state.context, state.question);

    logger.debug('Reranked documents', { documentCount: rerankedDocs.length });
    return {
      context: rerankedDocs.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
    };
  } catch (error) {
    logger.error('Error in rerank', { error: String(error) });
    throw error;
  }
};

export const generate = async (state: typeof StateAnnotation.State) => {
  try {
    if (!state.context || !state.question || !state.llm) {
      throw new Error('Missing required state: context, question, or llm');
    }

    const contextText = state.context.map((doc, index) => {
      const metadataStr = JSON.stringify(doc.metadata, null, 2);
      return `
      --- Information ${index} ---
        - Content: ${doc.pageContent}
        - Metadata / Additional data: ${metadataStr}
      --- End of Information ${index} ---
      `;
    }).join('\n\n');

    logger.debug('Formatting messages for LLM', {
      question: state.question,
      contextLength: contextText.length,
      context: contextText,
    });
    const messages = await assistantPrompt.formatMessages({
      context: contextText,
      question: state.question,
      history: state.history.map((msg) => ({
        type: msg.role,
        content: msg.content,
      })),
    });

    const llm = getLLM(state.llm);
    logger.debug('Invoking LLM', { llm: state.llm });
    const response = await llm.invoke(messages);

    logger.debug('LLM response received', { answerLength: response.content.length });
    return {
      answer: response.content,
      history: [
        ...state.history,
        { role: Role.User, content: state.question },
        { role: Role.Assistant, content: response.content },
      ],
    };
  } catch (error) {
    logger.error('Error in generate', { error: String(error) });
    throw error;
  }
};
