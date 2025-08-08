// https://github.com/cloudflare/turnstile-demo-workers/blob/main/src/index.mjs

import { NextRequest, NextResponse } from 'next/server';

import { turnstileSecretKey } from '@/config/turnstile';





export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // Early check for missing CAPTCHA token
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing CAPTCHA token' },
        { status: 400 }
      );
    }

    // Get user IP (for abuse detection)
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      undefined;

    // Verify Turnstile token with Cloudflare
    const formData = new FormData();
    formData.append('secret', turnstileSecretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );

    const verifyResult = await verifyRes.json();

    if (verifyResult.success) {
      // CAPTCHA valid
      return NextResponse.json({
        success: true,
        message: 'Verified',
      });
    } else {
      // CAPTCHA failed
      return NextResponse.json(
        { success: false, error: 'Invalid CAPTCHA token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
