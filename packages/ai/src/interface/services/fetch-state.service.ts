import { checkpointer } from '../../infra/checkpointer/postgres';

export async function fetchState(thread_id: string) {
  const state = await checkpointer.get({
    configurable: { thread_id },
  });

  const messages = state?.channel_values?.history as
    | Array<{ role: 'user' | 'assistant'; content: string }>
    | undefined;

  return messages ?? [];
}
