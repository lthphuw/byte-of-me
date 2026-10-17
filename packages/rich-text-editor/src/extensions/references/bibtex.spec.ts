import { describe, expect, it } from 'bun:test';

import { parseBibtex } from './bibtex';

const FASTER_RCNN = `@article{faster-rcnn,
  title   = {Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks},
  author  = {Shaoqing Ren and Kaiming He and Ross Girshick and Jian Sun},
  journal = {arXiv preprint arXiv:1506.01497},
  year    = {2015},
  url     = {https://arxiv.org/abs/1506.01497},
  file    = {papers/faster-rcnn_1506.01497.pdf}
}`;

describe('parseBibtex', () => {
  describe('the whole entry', () => {
    it('reads every mapped field off a real entry', () => {
      const { entries, skipped } = parseBibtex(FASTER_RCNN);

      expect(skipped).toEqual([]);
      expect(entries).toEqual([
        {
          id: 'faster-rcnn',
          title:
            'Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks',
          authors: 'Shaoqing Ren, Kaiming He, Ross Girshick, Jian Sun',
          source: 'arXiv preprint arXiv:1506.01497',
          year: '2015',
          url: 'https://arxiv.org/abs/1506.01497',
        },
      ]);
    });

    it('ignores fields the bibliography has no room for', () => {
      // `file` points at a local PDF that means nothing to a reader.
      const [entry] = parseBibtex(FASTER_RCNN).entries;
      expect(JSON.stringify(entry)).not.toContain('papers/');
    });

    it('reads several entries out of one paste', () => {
      const { entries } = parseBibtex(`
        @inproceedings{a, title = {First}, year = {2020} }
        @book{b, title = {Second}, year = {2021} }
      `);

      expect(entries.map((entry) => entry.title)).toEqual(['First', 'Second']);
    });
  });

  describe('value syntax', () => {
    it('keeps braces that are balanced inside a value', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {Faster R-CNN: {ImageNet} results}}'
      );
      expect(entries[0].title).toBe('Faster R-CNN: ImageNet results');
    });

    it('accepts quoted values', () => {
      const { entries } = parseBibtex('@misc{k, title = "A quoted title"}');
      expect(entries[0].title).toBe('A quoted title');
    });

    it('accepts bare numeric values', () => {
      const { entries } = parseBibtex('@misc{k, title = {T}, year = 2015}');
      expect(entries[0].year).toBe('2015');
    });

    it('does not care about field-name case or spacing', () => {
      const { entries } = parseBibtex('@MISC{k,TITLE={T},  Year   =  {1999}}');
      expect(entries[0]).toMatchObject({ title: 'T', year: '1999' });
    });

    it('survives a trailing comma after the last field', () => {
      const { entries } = parseBibtex('@misc{k, title = {T}, year = {2015},}');
      expect(entries[0].year).toBe('2015');
    });

    it('reads a value that spans several lines', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {One\n    two\n    three}}'
      );
      expect(entries[0].title).toBe('One two three');
    });
  });

  describe('authors', () => {
    it('joins the ` and ` list with commas', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {T}, author = {Ada Lovelace and Alan Turing}}'
      );
      expect(entries[0].authors).toBe('Ada Lovelace, Alan Turing');
    });

    it('flips "Last, First" round', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {T}, author = {Ren, Shaoqing and He, Kaiming}}'
      );
      expect(entries[0].authors).toBe('Shaoqing Ren, Kaiming He');
    });

    it('keeps `and others` readable as et al.', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {T}, author = {Ada Lovelace and others}}'
      );
      expect(entries[0].authors).toBe('Ada Lovelace, et al.');
    });

    it('falls back to the editor when there is no author', () => {
      const { entries } = parseBibtex(
        '@book{k, title = {T}, editor = {Ada Lovelace}}'
      );
      expect(entries[0].authors).toBe('Ada Lovelace');
    });

    it('does not split a name that merely contains the word "and"', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {T}, author = {Anderson, Grand}}'
      );
      expect(entries[0].authors).toBe('Grand Anderson');
    });
  });

  describe('source', () => {
    it('prefers journal', () => {
      const { entries } = parseBibtex(
        '@article{k, title = {T}, journal = {Nature}, publisher = {NPG}}'
      );
      expect(entries[0].source).toBe('Nature');
    });

    it('falls back down the chain to booktitle, then publisher', () => {
      expect(
        parseBibtex('@x{k, title={T}, booktitle={NeurIPS}, publisher={MIT}}')
          .entries[0].source
      ).toBe('NeurIPS');
      expect(
        parseBibtex('@x{k, title={T}, publisher={MIT Press}}').entries[0].source
      ).toBe('MIT Press');
    });
  });

  describe('url', () => {
    it('prefers an explicit url', () => {
      const { entries } = parseBibtex(
        '@misc{k, title={T}, url={https://a.test}, doi={10.1/xyz}}'
      );
      expect(entries[0].url).toBe('https://a.test');
    });

    it('builds one from a doi', () => {
      const { entries } = parseBibtex('@misc{k, title={T}, doi={10.1/xyz}}');
      expect(entries[0].url).toBe('https://doi.org/10.1/xyz');
    });

    it('does not double the prefix on a doi that is already a url', () => {
      const { entries } = parseBibtex(
        '@misc{k, title={T}, doi={https://doi.org/10.1/xyz}}'
      );
      expect(entries[0].url).toBe('https://doi.org/10.1/xyz');
    });

    it('builds one from an arXiv eprint', () => {
      const { entries } = parseBibtex(
        '@misc{k, title={T}, archivePrefix={arXiv}, eprint={1506.01497}}'
      );
      expect(entries[0].url).toBe('https://arxiv.org/abs/1506.01497');
    });

    it('refuses a url whose scheme a link must never carry', () => {
      // The sanitizer would strip it at render time; dropping it here means
      // the author never sees a field that silently does nothing.
      const { entries } = parseBibtex(
        '@misc{k, title={T}, url={javascript:alert(1)}}'
      );
      expect(entries[0].url).toBeUndefined();
    });
  });

  describe('year', () => {
    it('takes the year out of a `date` field when `year` is absent', () => {
      const { entries } = parseBibtex('@misc{k, title={T}, date={2019-04-11}}');
      expect(entries[0].year).toBe('2019');
    });
  });

  describe('LaTeX in values', () => {
    it('resolves accents written as commands', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {Erd{\\H{o}}s and Schr{\\"o}dinger}}'
      );
      expect(entries[0].title).toBe('Erdős and Schrödinger');
    });

    it('unescapes the characters BibTeX requires escaping', () => {
      const { entries } = parseBibtex(
        '@misc{k, title = {Cats \\& dogs, 100\\% of \\$5}}'
      );
      expect(entries[0].title).toBe('Cats & dogs, 100% of $5');
    });

    it('turns the dash ligatures into real dashes', () => {
      const { entries } = parseBibtex('@misc{k, title = {2015--2026}}');
      expect(entries[0].title).toBe('2015–2026');
    });
  });

  describe('the citation key', () => {
    it('becomes the reference id, so anchors read as the key', () => {
      expect(parseBibtex(FASTER_RCNN).entries[0].id).toBe('faster-rcnn');
    });

    it('strips characters that cannot sit in a url fragment', () => {
      const { entries } = parseBibtex('@misc{Ren:2015/faster rcnn, title={T}}');
      expect(entries[0].id).toBe('Ren-2015-faster-rcnn');
    });

    it('generates an id when the key is missing or unusable', () => {
      const { entries } = parseBibtex('@misc{, title={T}}');
      expect(entries[0].id).toMatch(/^r[a-z0-9]+$/);
    });

    it('keeps ids unique when two entries reduce to the same key', () => {
      const { entries } = parseBibtex(
        '@misc{a:b, title={First}} @misc{a/b, title={Second}}'
      );
      expect(entries[0].id).toBe('a-b');
      expect(entries[1].id).toBe('a-b-2');
    });
  });

  describe('what it refuses', () => {
    it('skips an entry with no title, and says why', () => {
      const { entries, skipped } = parseBibtex(
        '@misc{nope, year={2020}} @misc{ok, title={T}}'
      );
      expect(entries).toHaveLength(1);
      expect(skipped).toEqual([{ key: 'nope', reason: 'no title' }]);
    });

    it('returns nothing for text that is not BibTeX at all', () => {
      const { entries, skipped } = parseBibtex('just some prose');
      expect(entries).toEqual([]);
      expect(skipped).toEqual([]);
    });

    it('returns nothing for an empty paste', () => {
      expect(parseBibtex('   ')).toEqual({ entries: [], skipped: [] });
    });

    it('reads the entries it can out of a truncated paste', () => {
      const { entries } = parseBibtex(
        '@misc{a, title={First}} @misc{b, title={Second'
      );
      expect(entries.map((entry) => entry.title)).toEqual(['First', 'Second']);
    });

    it('ignores @comment and @string preambles', () => {
      const { entries } = parseBibtex(
        '@comment{ignore me} @string{acm = {ACM}} @misc{a, title={T}}'
      );
      expect(entries.map((entry) => entry.id)).toEqual(['a']);
    });
  });
});
