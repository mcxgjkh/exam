// exam-engine.js
import * as state from './state.js';
import { addWrongQuestion, addHistoryRecord } from './storage.js';
import { shuffleArray, generateShuffledIndices, isAnswerCorrect } from './utils.js';
import { EXAM_STANDARDS } from './config.js';

const loadedQuestions = { A: null, B: null, C: null };

export async function loadQuestionBank(type) {
  if (loadedQuestions[type]) return loadedQuestions[type];
  try {
    const resp = await fetch(`/data/data_${type}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (Array.isArray(data) && data.length) {
      loadedQuestions[type] = data;
      return data;
    }
    throw new Error('题库数据无效');
  } catch (e) {
    console.error(`加载${type}类题库失败`, e);
    throw e;
  }
}

export function getCachedQuestions(type) {
  return loadedQuestions[type] || null;
}

function initQuestionMeta(questions) {
  const orders = questions.map(q => generateShuffledIndices(q.options.length));
  const maps = questions.map((q, idx) => {
    const map = {};
    orders[idx].forEach((optIdx, pos) => {
      map[q.options[optIdx].value] = String.fromCharCode(65 + pos);
    });
    return map;
  });
  return { orders, maps };
}

export function startPractice(type, questions, order = 'asc') {
  let qs = [...questions];
  if (order === 'desc') qs.reverse();
  else if (order === 'random') qs = shuffleArray(qs);

  state.setQuestions(qs);
  state.setType(type);
  state.setMode('practice');
  state.setIndex(0);
  state.setAnswers(new Array(qs.length).fill(null));

  const meta = initQuestionMeta(qs);
  window._optionOrders = meta.orders;
  window._optionMaps = meta.maps;
  window._isMulti = qs.map(q => q.answer.length > 1);
  window._answered = new Array(qs.length).fill(false);
}

export function startExam(type, questions) {
  const standard = EXAM_STANDARDS[type];
  const shuffled = shuffleArray([...questions]);
  const selected = shuffled.slice(0, standard.total);

  state.setQuestions(selected);
  state.setType(type);
  state.setMode('exam');
  state.setIndex(0);
  state.setAnswers(new Array(selected.length).fill(null));

  const meta = initQuestionMeta(selected);
  window._optionOrders = meta.orders;
  window._optionMaps = meta.maps;
  window._isMulti = selected.map(q => q.answer.length > 1);
  window._answered = new Array(selected.length).fill(false);

  state.setTimeLeft(standard.time * 60);
  state.setStartTime(Date.now());
  startTimer();
}

function startTimer() {
  state.clearTimer();
  const interval = setInterval(() => {
    state.decTime();
    updateTimerDisplay();
    if (state.getTimeLeft() <= 0) {
      clearInterval(interval);
      state.setTimer(null);
      submitExam();
    }
  }, 1000);
  state.setTimer(interval);
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const t = state.getTimeLeft();
  const mins = Math.floor(t / 60);
  const secs = t % 60;
  const el = document.getElementById('timer-display');
  if (el) el.textContent = `剩余${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

export function submitExam() {
  state.clearTimer();
  const questions = state.getQuestions();
  const answers = state.getAnswers();
  let score = 0;
  const wrongIds = [], wrongUserAnswers = [];

  questions.forEach((q, idx) => {
    const ans = answers[idx];
    const correct = isAnswerCorrect(q, ans);
    if (correct) score++;
    else {
      wrongIds.push(q.id);
      wrongUserAnswers.push(ans);
      addWrongQuestion(q.id, state.getType());
    }
  });

  const elapsed = Math.floor((Date.now() - state.getStartTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const standard = EXAM_STANDARDS[state.getType()];
  const passed = score >= standard.pass;

  addHistoryRecord({
    type: state.getType(),
    score,
    total: questions.length,
    passed,
    timeUsedSec: elapsed,
    timeUsedStr: timeStr,
    wrongIds,
    wrongUserAnswers,
    timestamp: Date.now()
  });

  window._examResult = { score, total: questions.length, passed, timeStr };
  state.setMode('result');
}

export function goToQuestion(index) {
  const qs = state.getQuestions();
  if (index < 0 || index >= qs.length) return;
  state.setIndex(index);
}

export function nextQuestion() {
  const idx = state.getIndex();
  const total = state.getQuestions().length;
  if (idx < total - 1) goToQuestion(idx + 1);
}

export function prevQuestion() {
  const idx = state.getIndex();
  if (idx > 0) goToQuestion(idx - 1);
}

export function handleOptionClick(index, value, isMulti) {
  const answers = state.getAnswers();
  let current = answers[index];
  if (isMulti) {
    if (!current) current = [];
    if (current.includes(value)) {
      current = current.filter(v => v !== value);
    } else {
      current = [...current, value];
      current.sort();
    }
  } else {
    current = value;
  }
  answers[index] = current;
  state.setAnswers(answers);

  if (!isMulti && state.getMode() === 'practice') {
    const q = state.getQuestions()[index];
    const correct = isAnswerCorrect(q, current);
    window._answered[index] = true;
    const event = new CustomEvent('answer-feedback', {
      detail: { index, correct, answer: current }
    });
    document.dispatchEvent(event);
  }
}

export function confirmMultipleChoice(index) {
  const q = state.getQuestions()[index];
  const answer = state.getAnswers()[index];
  const correct = isAnswerCorrect(q, answer);
  window._answered[index] = true;
  const event = new CustomEvent('answer-feedback', {
    detail: { index, correct, answer }
  });
  document.dispatchEvent(event);
}