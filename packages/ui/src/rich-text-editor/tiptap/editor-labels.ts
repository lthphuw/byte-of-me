/**
 * Every line of text the rich-text editor shows, supplied by the app.
 *
 * This package carries no copy of its own: the app translates each key in
 * `apps/web/messages` and passes the object in, the same way it passes
 * `uploadFailedText`. The comment beside each key is its English text, for the
 * translator.
 *
 * Keys are the list below; `EditorLabels` is derived from it, so a key cannot
 * be added to one and forgotten in the other.
 */
export const EDITOR_LABEL_KEYS = [
  // Writing surface and its tabs
  'defaultPlaceholder', // Write, type '/' for commands
  'markdownSource', // Markdown source
  'outlineTab', // Outline
  'referencesTab', // References
  'outlineEmpty', // Headings you add will show up here.

  // Toolbar
  'previewNotice', // Preview — exactly as visitors will see it
  'edit', // Edit
  'preview', // Preview
  'undo', // Undo
  'redo', // Redo
  'headings', // Headings
  'normal', // Normal
  'blockquote', // Blockquote
  'code', // Code
  'codeBlock', // Code Block
  'bold', // Bold
  'italic', // Italic
  'underline', // Underline
  'strikethrough', // Strikethrough
  'link', // Link
  'linkHint', // Attach a link to the selected text
  'confirm', // Confirm
  'update', // Update
  'remove', // Remove
  'cite', // Cite a reference
  'newReference', // New reference
  'insertCitation', // Insert citation
  'bulletList', // Bullet list
  'orderedList', // Ordered list
  'horizontalRule', // Horizontal Rule
  'insertTable', // Insert table
  'addRowBelow', // Add row below
  'addColumnRight', // Add column right
  'deleteRow', // Delete row
  'deleteColumn', // Delete column
  'toggleHeaderRow', // Toggle header row
  'deleteTable', // Delete table
  'textAlignment', // Text Alignment
  'alignLeft', // Left Align
  'alignCenter', // Center Align
  'alignRight', // Right Align
  'alignJustify', // Justify Align
  'image', // Image
  'textColorAndHighlight', // Text Color & Highlight
  'color', // Color
  'highlight', // Highlight
  'background', // Background
  'hardBreak', // Hard break
  'colorDefault', // Default
  'colorGray', // Gray
  'colorBrown', // Brown
  'colorOrange', // Orange
  'colorYellow', // Yellow
  'colorGreen', // Green
  'colorBlue', // Blue
  'colorPurple', // Purple
  'colorPink', // Pink
  'colorRed', // Red
  'searchAndReplace', // Search & Replace
  'searchAndReplaceTitle', // Search and replace
  'search', // Search
  'searchPlaceholder', // Search...
  'replace', // Replace
  'replaceWith', // Replace with
  'replacePlaceholder', // Replace...
  'matchCase', // Match case
  'replaceAll', // Replace All

  // Phone toolbar
  'formatting', // Formatting
  'insertImage', // Insert image
  'heading1', // Heading 1
  'heading2', // Heading 2
  'numberedList', // Numbered list
  'quote', // Quote
  'closeFormattingTools', // Close formatting tools
  'openFormattingTools', // Open formatting tools

  // Slash menu
  'basicBlocks', // Basic blocks
  'inline', // Inline
  'alignment', // Alignment
  'text', // Text
  'textDescription', // Just start writing with plain text
  'heading1Description', // Large section heading
  'heading2Description', // Medium section heading
  'heading3', // Heading 3
  'heading3Description', // Small section heading
  'bulletListDescription', // Create a simple bullet list
  'numberedListDescription', // Create an ordered list
  'codeBlockDescription', // Capture code snippets
  'imageDescription', // Insert one image, or several side by side
  'horizontalRuleDescription', // Add a horizontal divider
  'quoteDescription', // Capture a quotation
  'codeDescription', // Inline code snippet
  'blockquoteDescription', // Block quote
  'alignLeftDescription', // Align text to the left
  'alignCenterDescription', // Center align text
  'alignRightDescription', // Align text to the right
  'noResults', // No results found

  // Images
  'replaceImage', // Replace Image
  'imageUrl', // Image URL
  'useUrl', // Use URL
  'altText', // Alt text
  'altTextOptional', // Alt text (optional)
  'addCaption', // Add a caption
  'upload', // Upload
  'delete', // Delete
  'clickToUploadOrDrop', // Click to upload or drag and drop
  'addImage', // Add Image
  'enterImageUrl', // Enter image URL...
  'enterValidUrl', // Please enter a valid URL
  'imageFormats', // SVG, PNG, JPG or GIF
  'imageFormatsPickSeveral', // SVG, PNG, JPG or GIF — pick several for a row
  'rowCaption', // Caption for this row
  'addImageToRow', // Add an image to this row
  'deleteImageRow', // Delete this row

  // References
  'sectionHeading', // Section heading
  'addReference', // Add reference
  'insert', // Insert
  'insertCitationAtCursor', // Insert citation at cursor
  'editReference', // Edit reference
  'deleteReference', // Delete reference
  'deleteReferenceTitle', // Delete this reference?
  'renumberedReferences', // The remaining references will be renumbered.
  'referencesNumbering', // References are numbered by the order they are first cited, and render as a bibliography at the end of the article.
  'citedCountPrefix', // It is cited
  'citedTimeSingular', // time
  'citedTimePlural', // times
  'citedCountSuffix', // in the text. Those markers will be removed and the remaining references renumbered.
  'importBibtex', // Import BibTeX
  'entry', // entry
  'entries', // entries
  'skipped', // skipped
  'noTitle', // no title
  'updateBadge', // update
  'add', // Add
  'save', // Save
  'editInReferencesPanel', // Edit in References panel
  'noReferencesYet', // No references yet. Add one from the References panel.
  'noBibtexEntries', // No BibTeX entries found.
  'referenceDeleted', // Reference was deleted
  'untitled', // Untitled
  'authors', // Authors
  'source', // Source
  'year', // Year
  'title', // Title
  'url', // URL
  'close', // Close
  'cancel', // Cancel
] as const;

export type EditorLabelKey = (typeof EDITOR_LABEL_KEYS)[number];

export type EditorLabels = Record<EditorLabelKey, string>;

/**
 * What an extension's options hold before `createExtensions` configures them.
 * Every editor is built through `createExtensions`, which always sets `labels`,
 * so this blank object is never drawn.
 */
export const EMPTY_EDITOR_LABELS = Object.fromEntries(
  EDITOR_LABEL_KEYS.map((key) => [key, ''])
) as EditorLabels;
