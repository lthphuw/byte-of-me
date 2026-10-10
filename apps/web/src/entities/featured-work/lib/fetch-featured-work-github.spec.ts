import { describe, expect, it, mock } from 'bun:test';

import { fetchFeaturedWorkGithub } from './fetch-featured-work-github';

const refs = [
  { owner: 'roboflow', repo: 'rf-detr', number: 512 },
  { owner: 'a', repo: 'b', number: 7 },
];

function respond(body: unknown, init?: ResponseInit) {
  return mock(
    async () => new Response(JSON.stringify(body), init)
  ) as unknown as typeof fetch;
}

describe('fetchFeaturedWorkGithub', () => {
  it('makes no request for an empty batch', async () => {
    const fetchImpl = mock() as unknown as typeof fetch;

    expect(await fetchFeaturedWorkGithub([], 'token', fetchImpl)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts one authenticated query and maps the aliases back to the refs', async () => {
    const fetchImpl = respond({
      data: {
        pr0: {
          nameWithOwner: 'roboflow/rf-detr',
          stargazerCount: 4200,
          pullRequest: { number: 512 },
        },
        pr1: {
          nameWithOwner: 'a/b',
          stargazerCount: 3,
          pullRequest: { number: 7 },
        },
      },
    });

    const out = await fetchFeaturedWorkGithub(refs, 'secret', fetchImpl);

    expect(out).toEqual([
      { repo: 'roboflow/rf-detr', stars: 4200 },
      { repo: 'a/b', stars: 3 },
    ]);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof mock>).mock
      .calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/graphql');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer secret'
    );
    expect(JSON.parse(init.body as string).variables).toMatchObject({
      o0: 'roboflow',
      p1: 7,
    });
  });

  it('keeps the resolved aliases when GitHub reports errors for the others', async () => {
    const fetchImpl = respond({
      data: {
        pr0: {
          nameWithOwner: 'roboflow/rf-detr',
          stargazerCount: 10,
          pullRequest: { number: 512 },
        },
        pr1: null,
      },
      errors: [
        { message: "Could not resolve to a Repository with the name 'a/b'." },
      ],
    });

    expect(await fetchFeaturedWorkGithub(refs, 'token', fetchImpl)).toEqual([
      { repo: 'roboflow/rf-detr', stars: 10 },
      null,
    ]);
  });

  it('throws when the response has errors and no data', async () => {
    const fetchImpl = respond({ errors: [{ message: 'Bad credentials' }] });

    await expect(
      fetchFeaturedWorkGithub(refs, 'token', fetchImpl)
    ).rejects.toThrow('Bad credentials');
  });

  it('throws on a non-OK status', async () => {
    const fetchImpl = respond({}, { status: 502 });

    await expect(
      fetchFeaturedWorkGithub(refs, 'token', fetchImpl)
    ).rejects.toThrow('502');
  });
});
