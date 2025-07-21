import { createEnv } from '@t3-oss/env-core';
import * as dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

export const env = createEnv({
  server: {
    // Database (Postgres) for LangGraph checkpoint
    DIRECT_DATABASE_URL: z.string().url(),

    // Pinecone vectorstore
    PINECONE_API_KEY: z.string(),
    PINECONE_NAMESPACE_768: z.string(),
    PINECONE_INDEX_768: z.string(),
    PINECONE_NAMESPACE_1024: z.string(),
    PINECONE_INDEX_1024: z.string(),

    MODEL_TEMPERATURE: z.number().optional().default(.4),

    // Google Gemini models
    GEMINI_API_KEY: z.string(),
    GOOGLE_API_KEY: z.string(),

    // Jina Embedding Models
    JINA_API_KEY: z.string(),

    // Checkpointer schema
    CHECKPOINTER_SCHEMA: z.string(),

    // Host for fetching portfolio data, Only need for index vector store
    HOST: z.string().url().optional(),

    // (Optional) Debug mode
    NODE_ENV: z.enum(['development', 'production']).optional().default('development'),
  },

  runtimeEnv: {
    MODEL_TEMPERATURE: process.env.MODEL_TEMPERATURE,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,

    JINA_API_KEY: process.env.JINA_API_KEY,

    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_768: process.env.PINECONE_INDEX_768,
    PINECONE_NAMESPACE_768: process.env.PINECONE_NAMESPACE_768,
    PINECONE_INDEX_1024: process.env.PINECONE_INDEX_1024,
    PINECONE_NAMESPACE_1024: process.env.PINECONE_NAMESPACE_1024,

    CHECKPOINTER_SCHEMA: process.env.CHECKPOINTER_SCHEMA,
    HOST: process.env.HOST,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,

    NODE_ENV: process.env.NODE_ENV,
  },
});
