import os
import uvicorn
import time
import json
import mammoth
import io
import re
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from openai import OpenAI
from typing import List, Optional

# ===========================
# 1. 配置与初始化
# ===========================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")

# ✨ 使用 Qwen 2.5 72B (当前开源最强，相当于 Max)
MODEL_NAME = "Qwen/Qwen2.5-72B-Instruct"

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
            base_url="[https://api.siliconflow.cn/v1](https://api.siliconflow.cn/v1)"
        )
        print(f"✅ LawLens 智能引擎已启动 (模型: {MODEL_NAME})")
    except Exception as e:
        print(f"❌ 初始化失败: {e}")

# ===========================
# 2. 工具函数：JSON 清洗 (核心修复)
# ===========================
def clean_json_output(content: str):
    """
    清洗大模型返回的 JSON 字符串，去除 Markdown 标记
    """
    try:
        # 1. 尝试去除 markdown 代码块
        if "```" in content:
            # 匹配 ```json ... ``` 或 ``` ... ``` 中间的内容
            pattern = r"```(?:json)?\s*(.*?)\s*```"
            match = re.search(pattern, content, re.DOTALL)
            if match:
                content = match.group(1)
        
        # 2. 去除首尾空白
        content = content.strip()
        
        # 3. 尝试解析
        return json.loads(content)
    except Exception as e:
        print(f"❌ JSON 解析失败: {e}\n原始内容: {content}")
        # 兜底返回一个空结构，防止前端崩溃
        return {
            "total_score": 0,
            "summary": "AI 解析数据格式异常，请重试。",
            "dimensions": []
        }

# ===========================
# 3. 数据模型
# ===========================
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage]
    current_doc: str = ""
    selection: Optional[str] = "" 
    mode: str = "draft" 
    user_id: Optional[str] = None 

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

class MemoryCreate(BaseModel):
    user_id: str
    content: str
    type: str = "preference"

# ===========================
# 4. 🧠 Memory Manager
# ===========================
class MemoryManager:
    @staticmethod
    def add_memory(user_id: str, content: str, m_type: str = "preference"):
        if not client or not supabase: return False
        try:
            resp = client.embeddings.create(model="BAAI/bge-m3", input=content)
            vec = resp.data[0].embedding
            supabase.table("agent_memories").insert({
                "user_id": user_id, "content": content, "memory_type": m_type, "embedding": vec
            }).execute()
            return True
        except Exception: return False

    @staticmethod
    def retrieve_memories(user_id: str, query: str) -> str:
        if not client or not supabase or not user_id: return ""
        try:
            resp = client.embeddings.create(model="BAAI/bge-m3", input=query)
            vec = resp.data[0].embedding
            rpc_resp = supabase.rpc("match_memories", {
                "query_embedding": vec, "match_threshold": 0.5, "match_count": 3, "p_user_id": user_id
            }).execute()
            if not rpc_resp.data: return ""
            return "\n".join([f"- {m['content']}" for m in rpc_resp.data])
        except Exception: return ""

# ===========================
# 5. 辅助接口
# ===========================
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = mammoth.convert_to_html(io.BytesIO(content))
        return {"status": "success", "content": result.value}
    except Exception as e:
        return {"status": "error", "msg": "文件解析失败，请确保是 .docx 文件"}

@app.post("/api/memory")
async def create_memory(mem: MemoryCreate):
    success = MemoryManager.add_memory(mem.user_id, mem.content, mem.type)
    return {"status": "success" if success else "error"}

@app.post("/api/save")
async def save_document(doc: DocumentSave):
    if not supabase: return {"status": "error", "msg": "DB未连接"}
    try:
        raw_text = doc.content.replace('<', '').replace('>', '')[:20]
        title = doc.title if doc.title and doc.title != "未命名法律文书" else f"{raw_text}..."
        supabase.table("documents").insert({"title": title, "content": doc.content, "user_id": doc.user_id}).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@app.get("/api/history")
async def get_history(user_id: Optional[str] = None):
    if not supabase: return []
    try:
        query = supabase.table("documents").select("*").order("created_at", desc=True).limit(20)
        if user_id: query = query.eq("user_id", user_id)
        else: query = query.is_("user_id", "null")
        return query.execute().data
    except Exception: return []

# ===========================
# 6. 核心 AI 逻辑
# ===========================

