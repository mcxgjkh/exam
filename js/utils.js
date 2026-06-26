// utils.js
import { CHAR_TO_INITIAL } from './pinyin-map.js';

// ---------- 拼音工具 ----------
export function getPinyinInitials(text, keepOther = true) {
  if (typeof text !== 'string') return '';
  let result = '';
  for (const ch of text) {
    const isChinese = /[\u4e00-\u9fa5]/.test(ch);
    if (isChinese) {
      result += CHAR_TO_INITIAL[ch] || '?';
    } else {
      result += keepOther ? ch.toLowerCase() : '';
    }
  }
  return result;
}

// ---------- 编辑距离 (Levenshtein) ----------
export function levenshteinDistance(s1, s2) {
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  if (s1.length > s2.length) {
    [s1, s2] = [s2, s1];
  }
  let prevRow = Array(s1.length + 1).fill(0).map((_, i) => i);
  let currRow = new Array(s1.length + 1);
  for (let i = 1; i <= s2.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= s1.length; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,
        currRow[j - 1] + 1,
        prevRow[j - 1] + cost
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[s1.length];
}

// ---------- 相似度 ----------
export function getSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(str1, str2);
  return 1 - dist / maxLen;
}

export function getPinyinSimilarity(str1, str2, keepOther = true) {
  const py1 = getPinyinInitials(str1, keepOther);
  const py2 = getPinyinInitials(str2, keepOther);
  return getSimilarity(py1, py2);
}

// ---------- 模糊搜索核心 ----------
export function fuzzySearch(query, items, options = {}) {
  const { threshold = 0.5, usePinyin = false, pinyinWeight = 0.4 } = options;
  if (!query || !items.length) return [];

  const results = [];
  for (const item of items) {
    let score = getSimilarity(query, item);
    let finalScore = score;
    if (usePinyin) {
      const pinyinScore = getPinyinSimilarity(query, item);
      finalScore = score * (1 - pinyinWeight) + pinyinScore * pinyinWeight;
    }
    if (finalScore >= threshold) {
      results.push({ item, score: finalScore });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

export function filterBySimilarity(query, items, threshold = 0.5) {
  return fuzzySearch(query, items, { threshold }).map(r => r.item);
}

export function rankBySimilarity(query, items, usePinyin = false) {
  return fuzzySearch(query, items, { threshold: 0, usePinyin });
}

// ---------- 数组工具 ----------
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateShuffledIndices(length) {
  return shuffleArray([...Array(length).keys()]);
}

// ---------- HTML 转义 ----------
export function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return map[char] || char;
  });
}

// ---------- 字符串归一化 ----------
export function normalizeString(str) {
  return str.toLowerCase().replace(/\s+/g, '');
}

// ---------- 正则转义 ----------
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------- 特殊字符正则（用于 fallback 字体检测） ----------
export const SPECIAL_CHAR_REGEX = /[\p{Script=Greek}\p{So}\p{Sm}\u03B1-\u03C9\u03A9\u03A0\u03A3\u0394\u0398\u00B0\u2103\u2109\u2032\u2033\u00B2\u00B3\u00B9\u2070-\u2079\u2080-\u2089\u00D7\u00F7\u2260\u2264\u2265\u221E\u221A\u2211\u220F\u2202\u2207\u2220\u221D\u2190\u2192\u2191\u2193\u2194\u21D0\u21D2\u21D4\u00B1\u220F\u2211\u222B\u222C\u222E\u220F\u221E\u00BD\u00BC\u00BE\u00A9\u00AE\u2122\u20AC\u00B5\u03BC]/gu;