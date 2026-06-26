// search-engine.js
import { loadQuestionBank, getCachedQuestions } from './exam-engine.js';
import {
  getPinyinInitials,
  getSimilarity,
  normalizeString,
  escapeRegex
} from './utils.js';
import { EXAM_TYPES } from './config.js';

// ---------- 计算单题匹配分数 ----------
export function calculateSearchScore(question, type, keyword) {
  const id = question.id;
  const kw = keyword.trim().toLowerCase();
  if (!kw) return 0;

  // 完全匹配 ID
  if (id === kw) return 10000;

  // ID 部分匹配（如 id 为 "A-001"，搜索 "001"）
  const idPart = id.split('-')[1] || id;
  if (idPart === kw) return 5000;

  let score = 0;
  const keywords = kw.split(/\s+/).filter(s => s.length > 0);
  let totalHits = 0;

  if (keywords.length > 0) {
    // 构建全文索引
    let fullText = id + ' ' + question.question;
    question.options.forEach(opt => {
      fullText += ' ' + opt.text;
    });
    const normalized = normalizeString(fullText);

    keywords.forEach(k => {
      let count = 0;
      let pos = -1;
      while ((pos = normalized.indexOf(k, pos + 1)) !== -1) {
        count++;
      }
      if (count > 0) {
        totalHits += count;
        // 题干匹配权重更高
        if (normalizeString(question.question).indexOf(k) !== -1) {
          score += count * 20;
        } else {
          score += count * 10;
        }
      }
    });
    if (totalHits > 0) {
      score += keywords.length * 5;
    }
  }

  // 拼音相似度
  const kwNorm = normalizeString(kw);
  const fullTextNorm = normalizeString(
    question.question + ' ' + question.options.map(o => o.text).join(' ')
  );
  const similarity = getSimilarity(kwNorm, fullTextNorm);
  const pinyinFull = getPinyinInitials(fullTextNorm);
  let pinyinBonus = 0;
  if (kwNorm.length > 0 && pinyinFull.includes(kwNorm)) {
    pinyinBonus = 80;
  }
  const simScore = similarity * 50 + pinyinBonus;

  return score + simScore;
}

// ---------- 执行搜索 ----------
export async function performSearch(keyword) {
  // 确保所有题库已加载
  const banks = {};
  for (const type of EXAM_TYPES) {
    banks[type] = await loadQuestionBank(type);
  }

  const results = [];
  for (const type of EXAM_TYPES) {
    const bank = banks[type];
    if (!bank) continue;
    for (const question of bank) {
      const score = calculateSearchScore(question, type, keyword);
      if (score > 0) {
        results.push({
          question: question,
          type: type,
          score: score
        });
      }
    }
  }

  // 排序
  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.question.id.localeCompare(b.question.id);
  });

  // 去重：同一题目可能出现在多个类型中
  const deduped = deduplicateResults(results);

  // 限制 100 条
  return deduped.slice(0, 100);
}

// ---------- 去重 ----------
function deduplicateResults(results) {
  const map = new Map();
  results.forEach(item => {
    const id = item.question.id;
    if (!map.has(id)) {
      map.set(id, {
        types: [item.type],
        question: item.question,
        score: item.score
      });
    } else {
      const existing = map.get(id);
      if (!existing.types.includes(item.type)) {
        existing.types.push(item.type);
      }
      if (item.score > existing.score) {
        existing.score = item.score;
      }
    }
  });

  const deduped = Array.from(map.values()).map(item => ({
    ...item,
    types: item.types.sort()
  }));

  deduped.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.question.id.localeCompare(b.question.id);
  });

  return deduped;
}