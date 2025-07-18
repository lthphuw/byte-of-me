import { StateGraph } from '@langchain/langgraph';
import { checkpointer } from '@ai/infra/checkpointer/postgres';
import { generate, retrieve,  } from './assistant.node';
import { StateAnnotation } from './assistant.annotation';

export const graph = new StateGraph(StateAnnotation)
  .addNode('retrieve', retrieve)
  .addNode('generate', generate)
  .addEdge('__start__', 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', '__end__')
  .compile({ checkpointer });
