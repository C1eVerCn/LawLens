import os
import re
import time
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# 1. 加载环境变量
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 错误: 请先在 .env 文件里填好 Supabase 的网址和密钥！")
    exit()

# 2. 连接数据库
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"❌ 数据库连接失败: {e}")
    exit()

print("⏳ 正在下载/加载 AI 模型 (第一次运行会比较慢，请耐心等待)...")
# 这里会下载一个几百MB的免费模型到你本地
model = SentenceTransformer('shibing624/text2vec-base-chinese') 

def parse_law_text(file_path: str, law_name: str) -> List[Dict]:
    """读取 txt 文件并切分成条款"""
    if not os.path.exists(file_path):
        print(f"❌ 找不到文件: {file_path}")
        return []

    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 切分规则：按 "第X条" 切分
    pattern = r"(第[零一二三四五六七八九十百千]+条\s+)"
    parts = re.split(pattern, text)
    
    docs = []
    current_clause = ""
    
    print(f"📄 正在解析: {law_name}...")
    for part in parts:
        if re.match(pattern, part):
            current_clause = part.strip()
        else:
            if current_clause and part.strip():
                # 把 "第一条" 和 "内容" 拼起来
                docs.append({
                    "content": f"{current_clause} {part.strip()}",
                    "law_name": law_name,
                    "reference_id": current_clause,
                    "category": "law"
                })
                current_clause = ""
    
    return docs

def ingest_data(docs: List[Dict]):
    """把数据上传到 Supabase"""
    if not docs: return
    print(f"🚀 准备上传 {len(docs)} 条数据...")
    
    batch_size = 10 # 每次传10条，稳一点
    for i in tqdm(range(0, len(docs), batch_size)):
        batch = docs[i : i + batch_size]
        
        # 1. AI 将文本转化为向量
        texts = [d["content"] for d in batch]
        embeddings = model.encode(texts)
        
        # 2. 准备要存的数据
        records = []
        for doc, emb in zip(batch, embeddings):
            records.append({
                "content": doc["content"],
                "law_name": doc["law_name"],
                "reference_id": doc["reference_id"],
                "category": "law"
                # 注意：这里需要先把 embedding 转成 list
                , "embedding": emb.tolist() 
            })
            
        # 3. 发送到 Supabase
        try:
            supabase.table("legal_docs").insert(records).execute()
        except Exception as e:
            print(f"⚠️ 上传出错: {e}")
            # 如果出错稍微等一下再试
            time.sleep(1)

if __name__ == "__main__":
    # 这里指定你要处理的文件
    # 请确保把 txt 文件放在 data 文件夹下
    txt_file = "data/minfadian.txt"
    
    if os.path.exists(txt_file):
        documents = parse_law_text(txt_file, "中华人民共和国民法典")
        ingest_data(documents)
        print("🎉 恭喜！数据入库完成！")
    else:
        print(f"⚠️ 请先下载民法典文本，并重命名为 minfadian.txt 放入 data 文件夹！")