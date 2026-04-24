import { getTranslations } from 'next-intl/server';


type Props = {
  url: string;
  host: string;
};

export async function signInTemplate({ url, host }: Props) {
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
                  ${t('signIn.title')}
                </p>

                <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:22px;">
                  ${t('signIn.description')}
                </p>

                <a href="${url}" target="_blank"
                  style="display:inline-block;background:${accentColor};color:#ffffff;
                         padding:12px 20px;border-radius:8px;
                         text-decoration:none;font-weight:600;font-size:14px;">
                  ${t('signIn.button')}
                </a>

                <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
                  ${t('signIn.expire')}
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px;text-align:center;background:#f1f5f9;font-size:12px;color:#94a3b8;">
                ${t('signIn.ignore')}<br/>
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
