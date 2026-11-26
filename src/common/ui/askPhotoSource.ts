import { Alert } from 'react-native';

export type PhotoChoice = 'library' | 'camera' | 'remove';

/** The native "Profile photo" sheet: library, camera, and remove when there is one. Null = cancelled. */
export function askPhotoSource(hasPhoto: boolean): Promise<PhotoChoice | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Profile photo',
      'Friends see it on the map and in their lists.',
      [
        { text: 'Choose from library', onPress: () => resolve('library') },
        { text: 'Take photo', onPress: () => resolve('camera') },
        ...(hasPhoto
          ? [
              {
                text: 'Remove photo',
                style: 'destructive' as const,
                onPress: () => resolve('remove'),
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
