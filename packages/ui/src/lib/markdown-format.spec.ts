import { describe, expect, it } from 'bun:test';

import { formatMarkdown } from './markdown-format';

describe('formatMarkdown', () => {
  describe('whitespace', () => {
    it('collapses runs of blank lines to one', () => {
      expect(formatMarkdown('a\n\n\n\n\nb')).toBe('a\n\nb\n');
    });

    it('drops leading and trailing blank lines', () => {
      expect(formatMarkdown('\n\n\na\n\n\n')).toBe('a\n');
    });

    it('leaves an empty document empty rather than making it a newline', () => {
      expect(formatMarkdown('')).toBe('');
      expect(formatMarkdown('\n\n  \n')).toBe('');
    });

    it('ends the document with exactly one newline', () => {
      expect(formatMarkdown('a')).toBe('a\n');
      expect(formatMarkdown('a\n')).toBe('a\n');
    });

    it('expands leading tabs to the next four-column stop, not to four each', () => {
      // Continuation lines, not a fresh block: four columns of indent after a
      // BLANK line is an indented code block, which is passed through verbatim
      // (see the code suite below). `\t\t` is 8 columns; `  \t` only reaches 4.
      expect(formatMarkdown('a\n\t\tb')).toBe('a\n        b\n');
      expect(formatMarkdown('a\n  \tb')).toBe('a\n    b\n');
    });

    it('collapses interior runs of spaces and tabs', () => {
      expect(formatMarkdown('one    two\tthree')).toBe('one two three\n');
    });

    it('normalises CRLF', () => {
      expect(formatMarkdown('a\r\n\r\nb\r\n')).toBe('a\n\nb\n');
    });

    it('keeps a two-space hard break, which is load-bearing', () => {
      expect(formatMarkdown('line one  \nline two')).toBe('line one  \nline two\n');
      // More than two collapse TO two rather than being trimmed away.
      expect(formatMarkdown('line one     \nline two')).toBe('line one  \nline two\n');
      // One trailing space is not a break, so it goes.
      expect(formatMarkdown('line one \nline two')).toBe('line one\nline two\n');
    });
  });

  describe('headings', () => {
    it('inserts the missing space after the hashes', () => {
      expect(formatMarkdown('#Title')).toBe('# Title\n');
      expect(formatMarkdown('###Deep')).toBe('### Deep\n');
    });

    it('collapses extra space after the hashes', () => {
      expect(formatMarkdown('##    Title')).toBe('## Title\n');
    });

    it('strips a closing run of hashes', () => {
      expect(formatMarkdown('## Title ##')).toBe('## Title\n');
    });

    it('does not touch a seventh hash, which is not a heading', () => {
      expect(formatMarkdown('#######Title')).toBe('#######Title\n');
    });
  });

  describe('lists', () => {
    it('unifies bullet markers, which is what splits a pasted list in two', () => {
      expect(formatMarkdown('* one\n+ two\n- three')).toBe('- one\n- two\n- three\n');
    });

    it('collapses the space after a bullet marker', () => {
      expect(formatMarkdown('*   one')).toBe('- one\n');
    });

    it('keeps nesting indentation', () => {
      expect(formatMarkdown('* one\n  * nested')).toBe('- one\n  - nested\n');
    });

    it('leaves emphasis alone — a bullet needs a space after the marker', () => {
      expect(formatMarkdown('*emphasised* text')).toBe('*emphasised* text\n');
    });

    it('normalises the space after an ordered marker but never the number', () => {
      expect(formatMarkdown('1.   one\n1.  two\n1. three')).toBe(
        '1. one\n1. two\n1. three\n'
      );
      expect(formatMarkdown('3) three\n7) seven')).toBe('3) three\n7) seven\n');
    });
  });

  describe('thematic breaks', () => {
    it('unifies the markers when the line stands alone', () => {
      expect(formatMarkdown('a\n\n***\n\nb')).toBe('a\n\n---\n\nb\n');
      expect(formatMarkdown('a\n\n___\n\nb')).toBe('a\n\n---\n\nb\n');
      expect(formatMarkdown('a\n\n- - -\n\nb')).toBe('a\n\n---\n\nb\n');
    });

    it('leaves one directly under a paragraph alone, where `---` would be a heading', () => {
      // Rewriting this to `---` would promote "a" to an <h2>.
      expect(formatMarkdown('a\n***\nb')).toBe('a\n***\nb\n');
    });
  });

  describe('blockquotes', () => {
    it('inserts the missing space after the marker', () => {
      expect(formatMarkdown('>quoted')).toBe('> quoted\n');
    });

    it('spaces every level of a nested quote', () => {
      expect(formatMarkdown('>>deep')).toBe('> > deep\n');
    });

    it('tidies the quoted line too', () => {
      expect(formatMarkdown('>  *  item')).toBe('> - item\n');
    });

    it('leaves an empty quote line as a bare marker', () => {
      expect(formatMarkdown('> a\n>\n> b')).toBe('> a\n>\n> b\n');
    });
  });

  describe('tables', () => {
    it('pads the cells so the pipes line up', () => {
      expect(formatMarkdown('|a|bbbb|\n|-|-|\n|1|2|')).toBe(
        '| a   | bbbb |\n| --- | ---- |\n| 1   | 2    |\n'
      );
    });

    it('preserves column alignment', () => {
      expect(formatMarkdown('|a|b|c|\n|:-|-:|:-:|\n|1|2|3|')).toBe(
        '| a   | b   | c   |\n| :-- | --: | :-: |\n| 1   | 2   | 3   |\n'
      );
    });

    it('respects escaped pipes inside a cell', () => {
      expect(formatMarkdown('|a\\|b|c|\n|-|-|\n|1|2|')).toBe(
        '| a\\|b | c   |\n| ---- | --- |\n| 1    | 2   |\n'
      );
    });

    it('leaves a run of pipe lines alone when there is no delimiter row', () => {
      expect(formatMarkdown('|a|b|\n|c|d|')).toBe('|a|b|\n|c|d|\n');
    });

    it('leaves it alone when the delimiter row has the wrong number of cells', () => {
      expect(formatMarkdown('|a|b|\n|-|\n|1|2|')).toBe('|a|b|\n|-|\n|1|2|\n');
    });
  });

  describe('code', () => {
    it('leaves fenced content completely alone', () => {
      const source = '```js\nif (x)   {\n\ty = 1;\n}\n\n\n\nz();\n```';
      expect(formatMarkdown(source)).toBe(`${source}\n`);
    });

    it('trims the info string but keeps the fence', () => {
      expect(formatMarkdown('```  ts  \nx\n```')).toBe('```ts\nx\n```\n');
    });

    it('does not let a short fence close a long one', () => {
      const source = '````md\n```\ninner\n```\n````';
      expect(formatMarkdown(source)).toBe(`${source}\n`);
    });

    it('does not let a backtick fence close a tilde one', () => {
      const source = '~~~\n```\n~~~';
      expect(formatMarkdown(source)).toBe(`${source}\n`);
    });

    it('leaves an indented code block alone', () => {
      const source = 'text\n\n    const x =   1;\n    if (x)\t{}';
      expect(formatMarkdown(source)).toBe(`${source}\n`);
    });
  });

  describe('front matter', () => {
    it('passes YAML front matter through verbatim', () => {
      const source = '---\ntitle:   Something\ntags:\n  - a\n---\n\n#Body';
      expect(formatMarkdown(source)).toBe(
        '---\ntitle:   Something\ntags:\n  - a\n---\n\n# Body\n'
      );
    });

    it('only treats it as front matter at the very top', () => {
      expect(formatMarkdown('text\n\n---\n\nmore')).toBe('text\n\n---\n\nmore\n');
    });
  });

  it('is idempotent, which is what lets a caller detect "nothing to do"', () => {
    const messy = [
      '#Title',
      '',
      '',
      'Some   text\twith noise  ',
      '',
      '*  one',
      '+ two',
      '',
      '|a|b|',
      '|-|-|',
      '|1|2|',
      '',
      '```py',
      'x =   1',
      '```',
      '',
      '>quoted',
      '',
      '***',
    ].join('\n');

    const once = formatMarkdown(messy);
    expect(formatMarkdown(once)).toBe(once);
    expect(once).not.toBe(messy);
  });

  it('never drops a line that had content on it', () => {
    const source = [
      '#a',
      'b',
      '  c  ',
      '\td',
      '> e',
      '- f',
      '1. g',
      '|h|i|',
      '```',
      'j',
      '```',
    ].join('\n');

    const contentLines = (text: string) =>
      text.split('\n').filter((line) => line.trim() !== '').length;

    expect(contentLines(formatMarkdown(source))).toBe(contentLines(source));
  });
});
