// 全局变量
let currentQuestions = [];
let currentExamType = '';
let userAnswers = [];
let currentQuestionIndex = 0;
let timeLeft = 0;
let timerInterval = null;
let startTime = null;
let optionOrders = []; // 存储每道题的选项随机顺序
let optionMappings = []; // 存储每道题的选项值到显示标签的映射

// 考试配置
const examConfig = {
    'A': { total: 40, single: 32, multi: 8, time: 40, pass: 30 },
    'B': { total: 60, single: 45, multi: 15, time: 60, pass: 45 },
    'C': { total: 90, single: 70, multi: 20, time: 90, pass: 70 }
};

// 开始考试
function startExam(type) {
    currentExamType = type;
    const config = examConfig[type];
    
    // 隐藏开始屏幕，显示考试屏幕
    document.getElementById('start-screen').classList.add('screen-hidden');
    document.getElementById('exam-screen').classList.remove('screen-hidden');
    
    // 设置考试信息
    document.getElementById('current-exam-type').textContent = type + '类';
    document.getElementById('total-questions').textContent = config.total;
    
    // 根据类型选择题目
    selectQuestions(type);
    
    // 初始化用户答案数组、选项顺序数组和选项映射数组
    userAnswers = new Array(currentQuestions.length).fill(null);
    optionOrders = new Array(currentQuestions.length);
    optionMappings = new Array(currentQuestions.length);
    
    // 为每道题生成选项随机顺序和映射
    currentQuestions.forEach((question, index) => {
        const order = generateOptionOrder(question.options.length);
        optionOrders[index] = order;
        
        // 创建选项值到显示标签的映射
        optionMappings[index] = {};
        order.forEach((optionIndex, displayIndex) => {
            const optionValue = question.options[optionIndex].value;
            optionMappings[index][optionValue] = String.fromCharCode(65 + displayIndex); // A, B, C, D
        });
    });
    
    // 设置并启动计时器
    timeLeft = config.time * 60;
    startTime = new Date();
    startTimer();
    
    // 显示第一题
    showQuestion(0);
}

// 选择题目
function selectQuestions(type) {
    let questionPool = [];
    
    // 根据类型选择题库
    if (type === 'A') {
        questionPool = [...questions_A];
    } else if (type === 'B') {
        questionPool = [...questions_B];
    } else if (type === 'C') {
        questionPool = [...questions_C];
    }
    
    // 随机打乱题目顺序
    questionPool = shuffleArray(questionPool);
    
    // 选择指定数量的题目
    currentQuestions = questionPool.slice(0, examConfig[type].total);
}

// 显示题目
function showQuestion(index) {
    if (index < 0 || index >= currentQuestions.length) return;
    
    currentQuestionIndex = index;
    const question = currentQuestions[index];
    
    // 更新进度
    document.getElementById('progress').textContent = index + 1;
    document.getElementById('progress-fill').style.width = `${((index + 1) / currentQuestions.length) * 100}%`;
    
    // 显示题目编号和ID
    document.getElementById('q-number').textContent = index + 1;
    document.getElementById('q-id').textContent = question.id;
    
    // 显示题目类型
    const isMulti = question.answer.length > 1;
    document.getElementById('q-type').textContent = isMulti ? '多选题' : '单选题';
    document.getElementById('q-type').style.color = isMulti ? '#e74c3c' : '#4a9fea';
    
    // 显示题目文本
    document.getElementById('q-text').textContent = question.question;
    
    // 显示选项（使用随机顺序）
    displayOptions(question, index);
    
    // 更新导航按钮状态
    document.getElementById('prev-btn').disabled = index === 0;
    document.getElementById('next-btn').disabled = index === currentQuestions.length - 1;
}

// 生成选项随机顺序
function generateOptionOrder(count) {
    const order = [];
    for (let i = 0; i < count; i++) {
        order.push(i);
    }
    return shuffleArray(order);
}

// 显示选项（使用随机顺序）
function displayOptions(question, questionIndex) {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    // 获取当前题目的选项随机顺序
    const order = optionOrders[questionIndex];
    
    // 创建选项元素（使用随机顺序）
    order.forEach((optionIndex, displayIndex) => {
        const option = question.options[optionIndex];
        const optionElem = document.createElement('div');
        optionElem.className = 'option';
        
        const isMulti = question.answer.length > 1;
        const inputType = isMulti ? 'checkbox' : 'radio';
        const inputName = isMulti ? `question-${questionIndex}` : 'question';
        
        // 检查用户是否已选择此选项
        let isChecked = false;
        if (userAnswers[questionIndex]) {
            if (isMulti) {
                isChecked = userAnswers[questionIndex].includes(option.value);
            } else {
                isChecked = userAnswers[questionIndex] === option.value;
            }
        }
        
        // 设置选项ID，用于关联label
        const optionId = `option-${questionIndex}-${displayIndex}`;
        
        optionElem.innerHTML = `
            <input type="${inputType}" id="${optionId}" name="${inputName}" value="${option.value}" 
                   ${isChecked ? 'checked' : ''}>
            <label for="${optionId}">${String.fromCharCode(65 + displayIndex)}. ${option.text}</label>
        `;
        
        // 检测是否为多行文本
        setTimeout(() => {
            const label = optionElem.querySelector('label');
            if (label.offsetHeight > 30) {
                optionElem.classList.add('multiline');
            }
        }, 0);
        
        // 直接监听input的change事件，而不是整个选项区域
        const input = optionElem.querySelector('input');
        input.addEventListener('change', function() {
            updateAnswer(option.value, questionIndex, isMulti);
        });
        
        // 如果已选择，添加selected类
        if (isChecked) {
            optionElem.classList.add('selected');
        }
        
        optionsContainer.appendChild(optionElem);
    });
}

