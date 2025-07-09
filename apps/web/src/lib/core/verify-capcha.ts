export async function verifyCaptcha(message: string, token: string) {
  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, token }),
    });

    const contentType = res.headers.get('Content-Type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      return { success: false, error: `Invalid response: ${text}` };
    }

    if (!res.ok) {
      return { success: false, error: data?.error || 'Server error' };
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Network error: ${message}` };
  }
}
