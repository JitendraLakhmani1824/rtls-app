import { storageContract } from '@testing/contracts';

import { MemoryStorage } from './MemoryStorage';

storageContract('MemoryStorage', () => new MemoryStorage());
