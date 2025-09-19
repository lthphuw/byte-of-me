import { NextRequest } from 'next/server';
import { fetchState } from '@ai/index';

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get('threadId');

  if (!threadId) {
    return new Response(JSON.stringify({ error: 'Missing threadId' }), {
      status: 400,
    });
  }

  try {
    const res = await fetchState(threadId);

    return Response.json({ history: res.history });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch history' }), {
      status: 500,
    });
  }
}
