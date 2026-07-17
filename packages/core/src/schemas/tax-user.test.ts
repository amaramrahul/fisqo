import { describe, expect, it } from 'vitest';
import { createTaxUserSchema, toTaxUserDto } from './tax-user.js';

describe('createTaxUserSchema', () => {
  it('accepts a well-formed PAN and DOB', () => {
    const result = createTaxUserSchema.parse({ pan: 'ABCDE1234F', dob: '1985-03-15' });
    expect(result).toEqual({ pan: 'ABCDE1234F', dob: '1985-03-15' });
  });

  it('canonicalises PAN to uppercase and trims surrounding whitespace', () => {
    const result = createTaxUserSchema.parse({ pan: '  abcde1234f  ', dob: '1985-03-15' });
    expect(result.pan).toBe('ABCDE1234F');
  });

  it.each([
    ['too short', 'ABCDE1234'],
    ['digits in the letter positions', '12345ABCDE'],
    ['trailing digit instead of a letter', 'ABCDE12345'],
    ['empty', ''],
  ])('rejects a PAN that is %s', (_label, pan) => {
    expect(() => createTaxUserSchema.parse({ pan, dob: '1985-03-15' })).toThrow();
  });

  it.each([
    ['DD/MM/YYYY rather than ISO', '15/03/1985'],
    ['a datetime rather than a calendar date', '1985-03-15T00:00:00Z'],
    ['a day that does not exist', '2025-02-30'],
    ['a month that does not exist', '2025-13-01'],
  ])('rejects a DOB that is %s', (_label, dob) => {
    expect(() => createTaxUserSchema.parse({ pan: 'ABCDE1234F', dob })).toThrow();
  });

  it('requires DOB to be present', () => {
    expect(() => createTaxUserSchema.parse({ pan: 'ABCDE1234F' })).toThrow();
  });
});

describe('toTaxUserDto', () => {
  it('serialises timestamps to ISO strings and leaves dob untouched', () => {
    const dto = toTaxUserDto({
      id: '11111111-1111-4111-8111-111111111111',
      pan: 'ABCDE1234F',
      dob: '1985-03-15',
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      updatedAt: new Date('2026-01-02T03:04:05.000Z'),
    });

    expect(dto).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      pan: 'ABCDE1234F',
      dob: '1985-03-15',
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-01-02T03:04:05.000Z',
    });
  });
});
