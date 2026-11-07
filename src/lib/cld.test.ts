import { describe, expect, it } from 'vitest';
import { cld, cloudinaryPublicId } from './cld';

describe('cld', () => {
  it('applies f_auto, q_auto, w_<width>, c_limit to a Cloudinary URL', () => {
    expect(
      cld(
        'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloombypela_Plantain_Chips',
        600,
      ),
    ).toBe(
      'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_600,c_limit/Bloombypela_Plantain_Chips',
    );
  });

  it('keeps the folder path of an uploaded asset and drops the version segment', () => {
    expect(
      cld(
        'https://res.cloudinary.com/titznrnk/image/upload/v1793696881/bloom-by-pela/products/abc-123.webp',
        600,
      ),
    ).toBe(
      'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_600,c_limit/bloom-by-pela/products/abc-123.webp',
    );
  });

  it('keeps the folder path when a version and transformation are both present', () => {
    expect(
      cld(
        'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/v1793696881/bloom-by-pela/products/abc-123.jpg',
        300,
      ),
    ).toBe(
      'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_300,c_limit/bloom-by-pela/products/abc-123.jpg',
    );
  });

  it('does not treat an underscored public id as a transformation', () => {
    expect(
      cld('https://res.cloudinary.com/titznrnk/image/upload/Bloombypela_Skin_Glow', 400),
    ).toBe(
      'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto,w_400,c_limit/Bloombypela_Skin_Glow',
    );
  });

  it('leaves a non-Cloudinary URL unchanged', () => {
    const url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
    expect(cld(url, 600)).toBe(url);
  });

  it('returns an unparseable value unchanged', () => {
    expect(cld('not-a-url', 600)).toBe('not-a-url');
    expect(cld('', 600)).toBe('');
  });
});

describe('cloudinaryPublicId', () => {
  it('extracts the public id of a plain uploaded asset', () => {
    expect(
      cloudinaryPublicId(
        'https://res.cloudinary.com/titznrnk/image/upload/Bloombypela_Plantain_Chips',
      ),
    ).toBe('Bloombypela_Plantain_Chips');
  });

  it('extracts the folder path and drops the version segment', () => {
    expect(
      cloudinaryPublicId(
        'https://res.cloudinary.com/titznrnk/image/upload/v1793696881/bloom-by-pela/products/abc-123.webp',
      ),
    ).toBe('bloom-by-pela/products/abc-123.webp');
  });

  it('drops a leading transformation segment', () => {
    expect(
      cloudinaryPublicId(
        'https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/v1793696881/bloom-by-pela/products/abc-123.jpg',
      ),
    ).toBe('bloom-by-pela/products/abc-123.jpg');
  });

  it('returns null for a non-Cloudinary URL', () => {
    expect(
      cloudinaryPublicId(
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      ),
    ).toBeNull();
  });

  it('returns null for an unparseable value', () => {
    expect(cloudinaryPublicId('not-a-url')).toBeNull();
    expect(cloudinaryPublicId('')).toBeNull();
  });
});
