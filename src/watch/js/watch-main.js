// watch-main.js
import * as state from './state.js';
import {
  loadQuestionBank,
  startPractice,
  startExam,
  nextQuestion,
  prevQuestion,
  submitExam,
  handleOptionClick,
  confirmMultipleChoice,
} from './exam-engine.js';
import { searchQuestions } from './search-engine.js';
import {
  renderHome,
  renderQuestionScreen,
  updateQuestionContent,
  renderResult,
  renderDetailModal
} from './ui-render.js';
import { getHistory } from './storage.js';
import { EXAM_TYPES } from './config.js';
import { isAnswerCorrect, stripImages } from './utils.js';

let currentType = '';
let currentOrder = 'asc';

// ---------- 自定义确认对话框 ----------
function showConfirmDialog(message, onConfirm, onCancel) {
  const old = document.getElementById('custom-confirm-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'custom-confirm-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
  `;
  overlay.innerHTML = `
    <div style="
      background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
      border-radius: 20px; padding: 24px; max-width: 200px; width: 80%;
      text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.5);
    ">
      <div style="font-size: 9px; margin-bottom: 16px; color: #1a1a2e;">${message}</div>
      <div style="display: flex; gap: 8px; justify-content: center;">
        <button id="confirm-yes" style="
          padding: 4px 16px; border: none; border-radius: 100px;
          background: #007aff; color: white; font-size: 8px; cursor: pointer;
        ">确定</button>
        <button id="confirm-no" style="
          padding: 4px 16px; border: none; border-radius: 100px;
          background: #e0e0e0; color: #333; font-size: 8px; cursor: pointer;
        ">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const yesBtn = overlay.querySelector('#confirm-yes');
  const noBtn = overlay.querySelector('#confirm-no');
  const cleanup = () => overlay.remove();

  yesBtn.addEventListener('click', () => {
    cleanup();
    if (onConfirm) onConfirm();
  });
  noBtn.addEventListener('click', () => {
    cleanup();
    if (onCancel) onCancel();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
      if (onCancel) onCancel();
    }
  });
}

// ---------- 初始化 ----------
async function init() {
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-mode');

    renderHome(getHistory());
    bindHomeEvents();

    // 预加载题库
    Promise.all(EXAM_TYPES.map(type => loadQuestionBank(type).catch(() => {})));
  } catch (e) {
    alert('初始化失败，请刷新页面');
  }
}

// ---------- 首页事件绑定 ----------
function bindHomeEvents() {
  document.querySelectorAll('[id^="practice-btn-"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const type = e.target.id.split('-')[2];
      currentType = type;
      showOrderModal(type, 'practice');
    });
  });

  document.querySelectorAll('[id^="exam-btn-"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const type = e.target.id.split('-')[2];
      await startExamSession(type);
    });
  });

  const queryBtn = document.getElementById('query-btn');
  if (queryBtn) queryBtn.addEventListener('click', handleSearch);

  const queryInput = document.getElementById('query-input');
  if (queryInput) queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  const cancelBtn = document.getElementById('modal-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    document.getElementById('order-modal').classList.add('hidden');
  });

  document.querySelectorAll('#order-modal [data-order]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const order = btn.dataset.order;
      const modal = document.getElementById('order-modal');
      const type = modal._type;
      const mode = modal._mode;
      modal.classList.add('hidden');
      if (mode === 'practice') {
        await startPracticeSession(type, order);
      }
    });
  });
}

function showOrderModal(type, mode) {
  const modal = document.getElementById('order-modal');
  modal._type = type;
  modal._mode = mode;
  modal.classList.remove('hidden');
}

// ---------- 启动练习 ----------
async function startPracticeSession(type, order) {
  try {
    const questions = await loadQuestionBank(type);
    startPractice(type, questions, order);
    window._currentType = type;
    window._currentIndex = 0;
    renderQuestionScreen(state.getQuestions()[0], 0, state.getQuestions().length, false);
    bindQuestionEvents(false);
    updateCurrentQuestion();
  } catch (e) {
    alert('加载失败: ' + e.message);
  }
}

// ---------- 启动考试 ----------
async function startExamSession(type) {
  try {
    const questions = await loadQuestionBank(type);
    startExam(type, questions);
    window._currentType = type;
    window._currentIndex = 0;
    renderQuestionScreen(state.getQuestions()[0], 0, state.getQuestions().length, true);
    bindQuestionEvents(true);
    updateCurrentQuestion();
  } catch (e) {
    alert('加载失败: ' + e.message);
  }
}

