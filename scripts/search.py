import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# 1. 加载环境变量
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# 2. 连接数据库
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 3. 加载模型 (这个很快，因为模型刚才已经下载过了)
print("⏳ 正在加载 AI 模型...")
model = SentenceTransformer('shibing624/text2vec-base-chinese')

def search_law(query_text: str):
    print(f"\n🔍 正在搜索: {query_text}")
    
    # 1. 把问题变成向量
    query_vector = model.encode(query_text).tolist()
    
    # 2. 去 Supabase 搜索最相似的条款
    # rpc 是 "Remote Procedure Call" 的缩写，就是调用我们在 SQL 里写的函数
    response = supabase.rpc("match_documents", {
        "query_embedding": query_vector,
        "match_threshold": 0.5, # 相似度阈值 (0-1)，越低搜到的越多但越不准
        "match_count": 3        # 只返回前 3 条
    }).execute()
    
    # 3. 打印结果
    if response.data:
        for i, doc in enumerate(response.data):
            print(f"\n--- 结果 {i+1} (相似度: {doc['similarity']:.4f}) ---")
            print(f"【出处】{doc['law_name']} - {doc['reference_id']}")
            print(f"【内容】{doc['content']}")
    else:
        print("🤷‍♂️ 未找到相关法律条文。")

if __name__ == "__main__":
    # 在这里修改你想问的问题
    questions = [
        "高空抛物怎么定责？",
        "离婚时财产怎么分割？",
        "租房合同还没到期房东要赶我走怎么办？"
    ]
    
    for q in questions:
        search_law(q)