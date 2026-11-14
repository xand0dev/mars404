// Перший візит: коротка підказка «що тут робити» (UX). Стан — лише localStorage, як glove mode; store не змінюється.
export const ONBOARDED_KEY = 'mars404.onboarded';

/** Сховище недоступне (приватне вікно) — показуємо підказку щоразу, це не ламає роботу. */
export function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // не зберегли — підказка з'явиться знову після перезавантаження
  }
}