// ---------- 绑定题目界面事件 ----------
function bindQuestionEvents(isExam) {
  const prevBtn = document.getElementById('prev-btn');
  if (prevBtn) {
    prevBtn.onclick = () => {
      prevQuestion();
      window._currentIndex = state.getIndex();
      updateCurrentQuestion();
    };
  }

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.onclick = () => {
      nextQuestion();
      window._currentIndex = state.getIndex();
      updateCurrentQuestion();
    };
  }

  // 退出按钮
  const exitBtn = document.getElementById('exit-btn');
  if (exitBtn) {
    exitBtn.onclick = () => {
      showConfirmDialog('确定退出吗？进度将丢失。', () => {
        try {
          state.setQuestions([]);
          state.setAnswers([]);
          state.clearTimer();
          state.setMode('home');
          renderHome(getHistory());
          bindHomeEvents();
        } catch (e) {
          location.reload();
        }
      });
    };
  }

  // 交卷按钮
  if (isExam) {
    const submitBtn = document.getElementById('submit-exam');
    if (submitBtn) {
      submitBtn.onclick = () => {
        showConfirmDialog('确定交卷吗？', () => {
          try {
            submitExam();
            const result = window._examResult;
            if (result) {
              renderResult(result.score, result.total, result.passed, result.timeStr);
              document.getElementById('back-main').addEventListener('click', () => {
                state.setMode('home');
                renderHome(getHistory());
                bindHomeEvents();
              });
            } else {
              alert('交卷失败，未生成结果');
            }
          } catch (e) {
            alert('交卷失败: ' + e.message);
          }
        });
      };
    }
  }

  const confirmBtn = document.getElementById('confirm-btn');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const idx = state.getIndex();
      confirmMultipleChoice(idx);
      updateCurrentQuestion();
    };
  }

  document.removeEventListener('option-click', handleOptionClickEvent);
  document.addEventListener('option-click', handleOptionClickEvent);
  document.removeEventListener('answer-feedback', handleFeedbackEvent);
  document.addEventListener('answer-feedback', handleFeedbackEvent);
}

function handleOptionClickEvent(e) {
  const { index, value, isMulti } = e.detail;
  handleOptionClick(index, value, isMulti);
  updateCurrentQuestion();
}

function handleFeedbackEvent(e) {
  updateCurrentQuestion();
}

// ---------- 更新当前题目 ----------
function updateCurrentQuestion() {
  const idx = state.getIndex();
  const questions = state.getQuestions();
  if (!questions || !questions.length) return;
  const q = questions[idx];
  const answers = state.getAnswers();
  const userAnswer = answers[idx];
  const optionOrders = window._optionOrders || [];
  const optionMaps = window._optionMaps || [];
  const isMulti = q.answer.length > 1;
  const order = optionOrders[idx] || [];
  const map = optionMaps[idx] || {};

  const isAnswered = window._answered && window._answered[idx];
  let feedback = null;
  if (state.getMode() === 'practice') {
    if (!isMulti) {
      if (userAnswer !== undefined && userAnswer !== null) {
        feedback = { correct: isAnswerCorrect(q, userAnswer) };
      }
    } else if (isAnswered) {
      feedback = { correct: isAnswerCorrect(q, userAnswer) };
    }
  }

  updateQuestionContent(q, userAnswer, order, map, isMulti, feedback);
  document.getElementById('progress-text').textContent = `${idx+1}/${questions.length} ${isMulti ? '多选题' : '单选题'}`;
  document.getElementById('prev-btn').disabled = (idx === 0);
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    if (isMulti && !isAnswered) {
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = (idx === questions.length - 1);
    }
  }
}

// ---------- 搜索 ----------
async function handleSearch() {
  const input = document.getElementById('query-input');
  const keyword = input.value.trim();
  if (!keyword) return;
  const resultsEl = document.getElementById('query-results');
  resultsEl.innerHTML = '<div style="font-size:7px;">搜索中...</div>';

  try {
    const results = await searchQuestions(keyword);
    if (!results.length) {
      resultsEl.innerHTML = '<div style="font-size:7px;">无结果</div>';
      return;
    }
    let html = '';
    results.forEach((item, idx) => {
      const short = stripImages(item.question.question).substring(0, 30);
      html += `<div class="query-item" data-idx="${idx}">
                <span style="color:#1a4d6f;">${item.question.id}</span> ${short}...
              </div>`;
    });
    resultsEl.innerHTML = html;
    resultsEl.querySelectorAll('.query-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        const item = results[idx];
        if (item) renderDetailModal(item.question);
      });
    });
  } catch (e) {
    resultsEl.innerHTML = '<div style="color:#c44536;">加载失败</div>';
  }
}

// ---------- 启动 ----------
init();