import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from zhipuai import ZhipuAI
from typing import List, Optional

# 1. 加载环境变量
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY")

# 2. 初始化客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
zhipu_client = ZhipuAI(api_key=ZHIPU_API_KEY)

# 🚀 OOM 修复：将模型初始化为 None，实现懒加载
embed_model = None 

# 3. 创建 API 服务
app = FastAPI()

# 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 数据模型 ---
class AnalyzeRequest(BaseModel):
    text: str

class DocumentSave(BaseModel):
    title: str
    content: str

class DocumentHistory(BaseModel):
    id: int
    title: str
    content: str
    created_at: str

# --- 核心逻辑函数 ---

def get_relevant_laws(query: str):
    """ 去 Supabase 搜索相关的法律条款 """
    global embed_model # 引用全局变量
    
    # ✅ 懒加载逻辑：只有第一次调用时才加载模型 (解决 OOM)
    if embed_model is None:
        print("⏳ 第一次运行，正在加载 AI 模型...")
        # 这一步将只在第一次 API 请求时发生
        embed_model = SentenceTransformer('shibing624/text2vec-base-chinese')
        print("✅ 模型加载完毕！")

    query_vector = embed_model.encode(query).tolist()
    
    # 调用数据库函数
    response = supabase.rpc("match_documents", {
        "query_embedding": query_vector,
        "match_threshold": 0.4, 
        "match_count": 5
    }).execute()
    
    return response.data

# --- API 接口 ---

@app.post("/api/save")
async def save_document(doc: DocumentSave):
    """ 保存文书到 Supabase """
    print(f"💾 正在保存: {doc.title}")
    try:
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
        response = supabase.table("documents").select("*").order("created_at", desc=True).limit(20).execute()
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

    # B. 组装提示词 (已包含生成建议问题的逻辑)
    system_prompt = """
    你是一位专业的中国法律顾问。请根据提供的【法律法规依据】分析用户的案情。
    
    输出要求：
    1. 先输出分析结果，引用法条，分点作答。
    2. 分析结束后，必须在最后一行单独输出特殊分隔符 "|||"。
    3. 在分隔符之后，列出 3 个用户可能想进一步了解的相关法律问题（简短，不超过 20 字）。
    4. 格式示例：
       分析内容......
       |||
       如何收集书面证据？
       诉讼时效是多久？
       能否要求精神损害赔偿？
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
        full_content = response.choices[0].message.content
        
        # D. 解析结果：分离“分析结果”和“建议问题”
        if "|||" in full_content:
            parts = full_content.split("|||")
            result_text = parts[0].strip()
            # 解析建议问题：按行分割，去空行，取前3个
            suggestions_raw = parts[1].strip().split("\n")
            suggestions = [s.strip() for s in suggestions_raw if s.strip()][:3]
        else:
            result_text = full_content
            suggestions = []

        return {
            "result": result_text,
            "suggestions": suggestions  # 返回给前端的新字段
        }

    except Exception as e:
        print(f"❌ 出错: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)