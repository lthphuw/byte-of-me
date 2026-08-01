import { describe, expect, it } from 'bun:test';

import { escapeHtml, sanitizeHtml } from './sanitize';

describe('escapeHtml', () => {
  it('escapes every character that can break out of an HTML context', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;'
    );
  });

  it('escapes the ampersand first so entities are not double-broken', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('sanitizeHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('keeps allowlisted tags and their allowlisted attributes', () => {
    expect(sanitizeHtml('<p class="x">hi</p>')).toBe('<p class="x">hi</p>');
    expect(sanitizeHtml('<a href="https://a.test">l</a>')).toBe(
      '<a href="https://a.test">l</a>'
    );
  });

  it('drops non-allowlisted tags but keeps their text', () => {
    expect(sanitizeHtml('<marquee>text</marquee>')).toBe('text');
  });

  it('self-closes void tags', () => {
    expect(sanitizeHtml('<br>')).toBe('<br />');
    expect(sanitizeHtml('<img src="a.png">')).toBe('<img src="a.png" />');
  });

  describe('script execution vectors', () => {
    it('removes script blocks with their contents', () => {
      expect(sanitizeHtml('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>');
    });

    it('removes style, iframe, object, embed and noscript blocks', () => {
      for (const tag of ['style', 'iframe', 'object', 'embed', 'noscript']) {
        expect(sanitizeHtml(`<${tag}>payload</${tag}>`)).toBe('');
      }
    });

    it('neutralizes an unclosed script tag', () => {
      // The block regex needs a closing tag, so this falls through to the
      // tag rebuild, which drops it because `script` is not allowlisted.
      expect(sanitizeHtml('<script>alert(1)')).toBe('alert(1)');
    });

    it('drops every event handler attribute', () => {
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe(
        '<img src="x" />'
      );
      expect(sanitizeHtml('<p onclick="alert(1)">a</p>')).toBe('<p>a</p>');
      // Separator tricks that defeat strip-based sanitizers.
      expect(sanitizeHtml('<img src="x"onerror="alert(1)">')).toBe(
        '<img src="x" />'
      );
      expect(sanitizeHtml('<img src="x"\n\tonerror = "alert(1)">')).toBe(
        '<img src="x" />'
      );
    });

    it('drops inline styles', () => {
      expect(sanitizeHtml('<p style="x:expression(alert(1))">a</p>')).toBe(
        '<p>a</p>'
      );
    });

    it('does not treat a mangled opening bracket as a tag', () => {
      // The leftover `>` is inert text: what matters is that no `<` survives
      // to open an element.
      const out = sanitizeHtml('<<script>script>alert(1)');
      expect(out).not.toContain('<');
      expect(out).toBe('script>alert(1)');
    });
  });

  describe('dangerous URL schemes', () => {
    it('neutralizes javascript:, data: and vbscript: hrefs', () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
        '<a href="#">x</a>'
      );
      expect(sanitizeHtml('<a href="data:text/html,<b>">x</a>')).toContain(
        'href="#"'
      );
      expect(sanitizeHtml('<a href="vbscript:msgbox">x</a>')).toBe(
        '<a href="#">x</a>'
      );
    });

    it('ignores case and leading whitespace in the scheme', () => {
      expect(sanitizeHtml('<a href="  JaVaScRiPt:alert(1)">x</a>')).toBe(
        '<a href="#">x</a>'
      );
    });

    it('neutralizes a dangerous scheme hidden behind an HTML entity', () => {
      // A browser decodes attribute-value entities before resolving the URL,
      // so `&#106;avascript:` is executable javascript: once parsed.
      expect(sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe(
        '<a href="#">x</a>'
      );
      expect(sanitizeHtml('<a href="&#x6A;avascript:alert(1)">x</a>')).toBe(
        '<a href="#">x</a>'
      );
    });

    it('neutralizes a scheme broken up by control characters', () => {
      // Browsers strip tabs/newlines inside the scheme before resolving it.
      expect(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>')).toBe(
        '<a href="#">x</a>'
      );
      expect(sanitizeHtml('<a href="java&#09;script:alert(1)">x</a>')).toBe(
        '<a href="#">x</a>'
      );
    });

    it('leaves safe URLs alone', () => {
      for (const url of [
        'https://a.test/p?q=1',
        'http://a.test',
        'mailto:a@b.test',
        '/relative/path',
        '#anchor',
      ]) {
        expect(sanitizeHtml(`<a href="${url}">x</a>`)).toBe(
          `<a href="${url}">x</a>`
        );
      }
    });
  });

  it('escapes quotes inside a kept attribute value', () => {
    expect(sanitizeHtml('<p title=\'a"b\'>x</p>')).toBe(
      '<p title="a&quot;b">x</p>'
    );
  });
});
