import { checkpointer } from '@ai/infra/checkpointer/postgres';
import { RoleType } from '@ai/types/role';

export async function fetchState(thread_id: string) {
  const state = await checkpointer.get({
    configurable: { thread_id },
  });

  const messages = state?.channel_values?.history as
    | Array<{ role: RoleType; content: string }>
    | undefined;

  return messages ?? [];
}
