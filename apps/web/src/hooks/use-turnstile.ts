// hooks/use-turnstile.ts
import { useEffect, useRef, useState } from 'react';

import {
  turnstileScriptURL,
  turnstileSitekey,
} from '@/config/turnstile/turnstile-client';
import { toast } from '@/components/ui/use-toast';

interface UseTurnstileProps {
  onVerify: (token: string) => void;
}

export function useTurnstile({ onVerify }: UseTurnstileProps) {
  const [ready, setReady] = useState(false);
  const captchaRef = useRef<HTMLDivElement>(null);

  // Load script once
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      document.querySelector(`script[src="${turnstileScriptURL}"]`)
    )
      return;

    const script = document.createElement('script');
    script.src = turnstileScriptURL;
    script.async = true;
    script.defer = true;
    script.onerror = () => toast({ title: 'Failed to load Turnstile script' });
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Turnstile ready callback
  useEffect(() => {
    window.onTurnstileLoad = () => setReady(true);
  }, []);

  // Render widget
  useEffect(() => {
    if (!ready || !captchaRef.current) return;

    captchaRef.current.innerHTML = '';

    try {
      window.turnstile?.render(captchaRef.current, {
        sitekey: turnstileSitekey,
        callback: (token: string) => {
          setTimeout(() => onVerify(token), 1500);
        },
        'error-callback': () => {
          toast({ title: 'CAPTCHA failed to load. Please refresh the page.' });
        },
        theme: 'auto',
      });
    } catch (err) {
      toast({ title: 'Error rendering CAPTCHA: ' + err });
    }
  }, [ready]);

  return { captchaRef, ready };
}
