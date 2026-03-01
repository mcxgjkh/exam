// script.js - 增强版，支持刷题/错题/收藏/待做/懒加载/图片
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
    let isNormalPractice = false;      // 当前是否为普通刷题模式
    let currentOrder = 'asc';          // 当前刷题的排序方式

    // 待做练习专用变量
    let pendingOriginalSession = null;  // 原始会话副本
    let pendingOriginalType = null;
    let pendingOriginalOrder = null;
    let pendingIndexMap = [];           // 当前题目索引到原始会话索引的映射

    // 存储键常量
    const WRONG_KEYS = { A: 'ham_wrong_A', B: 'ham_wrong_B', C: 'ham_wrong_C' };
    const FAVORITE_KEYS = { A: 'ham_favorite_A', B: 'ham_favorite_B', C: 'ham_favorite_C' };
    const PENDING_KEY_PREFIX = 'ham_pending_';  // 待做会话存储前缀，后跟类型_顺序

    // 题库缓存
    const questionBanks = { A: null, B: null, C: null };

    // 考试配置
    const examConfig = {
        'A': { total: 40, time: 40, pass: 30 },
        'B': { total: 60, time: 60, pass: 45 },
        'C': { total: 90, time: 90, pass: 70 }
    };

    // ----- 工具函数 -----
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function generateOptionOrder(count) {
        return shuffleArray([...Array(count).keys()]);
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"]/g, function(match) {
            if (match === '&') return '&amp;';
            if (match === '<') return '&lt;';
            if (match === '>') return '&gt;';
            if (match === '"') return '&quot;';
            return match;
        });
    }

    // ----- 本地存储管理 -----
    // 错题
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
            const el = document.getElementById(`wrong-count-${t}`);
            if (el) el.textContent = ids.length;
        });
    }

    // 收藏
    function getFavoriteIds(type) {
        const key = FAVORITE_KEYS[type];
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }

    function saveFavoriteIds(type, ids) {
        localStorage.setItem(FAVORITE_KEYS[type], JSON.stringify(ids));
        updateFavoriteStatsAll();
    }

    function updateFavoriteStatsAll() {
        ['A','B','C'].forEach(t => {
            const ids = getFavoriteIds(t);
            const el = document.getElementById(`favorite-count-${t}`);
            if (el) el.textContent = ids.length;
        });
    }

    // 待做会话
    function getPendingSessionKey(type, order) {
        return `${PENDING_KEY_PREFIX}${type}_${order}`;
    }

    function getPendingSession(type, order) {
        const key = getPendingSessionKey(type, order);
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }

    function savePendingSession(type, order, session) {
        const key = getPendingSessionKey(type, order);
        localStorage.setItem(key, JSON.stringify(session));
        updatePendingStatusAll();
    }

    function clearPendingSession(type, order) {
        const key = getPendingSessionKey(type, order);
        localStorage.removeItem(key);
        updatePendingStatusAll();
    }

    function updatePendingStatusAll() {
        document.querySelectorAll('.pending-btn').forEach(btn => {
            const type = btn.dataset.type;
            const order = btn.dataset.order;
            const session = getPendingSession(type, order);
            let unanswered = 0;
            let total = 0;
            if (session) {
                // 统计未答题数
                unanswered = session.userAnswers.filter(ans => ans === null || (Array.isArray(ans) && ans.length === 0)).length;
                total = session.total;
            } else {
                const bank = questionBanks[type];
                if (bank) {
                    total = bank.length;
                    unanswered = total; // 无会话时所有题都是未答
                } else {
                    btn.textContent = `${order === 'asc' ? '顺序' : order === 'desc' ? '倒序' : '乱序'}(?)`;
                    return;
                }
            }
            const orderText = order === 'asc' ? '顺序' : order === 'desc' ? '倒序' : '乱序';
            btn.textContent = `${orderText}(${unanswered})`;
        });
    }

    // ----- 题库懒加载 -----
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
                    const bank = eval('questions_' + type);
                    if (bank && Array.isArray(bank)) {
                        questionBanks[type] = bank;
                        showLoading(false);
                        resolve(bank);
                    } else {
                        reject(new Error(`题库变量 questions_${type} 不存在或格式错误`));
                    }
                } catch (e) {
                    reject(e);
                }
            };
            script.onerror = () => reject(new Error(`题库文件 data_${type}.js 加载失败`));
            document.head.appendChild(script);
        });
    }

    function showLoading(show, msg = '加载中...') {
        const overlay = document.getElementById('loading-overlay');
        document.getElementById('loading-message').textContent = msg;
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    }

    // ----- 界面显示与隐藏 -----
    function hideAllScreens() {
        document.getElementById('start-screen').classList.add('screen-hidden');
        document.getElementById('exam-screen').classList.add('screen-hidden');
        document.getElementById('result-screen').classList.add('screen-hidden');
    }

    function showStartScreen() {
        hideAllScreens();
        document.getElementById('start-screen').classList.remove('screen-hidden');
    }

    function showExamScreen() {
        hideAllScreens();
        document.getElementById('exam-screen').classList.remove('screen-hidden');
    }

    function showResultScreen() {
        hideAllScreens();
        document.getElementById('result-screen').classList.remove('screen-hidden');
    }

    // ----- 题目准备与显示 -----
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

        // 如果是普通刷题，更新待做会话
        if (currentMode === 'practice' && isNormalPractice) {
            updatePendingSession();
        }

        // 如果是待做练习（有原始会话），更新原始会话
        if (pendingIndexMap.length > 0 && pendingOriginalSession) {
            // 找到当前题目在原始会话中的索引
            const originalIdx = pendingIndexMap[qIndex];
            // 复制原始会话
            let updatedSession = {
                ...pendingOriginalSession,
                userAnswers: [...pendingOriginalSession.userAnswers]
            };
            // 更新答案
            updatedSession.userAnswers[originalIdx] = userAnswers[qIndex];
            // 保存
            savePendingSession(pendingOriginalType, pendingOriginalOrder, updatedSession);
            // 更新 pendingOriginalSession 引用
            pendingOriginalSession = updatedSession;
        }

        // 练习模式下实时反馈
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
        let questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, '<img src="imageswebp/$1" loading="lazy" class="question-image" alt="题目配图">');
        document.getElementById('q-text').innerHTML = questionHtml;

        displayOptions(q, index);

        document.getElementById('prev-btn').disabled = index === 0;
        document.getElementById('next-btn').disabled = index === currentQuestions.length - 1;

        // 练习模式下的反馈处理
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
        updateFavoriteButtonState();

        // 如果是普通刷题，保存当前进度
        if (currentMode === 'practice' && isNormalPractice) {
            updatePendingSession();
        }
    }

    // ----- 进度更新与保存 -----
    function updatePendingSession() {
        if (!isNormalPractice) return;
        const type = currentExamType;
        const order = currentOrder;
        const session = {
            questions: currentQuestions.map(q => q.id),
            userAnswers: userAnswers.map(ans => ans),
            currentIndex: currentQuestionIndex,
            total: currentQuestions.length,
            optionOrders: optionOrders
        };
        savePendingSession(type, order, session);
    }

    // ----- 恢复会话 -----
    async function loadPracticeSession(type, order, bank) {
        const session = getPendingSession(type, order);
        if (!session) return false;

        const questionMap = {};
        bank.forEach(q => questionMap[q.id] = q);
        const questions = session.questions.map(id => questionMap[id]).filter(q => q);
        if (questions.length !== session.questions.length) {
            alert('题库已变化，无法恢复');
            return false;
        }

        // 恢复全局变量
        currentQuestions = questions;
        currentExamType = type;
        currentMode = 'practice';
        isWrongPractice = false;
        isNormalPractice = true;
        currentOrder = order;
        userAnswers = session.userAnswers.map(ans => ans); // 深拷贝
        optionOrders = session.optionOrders.map(orderArr => [...orderArr]); // 深拷贝

        // 重建 optionMappings
        optionMappings = currentQuestions.map((q, idx) => {
            let map = {};
            optionOrders[idx].forEach((optIndex, displayIdx) => {
                map[q.options[optIndex].value] = String.fromCharCode(65 + displayIdx);
            });
            return map;
        });

        // 根据答案状态自动跳转到第一个未答题
        let firstUnanswered = -1;
        for (let i = 0; i < userAnswers.length; i++) {
            const ans = userAnswers[i];
            if (ans === null || (Array.isArray(ans) && ans.length === 0)) {
                firstUnanswered = i;
                break;
            }
        }
        if (firstUnanswered === -1) {
            // 所有题都答完了，跳转到最后一题
            currentQuestionIndex = userAnswers.length - 1;
        } else {
            currentQuestionIndex = firstUnanswered;
        }

        // 显示考试屏幕
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
        document.getElementById('total-questions').textContent = currentQuestions.length;

        showQuestion(currentQuestionIndex);
        return true;
    }

    // ----- 练习启动函数 -----
    function startPractice(type, bank, order, wrongMode, customQuestions = null) {
        currentMode = 'practice';
        currentExamType = type;
        isWrongPractice = wrongMode;
        isNormalPractice = !wrongMode && !customQuestions; // 普通刷题才保存进度
        currentOrder = order;

        let baseQuestions = customQuestions ? [...customQuestions] : [...bank];

        // 错题模式过滤
        if (!customQuestions && wrongMode) {
            const wrongIds = getWrongIds(type);
            baseQuestions = bank.filter(q => wrongIds.includes(q.id));
            if (baseQuestions.length === 0) {
                alert('当前没有错题，先去练习全题库吧！');
                return;
            }
        }

        // 排序
        if (order === 'asc') {
            currentQuestions = baseQuestions;
        } else if (order === 'desc') {
            currentQuestions = [...baseQuestions].reverse();
        } else {
            currentQuestions = shuffleArray([...baseQuestions]);
        }

        if (currentQuestions.length === 0) return;

        // 准备选项随机顺序和映射
        prepareQuestions();

        // 初始化用户答案数组
        userAnswers = new Array(currentQuestions.length).fill(null);

        // 如果是普通刷题，立即保存待做会话（初始状态）
        if (isNormalPractice) {
            const session = {
                questions: currentQuestions.map(q => q.id),
                userAnswers: userAnswers.map(ans => ans),
                currentIndex: 0,
                total: currentQuestions.length,
                optionOrders: optionOrders
            };
            savePendingSession(type, order, session);
        }

        // 显示界面
        showExamScreen();
        document.getElementById('mode-badge').textContent = wrongMode ? '错题练习' : '刷题练习';
        document.getElementById('timer-container').style.display = 'none';
        document.getElementById('submit-btn').classList.add('hidden');
        document.getElementById('favorite-btn').classList.remove('hidden');
        document.getElementById('goto-btn').classList.remove('hidden');
        if (wrongMode) {
            document.getElementById('reset-wrong-btn').classList.remove('hidden');
        } else {
            document.getElementById('reset-wrong-btn').classList.add('hidden');
        }
        document.getElementById('practice-feedback').classList.remove('hidden');
        document.getElementById('practice-feedback').innerHTML = '';

        document.getElementById('current-exam-type').textContent = type + '类';
        document.getElementById('total-questions').textContent = currentQuestions.length;

        showQuestion(0);
    }

    async function startPracticeWithLoad(type, order, wrongMode = false) {
        try {
            const bank = await loadQuestionBank(type);
            if (!wrongMode) {
                const session = getPendingSession(type, order);
                if (session) {
                    await loadPracticeSession(type, order, bank);
                    return;
                }
            }
            startPractice(type, bank, order, wrongMode);
        } catch (e) {
            alert('题库加载失败：' + e.message);
        }
    }

    // ----- 待做练习（只练未答） -----
    async function startPendingPractice(type, order) {
        try {
            const bank = await loadQuestionBank(type);
            const session = getPendingSession(type, order);
            let questions = [];
            let originalSession = session;
            let indexMap = [];
            if (session) {
                const questionMap = {};
                bank.forEach(q => questionMap[q.id] = q);
                const missing = session.questions.filter(id => !questionMap[id]);
                if (missing.length > 0) {
                    alert('题库已变化，待做会话已清除');
                    clearPendingSession(type, order);
                    questions = bank; // 退化为全题库
                    originalSession = null;
                    indexMap = Array.from({length: bank.length}, (_, i) => i);
                } else {
                    const validQuestions = session.questions.map(id => questionMap[id]);
                    const pendingIndices = [];
                    session.userAnswers.forEach((ans, idx) => {
                        if (ans === null || (Array.isArray(ans) && ans.length === 0)) {
                            pendingIndices.push(idx);
                        }
                    });
                    if (pendingIndices.length > 0) {
                        questions = pendingIndices.map(idx => validQuestions[idx]);
                        indexMap = pendingIndices; // 当前题目列表的索引对应原始会话的索引
                    } else {
                        alert('当前没有未答题目');
                        return;
                    }
                }
            } else {
                questions = bank;
                indexMap = Array.from({length: bank.length}, (_, i) => i);
                originalSession = null;
            }

            // 保存待做练习的原始会话信息
            pendingOriginalSession = originalSession ? { ...originalSession, userAnswers: [...originalSession.userAnswers] } : null;
            pendingOriginalType = type;
            pendingOriginalOrder = order;
            pendingIndexMap = indexMap;

            // 启动练习（不保存新会话）
            startPractice(type, bank, order, false, questions);
        } catch (e) {
            alert('加载失败：' + e.message);
        }
    }

    // ----- 收藏练习 -----
    async function startFavoritePractice(type) {
        try {
            const bank = await loadQuestionBank(type);
            const favIds = getFavoriteIds(type);
            const questions = bank.filter(q => favIds.includes(q.id));
            if (questions.length === 0) {
                alert('当前没有收藏的题目，先去学习题目界面收藏吧！');
                return;
            }
            startPractice(type, bank, 'asc', false, questions); // 收藏题按原序练习，不保存进度
        } catch (e) {
            alert('题库加载失败');
        }
    }

    // ----- 模拟考试 -----
    function startExam(type, bank) {
        currentMode = 'exam';
        currentExamType = type;
        const config = examConfig[type];
        let shuffled = shuffleArray([...bank]);
        currentQuestions = shuffled.slice(0, config.total);
        prepareQuestions();
        showExamScreen();
        document.getElementById('mode-badge').textContent = '模拟考试';
        document.getElementById('timer-container').style.display = 'block';
        document.getElementById('submit-btn').classList.remove('hidden');
        document.getElementById('reset-wrong-btn').classList.add('hidden');
        document.getElementById('practice-feedback').classList.add('hidden');
        document.getElementById('favorite-btn').classList.add('hidden');
        document.getElementById('goto-btn').classList.add('hidden');

        document.getElementById('current-exam-type').textContent = type + '类';
        document.getElementById('total-questions').textContent = currentQuestions.length;

        userAnswers = new Array(currentQuestions.length).fill(null);
        randomizeOptionsForAll();

        timeLeft = config.time * 60;
        startTime = new Date();
        startTimer();

        showQuestion(0);
    }

    async function startExamWithLoad(type) {
        try {
            const bank = await loadQuestionBank(type);
            startExam(type, bank);
        } catch (e) {
            alert('题库加载失败，请刷新重试\n' + e.message);
        }
    }

    // ----- 导航与提交 -----
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

        showResultScreen();

        displayExamWrongs(wrongs);
        wrongs.forEach(w => addWrongItem(w.question.id, currentExamType));

        const container = document.getElementById('wrong-questions-container');
        const toggleBtn = document.getElementById('toggle-wrong-btn');
        if (wrongs.length === 0) {
            toggleBtn.style.display = 'none';
            container.classList.add('hidden');
        } else {
            toggleBtn.style.display = 'inline-block';
            container.classList.add('hidden');
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

    // ----- 收藏按钮 -----
    function toggleFavorite() {
        if (currentMode !== 'practice') return;
        const q = currentQuestions[currentQuestionIndex];
        const type = currentExamType;
        let favs = getFavoriteIds(type);
        const id = q.id;
        if (favs.includes(id)) {
            favs = favs.filter(f => f !== id);
        } else {
            favs.push(id);
        }
        saveFavoriteIds(type, favs);
        updateFavoriteButtonState();
    }

    function updateFavoriteButtonState() {
        if (currentMode !== 'practice') return;
        const q = currentQuestions[currentQuestionIndex];
        const type = currentExamType;
        const favs = getFavoriteIds(type);
        const btn = document.getElementById('favorite-btn');
        if (favs.includes(q.id)) {
            btn.classList.add('favorited');
            btn.textContent = '★ 已收藏';
        } else {
            btn.classList.remove('favorited');
            btn.textContent = '☆ 收藏';
        }
    }

    // ----- 移出错题 -----
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

    // ----- 跳转 -----
    function showGotoModal() {
        let modal = document.getElementById('goto-modal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'goto-modal';
        modal.className = 'goto-modal';
        modal.innerHTML = `
            <div class="goto-modal-content">
                <h3>跳转到第几题？</h3>
                <input type="number" id="goto-input" min="1" max="${currentQuestions.length}" value="${currentQuestionIndex + 1}">
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
            const num = parseInt(input.value, 10);
            if (isNaN(num) || num < 1 || num > currentQuestions.length) {
                alert(`请输入1-${currentQuestions.length}之间的数字`);
                return;
            }
            showQuestion(num - 1);
            close();
        });

        cancelBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
    }

    // ----- 查询功能 -----
    async function performQuery() {
        const rawInput = document.getElementById('query-input').value.trim();
        if (!rawInput) {
            alert('请输入查询关键字');
            return;
        }
        if (rawInput.length > 100) {
            alert('查询内容过长，请精简后重试');
            return;
        }
        const keyword = escapeHTML(rawInput);

        showLoading(true, '正在加载题库数据...');

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

        // 2. 匹配后四位
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

        // 3. 关键词模糊匹配
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

        results.forEach((item) => {
            const q = item.question;
            const type = item.type;

            let optionsHtml = '';
            q.options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                optionsHtml += `<div class="option" style="cursor:default;">${letter}. ${opt.text}</div>`;
            });

            let correctDisplay = '';
            for (let char of q.answer) {
                const optIndex = q.options.findIndex(opt => opt.value === char);
                if (optIndex !== -1) {
                    correctDisplay += String.fromCharCode(65 + optIndex);
                }
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'query-item';
            const questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, '<img src="imageswebp/$1" loading="lazy" class="question-image" alt="题目配图">');
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

    // ----- DOM 初始化 -----
    document.addEventListener('DOMContentLoaded', function() {
        // 确保启动界面显示
        showStartScreen();
        document.getElementById('loading-overlay').classList.add('hidden');

        // 预加载题库，更新待做按钮显示
        Promise.allSettled([
            loadQuestionBank('A').catch(e => console.error('A题库加载失败', e)),
            loadQuestionBank('B').catch(e => console.error('B题库加载失败', e)),
            loadQuestionBank('C').catch(e => console.error('C题库加载失败', e))
        ]).then(() => {
            updatePendingStatusAll();
        });

        updateWrongStatsAll();
        updateFavoriteStatsAll();

        // 弹窗关闭
        const modal = document.getElementById('startup-modal');
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            const confirmBtn = modal.querySelector('.modal-confirm');
            const closeModal = () => modal.style.display = 'none';
            closeBtn.addEventListener('click', closeModal);
            confirmBtn.addEventListener('click', closeModal);
        }

        // 事件监听
        document.querySelectorAll('.exam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                startExamWithLoad(type);
            });
        });

        document.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const order = e.target.dataset.order;
                startPracticeWithLoad(type, order, false);
            });
        });

        document.querySelectorAll('.wrong-practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                startPracticeWithLoad(type, 'asc', true);
            });
        });

        document.querySelectorAll('.favorite-practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                startFavoritePractice(type);
            });
        });

        document.querySelectorAll('.pending-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const order = e.target.dataset.order;
                startPendingPractice(type, order);
            });
        });

        document.getElementById('exit-practice-btn').addEventListener('click', () => {
            clearInterval(timerInterval);
            // 重置待做状态
            pendingOriginalSession = null;
            pendingOriginalType = null;
            pendingOriginalOrder = null;
            pendingIndexMap = [];
            showStartScreen();
        });

        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('submit-btn').addEventListener('click', () => {
            if (confirm('确定提交答案吗？')) submitExam();
        });
        document.getElementById('reset-wrong-btn').addEventListener('click', removeCurrentFromWrong);

        document.getElementById('toggle-wrong-btn').addEventListener('click', function() {
            const container = document.getElementById('wrong-questions-container');
            container.classList.toggle('hidden');
            this.textContent = container.classList.contains('hidden') ? '查看错题' : '隐藏错题';
        });

        document.getElementById('favorite-btn').addEventListener('click', toggleFavorite);
        document.getElementById('goto-btn').addEventListener('click', showGotoModal);

        document.getElementById('query-btn').addEventListener('click', performQuery);
        document.getElementById('query-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performQuery();
        });
    });
})();