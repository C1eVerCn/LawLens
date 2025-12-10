import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse 
from pydantic import BaseModel
from supabase import create_client, Client
from openai import OpenAI
from typing import List, Optional
import json

# ===========================
# 1. 配置与初始化
# ===========================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")

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

# ===========================
# 2. 数据模型 (Pydantic)
# ===========================
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage]
    current_doc: str = ""
    selection: Optional[str] = "" # 👈 新增：支持局部选中的文本
    mode: str = "draft"           # draft(生成) | polish(润色) | selection_polish(局部)

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

# ===========================
# 3. 辅助接口 (历史 & 保存) - 完整保留
# ===========================
@app.post("/api/save")
async def save_document(doc: DocumentSave):
    """保存文档到 Supabase"""
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
    """获取历史记录"""
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

# ===========================
# 4. 核心 AI 业务逻辑
# ===========================

def get_relevant_laws(query: str):
    """RAG 检索逻辑"""
    if not client or not supabase: return []
    try:
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        
        # 针对局部润色减少检索量，提高速度
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.35,
            "match_count": 3 
        }).execute()
        return rpc_response.data
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """核心 AI 分析接口 (流式响应)"""
    last_user_msg = request.messages[-1].content
    print(f"🔍 请求模式: {request.mode} | 长度: {len(last_user_msg)}")
    
    # --- 上下文构建 (RAG) ---
    context_text = ""
    # 只有在非局部模式下才进行重度检索，避免局部润色时被无关案例干扰
    if request.mode != "selection_polish":
        relevant_docs = get_relevant_laws(last_user_msg)
        if relevant_docs:
            context_text = "【权威法律依据库】\n" + "\n".join(
                [f"《{d['law_name']}》: {d['content'][:300]}..." for d in relevant_docs]
            )

    # --- Prompt 构建 ---
    base_role = "你是一名中国红圈律所高级合伙人，专精于法律文书写作。"
    html_hint = "请直接输出 HTML 格式（<p>, <b>, <br>），不要使用 Markdown 代码块。"

    if request.mode == "selection_polish":
        # Case A: 局部润色
        system_instruction = f"""
        {base_role}
        【任务】用户选中了文档中的一段话，请对其进行【微观润色】。
        
        【选中原文】
        "{request.selection}"
        
        【用户指令】
        {last_user_msg} (若无具体指令，默认进行专业化、法言法语规范化修改)
        
        【要求】
        1. **仅输出修改后的那一段话**，严禁输出任何解释、首尾寒暄。
        2. 保持 HTML 格式。
        3. 语气严谨、有力，不改变原意。
        """
    
    elif request.mode == "polish":
        # Case B: 全文润色
        system_instruction = f"""
        {base_role}
        【任务】对整篇文书进行专业润色。
        【当前文档】'''{request.current_doc}'''
        【要求】术语专业化，逻辑严密，HTML排版。重点内容加粗。
        {html_hint}
        {context_text}
        """
        
    else: 
        # Case C: 从零生成 (Draft)
        system_instruction = f"""
        {base_role}
        【任务】从零起草法律文书。
        【要求】结构完备，引用规范，HTML排版。
        {html_hint}
        {context_text}
        """

    # --- 消息历史处理 ---
    llm_messages = [{"role": "system", "content": system_instruction}]
    
    if request.mode == "selection_polish":
        # 局部模式下，只保留当前指令，避免被之前的长对话干扰
        msg_content = last_user_msg if last_user_msg else "请专业化润色这段文字"
        llm_messages.append({"role": "user", "content": msg_content})
    else:
        # 其他模式带上历史记录，支持追问
        llm_messages.extend([m.dict() for m in request.messages if m.role != 'system'])

    # --- 流式生成器 ---
    async def generate_stream():
        try:
            stream = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct", 
                messages=llm_messages,
                stream=True, 
                temperature=0.7,
                max_tokens=2000 
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"<p style='color:red'>[Error: {str(e)}]</p>"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)