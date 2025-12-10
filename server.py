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
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage]
    current_doc: str = ""
    mode: str = "draft"

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

# --- 辅助接口 (Save / History) ---
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

# --- 核心升级：RAG 检索与流式 AI 分析 ---

def get_relevant_laws(query: str):
    if not client or not supabase: return []
    try:
        # 1. 生成向量 (BAAI/bge-m3)
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        
        # 2. 数据库查询 (确保 SQL match_documents 适配 1024 维度)
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.35,
            "match_count": 5
        }).execute()
        return rpc_response.data
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    last_user_msg = request.messages[-1].content
    print(f"🔍 流式请求: {last_user_msg[:20]}... 模式: {request.mode}")
    
    # 1. RAG 检索
    relevant_docs = get_relevant_laws(last_user_msg)
    
    context_text = ""
    if relevant_docs:
        context_text = "【权威法律依据库（必须优先引用）】\n" + "\n".join(
            [f"依据{i+1}:《{d['law_name']}》\n条款内容:{d['content'][:400]}" 
             for i, d in enumerate(relevant_docs)]
        )
    else:
        context_text = "（未检索到特定库内案例，请严格依据《中华人民共和国民法典》及相关司法解释）"

    # 2. 构建超级 System Prompt (人设 + 格式控制)
    
    base_role = """
    你是一名拥有 20 年经验的中国红圈律所高级合伙人，专精于民商事诉讼文书。
    你的文书风格必须：结构严谨、逻辑缜密、用词极其专业（法言法语）。
    """

    format_instruction = """
    【重要格式要求】
    前端使用富文本编辑器，请直接输出 HTML 格式的代码，不要使用 Markdown。
    1. 使用 <p> 包裹段落。
    2. 使用 <b> 或 <strong> 加粗重要的小标题（如“事实与理由”、“诉讼请求”）。
    3. 使用 <br> 进行换行。
    4. 严禁使用 ```html 代码块包裹，直接输出内容即可。
    """

    if request.mode == "polish":
        system_instruction = f"""
        {base_role}
        
        【任务目标】
        对用户提供的法律文书初稿进行专业级润色。
        
        【原始文档内容】
        '''
        {request.current_doc}
        '''

        【修改要求】
        1. **术语专业化**：将口语表达转化为标准法言法语（例如：将“想要钱”改为“诉请支付”；将“说话不算数”改为“构成根本违约”）。
        2. **逻辑严密性**：检查因果关系，使用“鉴于...”、“综上所述...”等连接词增强逻辑链。
        3. **引用规范化**：参考下方的【权威法律依据库】，对文中的法条引用进行核对或补充。
        4. **HTML排版**：重点内容（如金额、关键法条）请使用 <b> 加粗。
        
        {format_instruction}
        {context_text}
        """
    else: # draft mode
        system_instruction = f"""
        {base_role}
        
        【任务目标】
        根据用户提供的案情描述，从零起草一份结构严谨、攻防兼备的法律文书。
        
        【起草标准】
        1. **结构完备**：必须包含首部（原被告信息）、诉讼请求、事实与理由、尾部（致谢、具状人、日期）四大板块。
        2. **事实陈述**：采用“时间轴+法律事实”的叙述方式，冷静、客观、有力。
        3. **法律适用**：必须在“理由”部分显式引用下方的【权威法律依据库】。引用格式为：“根据《XX法》第XX条之规定...”。
        4. **HTML排版**：
           - 小标题（如【诉讼请求】）请使用 <b> 加粗。
           - 关键金额请使用 <b> 加粗。
           - 段落之间保持适当间距。

        {format_instruction}
        {context_text}
        """

    llm_messages = [{"role": "system", "content": system_instruction}]
    # 只取最近几条消息，避免 System Prompt 被淹没
    recent_history = request.messages[-3:] if len(request.messages) > 3 else request.messages
    llm_messages.extend([m.dict() for m in recent_history if m.role != 'system'])

    # 3. 定义生成器 (Generator)
    async def generate_stream():
        try:
            stream = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct", 
                messages=llm_messages,
                stream=True, 
                temperature=0.7,
                max_tokens=2500 # 增加长度以防截断
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"<p style='color:red'>[System Error: {str(e)}]</p>"

    # 4. 返回流式响应
    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)