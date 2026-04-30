// script.js
(function() {
    // 如果检测到IE，立即返回，不执行任何现代语法
    if (window.__IE_DETECTED) {
        return;
    }

    // ========== 模糊匹配库（包含 Levenshtein 距离）==========
    const PINYIN_GROUPS = {
        a: '啊阿呵吖嗄腌锕钶',
        b: '八巴吧扒叭芭笆疤捌拔跋靶把坝霸罢爸白百佰柏摆败拜班般颁斑搬扳板版办半伴瓣帮绑榜膀傍傍苞胞包褒薄雹保堡宝饱抱暴爆豹鲍杯背卑碑北贝备背倍狈惫被奔本笨崩泵蹦逼鼻比彼笔鄙币必毕闭毙辟碧蔽壁避臂边编鞭贬扁便变辩辫标彪表别瘪宾彬斌濒鬓冰兵丙秉饼炳病并拨波玻剥菠播伯脖驳泊柏勃铂箔帛舶博搏渤卜不布步部',
        c: '擦猜材才财裁采彩踩菜蔡参餐蚕残惭惨灿仓苍舱藏操草厕策侧测层蹭插叉查茶察岔差拆柴搀蝉馋缠产铲阐颤昌长场肠尝常偿厂场敞畅唱倡抄吵钞超朝潮嘲巢车扯彻撤尘臣辰陈晨衬趁撑成呈承诚城乘惩程秤吃痴池驰迟持匙尺齿耻斥赤翅充冲虫崇抽仇绸愁丑瞅臭出初除厨锄雏础储楚处触川穿传船喘串窗床闯创吹炊垂锤春纯唇淳醇戳绰词瓷辞慈磁雌此次刺从匆葱聪丛凑粗促猝窜催摧脆翠村存寸措错',
        d: '搭达答瘩打大呆歹代带待怠袋戴丹单担耽胆旦但诞弹淡蛋氮当挡党荡档刀导岛倒蹈到盗道稻得德的地灯登等瞪邓堤滴敌笛抵底弟帝第递颠典点电垫店惦奠殿雕吊钓调掉爹跌叠蝶丁叮顶订定丢东冬懂动冻侗洞斗抖陡豆督毒读独堵赌杜度渡端短段断锻堆队对兑敦蹲顿多夺朵躲',
        e: '俄峨鹅额恶厄饿恩儿而耳二',
        f: '发罚法帆翻凡烦反返犯泛饭范方芳防妨房仿访放非飞废费分芬纷酚焚粉份奋愤粪丰风封疯峰烽锋蜂逢缝冯讽凤佛否夫敷扶服俘浮符幅福辐抚府辅腐父付妇负附复赴副傅富赋',
        g: '该改钙盖溉干甘杆肝赶感赣冈刚纲缸钢岗港搞稿告戈哥胳鸽搁歌革格葛隔个各给根跟更耕工公功攻供宫恭拱共贡勾沟钩狗构购够咕菇孤姑鼓古谷股故顾固瓜刮挂乖拐怪关观官冠馆管贯惯灌罐光广归龟规轨鬼贵桂滚棍锅国果裹过',
        h: '哈孩海骇害憨酣含函涵寒韩罕喊汉汗旱杭航毫豪好号浩耗呵喝合何和河核荷盒贺赫黑痕狠恨亨横衡轰哄红宏洪虹鸿侯喉厚候后呼乎忽狐胡湖葫糊蝴虎互户护花华哗滑化划画话怀徊淮槐坏欢环还缓换唤痪患涣焕荒慌皇黄煌晃恍谎灰恢挥辉回毁汇会绘惠慧昏婚浑魂混活火伙或货获祸惑',
        i: '一壹医铱衣依伊揖壹猗漪',
        j: '击机积基畸激及吉级即极急疾集籍几己挤脊计记纪技系季既济继寂寄加夹佳家嘉颊甲假价架嫁稼尖坚奸间肩艰兼监减荐剑健舰渐溅涧建将奖浆匠酱讲交浇骄胶教椒蕉角脚搅缴叫轿较接街阶皆结秸截节劫杰洁结捷竭姐解介戒届界借巾今斤金津筋仅紧锦尽进近劲晋禁浸京经茎惊晶睛精井颈景警净静境镜竞敬境迥纠究九久酒旧救就菊局举矩句巨拒具俱惧聚卷倦捐绢圈倦眷决角觉绝倔掘嚼军君均菌俊',
        k: '卡开凯慨刊看坎砍康抗亢考拷烤靠科棵颗磕蝌可渴克刻客课肯啃垦恳坑空孔恐控抠口哭苦库酷夸跨块快宽款匡筐狂况旷矿亏愧昆捆困扩',
        l: '拉啦喇蜡腊辣来莱赖兰拦栏蓝篮览揽缆懒烂滥郎狼廊朗浪捞劳牢老佬姥酪烙乐雷蕾累磊类泪棱冷离梨犁璃黎礼李里哩理鲤力历利丽励厉例隶粒俩连帘怜莲联廉脸练恋链凉梁粮两亮谅辆量辽疗聊僚了料列烈裂邻林临淋磷灵玲凌陵铃领令溜刘流留柳六龙聋笼隆垄拢楼搂漏露卢芦庐炉鲁陆录赂鹿路驴旅屡律率绿卵乱掠略轮伦论罗萝逻裸洛落',
        m: '妈麻马码蚂骂嘛吗埋买迈麦卖脉蛮满曼慢漫忙芒盲茫猫毛矛茅茂冒帽貌么没玫眉梅媒煤霉每美妹门们闷蒙萌盟猛梦孟咪弥迷谜米密蜜眠绵棉免勉面苗描秒妙庙灭民敏名明鸣命摸模膜摩磨蘑魔抹末沫莫漠墨默谋某母亩木目牧慕',
        n: '那拿哪呐纳娜乃奶耐男南难囊挠脑恼闹呢内嫩能尼泥你拟逆年念娘酿鸟尿捏您宁拧牛扭纽农弄怒女',
        o: '哦噢欧偶',
        p: '趴爬怕拍排牌派攀盘判叛盼乓旁胖抛炮跑泡培赔陪配佩喷盆朋碰批披劈皮啤脾匹屁篇偏片漂飘票撇拼贫频品聘乒平评凭苹屏坡泼婆破迫剖扑铺普谱',
        q: '七妻凄期欺漆奇崎骑棋旗企启起气弃汽砌器掐洽牵谦签前钱钳乾潜浅遣欠嵌枪墙抢悄桥乔侨瞧巧切且窃亲侵芹琴禽勤青轻氢倾清情晴请庆穷秋丘求球区驱曲取去趣圈全权劝',
        r: '然燃染嚷让饶扰绕热人仁忍认任日容荣熔溶融柔揉肉如儒乳入软锐瑞润若',
        s: '撒洒萨塞赛三伞散桑嗓丧扫色森僧沙纱杀沙傻筛晒山衫删闪陕扇善伤商赏上尚烧稍少绍蛇舍设社射涉摄深申伸身神沈审婶肾甚渗升生声牲胜省圣师失诗尸虱十什石时识实拾食史使驶始士示世式事势是适室视试收手守首寿受瘦授兽书叔殊输舒疏舒术束树数刷耍摔甩帅双水睡顺说丝司私思斯死四松送诉速宿塑算虽随岁孙损笋缩所索锁',
        t: '他它她塔塌踏胎台太态泰谈坦探叹汤唐堂糖躺趟涛掏逃桃淘陶讨套特疼腾藤梯踢提题蹄体替天田甜填挑条调贴铁听厅亭庭停挺通同铜童统桶筒痛头投透突图涂途土吐兔团推腿退吞屯脱拖托驼陀',
        w: '挖哇蛙瓦歪外弯完玩顽挽晚碗万汪亡王网往忘旺危威微为围唯维伟伪尾委卫未位味畏胃喂温文闻纹蚊稳问嗡翁窝我卧握乌污屋无吴五午伍武侮舞务物西昔析息希牺溪悉惜熄习席袭媳洗喜系细下吓夏掀先闲弦贤咸显险县现线限相香箱乡详响想向象像项消销小孝校笑效些歇鞋协邪胁谢心辛欣新信兴星腥刑行形型姓幸性休秀绣须需虚许序叙蓄宣玄悬选穴学雪血寻巡训讯',
        x: '希西析息惜稀溪熙嘻昔席袭媳洗喜系细瞎虾霞峡暇下吓夏仙先纤闲贤咸衔嫌显险现县限线相香箱乡详响项向象像橡削消销小晓孝校笑效些歇协邪胁写泄泻谢心辛欣新信兴星猩腥刑行形型幸性休修羞秀袖绣需虚许序叙絮续蓄宣玄悬旋选学雪血寻巡询训讯迅',
        y: '压呀鸦鸭牙崖涯雅讶亚咽烟淹延严言岩沿炎研盐颜眼演厌宴艳验央殃秧扬羊阳洋仰养氧样要腰邀摇遥咬药耶爷也冶野业叶页夜液一依医衣伊揖壹猗漪铱医揖壹衣依伊医衣揖壹医衣伊揖壹衣医衣伊揖壹医衣展转衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医衣伊揖壹医移疑已以矣亦亿义艺忆议异译易疫益谊逸意溢银引饮印应英婴鹰迎赢影映硬哟拥庸永泳勇涌用优忧幽悠尤由犹油游友有又右幼于予余鱼娱渔愉舆与予羽雨语玉遇愈喻育寓冤元原员圆援源远怨院愿约月乐阅跃云匀允孕运晕',
        z: '杂灾栽宰载再在咱暂赞脏遭糟凿早枣澡藻造噪择则责怎增赠扎渣札轧眨炸摘宅窄债沾粘展斩盏崭站战绽张章涨掌丈帐仗账障招召照兆遮折这针真珍侦疹诊枕阵振镇震争征怔挣睁蒸整正政证之支汁只芝吱枝知织肢脂执直值职植殖止址纸指至志质制治致智置中忠钟终肿种仲众重州舟周洲轴骤逐主属煮嘱住助住抓转拽赚庄装壮状追准桌捉着仔资兹姿滋子紫字自宗踪总纵走奏租族足卒祖组钻嘴最罪醉昨左作',
    };

    // 分组构建反向映射
    const PINYIN_MAP = {};
    for (const [letter, chars] of Object.entries(PINYIN_GROUPS)) {
        for (const ch of chars) {
            PINYIN_MAP[ch] = letter;
        }
    }

    function getPinyinInitials(str, keepNonChinese = true) {
        if (typeof str !== 'string') return '';
        let result = '';
        for (let ch of str) {
            const isChinese = /[\u4e00-\u9fa5]/.test(ch);
            if (isChinese) {
                result += PINYIN_MAP[ch] || '?';
            } else {
                result += keepNonChinese ? ch.toLowerCase() : '';
            }
        }
        return result;
    }

    // Levenshtein 编辑距离（必须定义）
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        if (a.length > b.length) [a, b] = [b, a];
        let prev = Array(a.length + 1).fill(0).map((_, i) => i);
        let curr = new Array(a.length + 1);
        for (let i = 1; i <= b.length; i++) {
            curr[0] = i;
            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                curr[j] = Math.min(
                    prev[j] + 1,
                    curr[j - 1] + 1,
                    prev[j - 1] + cost
                );
            }
            [prev, curr] = [curr, prev];
        }
        return prev[a.length];
    }

    function getSimilarity(a, b) {
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1.0;
        const distance = levenshteinDistance(a, b);
        return 1 - distance / maxLen;
    }

    function getPinyinSimilarity(a, b, keepNonChinese = true) {
        const pinyinA = getPinyinInitials(a, keepNonChinese);
        const pinyinB = getPinyinInitials(b, keepNonChinese);
        return getSimilarity(pinyinA, pinyinB);
    }

    function fuzzySearch(keyword, items, options = {}) {
        const { threshold = 0.5, usePinyin = false, pinyinWeight = 0.4 } = options;
        if (!keyword || !items.length) return [];
        const results = [];
        for (const item of items) {
            let textScore = getSimilarity(keyword, item);
            let finalScore = textScore;
            if (usePinyin) {
                const pinyinScore = getPinyinSimilarity(keyword, item);
                finalScore = textScore * (1 - pinyinWeight) + pinyinScore * pinyinWeight;
            }
            if (finalScore >= threshold) {
                results.push({ item, score: finalScore });
            }
        }
        results.sort((a, b) => b.score - a.score);
        return results;
    }

    function filterBySimilarity(keyword, items, threshold = 0.5) {
        return fuzzySearch(keyword, items, { threshold }).map(r => r.item);
    }

    function rankBySimilarity(target, candidates, usePinyin = false) {
        return fuzzySearch(target, candidates, { threshold: 0, usePinyin });
    }

    // 导出（可选）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            levenshteinDistance,
            getPinyinInitials,
            extendPinyinMap: (map) => Object.assign(PINYIN_MAP, map),
            getSimilarity,
            getPinyinSimilarity,
            fuzzySearch,
            filterBySimilarity,
            rankBySimilarity,
        };
    } else if (typeof window !== 'undefined') {
        window.ChineseFuzzyLib = {
            levenshteinDistance,
            getPinyinInitials,
            extendPinyinMap: (map) => Object.assign(PINYIN_MAP, map),
            getSimilarity,
            getPinyinSimilarity,
            fuzzySearch,
            filterBySimilarity,
            rankBySimilarity,
        };
    }

    // ==================== Cookie 管理函数 ====================
    function setAgreementCookie() {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        document.cookie = "agree_policy=true; expires=" + date.toUTCString() + "; path=/";
    }

    function getNoticeVersion() {
        const match = document.cookie.match(/(?:^|;\s*)notice_version=([^;]+)/);
        return match ? match[1] : null;
    }

    function setNoticeVersion(version) {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        document.cookie = "notice_version=" + version + "; expires=" + date.toUTCString() + "; path=/";
    }

    // 检查是否需要显示弹窗
    function shouldShowModal() {
        const agreed = document.cookie.split(';').some(c => c.trim().startsWith('agree_policy=true'));
        const versionElem = document.querySelector('.version');
        const defaultVersion = '3.6.1.20260430_beta.3';
        const rawText = versionElem ? versionElem.textContent : `版本号：${defaultVersion}`;
        const match = rawText.match(/[\d.]+[_\w.]*/);
        const currentVersion = match ? match[0] : defaultVersion;
        const savedVersion = getNoticeVersion();
        if (savedVersion === null) return true;
        return !agreed || savedVersion !== currentVersion;
    }
    
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
    let isNormalPractice = false;
    let currentOrder = 'asc';
    let lastMergedResults = [];
    let lastKeyword = '';
    let currentPage = 1;
    const pageSize = 10;

    let pendingOriginalSession = null;
    let pendingOriginalType = null;
    let pendingOriginalOrder = null;
    let pendingIndexMap = [];

    const WRONG_KEYS = { A: 'ham_wrong_A', B: 'ham_wrong_B', C: 'ham_wrong_C' };
    const FAVORITE_KEYS = { A: 'ham_favorite_A', B: 'ham_favorite_B', C: 'ham_favorite_C' };
    const PENDING_KEY_PREFIX = 'ham_pending_';

    const questionBanks = { A: null, B: null, C: null };

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
                unanswered = session.userAnswers.filter(ans => ans === null || (Array.isArray(ans) && ans.length === 0)).length;
                total = session.total;
            } else {
                const bank = questionBanks[type];
                if (bank) {
                    total = bank.length;
                    unanswered = total;
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
            const versionElem = document.querySelector('.version');
            const defaultVersion = '3.6.1.20260430_beta.3';
            const rawText = versionElem ? versionElem.textContent : `版本号：${defaultVersion}`;
            const match = rawText.match(/[\d.]+[_\w.]*/);
            const version = match ? match[0] : defaultVersion;
            script.src = `data_${type}.js?v=${version}`;
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

    function updateCorrectAnswerHint(question, isCorrect) {
        const hintEl = document.getElementById('correct-answer-hint');
        if (!hintEl) return;
        if (isCorrect) {
            hintEl.style.display = 'none';
            return;
        }
        const correctValues = question.answer.split('');
        const correctLetters = correctValues.map(v => optionMappings[currentQuestionIndex][v] || v).join('、');
        hintEl.textContent = `正确答案：${correctLetters}`;
        hintEl.style.display = 'block';
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

        if (currentMode === 'practice' && isNormalPractice) {
            updatePendingSession();
        }

        if (pendingIndexMap.length > 0 && pendingOriginalSession) {
            const originalIdx = pendingIndexMap[qIndex];
            let updatedSession = {
                ...pendingOriginalSession,
                userAnswers: [...pendingOriginalSession.userAnswers]
            };
            updatedSession.userAnswers[originalIdx] = userAnswers[qIndex];
            savePendingSession(pendingOriginalType, pendingOriginalOrder, updatedSession);
            pendingOriginalSession = updatedSession;
        }

        if (currentMode === 'practice') {
            const question = currentQuestions[qIndex];
            if (isMulti) {
                const nextBtn = document.getElementById('next-btn');
                const confirmBtn = document.getElementById('confirm-btn');
                if (nextBtn.style.display !== 'none') {
                    confirmBtn.style.display = 'inline-block';
                    nextBtn.style.display = 'none';
                    document.getElementById('practice-feedback').innerHTML = '';
                    document.getElementById('correct-answer-hint').style.display = 'none';
                }
            } else {
                const userAns = userAnswers[qIndex];
                const isCorrect = checkAnswerSingle(question, userAns);
                showPracticeFeedback(isCorrect);
                updateWrongStorage(question.id, isCorrect, currentExamType);
                updateCorrectAnswerHint(question, isCorrect);
            }
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

        const fb = document.getElementById('practice-feedback');
        if (fb) {
            fb.innerHTML = '';
            fb.classList.remove('correct', 'incorrect');
        }

        document.getElementById('progress').textContent = index + 1;
        document.getElementById('progress-fill').style.width = `${((index + 1) / currentQuestions.length) * 100}%`;
        document.getElementById('q-number').textContent = index + 1;
        document.getElementById('q-id').textContent = q.id;
        const isMulti = q.answer.length > 1;
        document.getElementById('q-type').textContent = isMulti ? '多选题' : '单选题';
        document.getElementById('q-type').style.color = isMulti ? '#c44536' : '#2b6f9e';
        
        let questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, (match, filename) => {
            return `<span class="image-placeholder" data-img-src="imageswebp/${filename}"></span>`;
        });
        document.getElementById('q-text').innerHTML = questionHtml;

        document.querySelectorAll('.image-placeholder').forEach(placeholder => {
            const imgSrc = placeholder.dataset.imgSrc;
            const img = new Image();
            img.onload = () => {
                const imgTag = document.createElement('img');
                imgTag.src = imgSrc;
                imgTag.loading = 'lazy';
                imgTag.className = 'question-image';
                imgTag.alt = '题目配图';
                placeholder.parentNode.replaceChild(imgTag, placeholder);
            };
            img.onerror = () => {
                placeholder.remove();
            };
            img.src = imgSrc;
        });

        displayOptions(q, index);

        document.getElementById('prev-btn').disabled = index === 0;
        document.getElementById('next-btn').disabled = index === currentQuestions.length - 1;
        const hintEl = document.getElementById('correct-answer-hint');
        if (hintEl) hintEl.style.display = 'none';

        const confirmBtn = document.getElementById('confirm-btn');
        const nextBtn = document.getElementById('next-btn');
        if (currentMode === 'practice') {
            if (isMulti) {
                confirmBtn.style.display = 'inline-block';
                nextBtn.style.display = 'none';
                document.getElementById('practice-feedback').innerHTML = '';
            } else {
                confirmBtn.style.display = 'none';
                nextBtn.style.display = 'inline-block';
                const userAns = userAnswers[index];
                if (userAns !== undefined && userAns !== null) {
                    const isCorrect = checkAnswerSingle(q, userAns);
                    showPracticeFeedback(isCorrect);
                    updateCorrectAnswerHint(q, isCorrect);
                } else {
                    document.getElementById('practice-feedback').innerHTML = '';
                }
            }
        } else {
            confirmBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }

        updateFavoriteButtonState();
        if (currentMode === 'practice' && isNormalPractice) {
            updatePendingSession();
        }
    }

    // ----- 确认按钮处理 -----
    function confirmAnswer() {
        if (currentMode !== 'practice') return;
        const q = currentQuestions[currentQuestionIndex];
        const isMulti = q.answer.length > 1;
        if (!isMulti) return;

        const userAns = userAnswers[currentQuestionIndex];
        let isCorrect;
        if (userAns === null || (Array.isArray(userAns) && userAns.length === 0)) {
            isCorrect = false;
            showPracticeFeedback(false);
            updateWrongStorage(q.id, false, currentExamType);
        } else {
            isCorrect = checkAnswerSingle(q, userAns);
            showPracticeFeedback(isCorrect);
            updateWrongStorage(q.id, isCorrect, currentExamType);
        }
        updateCorrectAnswerHint(q, isCorrect);

        document.getElementById('confirm-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'inline-block';
    }

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
        currentQuestions = questions;
        currentExamType = type;
        currentMode = 'practice';
        isWrongPractice = false;
        isNormalPractice = true;
        currentOrder = order;
        userAnswers = session.userAnswers.map(ans => ans);
        optionOrders = session.optionOrders.map(orderArr => [...orderArr]);
        optionMappings = currentQuestions.map((q, idx) => {
            let map = {};
            optionOrders[idx].forEach((optIndex, displayIdx) => {
                map[q.options[optIndex].value] = String.fromCharCode(65 + displayIdx);
            });
            return map;
        });
        let firstUnanswered = -1;
        for (let i = 0; i < userAnswers.length; i++) {
            const ans = userAnswers[i];
            if (ans === null || (Array.isArray(ans) && ans.length === 0)) {
                firstUnanswered = i;
                break;
            }
        }
        currentQuestionIndex = firstUnanswered === -1 ? userAnswers.length - 1 : firstUnanswered;
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

    function startPractice(type, bank, order, wrongMode, customQuestions = null) {
        currentMode = 'practice';
        currentExamType = type;
        isWrongPractice = wrongMode;
        isNormalPractice = !wrongMode && !customQuestions;
        currentOrder = order;
        let baseQuestions = customQuestions ? [...customQuestions] : [...bank];
        if (!customQuestions && wrongMode) {
            const wrongIds = getWrongIds(type);
            baseQuestions = bank.filter(q => wrongIds.includes(q.id));
            if (baseQuestions.length === 0) {
                alert('当前没有错题，先去学习题目吧！');
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
        userAnswers = new Array(currentQuestions.length).fill(null);
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
                    questions = bank;
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
                        indexMap = pendingIndices;
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
            pendingOriginalSession = originalSession ? { ...originalSession, userAnswers: [...originalSession.userAnswers] } : null;
            pendingOriginalType = type;
            pendingOriginalOrder = order;
            pendingIndexMap = indexMap;
            startPractice(type, bank, order, false, questions);
        } catch (e) {
            alert('加载失败：' + e.message);
        }
    }

    async function startFavoritePractice(type) {
        try {
            const bank = await loadQuestionBank(type);
            const favIds = getFavoriteIds(type);
            const questions = bank.filter(q => favIds.includes(q.id));
            if (questions.length === 0) {
                alert('当前没有收藏的题目，先去学习题目界面收藏吧！');
                return;
            }
            startPractice(type, bank, 'asc', false, questions);
        } catch (e) {
            alert('题库加载失败');
        }
    }

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

    function normalizeText(str) {
        return str.toLowerCase().replace(/\s+/g, '');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function calculateScore(question, type, rawKeyword) {
        const id = question.id;
        const normalizedKeyword = rawKeyword.trim().toLowerCase();
        if (!normalizedKeyword) return 0;

        if (id === rawKeyword) return 10000;
        const suffix = id.split('-')[1] || id;
        if (suffix === rawKeyword) return 5000;

        let score = 0;
        const keywords = normalizedKeyword.split(/\s+/).filter(k => k.length > 0);
        if (keywords.length > 0) {
            let searchableText = id + ' ' + question.question;
            question.options.forEach(opt => {
                searchableText += ' ' + opt.text;
            });
            const normalizedSearchable = normalizeText(searchableText);
            let totalMatches = 0;
            keywords.forEach(kw => {
                let count = 0;
                let pos = -1;
                while ((pos = normalizedSearchable.indexOf(kw, pos + 1)) !== -1) {
                    count++;
                }
                if (count > 0) {
                    totalMatches += count;
                    if (normalizeText(question.question).indexOf(kw) !== -1) {
                        score += 20 * count;
                    } else {
                        score += 10 * count;
                    }
                }
            });
            if (totalMatches > 0) {
                score += keywords.length * 5;
            }
        }

        function preprocess(str) {
            return str.toLowerCase().replace(/[-\s]+/g, '');
        }
        const cleanKeyword = preprocess(rawKeyword);
        const cleanQuestion = preprocess(question.question);
        let altText = cleanQuestion;
        question.options.forEach(opt => {
            altText += ' ' + preprocess(opt.text);
        });
        const textSimilarity = getSimilarity(cleanKeyword, altText);
        const pinyinSimilarity = getPinyinSimilarity(cleanKeyword, altText);
        const fuzzyScore = textSimilarity * 200 + pinyinSimilarity * 80;
        return score + fuzzyScore;
    }

    // ----- 查询功能 -----
    let queryPending = false;
    let queryTimer = null;

    async function performQuery() {
        if (queryPending) {
            alert('正在查询中，请稍候...');
            return;
        }
        const rawInput = document.getElementById('query-input').value.trim();
        if (!rawInput) {
            alert('请输入查询关键字');
            return;
        }
        const lowerInput = rawInput.toLowerCase();
        if (lowerInput.includes('image') || lowerInput.includes('webp')) {
            alert('查询内容不能包含 "image" 或 "webp"');
            return;
        }
        if (rawInput.length > 100) {
            alert('查询内容过长，请精简后重试');
            return;
        }
        const keyword = rawInput;
        const resultsContainer = document.getElementById('query-results');
        queryPending = true;
        const queryBtn = document.getElementById('query-btn');
        queryBtn.disabled = true;
        queryBtn.textContent = '查询中...';
        resultsContainer.innerHTML = '<div class="loading-spinner-small" style="text-align:center; padding:20px;">正在搜索题目，请稍候...</div>';
        const types = ['A', 'B', 'C'];
        try {
            for (let type of types) {
                if (!questionBanks[type]) {
                    await loadQuestionBank(type);
                }
            }
        } catch (e) {
            console.error(e);
            alert('加载题库失败，请刷新重试');
            queryPending = false;
            queryBtn.disabled = false;
            queryBtn.textContent = '查询';
            resultsContainer.innerHTML = '<p style="text-align:center; color:#c44536;">加载失败，请重试</p>';
            return;
        }
        showLoading(false);
        const scoredResults = [];
        types.forEach(type => {
            const bank = questionBanks[type];
            if (!bank) return;
            bank.forEach(question => {
                const score = calculateScore(question, type, keyword);
                if (score > 0) {
                    scoredResults.push({ question, type, score });
                }
            });
        });
        scoredResults.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return a.question.id.localeCompare(b.question.id);
        });
        if (queryTimer) clearTimeout(queryTimer);
        const startTime = Date.now();
        const showResults = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < 2000) {
                queryTimer = setTimeout(showResults, 2000 - elapsed);
                return;
            }
            displayQueryResults(scoredResults, keyword);
            queryPending = false;
            queryBtn.disabled = false;
            queryBtn.textContent = '查询';
            queryTimer = null;
        };
        queryTimer = setTimeout(showResults, 2000);
    }

    function buildMergedResults(scoredResults) {
        const groups = new Map();
        scoredResults.forEach(item => {
            const id = item.question.id;
            if (!groups.has(id)) {
                groups.set(id, {
                    types: [item.type],
                    question: item.question,
                    score: item.score
                });
            } else {
                const group = groups.get(id);
                if (!group.types.includes(item.type)) group.types.push(item.type);
                if (item.score > group.score) group.score = item.score;
            }
        });
        const merged = Array.from(groups.values())
            .map(group => ({ ...group, types: group.types.sort() }))
            .sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return a.question.id.localeCompare(b.question.id);
            });
        return merged;
    }

    function generatePaginationHTML(totalPages) {
        if (totalPages <= 1) return '';
        let paginationHtml = '<div class="pagination-controls">';
        paginationHtml += `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;
        const maxVisible = 5;
        let pages = [];
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages = [1, 2, 3, 4, '...', totalPages];
            } else if (currentPage >= totalPages - 2) {
                pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
            }
        }
        pages.forEach(page => {
            if (page === '...') {
                paginationHtml += `<span class="page-ellipsis">...</span>`;
            } else {
                paginationHtml += `<button class="page-btn" data-page="${page}" ${currentPage === page ? 'disabled' : ''}>${page}</button>`;
            }
        });
        paginationHtml += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
        paginationHtml += `
            <span class="goto-box">
                跳至 <input type="number" id="page-goto-input" min="1" max="${totalPages}" value="${currentPage}" class="goto-input" style="width:60px;"> 页
                <button id="page-goto-btn" class="goto-btn">Go</button>
            </span>
        `;
        paginationHtml += '</div>';
        return paginationHtml;
    }

    function bindPaginationEvents(totalPages) {
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = btn.dataset.page;
                if (page === 'prev') {
                    if (currentPage > 1) currentPage--;
                } else if (page === 'next') {
                    if (currentPage < totalPages) currentPage++;
                } else {
                    currentPage = parseInt(page);
                }
                renderCurrentPage();
            });
        });
        const gotoBtn = document.getElementById('page-goto-btn');
        const gotoInput = document.getElementById('page-goto-input');
        if (gotoBtn) {
            gotoBtn.addEventListener('click', () => {
                let page = parseInt(gotoInput.value);
                if (isNaN(page)) page = 1;
                if (page < 1) page = 1;
                if (page > totalPages) page = totalPages;
                currentPage = page;
                renderCurrentPage();
            });
        }
        if (gotoInput) {
            gotoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    let page = parseInt(gotoInput.value);
                    if (isNaN(page)) page = 1;
                    if (page < 1) page = 1;
                    if (page > totalPages) page = totalPages;
                    currentPage = page;
                    renderCurrentPage();
                }
            });
        }
    }

    function attachImagePlaceholders(container) {
        container.querySelectorAll('.image-placeholder').forEach(placeholder => {
            const imgSrc = placeholder.dataset.imgSrc;
            const img = new Image();
            img.onload = () => {
                const imgTag = document.createElement('img');
                imgTag.src = imgSrc;
                imgTag.loading = 'lazy';
                imgTag.className = 'question-image';
                imgTag.alt = '题目配图';
                placeholder.parentNode.replaceChild(imgTag, placeholder);
            };
            img.onerror = () => {
                placeholder.remove();
            };
            img.src = imgSrc;
        });
    }

    function renderCurrentPage() {
        const container = document.getElementById('query-results');
        if (!container) return;
        const totalItems = lastMergedResults.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = lastMergedResults.slice(start, end);
        if (totalItems === 0) {
            container.innerHTML = '<p style="text-align:center; color:#7f8c8d;">未找到匹配的题目</p>';
            return;
        }
        let html = '';
        pageItems.forEach(({ question: q, types }) => {
            const typeLabel = types.join('/');
            let questionHtml = q.question.replace(/\[image:\s*([^\]]+)\]/g, (match, filename) => {
                return `<span class="image-placeholder-temp" data-img-src="imageswebp/${filename}"></span>`;
            });
            if (lastKeyword && lastKeyword.trim()) {
                const escaped = escapeRegex(lastKeyword.trim());
                const highlightRegex = new RegExp(`(${escaped})`, 'gi');
                questionHtml = questionHtml.replace(highlightRegex, '<mark>$1</mark>');
            }
            questionHtml = questionHtml.replace(/<span class="image-placeholder-temp" data-img-src="([^"]+)"><\/span>/g, (match, src) => {
                return `<span class="image-placeholder" data-img-src="${src}"></span>`;
            });
            let optionsHtml = '';
            q.options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                let optText = opt.text;
                if (lastKeyword && lastKeyword.trim()) {
                    const escaped = escapeRegex(lastKeyword.trim());
                    const highlightRegex = new RegExp(`(${escaped})`, 'gi');
                    optText = optText.replace(highlightRegex, '<mark>$1</mark>');
                }
                optionsHtml += `<div class="option" style="cursor:default;">${letter}. ${optText}</div>`;
            });
            let correctDisplay = '';
            for (let char of q.answer) {
                const optIndex = q.options.findIndex(opt => opt.value === char);
                if (optIndex !== -1) {
                    correctDisplay += String.fromCharCode(65 + optIndex);
                }
            }
            html += `
                <div class="query-item">
                    <div class="badge">${typeLabel}类题库</div>
                    <h4>${q.id}</h4>
                    <div class="question-text">${questionHtml}</div>
                    <div class="options">${optionsHtml}</div>
                    <div class="correct-answer">正确答案：${correctDisplay}</div>
                </div>
            `;
        });
        const paginationHtml = generatePaginationHTML(totalPages);
        container.innerHTML = '';
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'query-pagination';
        paginationDiv.innerHTML = paginationHtml;
        container.appendChild(paginationDiv);
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'query-results-list';
        resultsDiv.innerHTML = html;
        container.appendChild(resultsDiv);
        bindPaginationEvents(totalPages);
        attachImagePlaceholders(container);
    }

    function displayQueryResults(scoredResults, keyword) {
        const container = document.getElementById('query-results');
        lastKeyword = keyword;
        lastMergedResults = buildMergedResults(scoredResults);
        currentPage = 1;
        renderCurrentPage();
    }

    // ----- DOM 初始化 -----
    document.addEventListener('DOMContentLoaded', function() {
        showStartScreen();
        document.getElementById('loading-overlay').classList.add('hidden');
        Promise.allSettled([
            loadQuestionBank('A').catch(e => console.error('A题库加载失败', e)),
            loadQuestionBank('B').catch(e => console.error('B题库加载失败', e)),
            loadQuestionBank('C').catch(e => console.error('C题库加载失败', e))
        ]).then(() => {
            updatePendingStatusAll();
        });
        updateWrongStatsAll();
        updateFavoriteStatsAll();

        (function handleFontTimeout() {
            if (!document.fonts || !document.fonts.load) return;
            const FONT_FAMILY = 'HYWenhei';         
            const CHECK_STRING = `16px ${FONT_FAMILY}`;
            const TIMEOUT_MS = 5000;
            if (document.fonts.check(CHECK_STRING)) return;
            let fontTimedOut = false;
            const timeoutId = setTimeout(() => {
                fontTimedOut = true;
                document.documentElement.setAttribute('data-font-timeout', 'true');
            }, TIMEOUT_MS);
            document.fonts.load(CHECK_STRING)
                .then(() => {
                    clearTimeout(timeoutId);
                    if (!fontTimedOut) {
                        document.documentElement.removeAttribute('data-font-timeout');
                    }
                })
                .catch(() => {
                    clearTimeout(timeoutId);
                    fontTimedOut = true;
                    document.documentElement.setAttribute('data-font-timeout', 'true');
                });
        })();

        const modal = document.getElementById('startup-modal');
        if (modal) {
            if (!shouldShowModal()) {
                modal.style.display = 'none';
            } else {
                const lastVersionSpan = document.getElementById('last-version');
                const currentVersionSpan = document.getElementById('current-version-modal');
                if (lastVersionSpan && currentVersionSpan) {
                    const savedVer = getNoticeVersion();
                    const versionElem = document.querySelector('.version');
                    const rawText = versionElem ? versionElem.textContent : '版本号：3.6.1.20260430_beta.3';
                    const match = rawText.match(/[\d.]+[_\w.]*/);
                    const currentVer = match ? match[0] : '3.6.1.20260430_beta.3';
                    lastVersionSpan.textContent = savedVer ? savedVer : '（首次访问）';
                    currentVersionSpan.textContent = currentVer;
                }
                const confirmBtn = modal.querySelector('.modal-confirm');
                const agreeCheckbox = document.getElementById('agree-checkbox');
                const versionElem = document.querySelector('.version');
                const rawText = versionElem ? versionElem.textContent : '版本号：3.6.1.20260430_beta.3';
                const versionMatch = rawText.match(/[\d.]+[_\w.]*/);
                const currentVersion = versionMatch ? versionMatch[0] : '3.6.1.20260430_beta.3';
                const agreed = document.cookie.split(';').some(c => c.trim().startsWith('agree_policy=true'));
                if (agreed && getNoticeVersion() !== currentVersion) {
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
                const closeAndSave = () => {
                    if (!agreed) {
                        if (!agreeCheckbox || !agreeCheckbox.checked) {
                            alert('请先阅读并同意《业余无线电模拟考试系统用户协议隐私许可》');
                            return;
                        }
                        setAgreementCookie();
                    }
                    setNoticeVersion(currentVersion);
                    modal.style.display = 'none';
                };
                if (confirmBtn) {
                    confirmBtn.removeEventListener('click', closeAndSave);
                    confirmBtn.addEventListener('click', closeAndSave);
                }
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) closeAndSave();
                });
            }
        }

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
            pendingOriginalSession = null;
            pendingOriginalType = null;
            pendingOriginalOrder = null;
            pendingIndexMap = [];
            showStartScreen();
        });
        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('confirm-btn').addEventListener('click', confirmAnswer);
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