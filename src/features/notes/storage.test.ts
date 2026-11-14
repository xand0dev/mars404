import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../../contracts';
import { STORAGE_KEY, loadStoredAnnotations, saveStoredAnnotations } from './storage';

const a: Annotation = { id: 'a', kind: 'hazard', coordinates: [1, 2], radiusM: 20, text: 'rocks', createdAt: '2026-11-14T10:00:00.000Z', origin: 'this-eva' };

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('F1-AC6 · збереження в localStorage', () => {
  it('Given збережені мітки; When читаємо; Then ті самі мітки з тим самим origin', () => {
    saveStoredAnnotations([a]);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(loadStoredAnnotations()).toEqual([a]);
  });

  it('порожнє або зіпсоване сховище → []', () => {
    expect(loadStoredAnnotations()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadStoredAnnotations()).toEqual([]);
  });

  it('localStorage кидає (приватний режим) → без збереження, без помилки', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveStoredAnnotations([a])).not.toThrow();
    expect(loadStoredAnnotations()).toEqual([]);
  });
});
