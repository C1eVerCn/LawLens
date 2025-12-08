import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from openai import OpenAI # 👈 改用 OpenAI
from typing import List, Optional

# 1. 环境变量
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY") # 👈 新 Key

# 2. 全局客户端
supabase: Optional[Client] = None
client: Optional[OpenAI] = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    global supabase, client
    if not all([SUPABASE_URL, SUPABASE_KEY, SILICONFLOW_API_KEY]):
        print("❌ 错误：核心环境变量缺失 (请检查 Render 环境变量配置)")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        # 👇 初始化 SiliconFlow
        client = OpenAI(
            api_key=SILICONFLOW_API_KEY,
            base_url="https://api.siliconflow.cn/v1"
        )
        print("✅ 客户端初始化成功 (SiliconFlow / Qwen)")
    except Exception as e:
        print(f"❌ 初始化失败: {e}")

class AnalyzeRequest(BaseModel):
    text: str
    mode: str = "draft"

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

# ... (API: save 和 history 保持原样) ...
@app.post("/api/save")
async def save_document(doc: DocumentSave):
    if not supabase: return {"status": "error", "msg": "DB未连接"}
    try:
        data = {"title": doc.title, "content": doc.content, "user_id": doc.user_id}
        supabase.table("documents").insert(data).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"Save error: {e}")
        return {"status": "error", "msg": str(e)}

@app.get("/api/history")
async def get_history(user_id: Optional[str] = None):
    if not supabase: return []
    try:
        query = supabase.table("documents").select("*").order("created_at", desc=True).limit(20)
        if user_id: query = query.eq("user_id", user_id)
        else: query = query.is_("user_id", "null")
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"History error: {e}")
        return []

# --- 核心修改 ---

def get_relevant_laws(query: str):
    if not client or not supabase: return []
    try:
        # 1. 生成向量 (使用 BAAI/bge-m3)
        response = client.embeddings.create(
            model="BAAI/bge-m3", 
            input=query
        )
        query_vector = response.data[0].embedding
        
        # 2. 数据库查询
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.4, 
            "match_count": 5
        }).execute()
        return rpc_response.data
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    print(f"🔍 请求: {request.text[:10]}...")
    
    relevant_docs = get_relevant_laws(request.text)
    context_text = "\n".join([f"《{doc['law_name']}》: {doc['content'][:200]}..." for doc in relevant_docs])
    if not context_text: context_text = "（依据通用法律常识）"

    system_prompt = ""
    if request.mode == "draft":
        system_prompt = f"""
        你是一名资深律师。用户输入案情：{request.text}。
        参考法律：{context_text}。
        请撰写专业文书。末尾用 "|||" 分隔推荐问题。
        """
    else:
        system_prompt = f"""
        你是一名法务专家。用户输入初稿：{request.text}。
        参考法律：{context_text}。
        请润色并标注修改理由(> 修改理由)。末尾用 "|||" 分隔推荐问题。
        """

    try:
        # 👇 指定你要求的模型
        # 注意：如果报错 404 Model Not Found，请改为 "Qwen/Qwen2.5-32B-Instruct"
        MODEL_NAME = "Qwen/Qwen3-VL-32B-Instruct" 
        
        response = client.chat.completions.create(
            model=MODEL_NAME, 
            messages=[{"role": "user", "content": system_prompt}],
            stream=False
        )
        full_content = response.choices[0].message.content
        
        result = full_content
        suggestions = []
        if "|||" in full_content:
            parts = full_content.split("|||")
            result = parts[0].strip()
            suggestions = [s.strip() for s in parts[1].strip().split("\n") if s.strip()][:3]

        return {"result": result, "suggestions": suggestions}

    except Exception as e:
        print(f"❌ AI生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)