// 更新答案
function updateAnswer(value, questionIndex, isMulti) {
    if (!userAnswers[questionIndex]) {
        userAnswers[questionIndex] = isMulti ? [value] : value;
    } else {
        if (isMulti) {
            if (userAnswers[questionIndex].includes(value)) {
                userAnswers[questionIndex] = userAnswers[questionIndex].filter(v => v !== value);
            } else {
                userAnswers[questionIndex].push(value);
                userAnswers[questionIndex].sort();
            }
        } else {
            userAnswers[questionIndex] = value;
            
            // 对于单选题，取消选择其他选项
            const options = document.querySelectorAll(`input[name="question"]`);
            options.forEach(opt => {
                if (opt.value !== value) {
                    opt.checked = false;
                    opt.parentElement.classList.remove('selected');
                }
            });
        }
    }
    
    // 更新选项的选中状态
    updateOptionSelection(questionIndex);
}

// 更新选项的选中状态
function updateOptionSelection(questionIndex) {
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        const input = option.querySelector('input');
        if (input.checked) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// 下一题
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    }
}

// 上一题
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

// 提交答案
function submitExam() {
    // 停止计时器
    clearInterval(timerInterval);
    
    // 计算得分
    let correctCount = 0;
    const wrongQuestions = [];
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.answer;
        
        if (Array.isArray(userAnswer)) {
            // 多选题比较
            if (userAnswer.join('') === correctAnswer) {
                correctCount++;
            } else {
                wrongQuestions.push({ 
                    index, 
                    question, 
                    userAnswer: userAnswer.join(''), 
                    correctAnswer,
                    optionOrder: optionOrders[index] 
                });
            }
        } else {
            // 单选题比较
            if (userAnswer === correctAnswer) {
                correctCount++;
            } else {
                wrongQuestions.push({ 
                    index, 
                    question, 
                    userAnswer, 
                    correctAnswer,
                    optionOrder: optionOrders[index] 
                });
            }
        }
    });
    
    // 计算用时
    const endTime = new Date();
    const timeUsed = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(timeUsed / 60);
    const seconds = timeUsed % 60;
    
    // 显示结果
    showResults(correctCount, wrongQuestions, minutes, seconds);
}

// 显示考试结果
function showResults(correctCount, wrongQuestions, minutes, seconds) {
    // 隐藏考试屏幕，显示结果屏幕
    document.getElementById('exam-screen').classList.add('screen-hidden');
    document.getElementById('result-screen').classList.remove('screen-hidden');
    
    // 设置结果信息
    document.getElementById('score').textContent = correctCount;
    document.getElementById('result-type').textContent = currentExamType + '类';
    document.getElementById('correct-answers').textContent = correctCount;
    document.getElementById('total-answers').textContent = currentQuestions.length;
    document.getElementById('time-used').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 判断是否通过
    const passScore = examConfig[currentExamType].pass;
    const passFailElem = document.getElementById('pass-fail');
    
    if (correctCount >= passScore) {
        passFailElem.textContent = '合格';
        passFailElem.className = 'pass-fail pass';
    } else {
        passFailElem.textContent = '不合格';
        passFailElem.className = 'pass-fail fail';
    }
    
    // 显示错题
    displayWrongQuestions(wrongQuestions);
}

// 显示错题（考虑选项随机顺序）
function displayWrongQuestions(wrongQuestions) {
    const wrongListContainer = document.getElementById('wrong-questions-list');
    
    if (wrongQuestions.length === 0) {
        wrongListContainer.innerHTML = '<p>恭喜您，没有错题！</p>';
        return;
    }
    
    let wrongListHTML = '';
    
    wrongQuestions.forEach(wrong => {
        // 获取选项的随机顺序和映射
        const order = wrong.optionOrder;
        const mapping = optionMappings[wrong.index];
        
        let optionsHTML = '';
        order.forEach((optionIndex, displayIndex) => {
            const option = wrong.question.options[optionIndex];
            optionsHTML += `<div>${String.fromCharCode(65 + displayIndex)}. ${option.text}</div>`;
        });
        
        // 转换用户答案和正确答案为显示标签
        let userAnswerDisplay = '';
        if (wrong.userAnswer) {
            if (wrong.userAnswer.length > 1) {
                // 多选题
                userAnswerDisplay = wrong.userAnswer.split('').map(v => mapping[v]).join('');
            } else {
                // 单选题
                userAnswerDisplay = mapping[wrong.userAnswer] || wrong.userAnswer;
            }
        } else {
            userAnswerDisplay = '未作答';
        }
        
        let correctAnswerDisplay = '';
        if (wrong.correctAnswer.length > 1) {
            // 多选题
            correctAnswerDisplay = wrong.correctAnswer.split('').map(v => mapping[v]).join('');
        } else {
            // 单选题
            correctAnswerDisplay = mapping[wrong.correctAnswer] || wrong.correctAnswer;
        }
        
        wrongListHTML += `
            <div class="wrong-item">
                <div class="wrong-question-number">题目 ${wrong.index + 1} (ID: ${wrong.question.id})</div>
                <div class="wrong-question-text">${wrong.question.question}</div>
                <div class="wrong-options">${optionsHTML}</div>
                <div class="wrong-answer">您的答案: ${userAnswerDisplay}</div>
                <div class="correct-answer">正确答案: ${correctAnswerDisplay}</div>
            </div>
        `;
    });
    
    wrongListContainer.innerHTML = wrongListHTML;
}
// 启动计时器
function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('time').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 随机打乱数组
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('prev-btn').addEventListener('click', prevQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('submit-btn').addEventListener('click', function() {
        if (confirm('确定要提交答案吗？提交后将无法修改。')) {
            submitExam();
        }
    });
});