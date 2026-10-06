/**
 * `fetchGitHubProfile` adds the `email_verified` verdict GitHub's userinfo
 * lacks. The fetch is injected, so no network is touched.
 */
import { describe, expect, it } from 'bun:test';

import { fetchGitHubProfile } from './github-userinfo';

const context = {
  tokens: { access_token: 'token' },
  provider: { userinfo: { url: new URL('https://api.github.com/user') } },
};

type Emails = { email: string; primary: boolean; verified: boolean }[];

function fakeFetch(profile: object, emails: Emails | 'fail') {
  const urls: string[] = [];
  const impl = async (url: string) => {
    urls.push(url);

    if (url.endsWith('/emails')) {
      return emails === 'fail'
        ? new Response('nope', { status: 403 })
        : Response.json(emails);
    }
    return Response.json(profile);
  };

  return { impl, urls };
}

describe('fetchGitHubProfile', () => {
  it('marks a public email verified when GitHub lists it as verified', async () => {
    const { impl } = fakeFetch({ id: 1, login: 'a', email: 'Me@Example.com' }, [
      { email: 'me@example.com', primary: false, verified: true },
    ]);

    const profile = await fetchGitHubProfile(context, impl);

    expect(profile.email).toBe('Me@Example.com');
    expect(profile.email_verified).toBe(true);
  });

  it('falls back to the primary address when there is no public email', async () => {
    const { impl } = fakeFetch({ id: 1, login: 'a', email: null }, [
      { email: 'other@example.com', primary: false, verified: true },
      { email: 'main@example.com', primary: true, verified: true },
    ]);

    const profile = await fetchGitHubProfile(context, impl);

    expect(profile.email).toBe('main@example.com');
    expect(profile.email_verified).toBe(true);
  });

  it('reports an unverified primary address as unverified', async () => {
    const { impl } = fakeFetch({ id: 1, login: 'a', email: null }, [
      { email: 'owner@example.com', primary: true, verified: false },
      { email: 'mine@example.com', primary: false, verified: true },
    ]);

    const profile = await fetchGitHubProfile(context, impl);

    expect(profile.email).toBe('owner@example.com');
    expect(profile.email_verified).toBe(false);
  });

  it('is unverified when the address list cannot be read', async () => {
    const { impl } = fakeFetch(
      { id: 1, login: 'a', email: 'me@example.com' },
      'fail'
    );

    const profile = await fetchGitHubProfile(context, impl);

    expect(profile.email).toBe('me@example.com');
    expect(profile.email_verified).toBe(false);
  });

  it('reads the emails list next to the configured userinfo URL', async () => {
    const { impl, urls } = fakeFetch({ id: 1, login: 'a', email: null }, []);

    await fetchGitHubProfile(context, impl);

    expect(urls).toEqual([
      'https://api.github.com/user',
      'https://api.github.com/user/emails',
    ]);
  });

  it('fails the sign-in when the profile itself cannot be read', async () => {
    const impl = async () => new Response('', { status: 401 });

    await expect(fetchGitHubProfile(context, impl)).rejects.toThrow();
  });
});
