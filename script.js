// script.js - 增强版，支持刷题/错题/懒加载/图片，修复题库加载
(function() {
    // ----- 全局变量 -----
    let currentQuestions = [];
    let currentExamType = '';
    let userAnswers = [];
    let currentQuestionIndex = 0;
    let timeLeft = 0;
    let timerInterval = null;
    let startTime = null;
    let optionOrders = [];
    let optionMappings = [];
    let currentMode = 'exam';
    let isWrongPractice = false;

    // 题库缓存
    const questionBanks = { A: null, B: null, C: null };

    // 考试配置
    const examConfig = {
        'A': { total: 40, time: 40, pass: 30 },
        'B': { total: 60, time: 60, pass: 45 },
        'C': { total: 90, time: 90, pass: 70 }
    };

    // 错题本存储 key
    const WRONG_KEYS = { A: 'ham_wrong_A', B: 'ham_wrong_B', C: 'ham_wrong_C' };

    // ----- 初始化 & 事件绑定 -----
    document.addEventListener('DOMContentLoaded', function() {
        // 确保启动界面显示，其他隐藏
        document.getElementById('start-screen').classList.remove('hidden', 'screen-hidden');
        document.getElementById('exam-screen').classList.add('screen-hidden');
        document.getElementById('result-screen').classList.add('screen-hidden');
        document.getElementById('loading-overlay').classList.add('hidden');

        updateWrongStatsAll();

        // 模拟考试按钮
        document.querySelectorAll('.exam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                startExamWithLoad(type);
            });
        });

        document.getElementById('toggle-wrong-btn').addEventListener('click', function() {
            const container = document.getElementById('wrong-questions-container');
            container.classList.toggle('hidden');
            this.textContent = container.classList.contains('hidden') ? '查看错题' : '隐藏错题';
        });

        // 刷题按钮
        document.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const order = e.target.dataset.order;
                startPracticeWithLoad(type, order, false);
            });
        });

        // 错题练习按钮
        document.querySelectorAll('.wrong-practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                startPracticeWithLoad(type, 'asc', true);
            });
        });

        // 退出按钮
        document.getElementById('exit-practice-btn').addEventListener('click', () => {
            clearInterval(timerInterval);
            document.getElementById('exam-screen').classList.add('screen-hidden');
            document.getElementById('start-screen').classList.remove('screen-hidden');
        });

        // 导航按钮
        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('submit-btn').addEventListener('click', () => {
            if (confirm('确定提交答案吗？')) submitExam();
        });
        document.getElementById('reset-wrong-btn').addEventListener('click', removeCurrentFromWrong);
    });

    // ----- 懒加载题库 -----
    function loadQuestionBank(type) {
        return new Promise((resolve, reject) => {
            if (questionBanks[type]) {
                resolve(questionBanks[type]);
                return;
            }
            showLoading(true, `加载${type}类题库...`);
            const script = document.createElement('script');
            script.src = `data_${type}.js`;
            script.onload = () => {
                try {
                    // 使用 eval 获取全局变量 (题库文件用 const 声明，无法通过 window 访问)
                    const bank = eval('questions_' + type);
                    if (bank && Array.isArray(bank)) {
                        questionBanks[type] = bank;
                        showLoading(false);
                        resolve(bank);
                    } else {
                        reject(new Error('题库变量不存在或格式错误'));
                    }
                } catch (e) {
                    reject(e);
                }
            };
            script.onerror = () => reject(new Error('题库文件加载失败'));
            document.head.appendChild(script);
        });
    }

    function showLoading(show, msg = '加载中...') {
        const overlay = document.getElementById('loading-overlay');
        document.getElementById('loading-message').textContent = msg;
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    }

    async function startExamWithLoad(type) {
        try {
            const bank = await loadQuestionBank(type);
            startExam(type, bank);
        } catch (e) {
            alert('题库加载失败，请刷新重试\n' + e.message);
        }
    }

    async function startPracticeWithLoad(type, order, wrongMode = false) {
        try {
            const bank = await loadQuestionBank(type);
            startPractice(type, bank, order, wrongMode);
        } catch (e) {
            alert('题库加载失败，请刷新重试\n' + e.message);
        }
    }

    function startExam(type, bank) {
        currentMode = 'exam';
        currentExamType = type;
        const config = examConfig[type];
        let shuffled = shuffleArray([...bank]);
        currentQuestions = shuffled.slice(0, config.total);
        prepareQuestions();
        document.getElementById('start-screen').classList.add('screen-hidden');
        document.getElementById('exam-screen').classList.remove('screen-hidden');
        document.getElementById('result-screen').classList.add('screen-hidden');
        document.getElementById('mode-badge').textContent = '模拟考试';
        document.getElementById('timer-container').style.display = 'block';
        document.getElementById('submit-btn').classList.remove('hidden');
        document.getElementById('reset-wrong-btn').classList.add('hidden');
        document.getElementById('practice-feedback').classList.add('hidden');

        document.getElementById('current-exam-type').textContent = type + '类';
        document.getElementById('total-questions').textContent = currentQuestions.length;

        userAnswers = new Array(currentQuestions.length).fill(null);
        randomizeOptionsForAll();

        timeLeft = config.time * 60;
        startTime = new Date();
        startTimer();

        showQuestion(0);
    }

    function startPractice(type, bank, order, wrongMode) {
        currentMode = 'practice';
        currentExamType = type;
        isWrongPractice = wrongMode;

        let baseQuestions = [...bank];
        if (wrongMode) {
            const wrongIds = getWrongIds(type);
            baseQuestions = bank.filter(q => wrongIds.includes(q.id));
            if (baseQuestions.length === 0) {
                alert('当前没有错题，先去学习题目或模拟考试吧！');
                return;
            }
        }

        if (order === 'asc') {
            currentQuestions = baseQuestions;
        } else if (order === 'desc') {
            currentQuestions = [...baseQuestions].reverse();
        } else {
            currentQuestions = shuffleArray([...baseQuestions]);
        }

        if (currentQuestions.length === 0) return;

        prepareQuestions();

        document.getElementById('start-screen').classList.add('screen-hidden');
        document.getElementById('exam-screen').classList.remove('screen-hidden');
        document.getElementById('result-screen').classList.add('screen-hidden');
        document.getElementById('mode-badge').textContent = wrongMode ? '错题练习' : '刷题练习';
        document.getElementById('timer-container').style.display = 'none';
        document.getElementById('submit-btn').classList.add('hidden');
        if (wrongMode) {
            document.getElementById('reset-wrong-btn').classList.remove('hidden');
        } else {
            document.getElementById('reset-wrong-btn').classList.add('hidden');
        }
        
        document.getElementById('practice-feedback').classList.remove('hidden');
        document.getElementById('practice-feedback').innerHTML = '';

        document.getElementById('current-exam-type').textContent = type + '类';
        document.getElementById('total-questions').textContent = currentQuestions.length;

        userAnswers = new Array(currentQuestions.length).fill(null);
        randomizeOptionsForAll();

        showQuestion(0);
    }

    function prepareQuestions() {
        currentQuestionIndex = 0;
        optionOrders = currentQuestions.map(q => generateOptionOrder(q.options.length));
        optionMappings = currentQuestions.map((q, idx) => {
            let map = {};
            optionOrders[idx].forEach((optIndex, displayIdx) => {
                map[q.options[optIndex].value] = String.fromCharCode(65 + displayIdx);
            });
            return map;
        });
    }

    function randomizeOptionsForAll() {
        optionOrders = currentQuestions.map(q => generateOptionOrder(q.options.length));
        optionMappings = currentQuestions.map((q, idx) => {
            let map = {};
            optionOrders[idx].forEach((optIndex, displayIdx) => {
                map[q.options[optIndex].value] = String.fromCharCode(65 + displayIdx);
            });
            return map;
        });
    }

    function generateOptionOrder(count) {
        return shuffleArray([...Array(count).keys()]);
    }

    function showQuestion(index) {
        if (!currentQuestions.length) return;
        currentQuestionIndex = index;
        const q = currentQuestions[index];

        document.getElementById('progress').textContent = index + 1;
        document.getElementById('progress-fill').style.width = `${((index + 1) / currentQuestions.length) * 100}%`;
        document.getElementById('q-number').textContent = index + 1;
        document.getElementById('q-id').textContent = q.id;
        const isMulti = q.answer.length > 1;
        document.getElementById('q-type').textContent = isMulti ? '多选题' : '单选题';
        document.getElementById('q-type').style.color = isMulti ? '#c44536' : '#2b6f9e';
        // 处理题目中的图片标记 [image: 文件名]
        let questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, '<img src="images/$1" loading="lazy" class="question-image" alt="题目配图">');
        document.getElementById('q-text').innerHTML = questionHtml;

        displayOptions(q, index);

        document.getElementById('prev-btn').disabled = index === 0;
        document.getElementById('next-btn').disabled = index === currentQuestions.length - 1;

        // 练习模式下的反馈处理：每次切换题目都先清空反馈内容和样式类
        if (currentMode === 'practice') {
            const feedback = document.getElementById('practice-feedback');
            feedback.innerHTML = '';
            feedback.classList.remove('correct', 'incorrect');
            const userAns = userAnswers[index];
            if (userAns !== undefined && userAns !== null) {
                const isCorrect = checkAnswerSingle(q, userAns);
                showPracticeFeedback(isCorrect);
            }
        }
    }

    function checkAnswerSingle(question, userAnswer) {
        if (Array.isArray(userAnswer)) {
            return userAnswer.join('') === question.answer;
        } else {
            return userAnswer === question.answer;
        }
    }

    function displayOptions(question, qIndex) {
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        const order = optionOrders[qIndex];
        const isMulti = question.answer.length > 1;

        order.forEach((optIndex, displayIdx) => {
            const opt = question.options[optIndex];
            let text = opt.text;
            // 图片支持
            text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="option-image">');

            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            const inputType = isMulti ? 'checkbox' : 'radio';
            const inputName = isMulti ? `q-${qIndex}` : 'question';
            const inputId = `opt-${qIndex}-${displayIdx}`;
            const isChecked = userAnswers[qIndex] ? 
                (isMulti ? userAnswers[qIndex].includes(opt.value) : userAnswers[qIndex] === opt.value) : false;

            optionDiv.innerHTML = `
                <input type="${inputType}" id="${inputId}" name="${inputName}" value="${opt.value}" ${isChecked ? 'checked' : ''}>
                <label for="${inputId}">${String.fromCharCode(65 + displayIdx)}. ${text}</label>
            `;

            setTimeout(() => {
                const lbl = optionDiv.querySelector('label');
                if (lbl && lbl.offsetHeight > 32) optionDiv.classList.add('multiline');
            }, 10);

            optionDiv.querySelector('input').addEventListener('change', (e) => {
                updateAnswer(opt.value, qIndex, isMulti);
                if (currentMode === 'practice') {
                    const ans = userAnswers[qIndex];
                    const correct = checkAnswerSingle(question, ans);
                    showPracticeFeedback(correct);
                    updateWrongStorage(question.id, correct, currentExamType);
                }
            });

            if (isChecked) optionDiv.classList.add('selected');
            container.appendChild(optionDiv);
        });
    }

    function showPracticeFeedback(isCorrect) {
        const fb = document.getElementById('practice-feedback');
        fb.classList.remove('correct', 'incorrect');
        if (isCorrect) {
            fb.textContent = '回答正确';
            fb.classList.add('correct');
        } else {
            fb.textContent = '回答错误，已记入错题本';
            fb.classList.add('incorrect');
        }
    }

    function updateAnswer(val, qIndex, isMulti) {
        if (!userAnswers[qIndex]) {
            userAnswers[qIndex] = isMulti ? [val] : val;
        } else {
            if (isMulti) {
                let arr = userAnswers[qIndex];
                if (arr.includes(val)) {
                    arr = arr.filter(v => v !== val);
                } else {
                    arr.push(val);
                    arr.sort();
                }
                userAnswers[qIndex] = arr;
            } else {
                userAnswers[qIndex] = val;
            }
        }
        updateOptionSelection(qIndex);

        // 如果是练习模式，立即显示反馈
        if (currentMode === 'practice') {
            const question = currentQuestions[qIndex];
            const userAns = userAnswers[qIndex];
            const isCorrect = checkAnswerSingle(question, userAns);
            showPracticeFeedback(isCorrect);
            updateWrongStorage(question.id, isCorrect, currentExamType);
        }
    }

    function updateOptionSelection(qIndex) {
        document.querySelectorAll('.option').forEach(opt => {
            const inp = opt.querySelector('input');
            if (inp.checked) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
    }

    function getWrongIds(type) {
        const key = WRONG_KEYS[type];
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }

    function saveWrongIds(type, ids) {
        localStorage.setItem(WRONG_KEYS[type], JSON.stringify(ids));
        updateWrongStatsAll();
    }

    function updateWrongStorage(questionId, isCorrect, type) {
        let wrongs = getWrongIds(type);
        if (!isCorrect) {
            if (!wrongs.includes(questionId)) {
                wrongs.push(questionId);
                saveWrongIds(type, wrongs);
            }
        } else {
            const index = wrongs.indexOf(questionId);
            if (index !== -1) {
                wrongs.splice(index, 1);
                saveWrongIds(type, wrongs);
            }
        }
    }

    function addWrongItem(questionId, type) {
        let wrongs = getWrongIds(type);
        if (!wrongs.includes(questionId)) {
            wrongs.push(questionId);
            saveWrongIds(type, wrongs);
        }
    }

    function updateWrongStatsAll() {
        ['A','B','C'].forEach(t => {
            const ids = getWrongIds(t);
            document.getElementById(`wrong-count-${t}`).textContent = ids.length;
        });
    }

    function removeCurrentFromWrong() {
        if (currentMode !== 'practice' || !currentQuestions.length) return;
        const q = currentQuestions[currentQuestionIndex];
        let wrongs = getWrongIds(currentExamType);
        const id = q.id;
        if (wrongs.includes(id)) {
            wrongs = wrongs.filter(w => w !== id);
            saveWrongIds(currentExamType, wrongs);
            alert('已从错题本移除');
        } else {
            alert('当前题目不在错题本中');
        }
    }

    function nextQuestion() {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            showQuestion(currentQuestionIndex + 1);
        }
    }
    function prevQuestion() {
        if (currentQuestionIndex > 0) {
            showQuestion(currentQuestionIndex - 1);
        }
    }

    function submitExam() {
        clearInterval(timerInterval);
        let correctCount = 0;
        const wrongs = [];
        currentQuestions.forEach((q, idx) => {
            const ans = userAnswers[idx];
            const correct = q.answer;
            if (Array.isArray(ans) ? ans.join('') === correct : ans === correct) {
                correctCount++;
            } else {
                wrongs.push({ index: idx, question: q, userAnswer: ans, correctAnswer: correct });
            }
        });
        const end = new Date();
        const used = Math.floor((end - startTime) / 1000);
        const minutes = Math.floor(used / 60);
        const seconds = used % 60;

        document.getElementById('exam-screen').classList.add('screen-hidden');
        document.getElementById('result-screen').classList.remove('screen-hidden');

        // 填充错题列表（容器默认隐藏）
        displayExamWrongs(wrongs);
        // 将模拟考试中的错题加入错题本
        wrongs.forEach(w => addWrongItem(w.question.id, currentExamType));

        // 确保错题容器初始隐藏（如果无错题，也可隐藏按钮）
        const container = document.getElementById('wrong-questions-container');
        const toggleBtn = document.getElementById('toggle-wrong-btn');
        if (wrongs.length === 0) {
            // 没有错题时，隐藏按钮和容器
            toggleBtn.style.display = 'none';
            container.classList.add('hidden');
        } else {
            toggleBtn.style.display = 'inline-block';
            container.classList.add('hidden'); // 初始隐藏
            toggleBtn.textContent = '查看错题';
        }

        document.getElementById('score').textContent = correctCount;
        document.getElementById('result-type').textContent = currentExamType + '类';
        document.getElementById('correct-answers').textContent = correctCount;
        document.getElementById('total-answers').textContent = currentQuestions.length;
        document.getElementById('time-used').textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;

        const pass = examConfig[currentExamType].pass;
        const pf = document.getElementById('pass-fail');
        pf.textContent = correctCount >= pass ? '合格' : '不合格';
        pf.className = 'pass-fail ' + (correctCount >= pass ? 'pass' : 'fail');
    }

    function displayExamWrongs(wrongs) {
        const container = document.getElementById('wrong-questions-list');
        if (wrongs.length === 0) {
            container.innerHTML = '<p>恭喜，没有错题！</p>'; return;
        }
        let html = '';
        wrongs.forEach(w => {
            const map = optionMappings[w.index] || {};
            const userDisp = w.userAnswer ? (Array.isArray(w.userAnswer) ? w.userAnswer.map(v => map[v]||v).join('') : (map[w.userAnswer]||w.userAnswer)) : '未答';
            const correctDisp = w.correctAnswer.split('').map(v => map[v]||v).join('');
            html += `<div class="wrong-item">
                <div>题目 ${w.index+1} (ID:${w.question.id})</div>
                <div class="wrong-answer">您的答案: ${userDisp}</div>
                <div class="correct-answer">正确答案: ${correctDisp}</div>
            </div>`;
        });
        container.innerHTML = html;
    }

    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { clearInterval(timerInterval); submitExam(); }
        }, 1000);
    }
    function updateTimerDisplay() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        document.getElementById('time').textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // 查询功能
    document.getElementById('query-btn').addEventListener('click', performQuery);
    document.getElementById('query-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performQuery();
        }
    });

    async function performQuery() {
        const keyword = document.getElementById('query-input').value.trim();
        if (!keyword) {
            alert('请输入查询关键字');
            return;
        }

        showLoading(true, '正在加载题库数据...');
        
        // 确保所有题库都已加载
        const types = ['A', 'B', 'C'];
        for (let type of types) {
            if (!questionBanks[type]) {
                try {
                    await loadQuestionBank(type);
                } catch (e) {
                    console.error(`加载${type}题库失败`, e);
                    alert(`加载${type}题库失败，请刷新重试`);
                    showLoading(false);
                    return;
                }
            }
        }
        
        showLoading(false);

        // 搜索匹配的题目
        const results = [];
        
        // 1. 全字匹配完整ID
        types.forEach(type => {
            const bank = questionBanks[type];
            if (!bank) return;
            bank.forEach(q => {
                if (q.id === keyword) {
                    results.push({ question: q, type });
                }
            });
        });
        
        // 2. 如果没有，匹配后四位（连字符后部分）
        if (results.length === 0) {
            types.forEach(type => {
                const bank = questionBanks[type];
                if (!bank) return;
                bank.forEach(q => {
                    const parts = q.id.split('-');
                    const suffix = parts.length > 1 ? parts[1] : q.id;
                    if (suffix === keyword) {
                        results.push({ question: q, type });
                    }
                });
            });
        }
        
        // 3. 如果还没有，关键词模糊匹配（包含即可）
        if (results.length === 0) {
            types.forEach(type => {
                const bank = questionBanks[type];
                if (!bank) return;
                bank.forEach(q => {
                    if (q.id.includes(keyword) || q.question.includes(keyword)) {
                        results.push({ question: q, type });
                    }
                });
            });
        }

        displayQueryResults(results);
    }

    function displayQueryResults(results) {
        const container = document.getElementById('query-results');
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#7f8c8d;">未找到匹配的题目</p>';
            return;
        }

        results.forEach((item, idx) => {
            const q = item.question;
            const type = item.type;
            
            // 构建选项HTML
            let optionsHtml = '';
            q.options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                optionsHtml += `<div class="option" style="cursor:default;">${letter}. ${opt.text}</div>`;
            });

            // 将正确答案（如 "A" 或 "AC"）转换为字母显示
            let correctDisplay = '';
            for (let char of q.answer) {
                const optIndex = q.options.findIndex(opt => opt.value === char);
                if (optIndex !== -1) {
                    correctDisplay += String.fromCharCode(65 + optIndex);
                }
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'query-item';
            // 处理题目中的图片标记
            const questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, '<img src="images/$1" loading="lazy" class="question-image" alt="题目配图">');
            itemDiv.innerHTML = `
                <div class="badge">${type}类题库</div>
                <h4>${q.id}</h4>
                <div class="question-text">${questionHtml}</div>
                <div class="options">${optionsHtml}</div>
                <div class="correct-answer">正确答案：${correctDisplay}</div>
            `;
            container.appendChild(itemDiv);
        });
    }
})();