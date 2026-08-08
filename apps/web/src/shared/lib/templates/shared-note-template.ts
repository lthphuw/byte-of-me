import { getTranslations } from 'next-intl/server';

type Props = {
  url: string;
  host: string;
  /** The owner's display name, as the invitation attributes the share. */
  owner: string;
  /** The shared note's title. */
  title: string;
};

/**
 * The invitation a share recipient receives.
 *
 * Shares `sign-in-template.ts`'s table shell rather than importing from it:
 * these are HTML email bodies, where the markup IS the layout and every
 * client renders it differently, so a shared partial would have to be
 * parameterised down to the cell. The two are kept side by side so a change to
 * one is visible next to the other.
 *
 * The title is interpolated into the body deliberately — a recipient who
 * cannot tell which note they were given has to open every invitation to find
 * out. It is the owner's own note title, shown to the person the owner chose.
 */
export async function sharedNoteTemplate({ url, host, owner, title }: Props) {
  const t = await getTranslations('email');

  const brandColor = '#0f172a';
  const accentColor = '#3b82f6';

  return `
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="padding:32px 24px;text-align:center;border-bottom:1px solid #f1f5f9;">
                <h1 style="margin:0;font-size:22px;color:${brandColor};letter-spacing:-0.02em;">
                  ${host}
                </h1>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:32px 28px;text-align:center;">
                <p style="margin:0 0 16px;font-size:16px;color:#334155;font-weight:500;">
                  ${t('sharedNote.title')}
                </p>

                <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:22px;">
                  ${t('sharedNote.description', { owner, title })}
                </p>

                <a href="${url}" target="_blank"
                  style="display:inline-block;background:${accentColor};color:#ffffff;
                         padding:12px 20px;border-radius:8px;
                         text-decoration:none;font-weight:600;font-size:14px;">
                  ${t('sharedNote.button')}
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px;text-align:center;background:#f1f5f9;font-size:12px;color:#94a3b8;">
                ${t('sharedNote.ignore')}<br/>
                © ${new Date().getFullYear()} ${host}
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  `;
}
