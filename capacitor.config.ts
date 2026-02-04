import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.safetrack.location',
  appName: 'SafeTrack',
  webDir: 'dist',
  server: {
    url: 'https://0de824d6-e1b7-403b-bec2-f27ce62045f3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
