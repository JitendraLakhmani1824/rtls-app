import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageContract } from '@testing/contracts';

import { AsyncStorageManager } from './AsyncStorageManager';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => AsyncStorage.clear());

storageContract('AsyncStorageManager', () => new AsyncStorageManager());

it('reads null instead of throwing when the phone’s storage fails', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
  await expect(new AsyncStorageManager().load('book')).resolves.toBeNull();
});

it('loses a failed save instead of throwing', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
  await expect(new AsyncStorageManager().save('book', 'x')).resolves.toBeUndefined();
});
