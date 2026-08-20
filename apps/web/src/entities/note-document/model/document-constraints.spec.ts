/**
 * The rules an attachment has to satisfy, checked here as pure functions
 * because both call sites depend on them agreeing: the drop zone answers the
 * author instantly, the server action is the guarantee. A drift between the
 * two shows up as a file the UI accepted and the server refused, which reads
 * as a bug in the upload rather than in a constant.
 */
import { describe, expect, it } from 'bun:test';

import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  describeDocumentViolation,
  documentFilesFrom,
  findDocumentViolation,
  isAcceptedDocument,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_MB,
  noteDocumentHref,
} from './document-constraints';

/** A file of exactly `size` bytes, so the boundary can be probed. */
function fileOf(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('findDocumentViolation', () => {
  it('accepts a PDF at the ceiling', () => {
    const file = fileOf('paper.pdf', 'application/pdf', MAX_DOCUMENT_SIZE_BYTES);

    // The ceiling is inclusive: `>` not `>=`, so a file of exactly 5 MB is
    // fine. The off-by-one matters — a PDF that is precisely at the limit is
    // the one an author retries after being told to shrink it.
    expect(findDocumentViolation(file)).toBeNull();
  });

  it('rejects one byte over the ceiling, naming the file and the limit', () => {
    const file = fileOf(
      'huge.pdf',
      'application/pdf',
      MAX_DOCUMENT_SIZE_BYTES + 1
    );

    expect(findDocumentViolation(file)).toEqual({
      kind: 'size',
      fileName: 'huge.pdf',
      maxSizeMb: MAX_DOCUMENT_SIZE_MB,
    });
  });

  it('rejects anything that is not a PDF', () => {
    const file = fileOf('slides.pptx', 'application/vnd.ms-powerpoint', 10);

    expect(findDocumentViolation(file)).toEqual({
      kind: 'type',
      fileName: 'slides.pptx',
    });
  });

  // Being told to shrink a file that would be refused at any size is worse
  // than useless — the author needs the fact they can act on.
  it('reports the type before the size when a file breaks both rules', () => {
    const file = fileOf('huge.docx', 'text/plain', MAX_DOCUMENT_SIZE_BYTES + 1);

    expect(findDocumentViolation(file)?.kind).toBe('type');
  });

  // A PDF renamed `.txt` is still a PDF, and a `.pdf` that is really an HTML
  // page is still HTML. The type is what the browser reports; the extension
  // is author-supplied text nothing consulted.
  it('goes by the MIME type, not the extension', () => {
    expect(
      findDocumentViolation(fileOf('report.txt', 'application/pdf', 10))
    ).toBeNull();
    expect(
      findDocumentViolation(fileOf('report.pdf', 'text/html', 10))?.kind
    ).toBe('type');
  });
});

describe('isAcceptedDocument', () => {
  it('accepts exactly the declared list', () => {
    for (const mimeType of ACCEPTED_DOCUMENT_MIME_TYPES) {
      expect(isAcceptedDocument(mimeType)).toBe(true);
    }

    expect(isAcceptedDocument('image/png')).toBe(false);
    expect(isAcceptedDocument('')).toBe(false);
  });
});

describe('describeDocumentViolation', () => {
  // This string is what a caller with no locale shows the author, so it has to
  // carry the two facts they need: which file, and what was wrong with it.
  it('names the file, and the limit for a size violation', () => {
    const size = describeDocumentViolation({
      kind: 'size',
      fileName: 'huge.pdf',
      maxSizeMb: MAX_DOCUMENT_SIZE_MB,
    });
    expect(size).toContain('huge.pdf');
    expect(size).toContain(String(MAX_DOCUMENT_SIZE_MB));

    expect(
      describeDocumentViolation({ kind: 'type', fileName: 'slides.pptx' })
    ).toContain('slides.pptx');
  });
});

describe('noteDocumentHref', () => {
  // The ONLY address an attachment has. If this ever drifts from the route
  // handler's path the viewer 404s with nothing else to go on.
  it('points at the session-checked route, not at a bucket', () => {
    expect(noteDocumentHref('doc-1')).toBe('/api/notes/documents/doc-1');
  });
});

describe('documentFilesFrom', () => {
  it('keeps the PDFs of a mixed drop and drops the rest', () => {
    const pdf = fileOf('paper.pdf', 'application/pdf', 10);
    const image = fileOf('shot.png', 'image/png', 10);

    expect(documentFilesFrom([image, pdf])).toEqual([pdf]);
  });

  // The drop handler asks this before deciding whether to claim the event, so
  // an empty answer has to be an empty array rather than a throw: a `dragover`
  // with no files at all is the common case, not an error.
  it('answers with an empty array for nothing, null and undefined', () => {
    expect(documentFilesFrom([])).toEqual([]);
    expect(documentFilesFrom(null)).toEqual([]);
    expect(documentFilesFrom(undefined)).toEqual([]);
  });
});
