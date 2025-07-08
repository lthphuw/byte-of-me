import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
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

  // Host for fetching portfolio data
  HOST: z.string().url().optional(),

  // (Optional) Debug mode
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid or missing environment variables:',
    parsed.error.format(),
  );
  throw new Error('Invalid or missing environment variables');
}

export const env = parsed.data;
