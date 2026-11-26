import type { Storage } from '@core/protocols';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Text saved on the phone with AsyncStorage. Never throws: a failure reads as null or loses the save. */
export class AsyncStorageManager implements Storage {
  async load(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async save(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // The app keeps working from memory; the next change saves again.
    }
  }
}
