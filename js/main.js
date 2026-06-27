// main.js - 最终修复版（包含收藏/错题计数更新）
import * as state from './state.js';
import {
  loadQuestionBank, startPractice, startExamByType,
  goToQuestion, nextQuestion, prevQuestion,
  confirmMultipleChoice, submitExam, resetWrongQuestion,
  toggleFavorite, showGotoModal, restorePendingSession
} from './exam-engine.js';
import { performSearch } from './search-engine.js';
import {
  renderHistory, showStartScreen, toggleLoadingOverlay,
  applyFallbackFont, renderSearchResults
} from './ui-render.js';
import {
  getHistory, getTheme, saveTheme, addHistoryRecord, getPending,
  getWrongQuestions   // ← 新增导入
} from './storage.js';
// 注意：不静态导入 getFavorites，在函数中动态导入
import { initSupabase, syncFromCloud, uploadWrongQuestion, uploadFavorites, uploadExamSession } from './sync-supabase.js';
import { EXAM_TYPES } from './config.js';

// ---------- 主题切换 ----------
function initTheme() {
  const theme = getTheme();
  const toggle = document.getElementById('theme-switch');
  if (!toggle) return;

  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    toggle.checked = true;
  } else {
    document.body.classList.remove('dark-mode');
    toggle.checked = false;
  }

  toggle.addEventListener('change', function() {
    if (this.checked) {
      document.body.classList.add('dark-mode');
      saveTheme('dark');
    } else {
      document.body.classList.remove('dark-mode');
      saveTheme('light');
    }
  });
}

// ---------- 启动弹窗 ----------
function shouldShowStartupModal() {
  const hasAgreed = document.cookie.split(';').some(c => c.trim().startsWith('agree_policy=true'));
  const versionEl = document.querySelector('.version');
  const versionText = versionEl ? versionEl.textContent : '版本号：4.0.0.20260627_rc.2';
  const versionMatch = versionText.match(/[\d.]+[_\w.]*/);
  const currentVersion = versionMatch ? versionMatch[0] : '4.0.0.20260627_rc.2';

  const cookieMatch = document.cookie.match(/(?:^|;\s*)notice_version=([^;]+)/);
  const lastVersion = cookieMatch ? cookieMatch[1] : null;

  if (lastVersion === null) return true;
  return !hasAgreed || lastVersion !== currentVersion;
}

