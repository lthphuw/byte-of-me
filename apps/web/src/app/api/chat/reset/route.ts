import { NextRequest } from 'next/server';
import { deleteCheckpoint } from '@ai/interface/services';

export async function POST(req: NextRequest) {
  const { thread_id } = await req.json();

  if (!thread_id) {
    return new Response(JSON.stringify({ error: 'Missing thread_id' }), {
      status: 400,
    });
  }

  try {
    await deleteCheckpoint(thread_id);

    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('[delete-checkpoint-error]', err);
    return new Response(
      JSON.stringify({ error: 'Failed to delete checkpoint' }),
      {
        status: 500,
      }
    );
  }
}
