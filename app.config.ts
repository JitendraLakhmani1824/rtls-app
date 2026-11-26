import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'RTLS',
  slug: 'rtls',
  owner: 'harrylakhmani',
  scheme: 'rtls',
  version: '0.2.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.rtls.casestudy',
    buildNumber: '2',
  },
  android: {
    package: 'com.rtls.casestudy',
    versionCode: 2,
    // No audio anywhere in the app.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    '@maplibre/maplibre-react-native',
    [
      'expo-image-picker',
      {
        photosPermission: 'RTLS uses a photo you pick as your profile picture.',
        cameraPermission: 'RTLS uses the camera to take your profile picture.',
        microphonePermission: false,
      },
    ],
  ],
  extra: {
    eas: { projectId: 'eb8cce8b-fe33-42d7-adf5-0a36dcb30fae' },
  },
};

export default config;
