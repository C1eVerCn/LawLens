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
# 4. 核心 AI 业务逻辑 (修改部分：Prompt 逻辑)
# ===========================

def get_relevant_docs(query: str):
    """
    RAG 检索逻辑
    使用 SiliconFlow 的 Embedding 模型将查询向量化，去 Supabase 搜索相似案例/法条
    """
    if not client or not supabase: return []
    try:
        # 使用 SiliconFlow 支持的 embedding 模型 (确保和你数据库存的一致)
        # 注意：BAAI/bge-m3 生成的维度通常是 1024，请确保 Supabase 里的 embedding 字段维度匹配
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        
        # 调用 Supabase RPC 函数
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.4, # 稍微提高阈值，确保参考质量
            "match_count": 3 
        }).execute()
        return rpc_response.data
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """核心 AI 分析接口 (流式响应)"""
    # 确定用户的核心意图
    last_user_msg = request.selection or request.messages[-1].content
    print(f"🔍 请求模式: {request.mode} | 意图: {last_user_msg[:20]}...")
    
    # --- 1. RAG 检索 (先看案例) ---
    context_text = ""
    # 局部润色通常不需要查大案例，除非非常模糊；草拟和全文润色必须查
    if request.mode != "selection_polish":
        relevant_docs = get_relevant_docs(last_user_msg)
        if relevant_docs:
            doc_snippets = []
            for i, d in enumerate(relevant_docs):
                # 假设数据库字段有 title/law_name 和 content
                # 这里做个兼容，如果没有 law_name 就用 id
                source = d.get('law_name') or d.get('title') or f"案例 #{d.get('id')}"
                doc_snippets.append(f"【参考资料 {i+1} ({source})】:\n{d['content']}")
            
            context_text = "\n\n".join(doc_snippets)
            print(f"✅ 已注入 {len(relevant_docs)} 条参考资料")
        else:
            print("⚠️ 未检索到相关资料，使用通用逻辑")

    # --- 2. Prompt 构建 (核心修改：思维链) ---
    base_role = "你是一名中国红圈律所高级合伙人，专精于民商事法律文书写作。"
    html_hint = "请直接输出 HTML 格式（<p>, <b>, <br>），不要使用 Markdown 代码块。"

    # 这里的 Prompt 严格遵循：分析参考资料 -> 模仿逻辑 -> 执行写作
    if request.mode == "selection_polish":
        # Case A: 局部润色
        system_instruction = f"""
        {base_role}
        【任务】用户选中了文档中的一段话，请对其进行【微观润色】。
        
        【选中原文】
        "{request.selection}"
        
        【用户指令】
        {request.messages[-1].content}
        
        【要求】
        1. **仅输出修改后的那一段话**，严禁输出任何解释、首尾寒暄。
        2. 保持 HTML 格式。
        3. 语气严谨、有力，消除口语化表达，使用法言法语。
        """
    
    elif request.mode == "polish":
        # Case B: 全文润色
        system_instruction = f"""
        {base_role}
        【任务】请依据下方的【参考资料库】，对用户提供的整篇文书进行深度润色。
        
        【参考资料库（这是你的知识源）】
        {context_text if context_text else "（暂无特定参考案例，请依据《民法典》及实务经验）"}
        
        【待润色文档】
        '''{request.current_doc}'''
        
        【执行步骤】
        1. **对比分析**：对比待润色文档与参考资料，检查用词是否够专业，逻辑是否像参考案例那样严密。
        2. **执行修改**：保留原意，但将措辞提升至专业律师水准。
        3. **格式输出**：{html_hint}
        """
        
    else: 
        # Case C: 从零生成 (Draft) - 这是你最看重的逻辑
        system_instruction = f"""
        {base_role}
        【任务】根据用户需求，参考类似案例的写法，从零起草法律文书。
        
        【参考资料库（真实案例与法条）】
        {context_text if context_text else "（本次检索未找到高度相似案例，请依据通用法律实务撰写）"}
        
        【工作流】
        1. **检索分析**：阅读上述【参考资料库】，学习其诉讼请求的表述方式、事实陈述的逻辑结构以及引用的法律条款。
        2. **逻辑迁移**：将参考案例中的优秀逻辑迁移到本案中。
        3. **撰写文书**：
           - 结构必须完整（首部、事实与理由、诉讼请求/条款、尾部）。
           - 必须引用适用的法律条款。
           - 严禁口语化，必须使用法言法语。
        
        【输出要求】
        {html_hint}
        """

    # --- 3. 消息历史处理 ---
    llm_messages = [{"role": "system", "content": system_instruction}]
    
    if request.mode == "selection_polish":
        pass # 局部模式 Prompt 已经包含了所有信息
    else:
        # 其他模式带上历史记录，支持追问
        llm_messages.extend([m.dict() for m in request.messages if m.role != 'system'])

    # --- 4. 流式生成器 ---
    async def generate_stream():
        try:
            stream = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct", # 你的 SiliconFlow 模型
                messages=llm_messages,
                stream=True, 
                temperature=0.3, # 法律文书建议调低温度，更严谨
                max_tokens=4000  # 文书可能较长
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