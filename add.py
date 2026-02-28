import os
import re
import json
import ast

try:
    import json5
    HAS_JSON5 = True
except ImportError:
    HAS_JSON5 = False
    print("未安装 json5 库，将使用备用解析方法（可能不够完美）")

def load_image_map(images_dir='imageswebp'):
    """读取 imageswebp 目录下的所有 .webp 文件，返回 {文件名不含扩展名: 完整文件名} 的字典"""
    image_map = {}
    if not os.path.isdir(images_dir):
        print(f"警告：{images_dir} 目录不存在")
        return image_map
    for fname in os.listdir(images_dir):
        filepath = os.path.join(images_dir, fname)
        if os.path.isfile(filepath) and fname.lower().endswith('.webp'):
            name, ext = os.path.splitext(fname)  # ext 包含点，如 .webp
            image_map[name] = fname
    return image_map

def parse_array_str(array_str):
    """尝试多种方式解析数组字符串为Python列表"""
    # 方法1: 使用 json5
    if HAS_JSON5:
        try:
            return json5.loads(array_str)
        except:
            pass
    # 方法2: 替换 JS 字面量中的 null/true/false 为 Python 形式，然后 ast.literal_eval
    array_str = re.sub(r'\bnull\b', 'None', array_str)
    array_str = re.sub(r'\btrue\b', 'True', array_str)
    array_str = re.sub(r'\bfalse\b', 'False', array_str)
    try:
        return ast.literal_eval(array_str)
    except:
        pass
    # 方法3: 直接 eval（风险，但题库可信）
    try:
        return eval(array_str)
    except:
        raise ValueError("无法解析数组字符串")

def process_js_file(filepath, image_map):
    print(f"处理文件: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 移除单行注释（简单移除行首的 //）
    lines = content.splitlines()
    filtered_lines = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith('//'):
            continue
        filtered_lines.append(line)
    content = '\n'.join(filtered_lines)
    
    # 提取 const questions_X = [ ... ];
    pattern = r'const questions_([A-Z])\s*=\s*(\[.*?\])\s*;'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"  未找到题库数组，跳过")
        return
    type_letter = match.group(1)
    array_str = match.group(2)
    
    try:
        questions = parse_array_str(array_str)
    except Exception as e:
        print(f"  解析失败: {e}")
        return
    
    modified = False
    # 先删除所有 .png 图片标记
    png_tag_pattern = r'\[image:\s*\S+\.png\]'
    for q in questions:
        original_q = q.get('question', '')
        # 删除所有 .png 标记
        new_question = re.sub(png_tag_pattern, '', original_q, flags=re.IGNORECASE)
        # 清理可能多余的空格（例如标记前后可能有空格，简单去除多余空格）
        new_question = re.sub(r'\s+', ' ', new_question).strip()
        if new_question != original_q:
            q['question'] = new_question
            modified = True
            print(f"    题目 {q.get('id')} 已删除旧的 .png 标记")
    
    # 添加新的 .webp 标记（如果对应图片存在且尚未添加）
    for q in questions:
        qid = q.get('id')
        if qid in image_map:
            img_fname = image_map[qid]  # 例如 "MDX-XXXX.webp"
            img_tag = f"[image: {img_fname}]"
            # 检查题目文本中是否已存在该标记（防止重复添加）
            if img_tag not in q['question']:
                q['question'] += ' ' + img_tag
                modified = True
                print(f"    为题目 {qid} 添加图片标记 {img_tag}")
            else:
                print(f"    题目 {qid} 已有图片标记 {img_tag}，跳过")
    
    if not modified:
        print("  无需修改")
        return
    
    # 将修改后的列表转换回 JSON 字符串
    new_array_str = json.dumps(questions, ensure_ascii=False, indent=4)
    
    # 替换原数组部分
    new_content = content[:match.start(2)] + new_array_str + content[match.end(2):]
    
    # 备份原文件
    backup = filepath + '.bak'
    os.rename(filepath, backup)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"  已更新文件，原文件备份为 {backup}")

def main():
    image_map = load_image_map('imageswebp')
    print(f"找到 {len(image_map)} 个图片文件（.webp）")
    for fname in ['data_A.js', 'data_B.js', 'data_C.js']:
        if os.path.exists(fname):
            process_js_file(fname, image_map)
        else:
            print(f"文件 {fname} 不存在，跳过")

if __name__ == '__main__':
    main()