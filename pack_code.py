import os

# 定义不需要读取的文件夹和文件后缀
IGNORE_DIRS = {
    '.git', '__pycache__', 'node_modules', 'venv', '.next', '.idea', '.vscode', 'dist', 'build'
}
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', '.env', 'poetry.lock'
}
# 定义你主要想看的文件后缀（可以根据需要修改）
Valid_EXTENSIONS = {
    '.py', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.md', '.json', '.sql', '.toml', '.yml'
}

def pack_project(output_file="codebase.txt"):
    root_dir = os.getcwd()
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # 写入文件树结构，方便我理解架构
        f.write("# Project Structure:\n")
        for root, dirs, files in os.walk(root_dir):
            # 过滤文件夹
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            level = root.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * (level)
            f.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for file in files:
                if file not in IGNORE_FILES:
                    f.write(f"{subindent}{file}\n")
        
        f.write("\n" + "="*50 + "\n\n")

        # 写入具体代码内容
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                # 检查后缀
                ext = os.path.splitext(file)[1]
                if ext not in Valid_EXTENSIONS:
                    continue

                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, root_dir)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as code_file:
                        content = code_file.read()
                        f.write(f"\n# File: {rel_path}\n")
                        f.write("-" * 20 + "\n")
                        f.write(content)
                        f.write("\n" + "-" * 20 + "\n")
                except Exception as e:
                    print(f"Skipping {rel_path}: {e}")

    print(f"打包完成！所有代码已保存到 {output_file}")

if __name__ == "__main__":
    pack_project()