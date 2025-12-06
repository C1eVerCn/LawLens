import os
import json
import time
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# 1. 加载配置
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 错误: 请检查 .env 文件配置")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('shibing624/text2vec-base-chinese')

def chunk_text(text: str, chunk_size=400, overlap=50) -> List[str]:
    """ 长文本切片：避免超过模型处理长度 """
    if not text: return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        segment = text[start:end]
        chunks.append(segment)
        start += (chunk_size - overlap)
    return chunks

def process_lecard_json(file_path: str) -> List[Dict]:
    """ 解析 LeCaRD 格式的 JSON 文件 """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # LeCaRDv1/v2 的字段可能略有不同，这里做兼容处理
        # 优先获取 'qw'(全文)，如果没有则尝试拼接 'ajjbqk'(案情) + 'pjjg'(判决)
        content = data.get('qw', '')
        if not content:
            content = (data.get('ajjbqk', '') + "\n" + data.get('pjjg', '')).strip()
            
        case_name = data.get('ajName', os.path.basename(file_path))
        
        if not content:
            return []

        # 对长案情进行切片
        chunks = chunk_text(content)
        records = []
        
        for chunk in chunks:
            records.append({
                "content": chunk,
                "law_name": case_name,   # 存入案件名称
                "reference_id": "真实案例", # 标记来源
                "category": "case",      # 关键分类：case
                "meta": {"source": "LeCaRD"} # 额外元数据(可选)
            })
            
        return records
        
    except Exception as e:
        print(f"⚠️ 解析错误 {file_path}: {e}")
        return []

def ingest_folder(folder_path: str):
    """ 遍历文件夹并入库 """
    print(f"📂 正在扫描文件夹: {folder_path} ...")
    
    files = []
    for root, _, filenames in os.walk(folder_path):
        for filename in filenames:
            if filename.endswith('.json'):
                files.append(os.path.join(root, filename))
    
    print(f"📊 发现 {len(files)} 个案例文件，准备处理...")
    
    # 批量处理
    batch_records = []
    total_inserted = 0
    
    for file_path in tqdm(files):
        records = process_lecard_json(file_path)
        
        # 1. 向量化 (Embedding)
        if records:
            texts = [r["content"] for r in records]
            embeddings = model.encode(texts)
            
            # 把向量塞回记录里
            for record, emb in zip(records, embeddings):
                record["embedding"] = emb.tolist()
                batch_records.append(record)
        
        # 2. 每积攒 50 条数据就上传一次 (避免请求太频繁)
        if len(batch_records) >= 50:
            try:
                supabase.table("legal_docs").insert(batch_records).execute()
                total_inserted += len(batch_records)
                batch_records = [] # 清空缓冲区
            except Exception as e:
                print(f"⚠️ 上传失败: {e}")
                time.sleep(1)

    # 处理剩余的数据
    if batch_records:
        supabase.table("legal_docs").insert(batch_records).execute()
        total_inserted += len(batch_records)

    print(f"🎉 入库完成！共上传 {total_inserted} 条案例片段。")

if __name__ == "__main__":
    # 指定你的数据文件夹路径
    data_dir = "data/lecard_cases"
    
    if os.path.exists(data_dir):
        ingest_folder(data_dir)
    else:
        print(f"❌ 找不到文件夹: {data_dir}")
        print("请先下载 LeCaRD 数据并放入该文件夹！")