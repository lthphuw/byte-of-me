/**
 * Visitor text must reach the dashboard as plain text, never rendered to HTML
 * (a TipTap `image` node would become a tracking pixel in the owner's browser).
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPaginatedContactMessages } from './get-paginated-contacts';

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'contactMessage', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const TIPTAP_PAYLOAD = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'image',
      attrs: { src: 'https://attacker.example/pixel.png', alt: 'x' },
    },
  ],
});

const row = (message: string) => ({
  id: 'msg-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  name: 'Visitor',
  email: 'visitor@example.com',
  subject: null,
  message,
  userId: 'admin-1',
});

describe('getPaginatedContactMessages', () => {
  beforeEach(() => {
    findMany.mockReset();
    count.mockReset().mockResolvedValue(1);
  });

  it('returns a TipTap-shaped message verbatim, not rendered to HTML', async () => {
    findMany.mockResolvedValue([row(TIPTAP_PAYLOAD)]);

    const res = await getPaginatedContactMessages(1, 6);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    const [item] = res.data.data;
    expect(item?.message).toBe(TIPTAP_PAYLOAD);
    expect(item).not.toHaveProperty('messageHtml');
  });
});
