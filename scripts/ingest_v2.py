import os
import json
import time
import re
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI  # 👈 改用 OpenAI 库
from tqdm import tqdm

# 1. 加载环境变量
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY") # 👈 新 Key

if not all([SUPABASE_URL, SUPABASE_KEY, SILICONFLOW_API_KEY]):
    print("❌ 错误: 环境变量缺失，请检查 .env 文件！")
    exit()

# 2. 初始化客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 👇 初始化 SiliconFlow 客户端 (兼容 OpenAI 格式)
client = OpenAI(
    api_key=SILICONFLOW_API_KEY,
    base_url="https://api.siliconflow.cn/v1"
)

print("🚀 客户端初始化完成 (SiliconFlow)。准备开始处理数据...")

# ---------------- 工具函数 ----------------

def get_embedding(text: str):
    """ 调用 SiliconFlow 获取 BGE-M3 向量 (1024维) """
    for _ in range(3):
        try:
            # ✅ 这里使用硅基流动的免费向量模型 BAAI/bge-m3
            response = client.embeddings.create(
                model="BAAI/bge-m3", 
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"   ⚠️ API 波动: {e}，正在重试...")
            time.sleep(1)
    print("   ❌ Embedding 失败，跳过此条")
    return None

def check_if_exists(title_prefix: str) -> bool:
    try:
        response = supabase.table("documents").select("id").ilike("title", f"{title_prefix}%").limit(1).execute()
        return len(response.data) > 0
    except Exception:
        return False

def chunk_text(text: str, chunk_size=500, overlap=50) -> List[str]:
    if not text: return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
    return chunks

def batch_insert(records: List[Dict]):
    if not records: return
    try:
        supabase.table("documents").insert(records).execute()
    except Exception as e:
        print(f"   ⚠️ 数据库写入失败: {e}")

# ---------------- 逻辑 1: 处理民法典 ----------------

def process_minfadian(file_path: str):
    print(f"\n📘 [1/3] 处理: 民法典...")
    if not os.path.exists(file_path): return

    if check_if_exists("民法典"):
        print("   ⏩ 已存在，跳过。")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    pattern = r"(第[零一二三四五六七八九十百千]+条\s+)"
    parts = re.split(pattern, text)
    
    current_clause = ""
    batch_records = []
    
    for i in tqdm(range(0, len(parts)), desc="处理法条"):
        part = parts[i]
        if re.match(pattern, part):
            current_clause = part.strip()
        else:
            if current_clause and part.strip():
                content = f"{current_clause} {part.strip()}"
                embedding = get_embedding(content)
                if embedding:
                    batch_records.append({
                        "title": f"民法典 {current_clause}", 
                        "content": content,
                        "embedding": embedding,
                        "user_id": None 
                    })
                if len(batch_records) >= 10:
                    batch_insert(batch_records)
                    batch_records = []
                current_clause = ""
    if batch_records: batch_insert(batch_records)

# ---------------- 逻辑 2: 处理 LeCaRD 案例 ----------------

def process_lecard(folder_path: str):
    print(f"\n📂 [2/3] 处理: LeCaRD 案例...")
    if not os.path.exists(folder_path): return

    files = []
    for root, _, filenames in os.walk(folder_path):
        for filename in filenames:
            if filename.endswith('.json'):
                files.append(os.path.join(root, filename))
    
    for file_path in tqdm(files, desc="处理案例"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            case_name = data.get('ajName', os.path.basename(file_path))
            
            if check_if_exists(f"案例: {case_name}"): continue

            content = data.get('qw', '') or (data.get('ajjbqk', '') + "\n" + data.get('pjjg', '')).strip()
            if not content: continue

            chunks = chunk_text(content)
            batch_records = []
            for chunk in chunks:
                embedding = get_embedding(chunk)
                if embedding:
                    batch_records.append({
                        "title": f"案例: {case_name}",
                        "content": chunk,
                        "embedding": embedding,
                        "user_id": None
                    })
            batch_insert(batch_records)
        except Exception: pass

# ---------------- 逻辑 3: 处理普通 TXT ----------------

def process_general_txt(data_dir: str):
    print(f"\n📄 [3/3] 处理: 其他 TXT...")
    if not os.path.exists(data_dir): return

    for filename in os.listdir(data_dir):
        if filename.endswith(".txt") and "minfadian" not in filename:
            if check_if_exists(f"参考资料: {filename}"): continue
            
            file_path = os.path.join(data_dir, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            chunks = chunk_text(text)
            batch_records = []
            for chunk in tqdm(chunks, desc=filename, leave=False):
                embedding = get_embedding(chunk)
                if embedding:
                    batch_records.append({
                        "title": f"参考资料: {filename}",
                        "content": chunk,
                        "embedding": embedding,
                        "user_id": None
                    })
                if len(batch_records) >= 10:
                    batch_insert(batch_records)
                    batch_records = []
            if batch_records: batch_insert(batch_records)

if __name__ == "__main__":
    # 执行处理
    process_minfadian("data/minfadian.txt")
    process_lecard("data/lecard_cases")
    process_general_txt("data")
    print("\n🎉 全部完成！")