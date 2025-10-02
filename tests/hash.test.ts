/**
 * Tests unitarios para utilidades de hash
 */

import { generateRegistroHash } from '../src/utils/hash.js';

describe('Hash Utilities', () => {
  describe('generateRegistroHash', () => {
    it('should generate consistent MD5 hash for same inputs', () => {
      const fecha = '2025-10-02';
      const tcDof = 18.1234;

      const hash1 = generateRegistroHash(fecha, tcDof);
      const hash2 = generateRegistroHash(fecha, tcDof);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = generateRegistroHash('2025-10-02', 18.1234);
      const hash2 = generateRegistroHash('2025-10-03', 18.1234);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different tc_dof values', () => {
      const hash1 = generateRegistroHash('2025-10-02', 18.1234);
      const hash2 = generateRegistroHash('2025-10-02', 18.5678);

      expect(hash1).not.toBe(hash2);
    });
  });
});
