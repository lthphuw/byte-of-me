import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { env } from '../../env.mjs';

export const checkpointer = PostgresSaver.fromConnString(
  env.DIRECT_URL,
  {
    schema: env.CHECKPOINTER_SCHEMA,
  },
);


await checkpointer.setup();
