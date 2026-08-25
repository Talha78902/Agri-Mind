import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agrimind.app',
  appName: 'AgriMind',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://agri-mind-ten.vercel.app',
    cleartext: false,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#022c22',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#22c55e',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#022c22',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
