import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Database (Postgres) for LangGraph checkpoint
    DIRECT_DATABASE_URL: z.string().url(),

    // Pinecone vectorstore
    PINECONE_API_KEY: z.string(),
    PINECONE_NAMESPACE: z.string(),
    PINECONE_INDEX: z.string(),

    // Google Gemini models
    GEMINI_API_KEY: z.string(),
    GOOGLE_API_KEY: z.string(),

    // Checkpointer schema
    CHECKPOINTER_SCHEMA: z.string(),

    // Host for fetching portfolio data, Only need for index vector store
    HOST: z.string().url().optional(),

    // (Optional) Debug mode
    NODE_ENV: z.enum(['development', 'production']).optional().default('development'),
  },

  runtimeEnv: {
    // Server
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    PINECONE_NAMESPACE: process.env.PINECONE_NAMESPACE,
    CHECKPOINTER_SCHEMA: process.env.CHECKPOINTER_SCHEMA,

    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,

    NODE_ENV: process.env.NODE_ENV,
  },
});
