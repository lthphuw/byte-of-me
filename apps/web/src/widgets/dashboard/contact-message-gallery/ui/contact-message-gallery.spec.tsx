/**
 * The search input's markup matches between the server HTML and the client's
 * first render, and that HTML hydrates with no recoverable error. Only Prisma
 * is replaced, with an empty owner list.
 */
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { prisma } from '@byte-of-me/db';
import { makeQueryClient } from '@byte-of-me/query';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { ContactMessageGallery } from './contact-message-gallery';

const findMany = mock<(args: unknown) => Promise<unknown[]>>();
const count = mock<(args: unknown) => Promise<number>>();
const original = Object.getOwnPropertyDescriptor(prisma, 'contactMessage');
Object.defineProperty(prisma, 'contactMessage', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const { contactGallery } = en.dashboard;

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  count.mockReset().mockResolvedValue(0);
});

afterEach(cleanup);

afterAll(() => {
  if (original) Object.defineProperty(prisma, 'contactMessage', original);
  else Reflect.deleteProperty(prisma, 'contactMessage');
});

function gallery() {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <NextIntlClientProvider
        locale="en"
        messages={{ dashboard: en.dashboard }}
      >
        <ContactMessageGallery />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function searchInput(root: ParentNode) {
  const input = root.querySelector<HTMLInputElement>(
    `input[aria-label="${contactGallery.searchPlaceholder}"]`
  );
  if (!input) throw new Error('the search input is not rendered');
  return input;
}

function attributesOf(element: Element) {
  return Object.fromEntries(
    element
      .getAttributeNames()
      .map((name) => [name, element.getAttribute(name)])
  );
}

describe('ContactMessageGallery search input', () => {
  it('renders the same markup on the server and in the client first render', async () => {
    const server = document.createElement('div');
    server.innerHTML = renderToString(gallery());

    const { container } = render(gallery());
    const client = attributesOf(searchInput(container));

    expect(client).toEqual(attributesOf(searchInput(server)));
    expect(client).not.toHaveProperty('style');
    await waitFor(() =>
      expect(screen.getByText(contactGallery.noMessages)).toBeTruthy()
    );
  });

  it('hydrates the server HTML without a recoverable error', async () => {
    const host = document.createElement('div');
    host.innerHTML = renderToString(gallery());
    document.body.append(host);

    const errors: unknown[] = [];
    const roots: Root[] = [];
    act(() => {
      roots.push(
        hydrateRoot(host, gallery(), {
          onRecoverableError: (error) => errors.push(error),
        })
      );
    });

    await waitFor(() =>
      expect(screen.getByText(contactGallery.noMessages)).toBeTruthy()
    );
    expect(errors).toEqual([]);

    act(() => roots.forEach((root) => root.unmount()));
    host.remove();
  });
});
