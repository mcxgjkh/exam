import re
import json

def clean_pages(text):
    """
    删除字符串中独立的、前面有空格且数字在1-332范围内的页码。
    例如：'这是一个选项 273 继续' -> '这是一个选项 继续'
    """
    def replace(match):
        num = int(match.group(1))
        # 如果数字在1-332之间，认为是页码，删除（返回空字符串）
        if 1 <= num <= 332:
            return ''
        # 否则保留原样（包括前面的空格）
        return match.group(0)

    # 匹配模式：空格后跟1-3位数字，后面紧跟单词边界或标点符号
    # 使用正向肯定预查确保数字后是空格、标点或字符串结尾，避免误删像1273中的273
    pattern = r' (\d{1,3})(?=[\s,;.:!?)\]]|$)'
    return re.sub(pattern, replace, text)

def process_file(input_path, output_path):
    # 读取整个文件
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取JSON数组部分（去掉开头的 "const questions_C = " 和结尾的 ";"）
    start = content.find('[')
    end = content.rfind(']')
    if start == -1 or end == -1:
        raise ValueError("无法找到JSON数组的起始或结束位置")
    json_str = content[start:end+1]

    # 解析JSON
    data = json.loads(json_str)

    # 递归清理每个题目的question和options中的text
    for item in data:
        if 'question' in item:
            item['question'] = clean_pages(item['question'])
        if 'options' in item:
            for opt in item['options']:
                if 'text' in opt:
                    opt['text'] = clean_pages(opt['text'])

    # 将清理后的数据写回文件
    with open(output_path, 'w', encoding='utf-8') as f:
        # 保持原文件的变量声明格式
        f.write('const questions_C = ')
        json.dump(data, f, ensure_ascii=False, indent=4)
        f.write(';\n')

if __name__ == '__main__':
    input_file = 'data_C.js'   # 输入文件路径
    output_file = 'data_C_cleaned.js'  # 输出文件路径
    process_file(input_file, output_file)
    print(f"处理完成，结果已保存至 {output_file}")