// add_images_to_questions.js
const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const IMG_DIR = path.join(__dirname, 'static', 'img');   // 图片目录
const DATA_FILES = {
  A: path.join(__dirname, 'data', 'data_A.json'),
  B: path.join(__dirname, 'data', 'data_B.json'),
  C: path.join(__dirname, 'data', 'data_C.json'),
};

// ========== 辅助函数 ==========

/**
 * 从文件名中提取题目 ID
 * 例如 "MC1-0001.webp" -> "MC1-0001"
 */
function extractQuestionId(filename) {
  const match = filename.match(/^(MC[1-9]-\d{4})\.webp$/);
  return match ? match[1] : null;
}

/**
 * 检查 question 字段是否已包含该图片引用
 */
function hasImageReference(questionText, imageName) {
  return questionText.includes(`[image: ${imageName}]`);
}

/**
 * 加载 JSON 文件，如果文件不存在则返回 null
 */
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 文件不存在: ${filePath}`);
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ 解析 JSON 失败 (${filePath}):`, err.message);
    return null;
  }
}

/**
 * 保存 JSON 文件（格式化输出）
 */
function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ 已更新: ${filePath}`);
  } catch (err) {
    console.error(`❌ 保存失败 (${filePath}):`, err.message);
  }
}

// ========== 主程序 ==========
async function main() {
  // 1. 检查图片目录是否存在
  if (!fs.existsSync(IMG_DIR)) {
    console.error(`❌ 图片目录不存在: ${IMG_DIR}`);
    process.exit(1);
  }

  // 2. 读取所有 .webp 文件
  const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.webp'));
  if (files.length === 0) {
    console.log('ℹ️ 未找到任何 .webp 图片文件，脚本退出。');
    return;
  }

  // 3. 建立 图片名 -> 题号 映射
  const imageMap = new Map();
  files.forEach(file => {
    const id = extractQuestionId(file);
    if (id) {
      imageMap.set(id, file);
    } else {
      console.warn(`⚠️ 文件名格式不正确，已跳过: ${file}`);
    }
  });

  if (imageMap.size === 0) {
    console.log('ℹ️ 没有可匹配的图片，脚本退出。');
    return;
  }

  console.log(`📷 找到 ${imageMap.size} 个可匹配的图片文件。`);

  // 4. 加载三个题库
  const allData = {};
  for (const [type, filePath] of Object.entries(DATA_FILES)) {
    const data = loadJSON(filePath);
    if (data) {
      allData[type] = data;
    }
  }

  if (Object.keys(allData).length === 0) {
    console.error('❌ 没有加载到任何题库数据，请检查 JSON 文件是否存在。');
    process.exit(1);
  }

  // 5. 遍历每个题库，为匹配的题目添加图片引用
  let totalAdded = 0;
  for (const [type, questions] of Object.entries(allData)) {
    if (!Array.isArray(questions)) {
      console.warn(`⚠️ ${type} 题库数据不是数组，跳过。`);
      continue;
    }

    let typeAdded = 0;
    questions.forEach(q => {
      const id = q.id;
      if (imageMap.has(id)) {
        const imageName = imageMap.get(id);
        // 检查是否已有该图片引用，避免重复添加
        if (!hasImageReference(q.question, imageName)) {
          // 在 question 末尾添加换行和图片标记
          q.question += `\n[image: ${imageName}]`;
          typeAdded++;
          totalAdded++;
        }
      }
    });

    if (typeAdded > 0) {
      console.log(`📝 ${type} 类题库：新增 ${typeAdded} 个图片引用`);
      // 保存修改后的数据
      saveJSON(DATA_FILES[type], questions);
    } else {
      console.log(`ℹ️ ${type} 类题库：无需修改`);
    }
  }

  console.log(`🎉 总共为 ${totalAdded} 个题目添加了图片引用。`);
}

// ========== 执行 ==========
main().catch(err => {
  console.error('💥 脚本执行出错:', err);
  process.exit(1);
});