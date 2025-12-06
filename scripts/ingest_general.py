import os
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# 1. 加载配置
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('shibing624/text2vec-base-chinese')

def chunk_text(text: str, chunk_size=400, overlap=50) -> List[str]:
    """
    通用切片函数：按字数切分
    chunk_size: 每段大概多少字
    overlap: 上下文重叠多少字（防止把一句话切断）
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        # 截取片段
        segment = text[start:end]
        chunks.append(segment)
        # 移动指针，保留重叠部分
        start += (chunk_size - overlap)
    return chunks

def ingest_file(file_path: str, category="case"):
    """ 读取文件并入库 """
    filename = os.path.basename(file_path)
    print(f"📄 正在处理: {filename}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        full_text = f.read()
    
    # 1. 切片
    text_chunks = chunk_text(full_text)
    
    print(f"   🔪 切分为 {len(text_chunks)} 个片段，准备向量化...")

    # 2. 批量入库
    batch_size = 10
    for i in tqdm(range(0, len(text_chunks), batch_size)):
        batch_texts = text_chunks[i : i + batch_size]
        
        # 向量化
        embeddings = model.encode(batch_texts)
        
        records = []
        for text, emb in zip(batch_texts, embeddings):
            records.append({
                "content": text,
                "law_name": filename, # 这里用文件名作为来源
                "reference_id": "相关案例片段", # 案例没有条款号
                "category": category, # 标记为案例
                "embedding": emb.tolist()
            })
            
        try:
            supabase.table("legal_docs").insert(records).execute()
        except Exception as e:
            print(f"⚠️ Error: {e}")

if __name__ == "__main__":
    # 指定 data 目录下所有的 .txt 文件 (不包含 minfadian.txt)
    data_dir = "data"
    for filename in os.listdir(data_dir):
        if filename.endswith(".txt") and "minfadian" not in filename:
            path = os.path.join(data_dir, filename)
            ingest_file(path, category="case")
            
    print("🎉 所有案例文件入库完成！")