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
import time

# ===========================
# 1. 配置与初始化 (完全保持原样)
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
# 2. 数据模型 (Pydantic) (完全保持原样)
# ===========================
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage]
    current_doc: str = ""
    selection: Optional[str] = "" 
    mode: str = "draft"           # draft(生成) | polish(润色) | selection_polish(局部)

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

# ===========================
# 3. 辅助接口 (历史 & 保存) - (完全保持原样)
# ===========================
@app.post("/api/save")
async def save_document(doc: DocumentSave):
    """保存文档到 Supabase"""
    if not supabase: return {"status": "error", "msg": "DB未连接"}
    try:
        # 智能截取标题
        title = doc.title
        if not title or title == "未命名文档":
             # 简单过滤 HTML 标签取前 15 字
             clean_text = doc.content.replace('<', '').replace('>', '')[:15]
             title = f"{clean_text}..."
             
        data = {"title": title, "content": doc.content, "user_id": doc.user_id}
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
# 4. 核心 AI 业务逻辑 (升级版)
# ===========================

def get_relevant_laws_formatted(query: str):
    """
    RAG 检索逻辑 - 升级版
    不仅检索，还负责将结果格式化为带编号的引用块
    """
    if not client or not supabase: return ""
    try:
        # 1. 向量化
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        
        # 2. 数据库检索 (提高一点阈值，保证质量)
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.45, 
            "match_count": 4 
        }).execute()
        
        data = rpc_response.data
        if not data: return ""

        # 3. 格式化为引用源字符串
        formatted_sources = []
        for idx, doc in enumerate(data):
            # 尝试获取来源字段，兼容不同表结构
            meta = doc.get('metadata', {}) or {}
            source_name = doc.get('law_name') or meta.get('source') or "法律数据库"
            content_snippet = doc['content'][:500].replace("\n", " ") # 压缩一下防止 token 爆炸
            
            block = f"[参考资料 {idx + 1}] 来源：{source_name}\n内容：{content_snippet}..."
            formatted_sources.append(block)
            
        return "\n\n".join(formatted_sources)

    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return ""

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """核心 AI 分析接口 (流式响应)"""
    last_user_msg = request.selection or request.messages[-1].content
    print(f"🔍 [AI] 模式: {request.mode} | 意图: {last_user_msg[:20]}...")
    
    # --- 1. RAG 检索与上下文构建 ---
    context_text = ""
    # 局部润色一般不需要查大案例，除非显式要求
    if request.mode != "selection_polish":
        sources_str = get_relevant_laws_formatted(last_user_msg)
        if sources_str:
            context_text = f"""
### 📚 权威参考资料库
以下是系统为您检索到的相关法律依据与真实判例。请仔细阅读，并在撰写时**引用**这些资料（使用 [1], [2] 角标）。

{sources_str}
"""
        else:
            context_text = "（本次未检索到高度相关的特定案例，请依据《中华人民共和国民法典》及通用实务经验撰写）"

    # --- 2. Prompt 构建 (Role + Task + Constraints) ---
    base_role = "你是由 LawLens 开发的中国顶尖法律 AI 助手。你的回答必须具备红圈律所高级合伙人的水准：严谨、犀利、逻辑闭环。"
    
    # 通用排版要求 (适配 Tiptap 编辑器)
    html_hint = """
    【排版要求】
    1. **必须输出 HTML 标签**：使用 <h3> 表示小标题，<b> 表示重点，<p> 表示段落，<ul>/<li> 表示列表。
    2. **严禁使用 Markdown**：不要用 # 或 **，也不要输出 ```html 代码块。
    3. **引用标注**：在引用了参考资料的观点或法条时，必须在句末标注 [1] 等来源角标。
    """

    system_instruction = ""

    if request.mode == "selection_polish":
        # Case A: 局部润色 (微观操作)
        system_instruction = f"""
        {base_role}
        【任务】用户选中了一段文本，请对其进行【法言法语重构】。
        
        【原文】："{request.selection}"
        【指令】："{last_user_msg}"
        
        【要求】：
        1. 仅输出修改后的文本，不要任何解释或寒暄。
        2. 修正口语化表达（如“钱没给”->“未履行付款义务”）。
        3. 保持 HTML 格式。
        """
    
    elif request.mode == "polish":
        # Case B: 全文润色 (宏观操作)
        system_instruction = f"""
        {base_role}
        【任务】请像一位严厉的律所合伙人一样，审查并润色整篇文档。
        
        【待审文档】：
        '''{request.current_doc}'''
        
        {context_text}
        
        【输出结构】：
        1. <h3>审查意见</h3>：用一段话指出文档的主要法律风险点或逻辑漏洞。
        2. <h3>修订后全文</h3>：输出完整的、优化后的文档内容。重点修改处请用 <b>加粗</b> 标出。
        
        {html_hint}
        """
        
    else: 
        # Case C: 从零生成 (Draft) - 加入思维链
        system_instruction = f"""
        {base_role}
        【任务】根据用户需求，参考类似案例的写法，从零起草法律文书。
        
        {context_text}
        
        【输出结构】：
        1. **思维链（Thinking Chain）**：在正式起草前，先输出一段 `<blockquote>`，简要分析案由、核心法条和诉讼策略。
        2. **正式文书**：随后输出完整的法律文书。结构必须完整（首部、正文、尾部）。
        
        {html_hint}
        """

    # --- 3. 消息历史构建 ---
    llm_messages = [{"role": "system", "content": system_instruction}]
    
    if request.mode == "selection_polish":
        llm_messages.append({"role": "user", "content": last_user_msg})
    else:
        # 过滤掉之前的 system prompt，保留对话历史
        clean_history = [m.dict() for m in request.messages if m.role != 'system']
        llm_messages.extend(clean_history)

    # --- 4. 流式生成器 ---
    async def generate_stream():
        try:
            # 模拟“思考中”状态 (仅在起草模式)
            if request.mode == "draft":
                yield "<blockquote>⚖️ 正在检索判例库... 构建法律逻辑链条...</blockquote>"
            
            stream = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct", 
                messages=llm_messages,
                stream=True, 
                temperature=0.4, # 稍低温度，保证法律严谨性
                max_tokens=4000 
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            error_msg = f"<p style='color:red'>[AI 生成中断: {str(e)}]</p>"
            print(f"❌ AI Error: {e}")
            yield error_msg

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)