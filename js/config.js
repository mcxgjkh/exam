// config.js
export const VERSION = '3.12.10.20260623_beta.1';

export const EXAM_STANDARDS = {
  A: { total: 40, time: 40, pass: 30 },
  B: { total: 60, time: 60, pass: 45 },
  C: { total: 90, time: 90, pass: 70 }
};

export const STORAGE_KEYS = {
  WRONG: {
    A: 'ham_wrong_A',
    B: 'ham_wrong_B',
    C: 'ham_wrong_C'
  },
  FAVORITE: {
    A: 'ham_favorite_A',
    B: 'ham_favorite_B',
    C: 'ham_favorite_C'
  },
  PENDING_PREFIX: 'ham_pending_',
  HISTORY: 'exam_history',
  THEME: 'theme'
};

export const EXAM_TYPES = ['A', 'B', 'C'];