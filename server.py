import os
import uvicorn
import time
import json
import mammoth
import io
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
        print("✅ LawLens 智能引擎已启动 (Memory + Deep RAG + Risk + Upload)")
    except Exception as e:
        print(f"❌ 初始化失败: {e}")

# ===========================
# 2. 数据模型
# ===========================
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage]
    current_doc: str = ""
    selection: Optional[str] = "" 
    mode: str = "draft" # draft | polish | selection_polish | risk_score | chat_doc
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
# 3. 🧠 Memory Manager (记忆管理模块)
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
            print(f"🧠 [Memory] 已记住: {content}")
            return True
        except Exception as e:
            print(f"❌ Memory Write Error: {e}")
            return False

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
        except Exception as e:
            print(f"❌ Memory Read Error: {e}")
            return ""

# ===========================
# 4. 辅助接口 (Word解析 + 历史 + 保存)
# ===========================

# ✨ P0: Word 上传解析接口
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        # 使用 mammoth 将 docx 转换为 HTML
        result = mammoth.convert_to_html(io.BytesIO(content))
        html = result.value
        return {"status": "success", "content": html}
    except Exception as e:
        print(f"Upload failed: {e}")
        return {"status": "error", "msg": "文件解析失败，请确保是 .docx 文件"}

@app.post("/api/memory")
async def create_memory(mem: MemoryCreate):
    success = MemoryManager.add_memory(mem.user_id, mem.content, mem.type)
    return {"status": "success" if success else "error"}

@app.post("/api/save")
async def save_document(doc: DocumentSave):
    if not supabase: return {"status": "error", "msg": "DB未连接"}
    try:
        # 智能截取标题
        raw_text = doc.content.replace('<', '').replace('>', '')[:20]
        title = doc.title if doc.title and doc.title != "未命名法律文书" else f"{raw_text}..."
        
        data = {"title": title, "content": doc.content, "user_id": doc.user_id}
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

# ===========================
# 5. 核心 AI 逻辑 (RAG + 风险评分)
# ===========================

def get_relevant_laws_formatted(query: str):
    """Deep RAG 检索"""
    if not client or not supabase: return ""
    try:
        print(f"🔍 [RAG] 检索: {query[:15]}...")
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector, "match_threshold": 0.45, "match_count": 4 
        }).execute()
        
        data = rpc_response.data
        if not data: return ""

        formatted_sources = []
        for idx, doc in enumerate(data):
            meta = doc.get('metadata', {}) or {}
            source_name = doc.get('law_name') or meta.get('source') or "法律数据库"
            content_snippet = doc['content'][:500].replace("\n", " ")
            block = f"[参考资料 {idx + 1}] 来源：{source_name}\n内容：{content_snippet}..."
            formatted_sources.append(block)
            
        return "\n\n".join(formatted_sources)
    except Exception as e:
        print(f"❌ RAG Error: {e}")
        return ""

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """核心 AI 接口"""
    
    # ✨ P2: 风险评分模式 (直接返回 JSON)
    if request.mode == "risk_score":
        try:
            print("📊 [Risk Scan] 开始风险评估...")
            prompt = f"""
            你是一名资深法律风控专家。请阅读以下文书，从四个维度进行评分（0-100）。
            【待审文书】{request.current_doc[:3000]}
            【输出要求】仅输出标准 JSON，不要包含 Markdown 格式或其他文字：
            {{
                "total_score": 85,
                "summary": "一句话简评（例如：整体合规，但违约责任对甲方不利）",
                "dimensions": [
                    {{ "subject": "合规性", "A": 90, "fullMark": 100 }},
                    {{ "subject": "权益保护", "A": 75, "fullMark": 100 }},
                    {{ "subject": "完整性", "A": 85, "fullMark": 100 }},
                    {{ "subject": "文本规范", "A": 95, "fullMark": 100 }}
                ]
            }}
            """
            completion = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1, response_format={"type": "json_object"}
            )
            result = json.loads(completion.choices[0].message.content)
            return JSONResponse(result)
        except Exception as e:
            print(f"Risk scan failed: {e}")
            return JSONResponse({"error": "Analysis failed"}, status=500)

    # --- 常规流式模式 ---
    last_user_msg = request.selection if request.mode == "selection_polish" else request.messages[-1].content
    user_id = request.user_id
    
    # 1. RAG 检索 (文档对话模式下不检索外部)
    rag_context = ""
    if request.mode != "selection_polish" and request.mode != "chat_doc":
        rag_context = get_relevant_laws_formatted(last_user_msg)

    # 2. 记忆检索
    memory_context = ""
    if user_id:
        memory_context = MemoryManager.retrieve_memories(user_id, last_user_msg)

    memory_section = f"【⚠️ 用户偏好记忆】\n{memory_context}\n" if memory_context else ""
    rag_section = f"【📚 权威参考资料】\n{rag_context}\n" if rag_context else "（无特定案例，依通识撰写）"

    base_role = "你是由 LawLens 开发的中国顶尖法律 AI 助手。"
    html_hint = "使用 HTML 标签 (<h3>, <b>, <ul>, <blockquote>)。"

    system_instruction = ""

    if request.mode == "draft":
        system_instruction = f"""
        {base_role}
        【任务】起草法律文书。
        {memory_section}
        {rag_section}
        {html_hint}
        【结构】
        1. **思维链** (<blockquote>): 分析案情、法条匹配、记忆应用。
        2. **正文**：完整文书。
        """
    elif request.mode == "polish":
        system_instruction = f"""
        {base_role}
        【任务】审查润色。
        {memory_section}
        【文档】'''{request.current_doc}'''
        {rag_section}
        {html_hint}
        【结构】
        1. **审查意见** (<blockquote>): 风险点、修改依据。
        2. **修订全文**：用 <b>加粗</b> 标注修改。
        """
    elif request.mode == "chat_doc": # ✨ P4: 与文档对话
        system_instruction = f"""
        {base_role}
        【任务】根据当前文档内容回答问题。
        【文档内容】'''{request.current_doc[:10000]}'''
        【用户问题】"{last_user_msg}"
        【要求】答案必须基于文档内容，如果文档没提到则说不知道。引用原文时加粗。
        """
    else: # selection_polish
        system_instruction = f"""
        {base_role}
        【任务】微观润色。
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
            if request.mode == "draft":
                yield "<blockquote>🧠 正在检索知识库... 回忆用户偏好...</blockquote>"
                time.sleep(0.5) # 模拟思考

            stream = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct", 
                messages=messages,
                stream=True, 
                temperature=0.4,
                max_tokens=4000 
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            error_msg = f"<p style='color:red'>[AI 生成错误: {str(e)}]</p>"
            print(f"❌ AI Error: {e}")
            yield error_msg

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)