import { Pool } from 'pg';
import { env } from '../../config';

const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});

export async function deleteCheckpoint(thread_id: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete from checkpoint_writes
    await client.query(
      `DELETE FROM ${env.CHECKPOINTER_SCHEMA}.checkpoint_writes WHERE thread_id = $1`,
      [thread_id],
    );

    // Delete from checkpoint_blobs
    await client.query(
      `DELETE FROM ${env.CHECKPOINTER_SCHEMA}.checkpoint_blobs WHERE thread_id = $1`,
      [thread_id],
    );

    // Delete from checkpoints
    const res = await client.query(
      `DELETE FROM ${env.CHECKPOINTER_SCHEMA}.checkpoints WHERE thread_id = $1`,
      [thread_id],
    );

    await client.query('COMMIT');
    return { success: true, deleted: res.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[checkpoint-delete-error]', err);
    return { success: false, error: 'Failed to delete checkpoint' };
  } finally {
    client.release();
  }
}
