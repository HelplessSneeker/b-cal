import {
  composeSyntheticId,
  isSyntheticId,
  parseSyntheticId,
} from './occurrence-id';

describe('occurrence-id', () => {
  const parentId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const originalDate = new Date('2026-03-15T10:00:00.000Z');

  describe('composeSyntheticId', () => {
    it('should create a synthetic ID from parent ID and date', () => {
      const result = composeSyntheticId(parentId, originalDate);
      expect(result).toBe(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890:2026-03-15T10:00:00.000Z',
      );
    });
  });

  describe('isSyntheticId', () => {
    it('should return true for synthetic IDs', () => {
      const syntheticId = composeSyntheticId(parentId, originalDate);
      expect(isSyntheticId(syntheticId)).toBe(true);
    });

    it('should return false for regular UUIDs', () => {
      expect(isSyntheticId(parentId)).toBe(false);
    });

    it('should return false for short strings', () => {
      expect(isSyntheticId('short')).toBe(false);
    });

    it('should return false when char at index 36 is not a colon', () => {
      expect(isSyntheticId(parentId + '-extra')).toBe(false);
    });
  });

  describe('parseSyntheticId', () => {
    it('should parse a valid synthetic ID', () => {
      const syntheticId = composeSyntheticId(parentId, originalDate);
      const result = parseSyntheticId(syntheticId);
      expect(result).toEqual({
        parentId,
        originalDate,
      });
    });

    it('should return null for regular UUIDs', () => {
      expect(parseSyntheticId(parentId)).toBeNull();
    });

    it('should return null for invalid date in synthetic ID', () => {
      const invalidId = parentId + ':not-a-date';
      expect(parseSyntheticId(invalidId)).toBeNull();
    });
  });
});
