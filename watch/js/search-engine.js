import { loadQuestionBank } from './exam-engine.js';
import { EXAM_TYPES } from './config.js';

export async function searchQuestions(keyword) {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];

  const results = [];
  const seen = new Set();

  for (const type of EXAM_TYPES) {
    const bank = await loadQuestionBank(type);
    if (!bank) continue;
    for (const q of bank) {
      let match = false;
      if (q.id === kw) match = true;
      else if (q.question.toLowerCase().includes(kw)) match = true;
      else {
        for (const opt of q.options) {
          if (opt.text.toLowerCase().includes(kw)) {
            match = true;
            break;
          }
        }
      }
      if (match && !seen.has(q.id)) {
        seen.add(q.id);
        results.push({ question: q, type });
      }
    }
  }
  return results.slice(0, 20);
}