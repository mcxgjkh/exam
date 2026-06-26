// sync-supabase.js
import { getHistory, saveHistory, getFavorites, saveFavorites, getWrongQuestions, saveWrongQuestions } from './storage.js';
import { EXAM_TYPES } from './config.js';

let sbClient = null;
let currentUser = null;

export function initSupabase(supabase, user) {
  sbClient = supabase;
  currentUser = user;
}

export function isSupabaseReady() {
  return !!(sbClient && currentUser);
}

// ---------- 从云端同步数据 ----------
export async function syncFromCloud() {
  if (!sbClient || !currentUser) return;

  try {
    // 同步错题和收藏
    const progressResult = await sbClient
      .from('exam_progress')
      .select('*')
      .eq('user_id', currentUser.id);

    if (!progressResult.error && progressResult.data) {
      const cloudWrong = { A: [], B: [], C: [] };
      const cloudFav = { A: [], B: [], C: [] };

      progressResult.data.forEach(record => {
        if (record.is_favorite) {
          cloudFav[record.exam_type].push(record.question_id);
        }
        if (record.is_correct === false) {
          cloudWrong[record.exam_type].push(record.question_id);
        }
      });

      // 合并到本地
      EXAM_TYPES.forEach(type => {
        if (cloudFav[type].length) {
          const local = getFavorites(type);
          const merged = Array.from(new Set([...local, ...cloudFav[type]]));
          saveFavorites(type, merged);
        }
        if (cloudWrong[type].length) {
          const local = getWrongQuestions(type);
          const merged = Array.from(new Set([...local, ...cloudWrong[type]]));
          saveWrongQuestions(type, merged);
        }
      });
    }

    // 同步历史记录
    const historyResult = await sbClient
      .from('exam_sessions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!historyResult.error && historyResult.data && historyResult.data.length) {
      const local = getHistory();
      const localMap = {};
      local.forEach(record => { localMap[record.timestamp] = true; });

      let merged = false;
      historyResult.data.forEach(record => {
        const timestamp = new Date(record.created_at).getTime();
        if (!localMap[timestamp]) {
          local.push({
            type: record.exam_type,
            score: record.score,
            total: record.total,
            passed: record.passed,
            timeUsedSec: record.time_used_sec,
            timeUsedStr: record.time_used_sec
              ? Math.floor(record.time_used_sec / 60) + ':' + String(record.time_used_sec % 60).padStart(2, '0')
              : '00:00',
            wrongIds: [],
            wrongUserAnswers: [],
            timestamp: timestamp
          });
          localMap[timestamp] = true;
          merged = true;
        }
      });

      if (merged) {
        local.sort((a, b) => b.timestamp - a.timestamp);
        saveHistory(local);
        console.log('[Sync] 从云端合并了历史记录，共', local.length, '条');
      }
    }
  } catch (e) {
    console.warn('[Sync] 云同步失败:', e);
  }
}

// ---------- 上传错题记录 ----------
export function uploadWrongQuestion(questionId, type, isCorrect) {
  if (!sbClient || !currentUser) return;

  sbClient.from('exam_progress').upsert({
    user_id: currentUser.id,
    exam_type: type,
    question_id: questionId,
    is_correct: isCorrect,
    is_favorite: false,
    answered_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,exam_type,question_id'
  }).catch(() => {});
}

// ---------- 上传收藏 ----------
export function uploadFavorites(type, ids) {
  if (!sbClient || !currentUser || !ids.length) return;

  ids.forEach(id => {
    sbClient.from('exam_progress').upsert({
      user_id: currentUser.id,
      exam_type: type,
      question_id: id,
      is_favorite: true,
      answered_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,exam_type,question_id'
    }).catch(() => {});
  });
}

// ---------- 上传考试记录 ----------
export function uploadExamSession(record) {
  if (!sbClient || !currentUser) return;

  sbClient.from('exam_sessions').insert({
    user_id: currentUser.id,
    exam_type: record.type,
    score: record.score,
    total: record.total,
    passed: record.passed,
    time_used_sec: record.timeUsedSec,
    created_at: new Date(record.timestamp).toISOString()
  }).catch(() => {});
}