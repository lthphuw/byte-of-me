import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});

export async function deleteCheckpoint(thread_id: string) {
  try {
    const res = await pool.query(
      `DELETE FROM public.checkpoints WHERE config->>'thread_id' = $1`,
      [thread_id],
    );

    return { success: true, deleted: res.rowCount };
  } catch (err) {
    console.error('[checkpoint-delete-error]', err);
    return { success: false, error: 'Failed to delete checkpoint' };
  }
}
