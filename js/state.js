// state.js
// 当前题目列表
let _currentQuestions = [];
export const getQuestions = () => _currentQuestions;
export const setQuestions = (q) => { _currentQuestions = q; };

// 用户答案队列
let _userAnswers = [];
export const getAnswers = () => _userAnswers;
export const setAnswers = (a) => { _userAnswers = a; };
export const updateAnswer = (index, value) => { _userAnswers[index] = value; };

// 当前题目索引
let _currentIndex = 0;
export const getIndex = () => _currentIndex;
export const setIndex = (i) => { _currentIndex = i; };

// 模式标识
let _examMode = 'practice'; // 'exam' | 'practice'
export const getExamMode = () => _examMode;
export const setExamMode = (mode) => { _examMode = mode; };

let _currentExamType = '';
export const getExamType = () => _currentExamType;
export const setExamType = (type) => { _currentExamType = type; };

let _orderMode = 'asc'; // 'asc' | 'desc' | 'random'
export const getOrderMode = () => _orderMode;
export const setOrderMode = (mode) => { _orderMode = mode; };

let _isWrongPractice = false;
export const getIsWrongPractice = () => _isWrongPractice;
export const setIsWrongPractice = (flag) => { _isWrongPractice = flag; };

let _isPendingPractice = false;
export const getIsPendingPractice = () => _isPendingPractice;
export const setIsPendingPractice = (flag) => { _isPendingPractice = flag; };

// 选项顺序（每个题目独立打乱的选项索引数组）
let _optionOrders = [];
export const getOptionOrders = () => _optionOrders;
export const setOptionOrders = (orders) => { _optionOrders = orders; };

// 选项映射（选项值 → 字母 A/B/C/D）
let _optionMaps = [];
export const getOptionMaps = () => _optionMaps;
export const setOptionMaps = (maps) => { _optionMaps = maps; };

// 计时器
let _timerInterval = null;
export const getTimerInterval = () => _timerInterval;
export const setTimerInterval = (interval) => { _timerInterval = interval; };
export const clearTimer = () => {
  if (_timerInterval) {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }
};

let _timeRemaining = 0;
export const getTimeRemaining = () => _timeRemaining;
export const setTimeRemaining = (t) => { _timeRemaining = t; };
export const decrementTime = () => { _timeRemaining--; };

let _examStartTime = null;
export const getExamStartTime = () => _examStartTime;
export const setExamStartTime = (date) => { _examStartTime = date; };

// 待做进度相关
let _pendingData = null;
export const getPendingData = () => _pendingData;
export const setPendingData = (data) => { _pendingData = data; };

let _pendingType = null;
export const getPendingType = () => _pendingType;
export const setPendingType = (type) => { _pendingType = type; };

let _pendingOrder = null;
export const getPendingOrder = () => _pendingOrder;
export const setPendingOrder = (order) => { _pendingOrder = order; };

let _pendingIndices = [];
export const getPendingIndices = () => _pendingIndices;
export const setPendingIndices = (indices) => { _pendingIndices = indices; };

// 搜索相关
let _searchResults = [];
export const getSearchResults = () => _searchResults;
export const setSearchResults = (results) => { _searchResults = results; };

let _searchKeyword = '';
export const getSearchKeyword = () => _searchKeyword;
export const setSearchKeyword = (keyword) => { _searchKeyword = keyword; };

let _currentPage = 1;
export const getCurrentPage = () => _currentPage;
export const setCurrentPage = (page) => { _currentPage = page; };
export const PAGE_SIZE = 10;

// 历史记录
let _examHistory = [];
export const getHistory = () => _examHistory;
export const setHistory = (history) => { _examHistory = history; };

// 题库缓存
const _loadedQuestions = { A: null, B: null, C: null };
export const getCachedQuestions = (type) => _loadedQuestions[type];
export const setCachedQuestions = (type, data) => { _loadedQuestions[type] = data; };