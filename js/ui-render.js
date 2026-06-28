// ui-render.js
import { PAGE_SIZE } from './state.js';
import { SPECIAL_CHAR_REGEX } from './utils.js';

// ---------- 通用：为特殊字符添加 fallback 字体包裹 ----------
export function applyFallbackFont(container) {
  if (!container) return;
  const textNodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.parentElement?.classList.contains('fallback-char')) {
        return NodeFilter.FILTER_REJECT;
      }
      SPECIAL_CHAR_REGEX.lastIndex = 0;
      if (SPECIAL_CHAR_REGEX.test(node.textContent)) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    }
  });

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent;
    const parent = textNode.parentNode;
    if (!parent) return;

    const isMark = parent.tagName === 'MARK';
    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    SPECIAL_CHAR_REGEX.lastIndex = 0;

    let match;
    while ((match = SPECIAL_CHAR_REGEX.exec(text)) !== null) {
      const idx = match.index;
      if (idx > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
      }
      const span = document.createElement('span');
      span.className = 'fallback-char';
      span.textContent = match[0];
      fragment.appendChild(span);
      lastIdx = idx + match[0].length;
    }
    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    if (isMark) {
      const mark = document.createElement('mark');
      mark.appendChild(fragment);
      parent.parentNode.replaceChild(mark, parent);
    } else {
      parent.replaceChild(fragment, textNode);
    }
  });
}

// ---------- 渲染选项 ----------
export function renderOptions(question, index, optionOrders, optionMaps, userAnswers) {
  const container = document.getElementById('options-container');
  container.innerHTML = '';

  const order = optionOrders[index] || [];
  const isMulti = question.answer.length > 1;
  const currentAnswer = userAnswers[index];

  order.forEach((optIdx, pos) => {
    const opt = question.options[optIdx];
    let optText = opt.text;
    optText = optText.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, src) => {
      return `<img src="${src}" alt="${alt}" class="option-image">`;
    });

    const div = document.createElement('div');
    div.className = 'option';

    const inputType = isMulti ? 'checkbox' : 'radio';
    const name = isMulti ? 'q-' + index : 'question';
    const id = 'opt-' + index + '-' + pos;
    const checked = currentAnswer
      ? isMulti
        ? currentAnswer.includes(opt.value)
        : currentAnswer === opt.value
      : false;

    div.innerHTML = `
      <input type="${inputType}" id="${id}" name="${name}" value="${opt.value}" ${checked ? 'checked' : ''}>
      <label for="${id}">${String.fromCharCode(65 + pos)}. ${optText}</label>
    `;

    setTimeout(() => {
      const label = div.querySelector('label');
      if (label && label.offsetHeight > 32) {
        div.classList.add('multiline');
      }
    }, 10);

    div.querySelector('input').addEventListener('change', (e) => {
      const value = opt.value;
      if (isMulti) {
        const event = new CustomEvent('option-change', {
          detail: { index, value, isMulti, checked: e.target.checked }
        });
        document.dispatchEvent(event);
      } else {
        const event = new CustomEvent('option-change', {
          detail: { index, value, isMulti: false }
        });
        document.dispatchEvent(event);
      }
    });

    if (checked) div.classList.add('selected');
    container.appendChild(div);
  });
}

