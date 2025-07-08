import { NextRequest } from 'next/server';
import { answer } from '@ai/interface/services';

export async function POST(req: NextRequest) {
  const { question, history, stream, thread_id } = await req.json();

  if (!question) {
    return new Response(JSON.stringify({ error: 'Missing question' }), {
      status: 400,
    });
  }

  if (stream) {
    const encoder = new TextEncoder();
    const generator = await answer(question, {
      stream: true,
      history,
      thread_id,
    });

    const streamBody = new ReadableStream<Uint8Array>({
      async pull(controller) {
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(chunk.content));
        }
        controller.close();
      },
    });

    return new Response(streamBody, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  }

  const result = await answer(question, { history, thread_id });
  return Response.json(result);
}
