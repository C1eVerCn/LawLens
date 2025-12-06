import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from zhipuai import ZhipuAI
from typing import List, Optional # 新增 import

# 1. 加载环境变量
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY")

# 2. 初始化客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
zhipu_client = ZhipuAI(api_key=ZHIPU_API_KEY)

print("⏳ 正在加载 AI 模型 (第一次启动会稍慢)...")
# 这里复用你本地已经下载好的模型
embed_model = SentenceTransformer('shibing624/text2vec-base-chinese')
print("✅ 模型加载完毕！")

# --- 新增：数据模型 ---
class DocumentSave(BaseModel):
    title: str
    content: str

class DocumentHistory(BaseModel):
    id: int
    title: str
    content: str
    created_at: str

# 3. 创建 API 服务
app = FastAPI()

# 允许前端跨域访问 (非常重要！)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # 允许 Next.js 前端访问
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    text: str

def get_relevant_laws(query: str):
    """ 去 Supabase 搜索相关的法律条款 """
    query_vector = embed_model.encode(query).tolist()
    
    # 调用数据库函数
    response = supabase.rpc("match_documents", {
        "query_embedding": query_vector,
        "match_threshold": 0.4, 
        "match_count": 5
    }).execute()
    
    return response.data

# --- 新增：数据模型 ---
class DocumentSave(BaseModel):
    title: str
    content: str

class DocumentHistory(BaseModel):
    id: int
    title: str
    content: str
    created_at: str

# --- 新增：版本管理 API ---

@app.post("/api/save")
async def save_document(doc: DocumentSave):
    """ 保存文书到 Supabase """
    print(f"💾 正在保存: {doc.title}")
    try:
        # 简单实现：每次保存都作为一条新记录（类似版本快照）
        # 实际生产中可能需要区分 "update" 和 "new version"
        data = {
            "title": doc.title,
            "content": doc.content,
        }
        response = supabase.table("documents").insert(data).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        print(f"❌ 保存失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    """ 获取所有历史文书 """
    try:
        # 按时间倒序查前 10 条
        response = supabase.table("documents").select("*").order("created_at", desc=True).limit(10).execute()
        return response.data
    except Exception as e:
        print(f"❌ 获取历史失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    print(f"🔍 收到请求: {request.text[:20]}...")
    
    # A. 检索 (RAG)
    relevant_docs = get_relevant_laws(request.text)
    
    context_text = ""
    if not relevant_docs:
        context_text = "（未找到具体法律条文，请依据通用法律常识回答）"
    else:
        context_text = "\n\n".join([
            f"《{doc['law_name']}》{doc['reference_id']}:\n{doc['content']}" 
            for doc in relevant_docs
        ])

    # B. 组装提示词
    system_prompt = """
    你是一位专业的中国法律顾问。请根据下面提供的【法律法规依据】来分析用户的案情。
    要求：
    1. 引用具体的法律条款。
    2. 语气专业、客观。
    3. 输出格式要清晰，分点回答。
    """
    
    user_prompt = f"""
    【法律法规依据】：
    {context_text}

    【用户案情】：
    {request.text}
    """

    # C. 调用智谱 AI
    try:
        response = zhipu_client.chat.completions.create(
            model="glm-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        # 获取回答
        ai_reply = response.choices[0].message.content
        return {"result": ai_reply}

    except Exception as e:
        print(f"❌ 出错: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # 在 8000 端口启动服务
    uvicorn.run(app, host="0.0.0.0", port=8000)