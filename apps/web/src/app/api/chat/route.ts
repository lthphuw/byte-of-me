import { NextRequest, NextResponse } from 'next/server';
import { answer, deleteCheckpoint } from '@ai/index';
import { getTranslations } from 'next-intl/server';

import { dangerousKeywords } from '@/config/models';
import {
  applyRateLimit,
  rateLimitChatPerDay,
  rateLimitChatPerMinute,
} from '@/lib/core';

export async function POST(req: NextRequest) {
  const [perMin, perDate] = await Promise.all([
    applyRateLimit(rateLimitChatPerMinute, req),
    applyRateLimit(rateLimitChatPerDay, req),
  ]);
  if (perMin || perDate) return perMin || perDate;

  const t = await getTranslations('error');

  const { question, llm, embedding, reranker, history, stream, threadId } =
    await req.json();

  if (!question) {
    return NextResponse.json(
      { success: false, error: t('missingQuestion') },
      { status: 400 }
    );
  }

  const normalizedMessage = question.toLowerCase().replace(/[^a-z\s]/g, '');
  const words = normalizedMessage.split(/\s+/);
  const hasDangerousInput = words.some((kw: string) =>
    dangerousKeywords.has(kw)
  );

  if (hasDangerousInput) {
    return NextResponse.json(
      { success: false, error: t('invalidInput') },
      { status: 400 }
    );
  }

  if (stream) {
    const encoder = new TextEncoder();
    const generator = await answer(question, {
      stream: true,
      history,
      threadId,
      llm,
      embedding,
      reranker,
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

  const result = await answer(question, {
    history,
    threadId,
    llm,
    embedding,
    reranker,
  });

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const t = await getTranslations('error');

  const { threadId } = await req.json();

  if (!threadId) {
    return NextResponse.json(
      { success: false, error: t('missingThreadId') },
      { status: 400 }
    );
  }

  try {
    const res = await deleteCheckpoint(threadId);
    if (res.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: res.error });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: t('failedToDelete') },
      { status: 500 }
    );
  }
}
