import { nanoid } from 'nanoid';

import { checkpointer } from '@ai/infra/checkpointer/postgres';
import { graph } from '../pipeline/assistant.graph';
import { RoleType } from '@ai/types/role';
import { EmbeddingModelName } from '@ai/types/embedding';
import { LLMModelName } from '@ai/types/llm';
import { EmbeddingModel } from '@ai/enums/embedding';
import { LLMModel } from '@ai/enums/llm';

export async function answer(
  question: string,
  options: {
    stream?: boolean;
    history?: Array<{ role: RoleType; content: string }>;
    thread_id?: string;
    llm?: LLMModelName;
    embedding?: EmbeddingModelName;
  } = {},
): Promise<any> {
  const { stream, llm, embedding } = options;
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

  const initialState = {
    question,
    history: history ?? [],
    context: [],
    answer: '',
    embedding: embedding ?? EmbeddingModel.TextEmbedding004,
    llm: llm ?? LLMModel.Gemini20Flash,
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
