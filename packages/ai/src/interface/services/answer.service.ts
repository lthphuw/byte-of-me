import { v4 as uuidv4 } from 'uuid';
import { checkpointer } from '../../infra/checkpointer/postgres';
import { graph } from '../pipeline/assistant.graph';

export async function answer(
  question: string,
  options: {
    stream?: boolean;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    thread_id?: string;
  } = {},
): Promise<any> {
  let history = options.history;
  const thread_id = options.thread_id || uuidv4();

  if (!history && thread_id) {
    const previous = await checkpointer.get({
      configurable: { thread_id },
    });
    history = (previous?.channel_values?.history as any[] | undefined) ?? [];
  }

  const config = {
    configurable: {
      thread_id,
    },
  };

  if (!options.stream) {
    const result = await graph.invoke({ question, history }, config);
    return {
      answer: result.answer,
      thread_id,
    };
  }

  const stream = await graph.stream(
    { question, history },
    {
      streamMode: 'messages',
      ...config,
    },
  );

  async function* generator() {
    for await (const [msg] of stream) {
      const content = (msg?.content ?? '') as string;
      if (content) yield { content };
    }
  }

  return generator();
}
