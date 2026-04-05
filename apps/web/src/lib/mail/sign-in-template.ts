export function signInTemplate({ url, host }: { url: string; host: string }) {
  const brandColor = '#0f172a';
  const accentColor = '#3b82f6';

  return `
<body style="background-color: #f8fafc; padding: 20px; font-family: -apple-system, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"
    style="max-width: 500px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="padding: 40px 20px; text-align: center;">
        <h1 style="color: ${brandColor}; margin: 0; font-size: 24px; letter-spacing: -0.025em;">${host}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 40px 40px 40px; text-align: center;">
        <p style="font-size: 16px; color: #475569; line-height: 24px;">
          Click the button below to sign in to your account. This link will expire in 24 hours.
        </p>
        <div style="margin-top: 30px;">
          <a href="${url}" target="_blank"
            style="background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Sign In to Dashboard
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
        If you did not request this email, you can safely ignore it.<br/>
        © ${new Date().getFullYear()} ${host}
      </td>
    </tr>
  </table>
</body>
  `;
}
