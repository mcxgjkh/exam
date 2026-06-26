// watch/js/state.js
let _questions = [];
let _answers = [];
let _index = 0;
let _mode = 'home';      // 'home' | 'practice' | 'exam' | 'result'
let _type = '';
let _timer = null;
let _timeLeft = 0;
let _startTime = null;

export const getQuestions = () => _questions;
export const setQuestions = (q) => { _questions = q; };

export const getAnswers = () => _answers;
export const setAnswers = (a) => { _answers = a; };
export const updateAnswer = (idx, val) => { _answers[idx] = val; };

export const getIndex = () => _index;
export const setIndex = (i) => { _index = i; };

export const getMode = () => _mode;
export const setMode = (m) => { _mode = m; };

export const getType = () => _type;
export const setType = (t) => { _type = t; };   // ✅ 关键函数

export const getTimer = () => _timer;
export const setTimer = (t) => { _timer = t; };
export const clearTimer = () => {
  if (_timer) { clearInterval(_timer); _timer = null; }
};

export const getTimeLeft = () => _timeLeft;
export const setTimeLeft = (t) => { _timeLeft = t; };
export const decTime = () => { _timeLeft--; };

export const getStartTime = () => _startTime;
export const setStartTime = (t) => { _startTime = t; };