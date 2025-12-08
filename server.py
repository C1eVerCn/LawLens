import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from openai import OpenAI
from typing import List, Optional, Dict

# 1. 环境变量
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")

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
        print("❌ 错误：核心环境变量缺失")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        client = OpenAI(
            api_key=SILICONFLOW_API_KEY,
            base_url="https://api.siliconflow.cn/v1"
        )
        print("✅ 客户端初始化成功 (SiliconFlow / Qwen)")
    except Exception as e:
        print(f"❌ 初始化失败: {e}")

# --- Pydantic 模型 ---

# 👇 新增：对话消息结构
class ChatMessage(BaseModel):
    role: str
    content: str

# 👇 修改：请求体包含历史记录和当前文档内容
class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage] # 对话历史
    current_doc: str = ""       # 编辑器里的当前内容
    mode: str = "draft"         # draft | polish

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

# --- 原有的辅助接口 (Save / History) 保持不变 ---

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

# --- 核心升级：RAG 检索与 AI 分析 ---

def get_relevant_laws(query: str):
    if not client or not supabase: return []
    try:
        # 1. 生成向量 (保持使用 BAAI/bge-m3)
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        
        # 2. 数据库查询 (注意：请确保 SQL 函数 match_documents 已更新为 1024 维度)
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.35, # 👇 降低阈值以确保能查到案例
            "match_count": 5
        }).execute()
        return rpc_response.data
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    # 获取用户最新的一条消息
    last_user_msg = request.messages[-1].content
    print(f"🔍 请求: {last_user_msg[:20]}... 模式: {request.mode}")
    
    # RAG 检索
    relevant_docs = get_relevant_laws(last_user_msg)
    
    # 构建上下文引用文本
    context_text = ""
    if relevant_docs:
        context_text = "【必须引用的法律库/案例库】\n" + "\n".join(
            [f"{i+1}. 案号/法规名:《{d['law_name']}》\n   摘要:{d['content'][:300]}..." 
             for i, d in enumerate(relevant_docs)]
        )
    else:
        context_text = "（本次未检索到强相关案例，请依据通用法律原则）"

    # 构建 System Prompt
    system_instruction = f"""
    你是一个精通中国法律的资深律师助手。
    
    任务目标：
    1. 根据用户的指令生成或修改法律文书。
    2. 严格参考提供的【法律库/案例库】。**必须在回复中显式引用**相关的案号或法规名称（如“参照(2023)京01民终...号判决”）。
    3. 如果是生成模式，请直接输出文书正文。
    4. 如果是润色模式，请说明修改理由并输出修改后的段落。
    
    {context_text}
    """

    if request.mode == "polish":
        system_instruction += f"\n【当前文档内容】：\n'''\n{request.current_doc}\n'''\n请基于用户最新指令对上述文档进行修改。"
    else:
        system_instruction += "\n请根据用户描述从头起草文书。"

    # 组合消息历史发送给 AI (实现追问功能)
    llm_messages = [{"role": "system", "content": system_instruction}]
    # 将 Pydantic 对象转为字典
    llm_messages.extend([m.dict() for m in request.messages])

    try:
        # 建议使用指令遵循能力强的模型
        MODEL_NAME = "Qwen/Qwen2.5-32B-Instruct" 
        
        response = client.chat.completions.create(
            model=MODEL_NAME, 
            messages=llm_messages,
            stream=False
        )
        result = response.choices[0].message.content
        
        # 简单的后续建议 (也可以让 AI 生成，这里简化处理)
        suggestions = ["增加违约金条款", "补充证据链细节", "调整为更强硬的语气"]

        return {"result": result, "suggestions": suggestions}

    except Exception as e:
        print(f"❌ AI生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)