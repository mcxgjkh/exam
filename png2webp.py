import os
import argparse
from PIL import Image

def convert_png_to_webp(input_path, output_path, quality):
    """
    将单个PNG文件转换为WebP格式
    :param input_path: 输入PNG文件路径
    :param output_path: 输出WebP文件路径
    :param quality: 压缩质量 (0-100)
    """
    try:
        with Image.open(input_path) as img:
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            # 保存为WebP，指定质量
            img.save(output_path, 'webp', quality=quality)
        print(f"已转换: {input_path} -> {output_path} (质量={quality})")
    except Exception as e:
        print(f"处理文件 {input_path} 时出错: {e}")

def batch_convert(input_dir, output_dir, quality):
    """
    批量转换目录下的所有PNG文件
    :param input_dir: 输入目录
    :param output_dir: 输出目录
    :param quality: 压缩质量
    """
    if not os.path.isdir(input_dir):
        print(f"错误: 输入目录 {input_dir} 不存在")
        return

    # 遍历所有文件
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.lower().endswith('.png'):
                # 构建完整的输入路径
                input_path = os.path.join(root, file)
                # 计算相对于输入目录的路径
                rel_path = os.path.relpath(input_path, input_dir)
                # 修改扩展名为.webp
                rel_path_webp = os.path.splitext(rel_path)[0] + '.webp'
                # 构建输出路径
                output_path = os.path.join(output_dir, rel_path_webp)
                # 转换
                convert_png_to_webp(input_path, output_path, quality)

def main():
    parser = argparse.ArgumentParser(description='批量将PNG图片转换为WebP格式，可自定义压缩质量')
    parser.add_argument('input_dir', help='输入文件夹路径（包含PNG文件）')
    parser.add_argument('output_dir', help='输出文件夹路径（将存放WebP文件）')
    parser.add_argument('-q', '--quality', type=int, default=80, choices=range(0, 101),
                        help='WebP压缩质量 (0-100, 默认80)', metavar='[0-100]')
    args = parser.parse_args()

    print(f"开始转换: 从 {args.input_dir} 到 {args.output_dir}，质量={args.quality}")
    batch_convert(args.input_dir, args.output_dir, args.quality)
    print("转换完成！")

if __name__ == "__main__":
    main()