// time.js - 基于 time.is 武汉时间的自动昼夜主题切换
import { getThemeMode, saveThemeMode } from './storage.js';

const DAY_START = 6;
const NIGHT_START = 18;

let autoEnabled = true;
let observer = null;

function parseHour(timeText) {
    const m = timeText.match(/(\d{1,2}):\d{2}:\d{2}/);
    return m ? parseInt(m[1], 10) : null;
}

function isNight(hour) {
    return hour >= NIGHT_START || hour < DAY_START;
}

function applyTheme(night) {
    const body = document.body;
    const toggle = document.getElementById('theme-switch');
    if (night) {
        body.classList.add('dark-mode');
        if (toggle) toggle.checked = true;
    } else {
        body.classList.remove('dark-mode');
        if (toggle) toggle.checked = false;
    }
}

function onTimeUpdate(timeText) {
    if (!autoEnabled) return;
    const hour = parseHour(timeText);
    if (hour === null) return;
    applyTheme(isNight(hour));
}

export function initTimeSync() {
    // 立即用本地时间设置主题，避免等待 time.is 时的闪烁
    fallbackToLocalTimeOnce();

    // 隐藏容器（不可见但保留布局空间以维持脚本运行）
    const container = document.createElement('div');
    container.id = 'time-widget-container';
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;';
    container.innerHTML = '<a href="https://time.is/Wuhan" id="time_is_link" rel="nofollow">武汉时间:</a><span id="Wuhan_z43d"></span>';
    document.body.appendChild(container);

    const script = document.createElement('script');
    script.src = '//widget.time.is/t.js';
    script.onload = () => {
        const w = window.time_is_widget;
        if (w && w.init) {
            w.init({ Wuhan_z43d: {} });
            startObserving();
        }
    };
    script.onerror = () => {
        fallbackToLocalTime();
    };
    document.head.appendChild(script);

    // 超时回退：5 秒后若仍未初始化，使用本地时间
    setTimeout(() => {
        const span = document.getElementById('Wuhan_z43d');
        if (span && !span.textContent.trim()) {
            fallbackToLocalTime();
        }
    }, 5000);
}

function fallbackToLocalTimeOnce() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    onTimeUpdate(hh + ':' + mm + ':' + ss);
}

function startObserving() {
    const span = document.getElementById('Wuhan_z43d');
    if (!span) return;

    // 首次检查
    const text = span.textContent.trim();
    if (text) onTimeUpdate(text);

    // 监听文本变化
    observer = new MutationObserver(() => {
        const t = span.textContent.trim();
        if (t) onTimeUpdate(t);
    });
    observer.observe(span, { characterData: true, childList: true, subtree: true });
}

function fallbackToLocalTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    onTimeUpdate(hh + ':' + mm + ':' + ss);

    // 每分钟用本地时间更新一次
    setInterval(() => {
        if (!autoEnabled) return;
        const n = new Date();
        const h = String(n.getHours()).padStart(2, '0');
        const m = String(n.getMinutes()).padStart(2, '0');
        const s = String(n.getSeconds()).padStart(2, '0');
        onTimeUpdate(h + ':' + m + ':' + s);
    }, 60000);
}

export function disableAutoTheme() {
    autoEnabled = false;
    saveThemeMode(document.body.classList.contains('dark-mode') ? 'manual_dark' : 'manual_light');
}

export function enableAutoTheme() {
    autoEnabled = true;
    saveThemeMode('auto');
}

export function isAutoEnabled() {
    return autoEnabled;
}
