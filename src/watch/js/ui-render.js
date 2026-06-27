import { stripImages, escapeHtml, getOptionLetter } from './utils.js';

// ---------- 首页 ----------
export function renderHome(history) {
  const container = document.getElementById('content');
  const htmlHistory = history.length === 0
    ? '<div style="font-size:7px;color:#999;">无记录</div>'
    : history.slice(0, 5).map(rec => {
        const date = new Date(rec.timestamp).toLocaleDateString();
        const cls = rec.passed ? 'history-pass' : 'history-fail';
        return `<div class="history-item">
                  <span>${date} ${rec.type}类 ${rec.score}/${rec.total}</span>
                  <span class="${cls}">${rec.passed ? '合格' : '不合格'}</span>
                </div>`;
      }).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">刷题练习</div>
      <button class="btn" id="practice-btn-A">A类</button>
      <button class="btn" id="practice-btn-B">B类</button>
      <button class="btn" id="practice-btn-C">C类</button>
    </div>
    <div class="card">
      <div class="card-title">模拟考试</div>
      <button class="btn" id="exam-btn-A">A类考试</button>
      <button class="btn" id="exam-btn-B">B类考试</button>
      <button class="btn" id="exam-btn-C">C类考试</button>
    </div>
    <div class="card">
      <div class="card-title">历史记录</div>
      <div id="history-list">${htmlHistory}</div>
    </div>
    <div class="card">
      <div class="card-title">题目查询</div>
      <div class="query-row">
        <input type="text" id="query-input" class="query-input" placeholder="ID或关键词(只显示前20条)">
        <button class="query-btn" id="query-btn">查</button>
      </div>
      <div id="query-results" class="query-results"></div>
    </div>
    <div style="text-align:center;font-size:7px;color:#5d7184;padding:1px 0;">BH6RKW</div>
    <div style="text-align:center;font-size:7px;color:#5d7184;padding:1px 0;">萌ICP备20265973号</div>
  `;
}

// ---------- 题目界面 ----------
export function renderQuestionScreen(question, index, total, isExam) {
  const container = document.getElementById('content');
  const mode = isExam ? '考试' : '练习';
  const type = window._currentType || '';
  const timerHtml = isExam ? '<span id="timer-display"></span>' : '';

  container.innerHTML = `
    <div class="question-header">
      <span>${mode} ${type}类</span>
      <span id="progress-text">${index+1}/${total}</span>
      ${timerHtml}
    </div>
    <div class="question-text" id="q-text"></div>
    <div id="options-area"></div>
    <div class="feedback" id="feedback" style="display:none;"></div>
    <div class="nav-row">
      <button class="btn" id="prev-btn">上一题</button>
      <button class="btn" id="next-btn">下一题</button>
      <button class="btn primary" id="confirm-btn" style="display:none;">确定</button>
    </div>
    <div class="nav-row">
      ${isExam ? '<button class="btn primary" id="submit-exam">交卷</button>' : ''}
      <button class="btn danger" id="exit-btn">退出</button>
    </div>
    <div style="text-align:center;font-size:7px;color:#5d7184;padding:4px 0;">BH6RKW</div>
    <div style="text-align:center;font-size:7px;color:#5d7184;padding:1px 0;">萌ICP备20265973号</div>
  `;
}

// ---------- 更新题目内容 ----------
export function updateQuestionContent(question, userAnswer, optionOrder, optionMap, isMulti, feedback) {
  const qText = document.getElementById('q-text');
  if (qText) qText.textContent = stripImages(question.question);

  const area = document.getElementById('options-area');
  if (!area) return;
  area.innerHTML = '';

  const order = optionOrder || [];
  order.forEach((optIdx, pos) => {
    const opt = question.options[optIdx];
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = getOptionLetter(pos) + '. ' + opt.text;
    let selected = false;
    if (userAnswer) {
      if (Array.isArray(userAnswer)) selected = userAnswer.includes(opt.value);
      else selected = userAnswer === opt.value;
    }
    if (selected) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      const event = new CustomEvent('option-click', {
        detail: { index: window._currentIndex, value: opt.value, isMulti }
      });
      document.dispatchEvent(event);
    });
    area.appendChild(btn);
  });

  const fb = document.getElementById('feedback');
  if (feedback) {
    fb.style.display = 'block';
    fb.className = 'feedback ' + (feedback.correct ? 'correct' : 'wrong');
    fb.textContent = feedback.correct ? '正确' : '错误';
  } else {
    fb.style.display = 'none';
  }

  const confirmBtn = document.getElementById('confirm-btn');
  const nextBtn = document.getElementById('next-btn');
  const idx = window._currentIndex;
  const answered = window._answered && window._answered[idx];
  if (isMulti) {
    if (answered) {
      confirmBtn.style.display = 'none';
      nextBtn.style.display = 'inline-block';
    } else {
      confirmBtn.style.display = 'inline-block';
      nextBtn.style.display = 'none';
    }
  } else {
    confirmBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
  }
}

// ---------- 结果界面 ----------
export function renderResult(score, total, passed, timeStr) {
  const container = document.getElementById('content');
  container.innerHTML = `
    <div class="result-box">
      <div class="score-number">${score}</div>
      <div>答对 ${score}/${total}</div>
      <div class="pass-tag ${passed ? 'pass' : 'fail'}">${passed ? '合格' : '不合格'}</div>
      <div>用时 ${timeStr}</div>
      <button class="btn primary" id="back-main">返回</button>
    </div>
    <div style="text-align:center;font-size:7px;color:#5d7184;padding:4px 0;">BH6RKW</div>
    <div style="text-align:center;font-size:7px;color:#5d7184;padding:1px 0;">萌ICP备20265973号</div>
  `;
}

// ---------- 详情模态框 ----------
export function renderDetailModal(question) {
  let modal = document.getElementById('detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'detail-modal';
    modal.innerHTML = `
      <div id="detail-body"></div>
      <button class="btn danger" id="detail-close">关闭</button>
    `;
    document.body.appendChild(modal);
    document.getElementById('detail-close').addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }
  modal.style.display = 'flex';

  const body = document.getElementById('detail-body');
  const qText = stripImages(question.question);
  
  // 提取图片标记
  const imageMatches = question.question.match(/\[image:\s*([^\]]+)\]/g);
  let imagesHtml = '';
  if (imageMatches) {
    imageMatches.forEach(match => {
      const fileName = match.replace(/\[image:\s*|\]/g, '').trim();
      // 注意路径改为 static/img/
      imagesHtml += `<img src="/static/img/${fileName}" style="max-width:100%; margin:2px 0; border-radius:4px;" onerror="this.style.display='none'">`;
    });
  }

  let optsHtml = '';
  question.options.forEach((opt, idx) => {
    optsHtml += `<div>${getOptionLetter(idx)}. ${opt.text}</div>`;
  });
  let ansLetters = '';
  for (const val of question.answer) {
    const idx = question.options.findIndex(o => o.value === val);
    if (idx !== -1) ansLetters += getOptionLetter(idx);
  }
  body.innerHTML = `
    <div style="font-weight:600;color:#1a4d6f;">${question.id}</div>
    <div style="margin:6px 0;">${qText}</div>
    ${imagesHtml}
    <div style="margin-top:8px;">${optsHtml}</div>
    <div style="margin-top:6px;color:#2e7d32;">正确答案：${ansLetters}</div>
  `;
}