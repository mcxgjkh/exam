// storage.js
import { STORAGE_KEYS, EXAM_TYPES } from './config.js';

// ---------- 错题本 ----------
export function getWrongQuestions(type) {
  const key = STORAGE_KEYS.WRONG[type];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export function saveWrongQuestions(type, ids) {
  const key = STORAGE_KEYS.WRONG[type];
  localStorage.setItem(key, JSON.stringify(ids));
}

export function toggleWrongQuestion(questionId, isCorrect, type) {
  const list = getWrongQuestions(type);
  if (!isCorrect) {
    if (!list.includes(questionId)) list.push(questionId);
  } else {
    const idx = list.indexOf(questionId);
    if (idx !== -1) list.splice(idx, 1);
  }
  saveWrongQuestions(type, list);
  return list;
}

export function addWrongQuestion(questionId, type) {
  const list = getWrongQuestions(type);
  if (!list.includes(questionId)) {
    list.push(questionId);
    saveWrongQuestions(type, list);
  }
}

// ---------- 收藏 ----------
export function getFavorites(type) {
  const key = STORAGE_KEYS.FAVORITE[type];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export function saveFavorites(type, ids) {
  const key = STORAGE_KEYS.FAVORITE[type];
  localStorage.setItem(key, JSON.stringify(ids));
}

// ---------- 待做进度 ----------
function getPendingKey(type, order) {
  return STORAGE_KEYS.PENDING_PREFIX + type + '_' + order;
}

export function getPending(type, order) {
  const key = getPendingKey(type, order);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export function savePending(type, order, data) {
  const key = getPendingKey(type, order);
  localStorage.setItem(key, JSON.stringify(data));
}

export function deletePending(type, order) {
  const key = getPendingKey(type, order);
  localStorage.removeItem(key);
}

// ---------- 历史记录 ----------
export function getHistory() {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
}

export function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('存储空间已满，请先清空部分历史记录后再进行考试。');
    } else {
      console.error(e);
    }
  }
}

export function addHistoryRecord(record) {
  const history = getHistory();
  history.unshift(record);
  saveHistory(history);
  return history;
}

export function deleteHistoryRecord(index) {
  const history = getHistory();
  history.splice(index, 1);
  saveHistory(history);
  return history;
}

export function deleteHistoryRecords(indices) {
  const history = getHistory();
  for (let i = indices.length - 1; i >= 0; i--) {
    history.splice(indices[i], 1);
  }
  saveHistory(history);
  return history;
}

export function clearAllHistory() {
  saveHistory([]);
}

// ---------- 主题 ----------
export function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME);
}

export function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function getThemeMode() {
  return localStorage.getItem(STORAGE_KEYS.THEME_MODE) || 'auto';
}

export function saveThemeMode(mode) {
  localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
}