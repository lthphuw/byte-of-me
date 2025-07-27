import { createEnv } from '@t3-oss/env-core';
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const env = createEnv({
  server: {
    MODEL_TOP_K_INITIAL_DOCS: z.number().optional().default(15), // Initial number of documents to retrieve
    MODEL_TOP_K_DOCS: z.number().optional().default(4), // Final number of documents after re-ranking
    MODEL_TEMPERATURE: z.number().optional().default(0.4), // Temperature for LLM generation

    // Database (Postgres) for LangGraph checkpoint
    DIRECT_DATABASE_URL: z.string().url(),

    // Pinecone vectorstore
    PINECONE_API_KEY: z.string(),
    PINECONE_NAMESPACE_768: z.string(),
    PINECONE_INDEX_768: z.string(),
    PINECONE_NAMESPACE_1024: z.string(),
    PINECONE_INDEX_1024: z.string(),

    // Google Gemini models
    GEMINI_API_KEY: z.string(),
    GOOGLE_API_KEY: z.string(),

    // Re-ranker models
    COHERE_API_KEY: z.string(),

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
    MODEL_TOP_K_INITIAL_DOCS: Number(process.env.MODEL_TOP_K_INITIAL_DOCS),
    MODEL_TOP_K_DOCS: Number(process.env.MODEL_TOP_K_DOCS),
    MODEL_TEMPERATURE: Number(process.env.MODEL_TEMPERATURE),

    COHERE_API_KEY: process.env.COHERE_API_KEY,

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
