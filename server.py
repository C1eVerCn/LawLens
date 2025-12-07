import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from zhipuai import ZhipuAI
from typing import List, Optional

# 1. 环境变量 (Render 会自动注入，无需 load_dotenv)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY")

# 2. 全局客户端变量
supabase: Optional[Client] = None
zhipu_client: Optional[ZhipuAI] = None

# 3. 创建 API 服务
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 启动时初始化 (轻量级，不加载大模型)
@app.on_event("startup")
def startup_event():
    global supabase, zhipu_client
    # 检查 Render 是否配置了必要的环境变量
    if not all([SUPABASE_URL, SUPABASE_KEY, ZHIPU_API_KEY]):
        print("❌ 错误：核心环境变量缺失。")
        raise EnvironmentError("配置缺失：请检查 Render 的 Environment Variables")

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        zhipu_client = ZhipuAI(api_key=ZHIPU_API_KEY)
        print("✅ 客户端初始化成功 (API模式，内存占用极低)")
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        raise HTTPException(status_code=500, detail="初始化失败")

class AnalyzeRequest(BaseModel):
    text: str

class DocumentSave(BaseModel):
    title: str
    content: str

# ---------------------------------------------------------
# 核心修改：使用智谱 API 生成向量 (替代本地 sentence-transformers)
# ---------------------------------------------------------
def get_relevant_laws(query: str):
    if not zhipu_client or not supabase:
        raise HTTPException(status_code=500, detail="服务未就绪")
    
    try:
        # 调用智谱 Embedding API (使用 embedding-2 模型)
        # 这也是你当初向 Supabase 存数据时用的模型原理，通用性很高
        response = zhipu_client.embeddings.create(
            model="embedding-2", 
            input=query
        )
        # 获取向量数据 (这是一个 float 数组)
        query_vector = response.data[0].embedding
        
        # 去 Supabase 查询 (这一步没变)
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.4, 
            "match_count": 5
        }).execute()
        
        return rpc_response.data
        
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        # 如果检索挂了，返回空列表，不要让整个请求崩溃
        return []

# ---------------------------------------------------------

@app.post("/api/save")
async def save_document(doc: DocumentSave):
    if not supabase: raise HTTPException(status_code=500, detail="DB未连接")
    try:
        # 简单的取前20个字作为标题逻辑
        data = {"title": doc.title, "content": doc.content}
        supabase.table("documents").insert(data).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"Save error: {e}")
        return {"status": "error", "msg": str(e)}

@app.get("/api/history")
async def get_history():
    if not supabase: raise HTTPException(status_code=500, detail="DB未连接")
    try:
        res = supabase.table("documents").select("*").order("created_at", desc=True).limit(20).execute()
        return res.data
    except Exception as e:
        print(f"History error: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    print(f"🔍 分析请求: {request.text[:10]}...")
    
    # 1. 检索 (调用上面的 get_relevant_laws)
    relevant_docs = get_relevant_laws(request.text)
    
    context_text = ""
    if not relevant_docs:
        context_text = "（未找到具体条文，请依据通用法律常识回答）"
    else:
        context_text = "\n\n".join([
            f"《{doc['law_name']}》:\n{doc['content']}" 
            for doc in relevant_docs
        ])

    # 2. 生成回答
    system_prompt = """
    你是一位专业的中国法律顾问。请根据提供的【法律法规依据】分析用户的案情。
    输出要求：
    1. 先输出分析结果，引用法条。
    2. 最后一行单独输出 "|||"。
    3. 在分隔符后列出3个相关追问。
    """
    
    user_prompt = f"【法律法规依据】:\n{context_text}\n\n【用户案情】:\n{request.text}"

    try:
        response = zhipu_client.chat.completions.create(
            model="glm-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        full_content = response.choices[0].message.content
        
        # 解析 "|||" 分隔符
        if "|||" in full_content:
            parts = full_content.split("|||")
            return {
                "result": parts[0].strip(), 
                "suggestions": [s.strip() for s in parts[1].strip().split("\n") if s.strip()][:3]
            }
        else:
            return {"result": full_content, "suggestions": []}

    except Exception as e:
        print(f"❌ AI生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)