// exam-engine.js
import * as state from './state.js';
import {
  getWrongQuestions, saveWrongQuestions, toggleWrongQuestion,
  getFavorites, saveFavorites,
  getPending, savePending, deletePending,
  addHistoryRecord, addWrongQuestion
} from './storage.js';
import { uploadPending } from './sync-supabase.js';
import {
  shuffleArray, generateShuffledIndices
} from './utils.js';
import {
  renderOptions, renderProgress, showPracticeFeedback, showCorrectAnswerHint,
  showExamScreen, showResultScreen, showStartScreen,
  toggleLoadingOverlay, updateSelectedOptions,
  applyFallbackFont
} from './ui-render.js';
import { EXAM_STANDARDS, EXAM_TYPES, VERSION } from './config.js';

// ---------- 题库加载 ----------
const loadedQuestions = { A: null, B: null, C: null };
//const _loadedQuestions = { A: null, B: null, C: null };

export async function loadQuestionBank(type) {
  // 如果已缓存，直接返回
  if (loadedQuestions[type]) {
    return loadedQuestions[type];
  }

  const url = `data/data_${type}.json?v=${VERSION}`;
  toggleLoadingOverlay(true, `加载${type}类题库...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`网络请求失败: ${response.status}`);
    }
    const questions = await response.json();

    if (Array.isArray(questions) && questions.length) {
      loadedQuestions[type] = questions;
      toggleLoadingOverlay(false);
      return questions;
    } else {
      throw new Error('题库数据无效或为空');
    }
  } catch (e) {
    toggleLoadingOverlay(false);
    console.error(`[${type}题库] 加载失败:`, e);
    throw new Error('题库加载失败: ' + e.message);
  }
}

export function getCachedQuestions(type) {
  return loadedQuestions[type] || null;
}

// ---------- 辅助函数 ----------
function isAnswerCorrect(question, userAnswer) {
  if (Array.isArray(userAnswer)) {
    return userAnswer.join('') === question.answer;
  }
  return userAnswer === question.answer;
}

function initOptionOrders() {
  const questions = state.getQuestions();
  const orders = questions.map((q) => generateShuffledIndices(q.options.length));
  state.setOptionOrders(orders);

  const maps = questions.map((q, idx) => {
    const map = {};
    orders[idx].forEach((optIdx, pos) => {
      map[q.options[optIdx].value] = String.fromCharCode(65 + pos);
    });
    return map;
  });
  state.setOptionMaps(maps);
}

// ---------- 启动练习 ----------
export function startPractice(type, questions, order, isWrong = false, customQuestions = null) {
  state.setExamMode('practice');
  state.setExamType(type);
  state.setIsWrongPractice(isWrong);
  state.setIsPendingPractice(!isWrong && !customQuestions);
  state.setOrderMode(order);
  state.setPendingData(null);  // 新练习，清除旧待做映射

  let qList = customQuestions ? [...customQuestions] : [...questions];

  if (!customQuestions && isWrong) {
    const wrongIds = getWrongQuestions(type);
    qList = questions.filter(q => wrongIds.includes(q.id));
    if (qList.length === 0) {
      alert('当前没有错题，先去学习题目吧！');
      return;
    }
  }

  if (order === 'asc') {
    state.setQuestions(qList);
  } else if (order === 'desc') {
    state.setQuestions([...qList].reverse());
  } else {
    state.setQuestions(shuffleArray([...qList]));
  }

  const qs = state.getQuestions();
  if (qs.length === 0) return;

  initOptionOrders();
  state.setAnswers(new Array(qs.length).fill(null));
  state.setIndex(0);

  // 保存待做进度
  if (state.getIsPendingPractice()) {
    const pendingData = {
      questions: qs.map(q => q.id),
      userAnswers: state.getAnswers().map(a => a),
      currentIndex: 0,
      total: qs.length,
      optionOrders: state.getOptionOrders()
    };
    savePending(type, order, pendingData);
    uploadPending(type, order);
  }

  showExamScreen();
  document.getElementById('mode-badge').textContent = isWrong ? '错题练习' : '刷题练习';
  document.getElementById('timer-container').style.display = 'none';
  document.getElementById('submit-btn').classList.add('hidden');
  document.getElementById('favorite-btn').classList.remove('hidden');
  document.getElementById('goto-btn').classList.remove('hidden');
  document.getElementById('reset-wrong-btn').classList.toggle('hidden', !isWrong);
  document.getElementById('practice-feedback').classList.remove('hidden');
  document.getElementById('practice-feedback').innerHTML = '';
  document.getElementById('current-exam-type').textContent = type + '类';
  document.getElementById('total-questions').textContent = qs.length;

  goToQuestion(0);
}

// ---------- 恢复待做进度 ----------
export async function restorePendingSession(type, order) {
  const pending = getPending(type, order);
  if (!pending) return false;

  const questions = await loadQuestionBank(type);
  const questionMap = {};
  questions.forEach(q => questionMap[q.id] = q);

  // 筛选未答题目（含多选已选但未确认的）
  const unansweredIndices = [];
  const unansweredQuestions = [];
  pending.userAnswers.forEach((ans, i) => {
    const isEmpty = ans === null || (Array.isArray(ans) && ans.length === 0);
    if (isEmpty && pending.questions[i]) {
      unansweredIndices.push(i);
      const q = questionMap[pending.questions[i]];
      if (q) unansweredQuestions.push(q);
    }
  });

  if (unansweredQuestions.length === 0) {
    alert('所有题目已完成！');
    deletePending(type, order);
    return false;
  }

  // 保存索引映射：未答题在筛选后列表中的位置 → 原始位置
  state.setPendingData({
    originalQuestions: pending.questions,
    originalAnswers: pending.userAnswers,
    indexMap: unansweredIndices,
    originalType: type,
    originalOrder: order
  });

  state.setQuestions(unansweredQuestions);
  state.setExamType(type);
  state.setExamMode('practice');
  state.setIsWrongPractice(false);
  state.setIsPendingPractice(true);
  state.setOrderMode(order);

  // 筛选对应的答案和选项顺序
  const filteredAnswers = unansweredIndices.map(i => pending.userAnswers[i]);
  const filteredOrders = unansweredIndices.map(i =>
    pending.optionOrders ? (pending.optionOrders[i] || []) : []
  );
  state.setAnswers(filteredAnswers);
  state.setOptionOrders(filteredOrders);

  // 重建 optionMaps
  const maps = unansweredQuestions.map((q, idx) => {
    const map = {};
    const orders = filteredOrders[idx] || [];
    orders.forEach((optIdx, pos) => {
      if (q.options[optIdx]) {
        map[q.options[optIdx].value] = String.fromCharCode(65 + pos);
      }
    });
    return map;
  });
  state.setOptionMaps(maps);

  state.setIndex(0);

  showExamScreen();
  document.getElementById('mode-badge').textContent = '刷题练习';
  document.getElementById('timer-container').style.display = 'none';
  document.getElementById('submit-btn').classList.add('hidden');
  document.getElementById('favorite-btn').classList.remove('hidden');
  document.getElementById('goto-btn').classList.remove('hidden');
  document.getElementById('reset-wrong-btn').classList.add('hidden');
  document.getElementById('practice-feedback').classList.remove('hidden');
  document.getElementById('practice-feedback').innerHTML = '';
  document.getElementById('current-exam-type').textContent = type + '类';
  document.getElementById('total-questions').textContent = state.getQuestions().length;

  goToQuestion(0);
  return true;
}

// ---------- 跳转题目 ----------
export function goToQuestion(index) {
  const questions = state.getQuestions();
  if (!questions.length) return;

  state.setIndex(index);
  const q = questions[index];
  const answers = state.getAnswers();
  const optionOrders = state.getOptionOrders();
  const optionMaps = state.getOptionMaps();

  // 清空反馈
  const feedback = document.getElementById('practice-feedback');
  if (feedback) {
    feedback.innerHTML = '';
    feedback.classList.remove('correct', 'incorrect');
  }

  // 更新进度
  renderProgress(index, questions.length);
  document.getElementById('q-number').textContent = index + 1;
  document.getElementById('q-id').textContent = q.id;

  const isMulti = q.answer.length > 1;
  document.getElementById('q-type').textContent = isMulti ? '多选题' : '单选题';
  document.getElementById('q-type').style.color = isMulti ? '#c44536' : '#2b6f9e';

  // 渲染题干（含图片）
  let questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, (_, src) => {
    return `<span class="image-placeholder" data-img-src="imageswebp/${src}"></span>`;
  });
  document.getElementById('q-text').innerHTML = questionHtml;

  // 加载图片
  document.querySelectorAll('.image-placeholder').forEach((el) => {
    const src = el.dataset.imgSrc;
    const img = new Image();
    img.onload = () => {
      const imgEl = document.createElement('img');
      imgEl.src = src;
      imgEl.loading = 'lazy';
      imgEl.className = 'question-image';
      imgEl.alt = '题目配图';
      el.parentNode.replaceChild(imgEl, el);
    };
    img.onerror = () => el.remove();
    img.src = src;
  });

  // 渲染选项
  renderOptions(q, index, optionOrders, optionMaps, answers);
  applyFallbackFont(document.getElementById('question-container'));

  // 按钮状态
  document.getElementById('prev-btn').disabled = index === 0;
  document.getElementById('next-btn').disabled = index === questions.length - 1;

  // 正确答案提示隐藏
  const hint = document.getElementById('correct-answer-hint');
  if (hint) hint.style.display = 'none';

  const confirmBtn = document.getElementById('confirm-btn');
  const nextBtn = document.getElementById('next-btn');

  if (state.getExamMode() === 'practice') {
    if (isMulti) {
      confirmBtn.style.display = 'inline-block';
      nextBtn.style.display = 'none';
      document.getElementById('practice-feedback').innerHTML = '';
    } else {
      confirmBtn.style.display = 'none';
      nextBtn.style.display = 'inline-block';
      const ans = answers[index];
      if (ans !== undefined && ans !== null) {
        const correct = isAnswerCorrect(q, ans);
        showPracticeFeedback(correct);
        showCorrectAnswerHint(q, correct, optionMaps, index);
      } else {
        document.getElementById('practice-feedback').innerHTML = '';
      }
    }
  } else {
    confirmBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
  }

  updateFavoriteButton();
  if (state.getExamMode() === 'practice' && state.getIsPendingPractice()) {
    savePendingProgress();
  }
}

// ---------- 选项变化处理 ----------
export function handleOptionChange(index, value, isMulti, checked) {
  const answers = state.getAnswers();
  if (!answers[index]) {
    answers[index] = isMulti ? [value] : value;
  } else if (isMulti) {
    let arr = answers[index];
    if (arr.includes(value)) {
      arr = arr.filter(v => v !== value);
    } else {
      arr.push(value);
      arr.sort();
    }
    answers[index] = arr;
  } else {
    answers[index] = value;
  }
  state.setAnswers(answers);

  updateSelectedOptions();

  // 待做进度保存
  if (state.getExamMode() === 'practice' && state.getIsPendingPractice()) {
    savePendingProgress();
  }

  // 如果是练习模式且为多选，隐藏确认/下一题切换由外部处理
  if (state.getExamMode() === 'practice') {
    const q = state.getQuestions()[index];
    if (isMulti) {
      // 多选：由"确认"按钮触发判题
    } else {
      const ans = answers[index];
      const correct = isAnswerCorrect(q, ans);
      showPracticeFeedback(correct);
      // 使用 sync 包装器（如有）否则直接用 storage
      if (window.toggleWrongQuestion) {
        window.toggleWrongQuestion(q.id, correct, state.getExamType());
      } else {
        toggleWrongQuestion(q.id, correct, state.getExamType());
      }
      showCorrectAnswerHint(q, correct, state.getOptionMaps(), index);
    }
  }
}

// ---------- 确认多选 ----------
export function confirmMultipleChoice() {
  if (state.getExamMode() !== 'practice') return;

  const index = state.getIndex();
  const q = state.getQuestions()[index];
  const isMulti = q.answer.length > 1;
  if (!isMulti) return;

  const ans = state.getAnswers()[index];
  let correct;
  if (ans === null || (Array.isArray(ans) && ans.length === 0)) {
    correct = false;
    showPracticeFeedback(false);
    if (window.toggleWrongQuestion) {
      window.toggleWrongQuestion(q.id, false, state.getExamType());
    } else {
      toggleWrongQuestion(q.id, false, state.getExamType());
    }
  } else {
    correct = isAnswerCorrect(q, ans);
    showPracticeFeedback(correct);
    if (window.toggleWrongQuestion) {
      window.toggleWrongQuestion(q.id, correct, state.getExamType());
    } else {
      toggleWrongQuestion(q.id, correct, state.getExamType());
    }
  }
  showCorrectAnswerHint(q, correct, state.getOptionMaps(), index);

  document.getElementById('confirm-btn').style.display = 'none';
  document.getElementById('next-btn').style.display = 'inline-block';
}

// ---------- 保存待做进度（回写到原会话） ----------
function savePendingProgress() {
  if (!state.getIsPendingPractice()) return;

  const pendingData = state.getPendingData();
  if (pendingData && pendingData.originalQuestions) {
    // 有原始会话：回写答案到原始位置
    const originalAnswers = [...pendingData.originalAnswers];
    const indexMap = pendingData.indexMap;
    const currentAnswers = state.getAnswers();

    indexMap.forEach((origIdx, filteredIdx) => {
      originalAnswers[origIdx] = currentAnswers[filteredIdx] || null;
    });

    savePending(pendingData.originalType, pendingData.originalOrder, {
      questions: pendingData.originalQuestions,
      userAnswers: originalAnswers,
      currentIndex: 0,
      total: pendingData.originalQuestions.length,
      optionOrders: pendingData.originalQuestions.map((_, i) => {
        const origIdx = indexMap.indexOf(i);
        return origIdx !== -1 && state.getOptionOrders()[origIdx]
          ? state.getOptionOrders()[origIdx]
          : [];
      })
    });
    uploadPending(pendingData.originalType, pendingData.originalOrder);
  } else {
    // 无原始会话：直接保存当前状态
    const data = {
      questions: state.getQuestions().map(q => q.id),
      userAnswers: state.getAnswers().map(a => a),
      currentIndex: state.getIndex(),
      total: state.getQuestions().length,
      optionOrders: state.getOptionOrders()
    };
    savePending(state.getExamType(), state.getOrderMode(), data);
    uploadPending(state.getExamType(), state.getOrderMode());
  }
}

// ---------- 切换收藏 ----------
export function toggleFavorite() {
  if (state.getExamMode() !== 'practice') return;

  const index = state.getIndex();
  const q = state.getQuestions()[index];
  const type = state.getExamType();
  const favorites = getFavorites(type);

  if (favorites.includes(q.id)) {
    const newList = favorites.filter(id => id !== q.id);
    if (window.saveFavorites) window.saveFavorites(type, newList);
    else saveFavorites(type, newList);
  } else {
    favorites.push(q.id);
    if (window.saveFavorites) window.saveFavorites(type, favorites);
    else saveFavorites(type, favorites);
  }
  updateFavoriteButton();
}

function updateFavoriteButton() {
  if (state.getExamMode() !== 'practice') return;

  const index = state.getIndex();
  const q = state.getQuestions()[index];
  if (!q) return;

  const type = state.getExamType();
  const favorites = getFavorites(type);
  const btn = document.getElementById('favorite-btn');

  if (favorites.includes(q.id)) {
    btn.classList.add('favorited');
    btn.textContent = '★ 已收藏';
  } else {
    btn.classList.remove('favorited');
    btn.textContent = '☆ 收藏';
  }
}

// ---------- 从错题本移除 ----------
export function resetWrongQuestion() {
  if (state.getExamMode() !== 'practice' || !state.getQuestions().length) return;

  const index = state.getIndex();
  const q = state.getQuestions()[index];
  const type = state.getExamType();
  const wrongs = getWrongQuestions(type);

  if (wrongs.includes(q.id)) {
    const newList = wrongs.filter(id => id !== q.id);
    saveWrongQuestions(type, newList);
    alert('已从错题本移除');
  } else {
    alert('当前题目不在错题本中');
  }
}

// ---------- 跳转弹窗 ----------
export function showGotoModal() {
  let modal = document.getElementById('goto-modal');
  if (modal) modal.remove();

  const total = state.getQuestions().length;
  modal = document.createElement('div');
  modal.id = 'goto-modal';
  modal.className = 'goto-modal';
  modal.innerHTML = `
    <div class="goto-modal-content">
      <h3>跳转到第几题？</h3>
      <input type="number" id="goto-input" min="1" max="${total}" value="${state.getIndex() + 1}">
      <div class="goto-modal-actions">
        <button class="goto-confirm">确定</button>
        <button class="goto-cancel">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#goto-input');
  const confirmBtn = modal.querySelector('.goto-confirm');
  const cancelBtn = modal.querySelector('.goto-cancel');
  const close = () => modal.remove();

  confirmBtn.addEventListener('click', () => {
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1 || val > total) {
      alert('请输入1-' + total + '之间的数字');
      return;
    }
    goToQuestion(val - 1);
    close();
  });

  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ---------- 启动考试 ----------
export async function startExamByType(type) {
  try {
    const bank = await loadQuestionBank(type);
    startExam(type, bank);
  } catch (e) {
    alert('题库加载失败，请刷新重试\n' + e.message);
  }
}

function startExam(type, bank) {
  const standard = EXAM_STANDARDS[type];
  const shuffled = shuffleArray([...bank]);
  const questions = shuffled.slice(0, standard.total);

  state.setExamMode('exam');
  state.setExamType(type);
  state.setIsPendingPractice(false);
  state.setPendingData(null);
  state.setQuestions(questions);
  state.setAnswers(new Array(questions.length).fill(null));

  // 重新生成 optionOrders（考试用 random）
  const orders = questions.map((q) => generateShuffledIndices(q.options.length));
  state.setOptionOrders(orders);
  const maps = questions.map((q, idx) => {
    const map = {};
    orders[idx].forEach((optIdx, pos) => {
      map[q.options[optIdx].value] = String.fromCharCode(65 + pos);
    });
    return map;
  });
  state.setOptionMaps(maps);

  state.setTimeRemaining(standard.time * 60);
  state.setExamStartTime(new Date());

  showExamScreen();
  document.getElementById('mode-badge').textContent = '模拟考试';
  document.getElementById('timer-container').style.display = 'block';
  document.getElementById('submit-btn').classList.remove('hidden');
  document.getElementById('reset-wrong-btn').classList.add('hidden');
  document.getElementById('practice-feedback').classList.add('hidden');
  document.getElementById('favorite-btn').classList.add('hidden');
  document.getElementById('goto-btn').classList.add('hidden');
  document.getElementById('current-exam-type').textContent = type + '类';
  document.getElementById('total-questions').textContent = questions.length;

  state.setIndex(0);
  startTimer();
  goToQuestion(0);
}

// ---------- 计时器 ----------
function startTimer() {
  updateTimerDisplay();
  const interval = setInterval(() => {
    state.decrementTime();
    updateTimerDisplay();
    if (state.getTimeRemaining() <= 0) {
      clearInterval(interval);
      submitExam();
    }
  }, 1000);
  state.setTimerInterval(interval);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.getTimeRemaining() / 60);
  const secs = state.getTimeRemaining() % 60;
  document.getElementById('time').textContent =
    mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
}

