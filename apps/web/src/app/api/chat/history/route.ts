import { NextRequest } from 'next/server';
import { fetchState } from '@ai/index';

export async function GET(req: NextRequest) {
  const thread_id = req.nextUrl.searchParams.get('thread_id');

  if (!thread_id) {
    return new Response(JSON.stringify({ error: 'Missing thread_id' }), {
      status: 400,
    });
  }

  try {
    const history = await fetchState(thread_id);

    return Response.json({ history });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch history' }), {
      status: 500,
    });
  }
}