function handleStartupModal() {
  const modal = document.getElementById('startup-modal');
  if (!modal) return;

  if (!shouldShowStartupModal()) {
    modal.style.display = 'none';
    return;
  }

  const lastVerEl = document.getElementById('last-version');
  const currentVerEl = document.getElementById('current-version-modal');
  if (lastVerEl && currentVerEl) {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)notice_version=([^;]+)/);
    lastVerEl.textContent = cookieMatch ? cookieMatch[1] : '（首次访问）';
    const versionEl = document.querySelector('.version');
    const versionText = versionEl ? versionEl.textContent : '版本号：4.0.0.20260627_rc.2';
    const versionMatch = versionText.match(/[\d.]+[_\w.]*/);
    currentVerEl.textContent = versionMatch ? versionMatch[0] : '4.0.0.20260627_rc.2';
  }

  const confirmBtn = modal.querySelector('.modal-confirm');
  const agreeCheckbox = document.getElementById('agree-checkbox');
  const hasAgreed = document.cookie.split(';').some(c => c.trim().startsWith('agree_policy=true'));

  const versionEl = document.querySelector('.version');
  const versionText = versionEl ? versionEl.textContent : '版本号：4.0.0.20260627_rc.2';
  const versionMatch = versionText.match(/[\d.]+[_\w.]*/);
  const currentVersion = versionMatch ? versionMatch[0] : '4.0.0.20260627_rc.2';

  if (hasAgreed && getNoticeVersion() !== currentVersion) {
    if (agreeCheckbox) {
      agreeCheckbox.checked = true;
      agreeCheckbox.disabled = true;
    }
    if (confirmBtn) confirmBtn.disabled = false;
  } else {
    if (confirmBtn) confirmBtn.disabled = true;
    if (agreeCheckbox) {
      agreeCheckbox.disabled = false;
      agreeCheckbox.checked = false;
      agreeCheckbox.addEventListener('change', function() {
        confirmBtn.disabled = !this.checked;
      });
    }
  }

  function setAgreeCookie() {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = 'agree_policy=true; expires=' + expires.toUTCString() + '; path=/';
  }

  function setNoticeVersion(version) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = 'notice_version=' + version + '; expires=' + expires.toUTCString() + '; path=/';
  }

  function getNoticeVersion() {
    const match = document.cookie.match(/(?:^|;\s*)notice_version=([^;]+)/);
    return match ? match[1] : null;
  }

  const closeModal = () => {
    if (!hasAgreed) {
      if (!agreeCheckbox || !agreeCheckbox.checked) {
        alert('请先阅读并同意《业余无线电模拟考试系统用户协议隐私许可》');
        return;
      }
      setAgreeCookie();
    }
    setNoticeVersion(currentVersion);
    modal.style.display = 'none';
  };

  if (confirmBtn) {
    confirmBtn.removeEventListener('click', closeModal);
    confirmBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// ---------- 历史记录查看错题 ----------
function viewHistoryWrongDetail(index) {
  const history = getHistory();
  const record = history[index];
  if (!record) return;

  if (window.showWrongDetailModal) {
    window.showWrongDetailModal(index);
  } else {
    alert('查看错题功能暂不可用');
  }
}

// ---------- 搜索事件 ----------
async function handleSearch() {
  const input = document.getElementById('query-input');
  const keyword = input.value.trim();
  if (!keyword) {
    alert('请输入查询关键字');
    return;
  }

  const lower = keyword.toLowerCase();
  if (lower.includes('image') || lower.includes('webp')) {
    alert('查询内容不能包含 "image" 或 "webp"');
    return;
  }
  if (keyword.length > 100) {
    alert('查询内容过长，请精简后重试');
    return;
  }

  const btn = document.getElementById('query-btn');
  const container = document.getElementById('query-results');
  btn.disabled = true;
  btn.textContent = '查询中...';
  container.innerHTML = '<div class="loading-spinner-small" style="text-align:center; padding:20px;">正在搜索题目，请稍候...</div>';

  try {
    const results = await performSearch(keyword);
    state.setSearchResults(results);
    state.setSearchKeyword(keyword);
    state.setCurrentPage(1);
    renderSearchResultsWithPagination(results, keyword);
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p style="text-align:center; color:#c44536;">搜索失败，请重试</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = '查询';
  }
}

function renderSearchResultsWithPagination(results, keyword) {
  const totalPages = Math.ceil(results.length / state.PAGE_SIZE);
  const currentPage = state.getCurrentPage();

  renderSearchResults(
    results,
    keyword,
    currentPage,
    totalPages,
    (page) => {
      state.setCurrentPage(page);
      renderSearchResultsWithPagination(results, keyword);
    }
  );
}

// ---------- 图片预览 ----------
function setupImagePreview() {
  const modal = document.createElement('div');
  modal.className = 'image-preview-modal';
  modal.innerHTML = `
    <span class="image-preview-close">&times;</span>
    <img src="" alt="预览图片">
  `;
  document.body.appendChild(modal);

  const img = modal.querySelector('img');
  const closeBtn = modal.querySelector('.image-preview-close');

  function openPreview(src) {
    img.src = src;
    modal.classList.add('active');
  }

  function closePreview() {
    modal.classList.remove('active');
    setTimeout(() => { img.src = ''; }, 200);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePreview();
  });
  closeBtn.addEventListener('click', closePreview);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closePreview();
  });

  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('.question-image');
    if (target && target.src) {
      e.preventDefault();
      openPreview(target.src);
    }
  });
}

// ---------- 字体加载检测 ----------
function checkFontLoading() {
  if (!document.fonts || !document.fonts.load) return;

  const fontName = 'HYWenhei';
  const testStr = '16px ' + fontName;
  const timeout = 5000;

  if (document.fonts.check(testStr)) return;

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    document.documentElement.setAttribute('data-font-timeout', 'true');
  }, timeout);

  document.fonts.load(testStr)
    .then(() => {
      clearTimeout(timer);
      if (!timedOut) {
        document.documentElement.removeAttribute('data-font-timeout');
      }
    })
    .catch(() => {
      clearTimeout(timer);
      timedOut = true;
      document.documentElement.setAttribute('data-font-timeout', 'true');
    });
}

// ---------- 更新错题和收藏计数 ----------
function updateWrongCounts() {
  ['A', 'B', 'C'].forEach(type => {
    const list = getWrongQuestions(type);
    const el = document.getElementById(`wrong-count-${type}`);
    if (el) el.textContent = list.length;
  });
}

