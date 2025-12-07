import os
import uvicorn
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from zhipuai import ZhipuAI
from typing import List, Optional

# ... (环境变量和初始化代码保持不变) ...
# 1. 环境变量
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY")

# 2. 全局客户端
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

@app.on_event("startup")
def startup_event():
    global supabase, zhipu_client
    if not all([SUPABASE_URL, SUPABASE_KEY, ZHIPU_API_KEY]):
        print("❌ 错误：核心环境变量缺失。")
        # raise EnvironmentError("配置缺失") 
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        zhipu_client = ZhipuAI(api_key=ZHIPU_API_KEY)
        print("✅ 客户端初始化成功")
    except Exception as e:
        print(f"❌ 初始化失败: {e}")

class AnalyzeRequest(BaseModel):
    text: str
    mode: str = "draft"

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None # 👈 新增 user_id 字段

# ... (get_relevant_laws 函数保持不变，不用改) ...
def get_relevant_laws(query: str):
    if not zhipu_client or not supabase: return []
    try:
        response = zhipu_client.embeddings.create(model="embedding-2", input=query)
        query_vector = response.data[0].embedding
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.4, 
            "match_count": 5
        }).execute()
        return rpc_response.data
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        return []

# --- 核心修改：保存带上 user_id ---
@app.post("/api/save")
async def save_document(doc: DocumentSave):
    if not supabase: return {"status": "error", "msg": "DB未连接"}
    try:
        # 如果没有 user_id (游客)，也可以保存，但 user_id 字段为 null
        data = {
            "title": doc.title, 
            "content": doc.content,
            "user_id": doc.user_id # 写入数据库
        }
        supabase.table("documents").insert(data).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"Save error: {e}")
        return {"status": "error", "msg": str(e)}

# --- 核心修改：获取历史记录增加 user_id 过滤 ---
@app.get("/api/history")
async def get_history(user_id: Optional[str] = None):
    if not supabase: return []
    try:
        query = supabase.table("documents").select("*").order("created_at", desc=True).limit(20)
        
        # 🔒 关键逻辑：如果传了 user_id，只查这个人的；如果没传，暂时只能看公共的(user_id is null)
        if user_id:
            query = query.eq("user_id", user_id)
        else:
            # 游客只能看到未登录时创建的（可选逻辑）
            query = query.is_("user_id", "null")
            
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"History error: {e}")
        return []

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    # ... (analyze 函数逻辑保持不变，不需要改动，因为分析不需要 user_id) ...
    print(f"🔍 请求模式: {request.mode}, 内容预览: {request.text[:20]}...")
    
    # 1. 检索法条 (RAG)
    relevant_docs = get_relevant_laws(request.text)
    context_text = "\n".join([f"《{doc['law_name']}》: {doc['content'][:100]}..." for doc in relevant_docs])
    if not context_text: context_text = "（依据通用法律常识）"

    # 2. 根据模式构建不同的 Prompt
    system_prompt = ""
    if request.mode == "draft":
        system_prompt = f"""
        你是一名资深律师。用户的输入是一段【案情描述】。
        你的任务是：根据案情和以下法律依据，撰写一份**完整、专业、格式规范**的法律文书。
        
        【法律依据】：
        {context_text}

        【输出要求】：
        1. 直接输出文书内容，不要啰嗦。
        2. 必须包含标题（如【民事起诉状】）。
        3. 语言必须严谨、法言法语，但对普通人提到的事实要进行法律转化。
        4. 文书末尾用 "|||" 分隔，然后列出3个后续建议。
        """
    else: # review mode
        system_prompt = f"""
        你是一名资深法务专家。用户的输入是一份【法律文书初稿】。
        你的任务是：从合规性、逻辑性、语言准确度、格式规范、法条引用五个维度进行深度润色。
        
        【法律依据】：
        {context_text}

        【输出要求】：
        1. 输出修改后的完整文书。
        2. 在修改过的关键地方，请在文书对应的段落后，用Markdown的引用格式（> 修改理由：...）标注出你的修改理由，方便用户对比。
        3. 文书末尾用 "|||" 分隔，然后列出3个后续建议。
        """

    try:
        response = zhipu_client.chat.completions.create(
            model="glm-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.text},
            ],
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