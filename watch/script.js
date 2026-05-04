(function() {
    const questionBanks = { A: null, B: null, C: null };
    const examConfig = {
        A: { total: 40, time: 40, pass: 30 },
        B: { total: 60, time: 60, pass: 45 },
        C: { total: 90, time: 90, pass: 70 }
    };
    const WRONG_KEYS = { A: 'ham_wrong_A', B: 'ham_wrong_B', C: 'ham_wrong_C' };
    const FAVORITE_KEYS = { A: 'ham_favorite_A', B: 'ham_favorite_B', C: 'ham_favorite_C' };
    const HISTORY_KEY = 'exam_history';

    let currentMode = '';       // 'exam','practice','query'
    let currentType = '';
    let currentQuestions = [];
    let userAnswers = [];
    let currentIndex = 0;
    let optionOrders = [];
    let optionMappings = [];
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;
    let queryResults = [];
    let queryKeyword = '';

    // 存储
    function getWrongIds(type) { return JSON.parse(localStorage.getItem(WRONG_KEYS[type]) || '[]'); }
    function saveWrongIds(type, ids) { localStorage.setItem(WRONG_KEYS[type], JSON.stringify(ids)); }
    function addWrongItem(id, type) {
        const ids = getWrongIds(type);
        if (!ids.includes(id)) { ids.push(id); saveWrongIds(type, ids); }
    }
    function getHistory() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }

    // 题库加载
    function loadQuestionBank(type) {
        return new Promise((resolve, reject) => {
            if (questionBanks[type]) return resolve(questionBanks[type]);
            showLoading(true, '加载'+type+'类...');
            const script = document.createElement('script');
            script.src = '../data_' + type + '.js';
            script.onload = () => {
                try {
                    const bank = eval('questions_' + type);
                    if (bank && Array.isArray(bank)) {
                        questionBanks[type] = bank;
                        showLoading(false);
                        resolve(bank);
                    } else { reject(new Error('格式错误')); }
                } catch(e) { reject(e); }
            };
            script.onerror = () => reject(new Error('加载失败'));
            document.head.appendChild(script);
        });
    }

    function showLoading(show, msg) {
        const overlay = document.getElementById('loading-overlay');
        document.getElementById('loading-msg').textContent = msg || '加载中';
        overlay.classList.toggle('hidden', !show);
    }

    // 工具
    const shuffleArray = arr => { for (let i = arr.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const generateOptionOrder = count => shuffleArray([...Array(count).keys()]);
    const checkAnswer = (q, ans) => Array.isArray(ans) ? ans.join('') === q.answer : ans === q.answer;

    const contentEl = document.getElementById('content');

    // 渲染主界面 (查询 + 历史 + 练习三类按钮)
    function renderMain() {
        const history = getHistory().slice(0, 5);
        let histHtml = history.length === 0 ? '<div style="font-size:7px;color:#999;">无记录</div>' :
            history.map((r, i) => {
                const dateStr = new Date(r.timestamp).toLocaleDateString();
                const passClass = r.passed ? 'history-pass' : 'history-fail';
                return `<div class="history-item">
                    <span>${dateStr} ${r.type}类 ${r.score}/${r.total}</span>
                    <span class="${passClass}">${r.passed?'合格':'不合格'}</span>
                </div>`;
            }).join('');

        contentEl.innerHTML = `
            <!-- 1. 刷题练习 -->
            <div class="card">
                <div class="card-title">刷题练习</div>
                <button class="btn" id="practice-btn-A">A类</button>
                <button class="btn" id="practice-btn-B">B类</button>
                <button class="btn" id="practice-btn-C">C类</button>
            </div>
            <!-- 2. 模拟考试 -->
            <div class="card">
                <div class="card-title">模拟考试</div>
                <button class="btn" id="exam-btn-A">A类考试</button>
                <button class="btn" id="exam-btn-B">B类考试</button>
                <button class="btn" id="exam-btn-C">C类考试</button>
            </div>
            <!-- 3. 历史记录 -->
            <div class="card">
                <div class="card-title">历史记录</div>
                <div id="history-list">${histHtml}</div>
            </div>
            <!-- 4. 题目查询 -->
            <div class="card">
                <div class="card-title">题目查询</div>
                <div class="query-row">
                    <input type="text" id="query-input" class="query-input" placeholder="ID或关键词">
                    <button class="query-btn" id="query-btn">查</button>
                </div>
                <div id="query-results" class="query-results"></div>
            </div>
            <!-- 页尾 -->
            <div style="text-align:center;font-size:7px;color:#5d7184;padding:4px 0;">© BH6RKW</div>
            <div style="text-align:center;font-size:7px;color:#5d7184;padding:1px 0;">萌ICP备20265973号</div>
        `;
        bindMainEvents();
    }

    function bindMainEvents() {
        // 查询
        document.getElementById('query-btn').addEventListener('click', performQuery);
        document.getElementById('query-input').addEventListener('keypress', e => e.key==='Enter' && performQuery());
        // 练习按钮 -> 弹出顺序选择
        document.querySelectorAll('[id^="practice-btn-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.id.split('-')[2];
                showOrderModal(type, 'practice');
            });
        });
        // 考试按钮 -> 直接开始考试
        document.querySelectorAll('[id^="exam-btn-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.id.split('-')[2];
                startExam(type);
            });
        });
    }

    // 查询功能
    async function performQuery() {
        const keyword = document.getElementById('query-input').value.trim();
        if (!keyword) return;
        queryKeyword = keyword;
        const queryResEl = document.getElementById('query-results');
        queryResEl.innerHTML = '<div style="font-size:7px;">搜索中...</div>';
        const types = ['A','B','C'];
        const results = [];
        try {
            for (let t of types) {
                if (!questionBanks[t]) await loadQuestionBank(t);
                const bank = questionBanks[t];
                const lowerKW = keyword.toLowerCase();
                bank.forEach(q => {
                    let match = false;
                    if (q.id === keyword) match = true;
                    else if (q.question.toLowerCase().includes(lowerKW)) match = true;
                    else {
                        for (let opt of q.options) {
                            if (opt.text.toLowerCase().includes(lowerKW)) { match = true; break; }
                        }
                    }
                    if (match) results.push({ question: q, type: t });
                });
            }
        } catch(e) {
            queryResEl.innerHTML = '<div style="color:#c44536;">加载失败</div>';
            return;
        }
        queryResults = results.slice(0, 20);
        if (results.length === 0) {
            queryResEl.innerHTML = '<div style="font-size:7px;">无结果</div>';
            return;
        }
        let html = '';
        queryResults.forEach(r => {
            const q = r.question;
            html += `<div class="query-item">
                <span style="color:#1a4d6f;">${q.id}</span> ${q.question.substring(0, 30)}...
            </div>`;
        });
        queryResEl.innerHTML = html;
    }

    // 顺序选择弹窗
    function showOrderModal(type, mode) {
        const modal = document.getElementById('order-modal');
        modal.classList.remove('hidden');
        // 保存当前类型和模式到临时变量
        modal._type = type;
        modal._mode = mode;
    }
    document.getElementById('modal-cancel').addEventListener('click', () => {
        document.getElementById('order-modal').classList.add('hidden');
    });
    document.querySelectorAll('#order-modal [data-order]').forEach(btn => {
        btn.addEventListener('click', () => {
            const order = btn.dataset.order;
            const type = document.getElementById('order-modal')._type;
            const mode = document.getElementById('order-modal')._mode;
            document.getElementById('order-modal').classList.add('hidden');
            if (mode === 'practice') {
                startPractice(type, order);
            }
            // 其他模式未来可扩展
        });
    });

    // 开始考试
    async function startExam(type) {
        try {
            const bank = await loadQuestionBank(type);
            const config = examConfig[type];
            const shuffled = shuffleArray([...bank]);
            currentQuestions = shuffled.slice(0, config.total);
            currentMode = 'exam';
            currentType = type;
            userAnswers = new Array(currentQuestions.length).fill(null);
            optionOrders = currentQuestions.map(q => generateOptionOrder(q.options.length));
            optionMappings = optionOrders.map((order, i) => {
                const map = {};
                order.forEach((idx, disp) => { map[currentQuestions[i].options[idx].value] = String.fromCharCode(65 + disp); });
                return map;
            });
            currentIndex = 0;
            timeLeft = config.time * 60;
            startTime = Date.now();
            clearTimer();
            startTimer();
            renderExamUI();
            showQuestion(currentIndex);
        } catch(e) { alert('题库加载失败'); }
    }

    // 开始练习
    async function startPractice(type, order) {
        try {
            const bank = await loadQuestionBank(type);
            let questions = [...bank];
            if (order === 'asc') { /* keep */ }
            else if (order === 'desc') { questions.reverse(); }
            else { questions = shuffleArray(questions); }
            currentQuestions = questions;
            currentMode = 'practice';
            currentType = type;
            userAnswers = new Array(currentQuestions.length).fill(null);
            optionOrders = currentQuestions.map(q => generateOptionOrder(q.options.length));
            optionMappings = optionOrders.map((order, i) => {
                const map = {};
                order.forEach((idx, disp) => { map[currentQuestions[i].options[idx].value] = String.fromCharCode(65 + disp); });
                return map;
            });
            currentIndex = 0;
            clearTimer();
            renderExamUI();
            showQuestion(currentIndex);
        } catch(e) { alert('题库加载失败'); }
    }

    // 答题界面
    function renderExamUI() {
        contentEl.innerHTML = `
            <div class="question-header">
                <span>${currentMode === 'exam' ? '考试' : '练习'} ${currentType}类</span>
                <span id="progress-text">1/${currentQuestions.length}</span>
                ${currentMode === 'exam' ? '<span id="timer-display"></span>' : ''}
            </div>
            <div class="question-text" id="q-text"></div>
            <div id="options-area"></div>
            <div class="feedback" id="feedback" style="display:none;"></div>
            <div class="nav-row">
                <button class="btn" id="prev-btn">上一题</button>
                <button class="btn" id="next-btn">下一题</button>
            </div>
            <div class="nav-row">
                ${currentMode === 'exam' ? '<button class="btn primary" id="submit-exam">交卷</button>' : ''}
                <button class="btn danger" id="exit-btn">退出</button>
            </div>
        `;
        bindExamEvents();
        if (currentMode === 'exam') updateTimerDisplay();
    }
    function bindExamEvents() {
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentIndex > 0) { currentIndex--; showQuestion(currentIndex); }
        });
        document.getElementById('next-btn').addEventListener('click', () => {
            if (currentIndex < currentQuestions.length - 1) {
                currentIndex++;
                showQuestion(currentIndex);
            }
        });
        document.getElementById('exit-btn').addEventListener('click', () => {
            clearTimer();
            renderMain();
        });
        if (currentMode === 'exam') {
            document.getElementById('submit-exam').addEventListener('click', () => {
                if (confirm('交卷？')) submitExam();
            });
        }
    }

    function showQuestion(index) {
        currentIndex = index;
        const q = currentQuestions[index];
        document.getElementById('progress-text').textContent = (index+1)+'/'+currentQuestions.length;
        document.getElementById('q-text').textContent = q.question.replace(/\[image:.*?\]/g, '');
        const optArea = document.getElementById('options-area');
        optArea.innerHTML = '';
        const order = optionOrders[index];
        order.forEach((optIdx, disp) => {
            const opt = q.options[optIdx];
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = String.fromCharCode(65+disp) + '. ' + opt.text;
            const userAns = userAnswers[index];
            let isSelected = false;
            if (userAns) {
                if (Array.isArray(userAns)) isSelected = userAns.includes(opt.value);
                else isSelected = userAns === opt.value;
            }
            if (isSelected) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                const isMulti = q.answer.length > 1;
                if (isMulti) {
                    let ans = userAnswers[index] || [];
                    if (ans.includes(opt.value)) ans = ans.filter(v => v !== opt.value);
                    else { ans = [...ans, opt.value]; ans.sort(); }
                    userAnswers[index] = ans;
                } else {
                    userAnswers[index] = opt.value;
                }
                showQuestion(index);
            });
            optArea.appendChild(btn);
        });
        const fb = document.getElementById('feedback');
        if (currentMode === 'practice' && userAnswers[index] !== undefined && userAnswers[index] !== null) {
            const isCorrect = checkAnswer(q, userAnswers[index]);
            fb.style.display = 'block';
            fb.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
            fb.textContent = isCorrect ? '正确' : '错误';
            if (!isCorrect) addWrongItem(q.id, currentType);
        } else {
            fb.style.display = 'none';
        }
        updateNavButtons();
    }
    function updateNavButtons() {
        document.getElementById('prev-btn').disabled = currentIndex === 0;
        document.getElementById('next-btn').disabled = currentIndex === currentQuestions.length - 1;
    }

    function submitExam() {
        clearTimer();
        let correctCount = 0;
        currentQuestions.forEach((q, idx) => {
            if (checkAnswer(q, userAnswers[idx])) correctCount++;
            else addWrongItem(q.id, currentType);
        });
        const used = Math.floor((Date.now() - startTime) / 1000);
        const min = Math.floor(used / 60);
        const sec = used % 60;
        // 保存历史记录
        const history = getHistory();
        history.unshift({
            type: currentType,
            score: correctCount,
            total: currentQuestions.length,
            passed: correctCount >= examConfig[currentType].pass,
            timeUsedStr: String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0'),
            timestamp: Date.now()
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderResult(correctCount, currentQuestions.length, examConfig[currentType].pass, min, sec);
    }

    function renderResult(score, total, pass, min, sec) {
        const passed = score >= pass;
        contentEl.innerHTML = `
            <div class="result-box">
                <div class="score-number">${score}</div>
                <div>答对 ${score}/${total}</div>
                <div class="pass-tag ${passed?'pass':'fail'}">${passed?'合格':'不合格'}</div>
                <div>用时 ${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}</div>
                <button class="btn primary" id="back-main">返回</button>
            </div>
        `;
        document.getElementById('back-main').addEventListener('click', () => renderMain());
    }

    // 计时器
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { clearTimer(); submitExam(); }
        }, 1000);
    }
    function clearTimer() { if (timerInterval) clearInterval(timerInterval); }
    function updateTimerDisplay() {
        const el = document.getElementById('timer-display');
        if (!el) return;
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        el.textContent = '剩余'+String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0');
    }

    // 启动
    renderMain();
})();