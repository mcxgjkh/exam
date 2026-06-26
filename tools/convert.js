// tools/convert.js
const fs = require('fs');
const path = require('path');

// 从 JS 文件中提取 const vA2 = [...] 的内容
function extractArray(jsContent) {
  // 匹配 const vA2 = [ ... ]; 注意可能跨行
  const regex = /const vA2\s*=\s*(\[[\s\S]*?\]);/;
  const match = jsContent.match(regex);
  if (!match) {
    throw new Error('未找到 vA2 数组定义');
  }
  // 使用 Function 构造器解析，避免执行任何函数
  return new Function('return ' + match[1])();
}

const types = ['A', 'B', 'C'];
types.forEach(type => {
  const jsPath = path.join(__dirname, '.', `data_${type}.js`);
  const jsonPath = path.join(__dirname, '.', `data_${type}.json`);

  try {
    const content = fs.readFileSync(jsPath, 'utf-8');
    const data = extractArray(content);
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`✅ 已生成 data_${type}.json (共 ${data.length} 题)`);
  } catch (err) {
    console.error(`❌ 处理 data_${type}.js 失败:`, err.message);
  }
});