// ---------- 更新选项选中状态 ----------
export function updateSelectedOptions() {
  document.querySelectorAll('.option').forEach((el) => {
    const input = el.querySelector('input');
    if (input && input.checked) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
}

// ---------- 显示练习反馈 ----------
export function showPracticeFeedback(isCorrect) {
  const el = document.getElementById('practice-feedback');
  el.classList.remove('correct', 'incorrect');
  if (isCorrect) {
    el.textContent = '回答正确';
    el.classList.add('correct');
  } else {
    el.textContent = '回答错误，已记入错题本';
    el.classList.add('incorrect');
  }
}

// ---------- 显示正确答案提示 ----------
export function showCorrectAnswerHint(question, isCorrect, optionMaps, currentIndex) {
  const el = document.getElementById('correct-answer-hint');
  if (!el) return;
  if (isCorrect) {
    el.style.display = 'none';
    return;
  }
  const map = optionMaps[currentIndex] || {};
  const letters = question.answer.split('').map((v) => map[v] || v).join('、');
  el.textContent = '正确答案：' + letters;
  el.style.display = 'block';
}

// ---------- 渲染进度 ----------
export function renderProgress(current, total) {
  document.getElementById('progress').textContent = current + 1;
  document.getElementById('progress-fill').style.width = ((current + 1) / total * 100) + '%';
}

// ---------- 显示/隐藏屏幕 ----------
export function hideAllScreens() {
  document.getElementById('start-screen').classList.add('screen-hidden');
  document.getElementById('exam-screen').classList.add('screen-hidden');
  document.getElementById('result-screen').classList.add('screen-hidden');
}

export function showStartScreen() {
  hideAllScreens();
  document.getElementById('start-screen').classList.remove('screen-hidden');
}

export function showExamScreen() {
  hideAllScreens();
  document.getElementById('exam-screen').classList.remove('screen-hidden');
}

export function showResultScreen() {
  hideAllScreens();
  document.getElementById('result-screen').classList.remove('screen-hidden');
}

// ---------- 加载遮罩 ----------
export function toggleLoadingOverlay(show, message = '加载中...') {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-message').textContent = message;
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// ---------- 渲染历史记录 ----------
export function renderHistory(history, onViewWrong) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">暂无考试记录</div>';
    return;
  }

  let html = '';
  history.forEach((record, idx) => {
    const dateStr = new Date(record.timestamp).toLocaleString();
    const passClass = record.passed ? 'history-pass' : 'history-fail';
    const passText = record.passed ? '合格' : '不合格';

    html += `
      <div class="history-item" data-idx="${idx}">
        <div class="history-item-header">
          <input type="checkbox" class="history-checkbox" data-index="${idx}" id="hist-cb-${idx}">
          <label for="hist-cb-${idx}" class="history-title">
            <strong>${record.type}类</strong>
            <span class="history-score">${record.score}/${record.total}</span>
            <span class="${passClass}">${passText}</span>
            <span class="history-time">${record.timeUsedStr}</span>
          </label>
        </div>
        <div class="history-item-footer">
          <span class="history-date">${dateStr}</span>
          ${record.wrongIds && record.wrongIds.length ? `<span class="history-view-wrong" data-idx="${idx}">查看错题</span>` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.history-view-wrong').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      if (!isNaN(idx) && onViewWrong) onViewWrong(idx);
    });
  });
}

// ---------- 分页控件生成（仅 HTML） ----------
function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) return '';

  let html = '<div class="pagination-controls">';
  html += `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;

  let pages = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    pages = [1, 2, 3, 4, '...', totalPages];
  } else if (currentPage >= totalPages - 2) {
    pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }

  pages.forEach((p) => {
    if (p === '...') {
      html += '<span class="page-ellipsis">...</span>';
    } else {
      html += `<button class="page-btn" data-page="${p}" ${currentPage === p ? 'disabled' : ''}>${p}</button>`;
    }
  });

  html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
  html += `
    <span class="goto-box">
      跳至 <input type="number" id="page-goto-input" min="1" max="${totalPages}" value="${currentPage}" class="goto-input" style="width:60px;"> 页
      <button id="page-goto-btn" class="goto-btn">Go</button>
    </span>
  `;
  html += '</div>';

  return html;
}

// ---------- 加载搜索结果的图片 ----------
function loadSearchImages(container) {
  container.querySelectorAll('.image-placeholder').forEach((el) => {
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
}

// ---------- 渲染搜索结果（含分页事件绑定） ----------
export function renderSearchResults(results, keyword, currentPage, totalPages, onPageChange) {
  //console.log('[renderSearchResults] 被调用', { resultsLength: results?.length, keyword, currentPage, totalPages });

  const container = document.getElementById('query-results');
  const paginationTop = document.getElementById('query-pagination-top');

  if (!container) {
    console.error('找不到 #query-results 元素');
    return;
  }
  if (!paginationTop) {
    console.error('找不到 #query-pagination-top 元素');
    return;
  }

  // 清除旧的事件监听
  paginationTop.onclick = null;
  paginationTop.onkeypress = null;

  if (!results || results.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#7f8c8d;">未找到匹配的题目</p>';
    paginationTop.innerHTML = '';
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = results.slice(start, end);

  // 渲染分页控件
  if (totalPages > 1) {
    paginationTop.innerHTML = renderPagination(currentPage, totalPages);

    // 绑定点击事件（事件委托）
    paginationTop.onclick = function(e) {
      //console.log('[分页] 点击事件触发', e.target);
      // 处理页码按钮
      const btn = e.target.closest('.page-btn');
      if (btn) {
        const page = btn.dataset.page;
        //console.log('[分页] 点击的按钮 page =', page);
        if (page === 'prev') {
          if (currentPage > 1) onPageChange(currentPage - 1);
        } else if (page === 'next') {
          if (currentPage < totalPages) onPageChange(currentPage + 1);
        } else if (page !== '...') {
          onPageChange(parseInt(page, 10));
        }
        return;
      }
      // 处理“跳转”按钮
      if (e.target.id === 'page-goto-btn' || e.target.closest('#page-goto-btn')) {
        const input = document.getElementById('page-goto-input');
        if (input) {
          let page = parseInt(input.value, 10);
          if (isNaN(page) || page < 1) page = 1;
          if (page > totalPages) page = totalPages;
          if (page !== currentPage) onPageChange(page);
        }
      }
    };

    // 绑定输入框回车事件
    paginationTop.onkeypress = function(e) {
      if (e.target.id === 'page-goto-input' && e.key === 'Enter') {
        const goBtn = document.getElementById('page-goto-btn');
        if (goBtn) goBtn.click();
      }
    };
  } else {
    paginationTop.innerHTML = '';
  }

  // 渲染题目列表
  let html = '';
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('(' + escapedKeyword + ')', 'gi');

  pageItems.forEach(({ question, types }) => {
    const typeDisplay = types.join('/');
    let questionHtml = question.question;
    const imageRegex = /\[image:\s*([^\]]+)\]/g;
    const parts = [];
    let lastIdx = 0;
    let match;
    while ((match = imageRegex.exec(questionHtml)) !== null) {
      parts.push(questionHtml.slice(lastIdx, match.index));
      parts.push(`<span class="image-placeholder" data-img-src="imageswebp/${match[1]}"></span>`);
      lastIdx = match.index + match[0].length;
    }
    parts.push(questionHtml.slice(lastIdx));

    for (let i = 0; i < parts.length; i++) {
      if (typeof parts[i] === 'string' && !parts[i].includes('image-placeholder')) {
        parts[i] = parts[i].replace(regex, '<mark>$1</mark>');
      }
    }
    const finalHtml = parts.join('');

    let optionsHtml = '';
    question.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      let text = opt.text.replace(regex, '<mark>$1</mark>');
      optionsHtml += `<div class="option" style="cursor:default;">${letter}. ${text}</div>`;
    });

    let answerLetters = '';
    for (const val of question.answer) {
      const idx = question.options.findIndex(o => o.value === val);
      if (idx !== -1) answerLetters += String.fromCharCode(65 + idx);
    }

    html += `
      <div class="query-item">
        <div class="badge">${typeDisplay}类题库</div>
        <h4>${question.id}</h4>
        <div class="question-text">${finalHtml}</div>
        <div class="options">${optionsHtml}</div>
        <div class="correct-answer">正确答案：${answerLetters}</div>
      </div>
    `;
  });

  container.innerHTML = html;
  applyFallbackFont(container);
  loadSearchImages(container);
}