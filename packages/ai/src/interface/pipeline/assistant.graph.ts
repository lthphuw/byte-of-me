import { StateGraph } from '@langchain/langgraph';
import { checkpointer } from '@ai/infra/checkpointer/postgres.checkpoint';
import { retrieve, rerank, generate } from './assistant.node';
import { StateAnnotation } from './assistant.annotation';
import { logger as _logger } from '@logger/logger';

// Create a named logger for the assistant graph
const logger = _logger('assistant-graph');

export const graph = new StateGraph(StateAnnotation)
  .addNode('retrieve', async (state) => {
    try {
      logger.info('Starting retrieve node', { question: state.question, embedding: state.embedding });
      if (!state.question || !state.embedding) {
        throw new Error('Missing required state: question or embedding');
      }
      const result = await retrieve(state);
      logger.info('Retrieve node completed', { documents: result.context.length });
      return result;
    } catch (error) {
      logger.error('Error in retrieve node', { error: String(error) });
      throw error;
    }
  })
  .addNode('rerank', async (state) => {
    try {
      logger.info('Starting rerank node', { question: state.question, documents: state.context.length });
      if (!state.context || !state.question) {
        throw new Error('Missing required state: context or question');
      }
      const result = await rerank(state);
      logger.info('Rerank node completed', { documents: result.context.length });
      return result;
    } catch (error) {
      logger.error('Error in rerank node', { error: String(error) });
      throw error;
    }
  })
  .addNode('generate', async (state) => {
    try {
      logger.info('Starting generate node', { question: state.question, llm: state.llm });
      if (!state.context || !state.llm) {
        throw new Error('Missing required state: context or llm');
      }
      const result = await generate(state);
      logger.info('Generate node completed', { answerLength: result.answer.length });
      return result;
    } catch (error) {
      logger.error('Error in generate node', { error: String(error) });
      throw error;
    }
  })
  .addEdge('__start__', 'retrieve')
  .addEdge('retrieve', 'rerank')
  .addEdge('rerank', 'generate')
  .addEdge('generate', '__end__')
  .compile({ checkpointer });
