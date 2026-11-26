import type { Photos } from '@core/protocols';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

/**
 * Photos via expo-image-picker. The picked image is copied into the app's documents folder: the
 * picker's own file sits in a cache the phone may clear. Nothing is uploaded.
 */
export class ExpoPhotoManager implements Photos {
  async pick(from: 'library' | 'camera'): Promise<string | null> {
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return null;
      }
      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync(OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(OPTIONS);
      const picked = result.canceled ? undefined : result.assets[0];
      if (!picked) return null;
      const saved = new File(Paths.document, `photo-${Date.now()}.jpg`);
      await new File(picked.uri).copy(saved);
      return saved.uri;
    } catch {
      return null; // no camera (simulator), refused, or the copy failed: same as cancelling
    }
  }

  async remove(uri: string): Promise<void> {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Already gone, or not ours: nothing to do.
    }
  }
}
