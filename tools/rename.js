// rename.js (最终修正版)
const fs = require('fs');

async function run() {
  // 导入 ESM 模块（注意各模块的导出方式不同）
  const { parse } = await import('@babel/parser');
  const { default: traverse } = await import('@babel/traverse');
  const t = await import('@babel/types');           // ✅ 直接取模块，不取 default
  const { default: generate } = await import('@babel/generator');

  // 读取映射表
  const mapping = JSON.parse(fs.readFileSync('map.json', 'utf-8'));

  // 读取待处理的 JS 文件
  const code = fs.readFileSync('data_A.js', 'utf-8');

  // 解析为 AST
  const ast = parse(code, {
    sourceType: 'script',
    allowHashBang: true,
    plugins: ['jsx']
  });

  // 遍历并替换标识符
  traverse(ast, {
    Identifier(path) {
      const { node, parent } = path;
      const name = node.name;
      if (!mapping[name]) return;

      // 安全检查：防止误改属性名和字符串
      if (t.isObjectProperty(parent) && parent.key === node) return;
      if (t.isMemberExpression(parent) && parent.property === node && !parent.computed) return;
      if (t.isClassProperty(parent) && parent.key === node) return;

      // 检查作用域，仅替换全局变量
      const binding = path.scope.getBinding(name);
      //if (binding && !binding.scope.isGlobal) return;

      node.name = mapping[name];
    }
  });

  // 生成新代码
  const output = generate(ast, {
    retainLines: true,
    compact: false,
    jsescOption: { minimal: true }
  }, code);

  // 写入新文件
  fs.writeFileSync('data_A_renamed.js', output.code, 'utf-8');
  console.log('✅ 替换成功！已生成 script_renamed.js');
}

run().catch(console.error);