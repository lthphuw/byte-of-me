'use client';

import { Analytics } from './analytics';
import { GoogleAnalytics } from './google-analytics';
import { SpeedInsights } from './speed-insight';

export const Integrations = () => (
  <>
    <Analytics />
    <SpeedInsights />
    <GoogleAnalytics />
  </>
);
