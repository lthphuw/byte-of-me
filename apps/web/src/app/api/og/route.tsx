import { ImageResponse } from 'next/og';

import { host } from '@/config/host';





export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title')?.slice(0, 100) || 'Byte of Me';

    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: '#000',
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            color: '#fff',
            padding: '60px 100px',
            textAlign: 'center',
          }}
        >
          <img
            src={`${host}/images/avatars/HaNoi2024.jpeg`}
            width={160}
            height={160}
            style={{ borderRadius: '50%', marginBottom: '40px' }}
            alt="Avatar"
          />
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
