import { nanoid } from 'nanoid';

import { checkpointer } from '@ai/infra/checkpointer/postgres.checkpoint';
import { graph } from '../pipeline/assistant.graph';
import { RoleType } from '@ai/types/role';
import { EmbeddingModelName } from '@ai/types/embedding';
import { LLMModelName } from '@ai/types/llm';
import { EmbeddingModel } from '@ai/enums/embedding';
import { LLMModel } from '@ai/enums/llm';
import { RerankerModel } from '@ai/enums/reranker';
import { RerankerModelName } from '@ai/types/reranker';
import { logger as _logger } from '@logger/logger';

const logger = _logger('chat');

export async function answer(
  question: string,
  options: {
    stream?: boolean;
    history?: Array<{ role: RoleType; content: string }>;
    thread_id?: string;
    llm?: LLMModelName;
    embedding?: EmbeddingModelName;
    reranker?: RerankerModelName;
  } = {},
): Promise<any> {
  logger.debug('Chat with options', {
    config: options,
  });

  const { stream, llm, embedding, reranker } = options;
  let history = options.history;
  const thread_id = options.thread_id || nanoid(16);

  if (!history && thread_id) {
    const previous = await checkpointer.get({
      configurable: { thread_id },
    });
    history = (previous?.channel_values?.history as any[] | undefined) ?? [];

    history = history.slice(-5);
  }
  const config = {
    configurable: {
      thread_id,
      ...(llm && { llm }),
      ...(embedding && { embedding }),
    },
  };

  console.log('>>> History: ', history);
  const initialState = {
    question,
    history: history ?? [],
    context: [],
    answer: '',
    embedding: embedding ?? EmbeddingModel.TextEmbedding004,
    llm: llm ?? LLMModel.Gemini20Flash,
    reranker: Object.values(RerankerModel).includes(reranker as RerankerModel) ? reranker : null,
  };

  if (!stream) {
    const result = await graph.invoke(initialState, config);
    return {
      answer: result.answer,
      thread_id,
    };
  }

  const streamResult = await graph.stream(
    initialState,
    {
      streamMode: 'messages',
      ...config,
    },
  );

  async function* generator() {
    for await (const [msg] of streamResult) {
      const content = (msg?.content ?? '') as string;
      if (content) yield { content };
    }
  }

  return generator();
}
