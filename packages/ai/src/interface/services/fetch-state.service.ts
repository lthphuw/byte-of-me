import { checkpointer } from '@ai/infra/checkpointer/postgres.checkpoint';
import { RoleType } from '@ai/types/role';
import { EmbeddingModelName } from '@ai/types/embedding';
import { LLMModelName } from '@ai/types/llm';

export async function fetchState(threadId: string) {
  const state = await checkpointer.get({
    configurable: { thread_id: threadId },
  });

  const messages = state?.channel_values?.history as Array<{ role: RoleType; content: string }> | undefined;
  const llm = state?.channel_values?.llm as LLMModelName | undefined;
  const embedding = state?.channel_values?.embedding as EmbeddingModelName | undefined;
  const question = state?.channel_values?.question as string | undefined;
  const answer = state?.channel_values?.answer as string | undefined;

  return {
    history: messages ?? [],
    llm,
    embedding,
    question,
    answer,
  };
}