// ---------- 提交考试 ----------
export function submitExam() {
  const interval = state.getTimerInterval();
  if (interval) clearInterval(interval);
  state.setTimerInterval(null);

  const questions = state.getQuestions();
  const answers = state.getAnswers();
  let score = 0;
  const wrongs = [];

  questions.forEach((q, idx) => {
    const ans = answers[idx];
    const correct = isAnswerCorrect(q, ans);
    if (correct) {
      score++;
    } else {
      wrongs.push({
        index: idx,
        question: q,
        userAnswer: ans,
        correctAnswer: q.answer
      });
    }
  });

  // 计算用时
  const endTime = new Date();
  const startTime = state.getExamStartTime() || new Date();
  const totalSec = Math.floor((endTime - startTime) / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeStr = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');

  // 保存历史
  const wrongIds = wrongs.map(w => w.question.id);
  const wrongUserAnswers = wrongs.map(w => w.userAnswer);
  const standard = EXAM_STANDARDS[state.getExamType()];
  const passed = score >= standard.pass;

  const record = {
    type: state.getExamType(),
    score: score,
    total: questions.length,
    passed: passed,
    timeUsedSec: totalSec,
    timeUsedStr: timeStr,
    wrongIds: wrongIds,
    wrongUserAnswers: wrongUserAnswers,
    timestamp: Date.now()
  };
  try {
    if (window.addHistoryRecord) window.addHistoryRecord(record);
    else addHistoryRecord(record);
  } catch(e) { console.warn('[submitExam] 保存历史失败', e); }

  // 自动加入错题本
  try {
    wrongs.forEach(w => {
      addWrongQuestion(w.question.id, state.getExamType());
    });
  } catch(e) { console.warn('[submitExam] 加入错题本失败', e); }

  // 确保结果显示
  try { showResultScreen(); } catch(e) { console.error('[submitExam] 显示结果失败', e); }

  document.getElementById('score').textContent = score;
  document.getElementById('result-type').textContent = state.getExamType() + '类';
  document.getElementById('correct-answers').textContent = score;
  document.getElementById('total-answers').textContent = questions.length;
  document.getElementById('time-used').textContent = timeStr;

  const passFail = document.getElementById('pass-fail');
  passFail.textContent = passed ? '合格' : '不合格';
  passFail.className = 'pass-fail ' + (passed ? 'pass' : 'fail');

  renderWrongQuestions(wrongs);

  const toggleBtn = document.getElementById('toggle-wrong-btn');
  const container = document.getElementById('wrong-questions-container');
  if (wrongs.length === 0) {
    toggleBtn.style.display = 'none';
    container.classList.add('hidden');
  } else {
    toggleBtn.style.display = 'inline-block';
    container.classList.add('hidden');
    toggleBtn.textContent = '查看错题';
  }

  // 通知首页刷新历史记录和计数
  window.dispatchEvent(new CustomEvent('history-updated'));
}

// ---------- 渲染错题 ----------
function renderWrongQuestions(wrongs) {
  const list = document.getElementById('wrong-questions-list');
  if (wrongs.length === 0) {
    list.innerHTML = '<p>恭喜，没有错题！</p>';
    return;
  }

  let html = '';
  const optionMaps = state.getOptionMaps();
  wrongs.forEach((w) => {
    const map = optionMaps[w.index] || {};
    const userStr = w.userAnswer
      ? Array.isArray(w.userAnswer)
        ? w.userAnswer.map(v => map[v] || v).join('')
        : map[w.userAnswer] || w.userAnswer
      : '未答';
    const correctStr = w.correctAnswer.split('').map(v => map[v] || v).join('');

    html += `
      <div class="wrong-item">
        <div>题目 ${w.index + 1} (ID:${w.question.id})</div>
        <div class="wrong-answer">您的答案: ${userStr}</div>
        <div class="correct-answer">正确答案: ${correctStr}</div>
      </div>
    `;
  });
  list.innerHTML = html;
}

// ---------- 导航 ----------
export function nextQuestion() {
  if (state.getIndex() < state.getQuestions().length - 1) {
    goToQuestion(state.getIndex() + 1);
  }
}

export function prevQuestion() {
  if (state.getIndex() > 0) {
    goToQuestion(state.getIndex() - 1);
  }
}

// ---------- 重新导出一些函数供 main.js 使用 ----------
export { addWrongQuestion };
export { updateFavoriteButton, savePendingProgress };