import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';

import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Social preview card. Mirrors the site's own vocabulary rather than a generic
 * centred layout: the neutral greyscale palette, the fingerprint mark, a
 * left-aligned editorial block, and the same Cal Sans used for headings.
 */

/**
 * Satori cannot parse .woff2, so this points at the .ttf sitting beside it.
 *
 * `readFile`, not `fetch`: Turbopack resolves `import.meta.url` to a `file://`
 * URL, and Node's fetch rejects those outright ("not implemented... yet"), so
 * the documented webpack-era `fetch(new URL(...))` recipe silently yields no
 * font here. Read once per process rather than per request.
 */
const headingFont = readFile(
  new URL('../../assets/fonts/CalSans-SemiBold.ttf', import.meta.url)
).catch(() => null);

// Straight from the dark theme in globals.css, so the card and the site agree.
const BACKGROUND = '#0a0a0a'; // --background      0 0% 3.9%
const FOREGROUND = '#fafafa'; // --foreground      0 0% 98%
const MUTED = '#a3a3a3'; // --muted-foreground     0 0% 63.9%
const BORDER = '#262626'; // --border             0 0% 14.9%

const MAX_TITLE = 80;
const MAX_SUBTITLE = 90;

/** Keeps long titles inside 630px instead of pushing the footer off the card. */
function titleSize(length: number) {
  if (length <= 28) return 78;
  if (length <= 55) return 62;
  return 48;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title =
      searchParams.get('title')?.trim().slice(0, MAX_TITLE) || siteConfig.name;

    // Callers pass the page's own translated description; the site tagline is
    // only the fallback, so a Vietnamese page no longer gets an English footer.
    const rawSubtitle =
      searchParams.get('subtitle')?.trim() || siteConfig.description;
    const subtitle =
      rawSubtitle.length > MAX_SUBTITLE
        ? `${rawSubtitle.slice(0, MAX_SUBTITLE - 1).trimEnd()}…`
        : rawSubtitle;

    // A missing font degrades to the built-in sans rather than failing the card.
    const fontData = await headingFont;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: BACKGROUND,
            color: FOREGROUND,
            fontFamily: 'sans-serif',
            padding: 72,
          }}
        >
          {/* Identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke={FOREGROUND}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
              <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
              <path d="M2 12a10 10 0 0 1 18-6" />
              <path d="M2 16h.01" />
              <path d="M21.8 16c.2-2 .131-5.354 0-6" />
              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
              <path d="M8.65 22c.21-.66.45-1.32.57-2" />
              <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
            </svg>
            <div
              style={{
                fontSize: 20,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              {siteConfig.name}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontFamily: fontData ? 'Cal Sans' : 'sans-serif',
              fontSize: titleSize(title.length),
              lineHeight: 1.15,
              letterSpacing: -1,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          {/* Footer: hairline, then the author */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', height: 1, backgroundColor: BORDER }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* A background, not an <img>: border-radius clips a background
                  directly, while satori will not clip an oversized child with
                  `overflow: hidden`. The source is a 1200x900 landscape shot
                  with the subject at the left edge, so a centred crop would
                  frame the painting behind him — this window is x 0-430,
                  y 350-780 of the source, scaled by 64/430. */}
              <div
                style={{
                  display: 'flex',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundImage: `url(${host}/images/og/og.jpeg)`,
                  backgroundSize: '179px 134px',
                  backgroundPosition: '0px -52px',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: 24,
                  color: MUTED,
                  maxWidth: 940,
                }}
              >
                {subtitle}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontData
          ? [{ name: 'Cal Sans', data: fontData, style: 'normal', weight: 600 }]
          : undefined,
      }
    );
  } catch (error) {
    return new Response(
      `Failed to generate the image: ${getErrorMessage(error)}`,
      { status: 500 }
    );
  }
}
