(function() {
    // 题库缓存
    const questionBanks = { A: null, B: null, C: null };
    const examConfig = {
        A: { total: 40, time: 40, pass: 30 },
        B: { total: 60, time: 60, pass: 45 },
        C: { total: 90, time: 90, pass: 70 }
    };
    const WRONG_KEYS = { A: 'ham_wrong_A', B: 'ham_wrong_B', C: 'ham_wrong_C' };
    const FAVORITE_KEYS = { A: 'ham_favorite_A', B: 'ham_favorite_B', C: 'ham_favorite_C' };

    let currentMode = '';          // 'exam' or 'practice'
    let currentType = '';
    let currentQuestions = [];
    let userAnswers = [];
    let currentIndex = 0;
    let optionOrders = [];
    let optionMappings = [];
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;
    let answeredFeedback = false;  // 是否已作答并看过结果

    // ---------- 本地存储 ----------
    function getWrongIds(type) {
        const raw = localStorage.getItem(WRONG_KEYS[type]);
        return raw ? JSON.parse(raw) : [];
    }
    function saveWrongIds(type, ids) {
        localStorage.setItem(WRONG_KEYS[type], JSON.stringify(ids));
    }
    function addWrongItem(id, type) {
        const ids = getWrongIds(type);
        if (!ids.includes(id)) {
            ids.push(id);
            saveWrongIds(type, ids);
        }
    }
    function getFavoriteIds(type) {
        const raw = localStorage.getItem(FAVORITE_KEYS[type]);
        return raw ? JSON.parse(raw) : [];
    }
    function saveFavoriteIds(type, ids) {
        localStorage.setItem(FAVORITE_KEYS[type], JSON.stringify(ids));
    }

    // ---------- 题库加载 ----------
    function loadQuestionBank(type) {
        return new Promise((resolve, reject) => {
            if (questionBanks[type]) {
                resolve(questionBanks[type]);
                return;
            }
            showLoading(true, '加载' + type + '类题库...');
            const script = document.createElement('script');
            const versionEl = document.querySelector('.version');
            const versionMatch = versionEl ? versionEl.textContent.match(/[\d.]+[_\w.]*/) : null;
            const version = versionMatch ? versionMatch[0] : '3.9.16.20260502_beta.4';
            script.src = 'data_' + type + '.js?v=' + version;
            script.onload = () => {
                try {
                    const bank = eval('questions_' + type);
                    if (bank && Array.isArray(bank)) {
                        questionBanks[type] = bank;
                        showLoading(false);
                        resolve(bank);
                    } else {
                        reject(new Error('题库格式错误'));
                    }
                } catch (e) {
                    reject(e);
                }
            };
            script.onerror = () => reject(new Error('题库文件加载失败'));
            document.head.appendChild(script);
        });
    }

    function showLoading(show, msg) {
        const overlay = document.getElementById('loading-overlay');
        document.getElementById('loading-message').textContent = msg || '加载中...';
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    }

    // ---------- 工具函数 ----------
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function generateOptionOrder(count) {
        return shuffleArray([...Array(count).keys()]);
    }

    function mapAnswers(question, userVal) {
        const map = optionMappings[currentIndex];
        if (!map) return '';
        if (Array.isArray(userVal)) {
            return userVal.map(v => map[v] || v).join('');
        }
        return map[userVal] || userVal;
    }

    function checkAnswer(question, userAns) {
        const correct = question.answer;
        if (Array.isArray(userAns)) return userAns.join('') === correct;
        return userAns === correct;
    }

    // ---------- UI 渲染 ----------
    const mainEl = document.getElementById('main');

    function renderMenu() {
        mainEl.innerHTML = `
            <div class="menu-card">
                <div class="menu-title">选择考试类别</div>
                <button class="btn" data-action="exam" data-type="A">A类 模拟考试</button>
                <button class="btn" data-action="exam" data-type="B">B类 模拟考试</button>
                <button class="btn" data-action="exam" data-type="C">C类 模拟考试</button>
                <div class="menu-title" style="margin-top:16px;">刷题练习</div>
                <button class="btn" data-action="practice" data-type="A" data-order="asc">A类 顺序</button>
                <button class="btn" data-action="practice" data-type="A" data-order="random">A类 乱序</button>
                <button class="btn" data-action="practice" data-type="B" data-order="asc">B类 顺序</button>
                <button class="btn" data-action="practice" data-type="B" data-order="random">B类 乱序</button>
                <button class="btn" data-action="practice" data-type="C" data-order="asc">C类 顺序</button>
                <button class="btn" data-action="practice" data-type="C" data-order="random">C类 乱序</button>
            </div>
        `;
        delegateMenuEvents();
    }

    function delegateMenuEvents() {
        mainEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const type = btn.dataset.type;
                const order = btn.dataset.order;
                if (action === 'exam') {
                    await startExam(type);
                } else if (action === 'practice') {
                    await startPractice(type, order);
                }
            });
        });
    }

    // ---------- 考试 ----------
    async function startExam(type) {
        try {
            const bank = await loadQuestionBank(type);
            const config = examConfig[type];
            const shuffled = shuffleArray(bank);
            currentQuestions = shuffled.slice(0, config.total);
            currentMode = 'exam';
            currentType = type;
            userAnswers = new Array(currentQuestions.length).fill(null);
            optionOrders = currentQuestions.map(q => generateOptionOrder(q.options.length));
            optionMappings = optionOrders.map((order, i) => {
                const map = {};
                order.forEach((idx, disp) => {
                    map[currentQuestions[i].options[idx].value] = String.fromCharCode(65 + disp);
                });
                return map;
            });
            currentIndex = 0;
            answeredFeedback = false;
            timeLeft = config.time * 60;
            startTime = Date.now();
            clearTimer();
            startTimer();
            renderExamUI();
            showQuestion(currentIndex);
        } catch (e) {
            alert('题库加载失败: ' + e.message);
        }
    }

    // ---------- 练习 ----------
    async function startPractice(type, order) {
        try {
            const bank = await loadQuestionBank(type);
            let questions = [...bank];
            if (order === 'asc') {
                // 保持原序
            } else if (order === 'desc') {
                questions.reverse();
            } else {
                questions = shuffleArray(questions);
            }
            currentQuestions = questions;
            currentMode = 'practice';
            currentType = type;
            userAnswers = new Array(currentQuestions.length).fill(null);
            optionOrders = currentQuestions.map(q => generateOptionOrder(q.options.length));
            optionMappings = optionOrders.map((order, i) => {
                const map = {};
                order.forEach((idx, disp) => {
                    map[currentQuestions[i].options[idx].value] = String.fromCharCode(65 + disp);
                });
                return map;
            });
            currentIndex = 0;
            answeredFeedback = false;
            clearTimer();
            renderExamUI();
            showQuestion(currentIndex);
        } catch (e) {
            alert('题库加载失败: ' + e.message);
        }
    }

    // ---------- 答题界面 ----------
    function renderExamUI() {
        const isMulti = currentQuestions[currentIndex].answer.length > 1;
        mainEl.innerHTML = `
            <div class="question-container" id="question-container">
                <div class="question-header">
                    <span>${currentMode === 'exam' ? '考试' : '练习'} ${currentType}类</span>
                    <span id="progress-text">1/${currentQuestions.length}</span>
                    ${currentMode === 'exam' ? '<span id="timer-display"></span>' : ''}
                </div>
                <div class="question-type" id="q-type"></div>
                <div class="question-text" id="q-text"></div>
                <div id="options-area"></div>
                <div class="feedback" id="feedback" style="display:none;"></div>
                <div class="nav-row">
                    <button class="btn" id="prev-btn">上一题</button>
                    <button class="btn" id="next-btn">下一题</button>
                </div>
                <div class="nav-row" style="margin-top: 4px;">
                    ${currentMode === 'exam' ? '<button class="btn primary" id="submit-exam">交卷</button>' : ''}
                    <button class="btn danger" id="exit-btn">退出</button>
                </div>
            </div>
        `;
        bindExamEvents();
        if (currentMode === 'exam') updateTimerDisplay();
    }

    function bindExamEvents() {
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                showQuestion(currentIndex);
            }
        });
        document.getElementById('next-btn').addEventListener('click', () => {
            if (currentIndex < currentQuestions.length - 1) {
                currentIndex++;
                showQuestion(currentIndex);
            } else if (currentMode === 'practice') {
                if (currentIndex === currentQuestions.length - 1 && userAnswers[currentIndex] !== null) {
                    alert('已经是最后一题');
                }
            }
        });
        document.getElementById('exit-btn').addEventListener('click', exitToMenu);
        if (currentMode === 'exam') {
            document.getElementById('submit-exam').addEventListener('click', () => {
                if (confirm('确定交卷吗？')) submitExam();
            });
        }
    }

    function showQuestion(index) {
        currentIndex = index;
        const q = currentQuestions[index];
        const isMulti = q.answer.length > 1;
        document.getElementById('progress-text').textContent = (index + 1) + '/' + currentQuestions.length;
        document.getElementById('q-type').textContent = isMulti ? '多选题' : '单选题';
        document.getElementById('q-type').style.color = isMulti ? '#c44536' : '#2b6f9e';
        document.getElementById('q-text').innerHTML = q.question.replace(/\[image:\s*([^\]]+)\]/g, '');
        const optionsArea = document.getElementById('options-area');
        optionsArea.innerHTML = '';
        const order = optionOrders[index];
        order.forEach((optIdx, disp) => {
            const opt = q.options[optIdx];
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = String.fromCharCode(65 + disp) + '. ' + opt.text;
            const userAns = userAnswers[index];
            let isSelected = false;
            if (userAns !== null) {
                if (Array.isArray(userAns)) {
                    isSelected = userAns.includes(opt.value);
                } else {
                    isSelected = userAns === opt.value;
                }
            }
            if (isSelected) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                if (isMulti) {
                    let ans = userAnswers[index];
                    if (!ans) ans = [];
                    if (ans.includes(opt.value)) {
                        ans = ans.filter(v => v !== opt.value);
                    } else {
                        ans = [...ans, opt.value];
                        ans.sort();
                    }
                    userAnswers[index] = ans;
                } else {
                    userAnswers[index] = opt.value;
                }
                showQuestion(index); // 刷新选项状态和反馈
            });
            optionsArea.appendChild(btn);
        });
        // 显示作答反馈（练习模式）
        const fb = document.getElementById('feedback');
        if (currentMode === 'practice' && userAnswers[index] !== undefined && userAnswers[index] !== null) {
            const isCorrect = checkAnswer(q, userAnswers[index]);
            fb.style.display = 'block';
            fb.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
            fb.textContent = isCorrect ? '回答正确' : '回答错误';
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

    // ---------- 交卷 ----------
    function submitExam() {
        clearTimer();
        let correctCount = 0;
        const wrongQuestions = [];
        currentQuestions.forEach((q, idx) => {
            const ans = userAnswers[idx];
            if (checkAnswer(q, ans)) {
                correctCount++;
            } else {
                wrongQuestions.push({ question: q, userAnswer: ans });
                addWrongItem(q.id, currentType);
            }
        });
        const used = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(used / 60);
        const seconds = used % 60;
        renderResult(correctCount, currentQuestions.length, examConfig[currentType].pass, minutes, seconds);
    }

    function renderResult(score, total, pass, min, sec) {
        const passed = score >= pass;
        mainEl.innerHTML = `
            <div class="result-box">
                <div class="score-number">${score}</div>
                <div>答对 ${score}/${total}</div>
                <div class="pass-tag ${passed ? 'pass' : 'fail'}">${passed ? '合格' : '不合格'}</div>
                <div>用时 ${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}</div>
                <button class="btn primary" id="back-menu">返回菜单</button>
            </div>
        `;
        document.getElementById('back-menu').addEventListener('click', exitToMenu);
    }

    // ---------- 计时器 ----------
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearTimer();
                submitExam();
            }
        }, 1000);
    }
    function clearTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }
    function updateTimerDisplay() {
        const el = document.getElementById('timer-display');
        if (!el) return;
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        el.textContent = '剩余 ' + String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    }

    function exitToMenu() {
        clearTimer();
        currentMode = '';
        renderMenu();
    }

    // ---------- 启动 ----------
    renderMenu();
})();