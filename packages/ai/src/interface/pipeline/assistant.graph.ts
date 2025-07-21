import { StateGraph } from '@langchain/langgraph';
import { checkpointer } from '@ai/infra/checkpointer/postgres';
import { generate, retrieve } from './assistant.node';
import { StateAnnotation } from './assistant.annotation';

export const graph = new StateGraph(StateAnnotation)
  .addNode('retrieve', async (state) => {
    try {
      if (!state.question || !state.embedding) {
        throw new Error('Missing required state: question or embedding');
      }
      return await retrieve(state);
    } catch (error) {
      console.error(`Error in retrieve node: ${error}`);
      throw error;
    }
  })
  .addNode('generate', async (state) => {
    try {
      if (!state.context || !state.llm) {
        throw new Error('Missing required state: context or llm');
      }
      return await generate(state);
    } catch (error) {
      console.error(`Error in generate node: ${error}`);
      throw error;
    }
  })
  .addEdge('__start__', 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', '__end__')
  .compile({ checkpointer });
