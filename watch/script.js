(function() {
    const questionBanks = { A: null, B: null, C: null };
    const examConfig = {
        A: { total: 40, time: 40, pass: 30 },
        B: { total: 60, time: 60, pass: 45 },
        C: { total: 90, time: 90, pass: 70 }
    };
    const WRONG_KEYS = { A: 'ham_wrong_A', B: 'ham_wrong_B', C: 'ham_wrong_C' };

    let currentMode = '';
    let currentType = '';
    let currentQuestions = [];
    let userAnswers = [];
    let currentIndex = 0;
    let optionOrders = [];
    let optionMappings = [];
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;

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

    function loadQuestionBank(type) {
        return new Promise((resolve, reject) => {
            if (questionBanks[type]) {
                resolve(questionBanks[type]);
                return;
            }
            showLoading(true, '加载' + type + '类...');
            const script = document.createElement('script');
            script.src = '../data_' + type + '.js?v=3.10.4';  // 题库从上级目录加载
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
                } catch (e) { reject(e); }
            };
            script.onerror = () => reject(new Error('题库文件加载失败'));
            document.head.appendChild(script);
        });
    }

    function showLoading(show, msg) {
        const overlay = document.getElementById('loading-overlay');
        document.getElementById('loading-msg').textContent = msg || '加载中';
        overlay.classList.toggle('hidden', !show);
    }

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
    function checkAnswer(question, userAns) {
        const correct = question.answer;
        if (Array.isArray(userAns)) return userAns.join('') === correct;
        return userAns === correct;
    }

    const contentEl = document.getElementById('content');

    function renderMenu() {
        contentEl.innerHTML = `
            <div class="menu-title">模拟考试</div>
            <button class="btn" data-action="exam" data-type="A">A类考试</button>
            <button class="btn" data-action="exam" data-type="B">B类考试</button>
            <button class="btn" data-action="exam" data-type="C">C类考试</button>
            <div class="menu-title" style="margin-top:8px;">刷题练习</div>
            <button class="btn" data-action="practice" data-type="A" data-order="asc">A类顺序</button>
            <button class="btn" data-action="practice" data-type="A" data-order="random">A类乱序</button>
            <button class="btn" data-action="practice" data-type="B" data-order="asc">B类顺序</button>
            <button class="btn" data-action="practice" data-type="B" data-order="random">B类乱序</button>
            <button class="btn" data-action="practice" data-type="C" data-order="asc">C类顺序</button>
            <button class="btn" data-action="practice" data-type="C" data-order="random">C类乱序</button>
        `;
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const type = btn.dataset.type;
                const order = btn.dataset.order;
                if (action === 'exam') await startExam(type);
                else if (action === 'practice') await startPractice(type, order);
            });
        });
    }

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
        } catch (e) { alert('题库加载失败: ' + e.message); }
    }

    async function startPractice(type, order) {
        try {
            const bank = await loadQuestionBank(type);
            let questions = [...bank];
            if (order === 'asc') { /* 保持原序 */ }
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
        } catch (e) { alert('题库加载失败: ' + e.message); }
    }

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
        document.getElementById('progress-text').textContent = (index + 1) + '/' + currentQuestions.length;
        document.getElementById('q-text').textContent = q.question.replace(/\[image:\s*[^\]]+\]/g, '');
        const optArea = document.getElementById('options-area');
        optArea.innerHTML = '';
        const order = optionOrders[index];
        order.forEach((optIdx, disp) => {
            const opt = q.options[optIdx];
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = String.fromCharCode(65 + disp) + '. ' + opt.text;
            const userAns = userAnswers[index];
            let isSelected = false;
            if (userAns !== null) {
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
        renderResult(correctCount, currentQuestions.length, examConfig[currentType].pass, min, sec);
    }

    function renderResult(score, total, pass, min, sec) {
        const passed = score >= pass;
        contentEl.innerHTML = `
            <div class="result-box">
                <div class="score-number">${score}</div>
                <div>${score}/${total}</div>
                <div class="pass-tag ${passed ? 'pass' : 'fail'}">${passed ? '合格' : '不合格'}</div>
                <div>用时 ${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}</div>
                <button class="btn primary" id="back-menu">返回</button>
            </div>
        `;
        document.getElementById('back-menu').addEventListener('click', exitToMenu);
    }

    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { clearTimer(); submitExam(); }
        }, 1000);
    }
    function clearTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }
    function updateTimerDisplay() {
        const el = document.getElementById('timer-display');
        if (!el) return;
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        el.textContent = '剩余' + String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    }

    function exitToMenu() {
        clearTimer();
        currentMode = '';
        renderMenu();
    }

    renderMenu();
})();