def get_rag_context(query: str):
    if not client or not supabase: return ""
    try:
        resp = client.embeddings.create(model="BAAI/bge-m3", input=query)
        vec = resp.data[0].embedding
        rpc_resp = supabase.rpc("match_documents", {
            "query_embedding": vec, "match_threshold": 0.45, "match_count": 3 
        }).execute()
        
        if not rpc_resp.data: return ""
        formatted = ""
        for i, doc in enumerate(rpc_resp.data):
            snippet = doc['content'][:500].replace('\n', ' ')
            formatted += f"【参考资料 {i+1}】\n{snippet}...\n"
        return formatted
    except Exception: return ""

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """核心 AI 接口"""
    
    # --- P2: 风险评分 (JSON) ---
    if request.mode == "risk_score":
        try:
            print("📊 [Risk Scan] 正在调用 Qwen 72B 进行体检...")
            
            # 使用更严格的 Prompt 引导模型输出纯 JSON
            prompt = f"""
            你是一名资深的法律合规专家。请仔细审查以下法律文书片段，并从四个维度进行评分（0-100分）。
            
            【待审文书内容】
            {request.current_doc[:4000]} 
            
            【任务要求】
            请直接返回一个标准的 JSON 对象，不要包含任何 Markdown 格式（如 ```json），不要包含任何额外的解释文字。
            
            JSON 数据结构必须严格如下：
            {{
                "total_score": 85,
                "summary": "这里写一句话的中文简评，指出主要风险或优点。",
                "dimensions": [
                    {{ "subject": "合规性", "A": 90, "fullMark": 100 }},
                    {{ "subject": "权益保护", "A": 75, "fullMark": 100 }},
                    {{ "subject": "完整性", "A": 85, "fullMark": 100 }},
                    {{ "subject": "文本规范", "A": 95, "fullMark": 100 }}
                ]
            }}
            """
            
            completion = client.chat.completions.create(
                model=MODEL_NAME, # Qwen/Qwen2.5-72B-Instruct
                messages=[
                    {"role": "system", "content": "你是一个只输出 JSON 格式的 API 接口。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1, 
                # 移除 response_format 参数，防止部分模型网关报错，改用手动清洗
            )
            
            raw_content = completion.choices[0].message.content
            print(f"📥 [Raw AI Output]: {raw_content[:100]}...") # 打印日志方便调试
            
            # 清洗并解析 JSON
            result = clean_json_output(raw_content)
            
            return JSONResponse(result)
            
        except Exception as e:
            print(f"❌ Risk scan failed: {e}")
            return JSONResponse({"error": "体检服务暂时繁忙，请稍后重试"}, status=500)

    # --- 常规流式模式 ---
    last_user_msg = request.selection if request.mode == "selection_polish" else request.messages[-1].content
    user_id = request.user_id
    
    rag_context = ""
    found_cases = False
    if request.mode != "selection_polish" and request.mode != "chat_doc":
        rag_context = get_rag_context(last_user_msg)
        if rag_context: found_cases = True

    memory_context = ""
    if user_id:
        memory_context = MemoryManager.retrieve_memories(user_id, last_user_msg)

    memory_section = f"【⚠️ 用户偏好记忆】\n请严格遵守：{memory_context}\n" if memory_context else ""
    rag_section = f"【📚 法律数据库】\n{rag_context}\n" if rag_context else "（使用通用法律知识）"

    base_role = "你是由 LawLens 开发的中国顶尖法律 AI 助手。你的回答必须专业、严谨、符合中国法律规范。"
    html_hint = "使用 HTML 标签排版 (<h3>, <b>, <ul>, <blockquote>)，禁止 Markdown。"

    system_instruction = ""

    if request.mode == "draft":
        system_instruction = f"""
        {base_role}
        【任务】起草法律文书。
        {memory_section}
        {rag_section}
        {html_hint}
        【输出结构】
        1. **分析报告** (<blockquote>): 核心争议点、法律依据、起草策略。
        2. **正式文书**: 完整的合同或函件。
        """
    elif request.mode == "polish":
        system_instruction = f"""
        {base_role}
        【任务】审查并润色。
        {memory_section}
        【文档】'''{request.current_doc}'''
        {rag_section}
        {html_hint}
        【输出结构】
        1. **审查意见** (<blockquote>): 风险提示、修改依据。
        2. **修订全文**: 用 <b>加粗</b> 标记修改处。
        """
    elif request.mode == "chat_doc":
        system_instruction = f"""
        {base_role}
        【任务】基于文档回答问题。
        【文档】'''{request.current_doc[:10000]}'''
        【问题】"{last_user_msg}"
        【要求】答案必须基于文档，引用处加粗。
        """
    else: 
        system_instruction = f"""
        {base_role}
        【任务】微调选中文本。
        {memory_section}
        【原文】"{request.selection}"
        【指令】"{last_user_msg}"
        【要求】仅输出修改后的文本。
        """

    messages = [{"role": "system", "content": system_instruction}]
    if request.mode != "selection_polish":
        history = [m.dict() for m in request.messages if m.role != "system"]
        messages.extend(history)
    else:
        messages.append({"role": "user", "content": last_user_msg})

    async def generate_stream():
        try:
            if request.mode != "selection_polish":
                status_rag = f"✅ 已匹配 {rag_context.count('【参考资料')} 个相关案例" if found_cases else "⚠️ 通用法律模式"
                status_mem = "✅ 命中偏好" if memory_context else "无特定偏好"
                status_html = f"""
                <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:16px; font-size:13px; color:#475569;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <span style="display:inline-block; width:8px; height:8px; background:#2563eb; border-radius:50%;"></span>
                        <b>AI 法律引擎运行中...</b>
                    </div>
                    <ul style="margin:0; padding-left:20px; line-height: 1.6;">
                        <li>分析案情：{last_user_msg[:10]}...</li>
                        <li>数据库：{status_rag}</li>
                        <li>记忆库：{status_mem}</li>
                    </ul>
                </div>
                """
                yield status_html
                time.sleep(0.5)

            stream = client.chat.completions.create(
                model=MODEL_NAME, 
                messages=messages,
                stream=True, 
                temperature=0.4,
                max_tokens=4000 
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"<p style='color:red'>AI 服务响应错误: {str(e)}</p>"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)