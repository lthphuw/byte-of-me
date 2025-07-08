import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { env } from '../../config';

export const checkpointer = PostgresSaver.fromConnString(
  env.DIRECT_DATABASE_URL,
  {
    schema: 'public',
  },
);

await checkpointer.setup();