async function updateFavoriteCounts() {
  try {
    const { getFavorites } = await import('./storage.js');
    ['A', 'B', 'C'].forEach(type => {
      const list = getFavorites(type);
      const el = document.getElementById(`favorite-count-${type}`);
      if (el) el.textContent = list.length;
    });
  } catch (e) {
    console.warn('更新收藏计数失败', e);
  }
}

// ---------- 启动 ----------
document.addEventListener('DOMContentLoaded', async function() {
  // 1. 初始化主题
  initTheme();

  // 2. 显示主界面
  showStartScreen();
  toggleLoadingOverlay(false);

  // 3. 更新错题和收藏计数（首页元素已存在）
  updateWrongCounts();
  await updateFavoriteCounts();

  // 4. 预加载题库
  await Promise.allSettled(
    EXAM_TYPES.map(type =>
      loadQuestionBank(type).catch(err => console.error(type + '题库加载失败', err))
    )
  );

  // 5. 更新待做按钮
  updatePendingButtons();

  // 6. 渲染历史记录
  const history = getHistory();
  renderHistory(history, viewHistoryWrongDetail);

  // 7. 应用 fallback 字体
  applyFallbackFont(document.body);

  // 8. 启动弹窗
  handleStartupModal();

  // 9. 字体检测
  checkFontLoading();

  // 10. 图片预览
  setupImagePreview();

  // ========== 事件绑定（统一使用 document.body 事件委托） ==========
  document.body.addEventListener('click', async (e) => {
    // 模拟考试按钮
    const examBtn = e.target.closest('.exam-btn');
    if (examBtn) {
      const type = examBtn.dataset.type;
      startExamByType(type);
      e.preventDefault();
      return;
    }

    // 刷题练习按钮
    const practiceBtn = e.target.closest('.practice-btn');
    if (practiceBtn) {
      const type = practiceBtn.dataset.type;
      const order = practiceBtn.dataset.order;
      try {
        const bank = await loadQuestionBank(type);
        startPractice(type, bank, order, false);
      } catch (err) {
        alert('加载失败：' + err.message);
      }
      e.preventDefault();
      return;
    }

    // 错题练习按钮
    const wrongBtn = e.target.closest('.wrong-practice-btn');
    if (wrongBtn) {
      const type = wrongBtn.dataset.type;
      try {
        const bank = await loadQuestionBank(type);
        startPractice(type, bank, 'asc', true);
      } catch (err) {
        alert('加载失败：' + err.message);
      }
      e.preventDefault();
      return;
    }

    // 收藏练习按钮
    const favBtn = e.target.closest('.favorite-practice-btn');
    if (favBtn) {
      const type = favBtn.dataset.type;
      try {
        const bank = await loadQuestionBank(type);
        const { getFavorites } = await import('./storage.js');
        const favorites = getFavorites(type);
        const filtered = bank.filter(q => favorites.includes(q.id));
        if (filtered.length === 0) {
          alert('当前没有收藏的题目，先去学习题目界面收藏吧！');
          return;
        }
        startPractice(type, bank, 'asc', false, filtered);
      } catch (err) {
        alert('加载失败：' + err.message);
        console.error('[收藏练习] 错误:', err);
      }
      e.preventDefault();
      return;
    }

    // 待做练习按钮
    const pendingBtn = e.target.closest('.pending-btn');
    if (pendingBtn) {
      const type = pendingBtn.dataset.type;
      const order = pendingBtn.dataset.order;
      try {
        const success = await restorePendingSession(type, order);
        if (!success) {
          const bank = await loadQuestionBank(type);
          startPractice(type, bank, order, false);
        }
      } catch (err) {
        alert('加载失败：' + err.message);
      }
      e.preventDefault();
      return;
    }
  });

  // 历史记录折叠
  const historyToggle = document.getElementById('history-toggle');
  const historyContainer = document.getElementById('history-list-container');
  if (historyToggle && historyContainer) {
    historyToggle.addEventListener('click', () => {
      const icon = document.getElementById('history-toggle-icon');
      if (historyContainer.style.maxHeight === '0px' || !historyContainer.style.maxHeight) {
        historyContainer.style.maxHeight = '400px';
        icon.textContent = '▲';
      } else {
        historyContainer.style.maxHeight = '0px';
        icon.textContent = '▼';
      }
    });
  }

  // 历史全选
  const selectAll = document.getElementById('history-select-all');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      document.querySelectorAll('.history-checkbox').forEach(cb => {
        cb.checked = e.target.checked;
      });
    });
  }

  // 删除选中历史
  const deleteSelected = document.getElementById('history-delete-selected');
  if (deleteSelected) {
    deleteSelected.addEventListener('click', () => {
      const checked = document.querySelectorAll('.history-checkbox:checked');
      const indices = Array.from(checked).map(cb => parseInt(cb.dataset.index)).filter(i => !isNaN(i));
      if (!indices.length) {
        alert('请先选择要删除的记录');
        return;
      }
      if (confirm('确定删除 ' + indices.length + ' 条记录吗？')) {
        import('./storage.js').then(({ deleteHistoryRecords }) => {
          deleteHistoryRecords(indices);
          const newHistory = getHistory();
          renderHistory(newHistory, viewHistoryWrongDetail);
        });
      }
    });
  }

  // 清空历史
  const clearAll = document.getElementById('history-clear-all');
  if (clearAll) {
    clearAll.addEventListener('click', () => {
      if (confirm('确定清空所有历史记录吗？')) {
        import('./storage.js').then(({ clearAllHistory }) => {
          clearAllHistory();
          const newHistory = getHistory();
          renderHistory(newHistory, viewHistoryWrongDetail);
        });
      }
    });
  }

  // 退出练习
  const exitPracticeBtn = document.getElementById('exit-practice-btn');
  if (exitPracticeBtn) {
    exitPracticeBtn.addEventListener('click', () => {
      const interval = state.getTimerInterval();
      if (interval) clearInterval(interval);
      state.setTimerInterval(null);
      state.setPendingData(null);
      state.setPendingType(null);
      state.setPendingOrder(null);
      state.setPendingIndices([]);
      showStartScreen();
    });
  }

  // 导航按钮
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const confirmBtn = document.getElementById('confirm-btn');
  if (prevBtn) prevBtn.addEventListener('click', prevQuestion);
  if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
  if (confirmBtn) confirmBtn.addEventListener('click', confirmMultipleChoice);

  // 提交考试
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      showSubmitConfirm();
    });
  }

  function showSubmitConfirm() {
    if (!document.getElementById('submit-confirm-css')) {
      const style = document.createElement('style');
      style.id = 'submit-confirm-css';
      style.textContent = `
        .submit-confirm-overlay{display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center}
        .submit-confirm-card{background:#fff;border-radius:16px;max-width:420px;width:90%;padding:28px 24px 20px;box-shadow:0 20px 40px rgba(0,0,0,0.2);text-align:center}
        .submit-confirm-card h3{margin:0 0 20px;color:#1f4662;font-size:1.25rem}
        .submit-confirm-stats{display:flex;justify-content:center;gap:24px;margin-bottom:16px}
        .submit-confirm-stats .stat-item{display:flex;flex-direction:column;align-items:center}
        .submit-confirm-stats .stat-val{font-size:1.75rem;font-weight:700;color:#1f4f73}
        .submit-confirm-stats .stat-label{font-size:0.8rem;color:#7f8c8d;margin-top:2px}
        .submit-confirm-stats .answered .stat-val{color:#27ae60}
        .submit-confirm-stats .unanswered .stat-val{color:#e67e22}
        .submit-confirm-warn{color:#e67e22;font-size:0.85rem;margin:0 0 16px;padding:8px 12px;background:#fef3e2;border-radius:8px}
        .submit-confirm-btns{display:flex;gap:12px;justify-content:center}
        .submit-confirm-cancel,.submit-confirm-ok{border:none;border-radius:10px;padding:10px 28px;font-size:0.95rem;cursor:pointer;transition:opacity .2s}
        .submit-confirm-cancel{background:#ecf0f1;color:#555}
        .submit-confirm-cancel:hover{opacity:.8}
        .submit-confirm-ok{background:#1f4f73;color:#fff}
        .submit-confirm-ok:hover{opacity:.85}
        body.dark-mode .submit-confirm-overlay{background:rgba(0,0,0,0.7)}
        body.dark-mode .submit-confirm-card{background:#1e293b;box-shadow:0 20px 40px rgba(0,0,0,0.5)}
        body.dark-mode .submit-confirm-card h3{color:#e0e0e0}
        body.dark-mode .submit-confirm-stats .stat-val{color:#81b4d9}
        body.dark-mode .submit-confirm-stats .answered .stat-val{color:#4ade80}
        body.dark-mode .submit-confirm-stats .unanswered .stat-val{color:#f59e0b}
        body.dark-mode .submit-confirm-warn{color:#f59e0b;background:#3b2e1a}
        body.dark-mode .submit-confirm-cancel{background:#334155;color:#cbd5e1}
        body.dark-mode .submit-confirm-ok{background:#2563eb;color:#fff}
      `;
      document.head.appendChild(style);
    }

    const answers = state.getAnswers();
    const unanswered = answers.filter(a => a === null || (Array.isArray(a) && a.length === 0)).length;
    const answered = state.getQuestions().length - unanswered;

    const overlay = document.createElement('div');
    overlay.className = 'submit-confirm-overlay';
    overlay.innerHTML = `
      <div class="submit-confirm-card">
        <h3>确认提交</h3>
        <div class="submit-confirm-stats">
          <div class="stat-item"><span class="stat-val">${state.getQuestions().length}</span><span class="stat-label">总题数</span></div>
          <div class="stat-item answered"><span class="stat-val">${answered}</span><span class="stat-label">已作答</span></div>
          <div class="stat-item unanswered"><span class="stat-val">${unanswered}</span><span class="stat-label">未作答</span></div>
        </div>
        ${unanswered > 0 ? `<p class="submit-confirm-warn">还有 ${unanswered} 题未作答，提交后将记为错误。</p>` : ''}
        <div class="submit-confirm-btns">
          <button class="submit-confirm-cancel">继续答题</button>
          <button class="submit-confirm-ok">确认提交</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function removeOverlay() { overlay.remove(); }

    overlay.querySelector('.submit-confirm-cancel').addEventListener('click', removeOverlay);
    overlay.querySelector('.submit-confirm-ok').addEventListener('click', () => {
      removeOverlay();
      submitExam();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) removeOverlay(); });
  }

  // 重置错题
  const resetWrongBtn = document.getElementById('reset-wrong-btn');
  if (resetWrongBtn) resetWrongBtn.addEventListener('click', resetWrongQuestion);

  // 切换错题显示
  const toggleWrongBtn = document.getElementById('toggle-wrong-btn');
  if (toggleWrongBtn) {
    toggleWrongBtn.addEventListener('click', function() {
      const container = document.getElementById('wrong-questions-container');
      container.classList.toggle('hidden');
      this.textContent = container.classList.contains('hidden') ? '查看错题' : '隐藏错题';
    });
  }

  // 返回首页
  const backBtn = document.getElementById('back-to-start-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const interval = state.getTimerInterval();
      if (interval) clearInterval(interval);
      state.setTimerInterval(null);
      state.setPendingData(null);
      state.setPendingType(null);
      state.setPendingOrder(null);
      state.setPendingIndices([]);
      showStartScreen();
    });
  }

  // 收藏
  const favBtn = document.getElementById('favorite-btn');
  if (favBtn) favBtn.addEventListener('click', toggleFavorite);

  // 跳转
  const gotoBtn = document.getElementById('goto-btn');
  if (gotoBtn) gotoBtn.addEventListener('click', showGotoModal);

  // 搜索
  const queryBtn = document.getElementById('query-btn');
  const queryInput = document.getElementById('query-input');
  if (queryBtn) queryBtn.addEventListener('click', handleSearch);
  if (queryInput) queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // ---------- Supabase 云端同步 ----------
  window.addEventListener('supabase-ready', function(e) {
    initSupabase(e.detail.sb, e.detail.user);
    syncFromCloud();
  });

  import('./storage.js').then((storage) => {
    window.toggleWrongQuestion = function(id, correct, type) {
        const result = storage.toggleWrongQuestion(id, correct, type);
        if (window.isSupabaseReady) {
            uploadWrongQuestion(id, type, correct);
        }
        return result;
    };

    window.saveFavorites = function(type, ids) {
        storage.saveFavorites(type, ids);
        if (window.isSupabaseReady) {
            uploadFavorites(type, ids);
        }
    };

    window.addHistoryRecord = function(record) {
        const result = storage.addHistoryRecord(record);
        if (window.isSupabaseReady) {
            uploadExamSession(record);
        }
        return result;
    };
  });

  window.isSupabaseReady = () => {
    return import('./sync-supabase.js').then(module => module.isSupabaseReady());
  };
});

// ---------- 更新待做按钮 ----------
function updatePendingButtons() {
  document.querySelectorAll('.pending-btn').forEach(btn => {
    const type = btn.dataset.type;
    const order = btn.dataset.order;
    const pending = getPending(type, order);
    let unanswered = 0;
    let total = 0;

    if (pending) {
      unanswered = pending.userAnswers.filter(a =>
        a === null || (Array.isArray(a) && a.length === 0)
      ).length;
      total = pending.total;
    } else {
      import('./exam-engine.js').then(({ getCachedQuestions }) => {
        const bank = getCachedQuestions(type);
        if (bank) {
          total = bank.length;
          unanswered = total;
        }
        const orderText = order === 'asc' ? '顺序' : order === 'desc' ? '倒序' : '乱序';
        btn.textContent = orderText + '(' + unanswered + ')';
      });
      return;
    }

    const orderText = order === 'asc' ? '顺序' : order === 'desc' ? '倒序' : '乱序';
    btn.textContent = orderText + '(' + unanswered + ')';
  });
}

// ---------- 暴露函数到全局（兼容旧代码） ----------
window.showWrongDetailModal = function(index) {
  import('./ui-render.js').then((ui) => {
    const history = getHistory();
    const record = history[index];
    if (!record) return;

    import('./exam-engine.js').then((engine) => {
      const bank = engine.getCachedQuestions(record.type);
      if (!bank) {
        alert('无法加载题库，请刷新后重试');
        return;
      }

      const wrongs = [];
      const userAnswers = [];
      record.wrongIds.forEach((id, idx) => {
        const q = bank.find(q => q.id === id);
        if (q) {
          wrongs.push(q);
          userAnswers.push(record.wrongUserAnswers ? record.wrongUserAnswers[idx] : null);
        }
      });

      if (wrongs.length === 0) {
        alert('没有找到对应的错题信息');
        return;
      }

      let html = '<div style="padding:20px;">';
      html += `<h3 style="margin-top:0;">${record.type}类考试 错题详情 (${wrongs.length}题)</h3>`;

      wrongs.forEach((q, idx) => {
        let qText = q.question.replace(/\[image:\s*([^\]]+)\]/g, (_, src) => {
          return `<span class="modal-image-placeholder" data-img-src="imageswebp/${src}"></span>`;
        });

        let optsHtml = '';
        q.options.forEach((opt, idx2) => {
          const letter = String.fromCharCode(65 + idx2);
          optsHtml += `<div style="margin:4px 0;">${letter}. ${opt.text}</div>`;
        });

        let ansLetters = '';
        for (const val of q.answer) {
          const idx2 = q.options.findIndex(o => o.value === val);
          if (idx2 !== -1) ansLetters += String.fromCharCode(65 + idx2);
        }

        let userStr = '未作答';
        const ua = userAnswers[idx];
        if (ua !== undefined && ua !== null) {
          userStr = Array.isArray(ua) ? ua.join('、') : ua;
        }

        html += `
          <div style="border:1px solid #ddd;border-radius:12px;padding:12px;margin-bottom:16px;background:#fafdff;">
            <div style="font-weight:bold;margin-bottom:6px;">题目 ${idx+1} (${q.id})</div>
            <div style="margin-bottom:10px;">${qText}</div>
            <div class="modal-options" style="margin-left:16px;">${optsHtml}</div>
            <div style="margin-top:8px;color:#c44536;"><strong>您的答案：</strong> ${userStr}</div>
            <div style="margin-top:4px;color:#2e7d32;"><strong>正确答案：</strong> ${ansLetters}</div>
          </div>
        `;
      });
      html += '<div style="text-align:center;margin-top:20px;"><button id="close-wrong-modal" class="small-btn">关闭</button></div></div>';

      let modal = document.getElementById('wrong-detail-modal');
      if (modal) modal.remove();

      modal = document.createElement('div');
      modal.id = 'wrong-detail-modal';
      modal.className = 'wrong-detail-modal';
      modal.innerHTML = `
        <div class="wrong-detail-content">
          <span class="wrong-detail-close">&times;</span>
          <div class="wrong-detail-body">${html}</div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelectorAll('.modal-image-placeholder').forEach(el => {
        const src = el.dataset.imgSrc;
        const img = new Image();
        img.onload = () => {
          const imgEl = document.createElement('img');
          imgEl.src = src;
          imgEl.className = 'question-image';
          imgEl.style.maxWidth = '100%';
          imgEl.style.margin = '10px 0';
          el.parentNode.replaceChild(imgEl, el);
        };
        img.onerror = () => el.remove();
        img.src = src;
      });

      const close = () => modal.remove();
      modal.querySelector('.wrong-detail-close').addEventListener('click', close);
      modal.querySelector('#close-wrong-modal').addEventListener('click', close);
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
      applyFallbackFont(modal);
    });
  });
};