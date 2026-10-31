import { describe, expect, it } from 'vitest';
import { cld } from './cld';

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

  it('leaves a non-Cloudinary URL unchanged', () => {
    const url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
    expect(cld(url, 600)).toBe(url);
  });

  it('returns an unparseable value unchanged', () => {
    expect(cld('not-a-url', 600)).toBe('not-a-url');
    expect(cld('', 600)).toBe('');
  });
});
