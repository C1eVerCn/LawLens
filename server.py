import os
import uvicorn
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse 
from pydantic import BaseModel
from supabase import create_client, Client
from openai import OpenAI
from typing import List, Optional
import json

# ===========================
# 1. Configuration & Initialization
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
        print("❌ Error: Missing core environment variables")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        client = OpenAI(
            api_key=SILICONFLOW_API_KEY,
            base_url="https://api.siliconflow.cn/v1"
        )
        print("✅ LawLens Intelligence Engine Started (RAG + Memory Enabled)")
    except Exception as e:
        print(f"❌ Initialization Failed: {e}")

# ===========================
# 2. Data Models
# ===========================
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    messages: List[ChatMessage]
    current_doc: str = ""
    selection: Optional[str] = "" 
    mode: str = "draft" 
    user_id: Optional[str] = None # Added: User ID is required for memory features

class DocumentSave(BaseModel):
    title: str
    content: str
    user_id: Optional[str] = None

class MemoryCreate(BaseModel):
    user_id: str
    content: str
    type: str = "preference"

# ===========================
# 3. 🧠 Memory Manager (New Core Module)
# ===========================
class MemoryManager:
    @staticmethod
    def add_memory(user_id: str, content: str, m_type: str = "preference"):
        """Write a new memory"""
        if not client or not supabase: return False
        try:
            # Vectorize the memory content
            resp = client.embeddings.create(model="BAAI/bge-m3", input=content)
            vec = resp.data[0].embedding
            
            # Store in Supabase
            supabase.table("agent_memories").insert({
                "user_id": user_id,
                "content": content,
                "memory_type": m_type,
                "embedding": vec
            }).execute()
            print(f"🧠 [Memory] Remembered: {content}")
            return True
        except Exception as e:
            print(f"❌ Memory Write Error: {e}")
            return False

    @staticmethod
    def retrieve_memories(user_id: str, query: str) -> str:
        """Retrieve relevant memories"""
        if not client or not supabase or not user_id: return ""
        try:
            # Vectorize the current query
            resp = client.embeddings.create(model="BAAI/bge-m3", input=query)
            vec = resp.data[0].embedding
            
            # RPC Search (Search ONLY within this user's memories)
            rpc_resp = supabase.rpc("match_memories", {
                "query_embedding": vec,
                "match_threshold": 0.5, # High threshold to prevent irrelevant associations
                "match_count": 3,
                "p_user_id": user_id
            }).execute()
            
            memories = rpc_resp.data
            if not memories: return ""
            
            # Format memories for the prompt
            mem_text = "\n".join([f"- {m['content']}" for m in memories])
            return mem_text
        except Exception as e:
            print(f"❌ Memory Read Error: {e}")
            return ""

# ===========================
# 4. Helper Interfaces (History & Save)
# ===========================

# --- New: Manual Memory Creation Interface ---
@app.post("/api/memory")
async def create_memory(mem: MemoryCreate):
    success = MemoryManager.add_memory(mem.user_id, mem.content, mem.type)
    return {"status": "success" if success else "error"}

@app.post("/api/save")
async def save_document(doc: DocumentSave):
    if not supabase: return {"status": "error", "msg": "DB Not Connected"}
    try:
        # Intelligent title generation: remove HTML tags, take first 20 chars
        raw_text = doc.content.replace('<', '').replace('>', '')[:20]
        title = doc.title if doc.title and doc.title != "Untitled Document" else f"{raw_text}..."
        
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
# 5. Core AI Logic (Deep Upgrade: RAG + Memory + CoT)
# ===========================

def get_relevant_laws(query: str):
    """
    RAG Retrieval Logic
    1. Vectorize user requirement
    2. Database matching
    3. Format return
    """
    if not client or not supabase: return None
    try:
        # 1. Embedding
        print(f"🔍 [RAG] Retrieving external laws: {query[:20]}...")
        response = client.embeddings.create(model="BAAI/bge-m3", input=query)
        query_vector = response.data[0].embedding
        
        # 2. RPC Search
        rpc_response = supabase.rpc("match_documents", {
            "query_embedding": query_vector,
            "match_threshold": 0.45, # Higher threshold for quality
            "match_count": 3 
        }).execute()
        
        # 3. Format
        docs = rpc_response.data
        if not docs:
            print("⚠️ [RAG] No cases matched")
            return None
            
        print(f"✅ [RAG] Matched {len(docs)} cases")
        formatted_context = ""
        for i, doc in enumerate(docs):
            # Attempt to extract metadata (assuming content might contain it or there's a metadata field)
            # Simple handling: truncate content
            snippet = doc['content'][:600].replace('\n', ' ')
            formatted_context += f"【Reference Case/Statute {i+1}】\nContent Snippet: {snippet}...\n----------------\n"
            
        return formatted_context
    except Exception as e:
        print(f"❌ Retrieval Failed: {e}")
        return None

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """Core AI Analysis Interface (With Chain of Thought Display)"""
    
    # 1. Intent Recognition
    user_intent = request.selection if request.mode == "selection_polish" else request.messages[-1].content
    user_id = request.user_id
    
    print(f"🧠 [AI Core] Mode: {request.mode} | Intent: {user_intent[:30]}")

    # 2. Dual Retrieval (RAG + Memory)
    
    # A. Retrieve External Knowledge (RAG - Law)
    rag_context = ""
    found_cases = False
    
    if request.mode != "selection_polish":
        rag_context = get_relevant_laws(user_intent)
        if rag_context:
            found_cases = True

    # B. Retrieve Internal Memory (Memory - User Prefs) ✨✨✨
    memory_context = ""
    if user_id:
        memory_context = MemoryManager.retrieve_memories(user_id, user_intent)
        if memory_context:
            print(f"🧠 [Memory] Matched User Preferences:\n{memory_context}")

    # 3. Prompt Construction (Injecting Chain of Thought & Memory)
    
    # Inject memory into Prompt
    memory_section = ""
    if memory_context:
        memory_section = f"""
        【⚠️ User Special Instructions (Agent Memory)】
        Please strictly adhere to the following user past preferences or correction records:
        {memory_context}
        """

    base_role = "You are a top-tier Chinese AI Legal Assistant developed by LawLens. Your responses must meet the standards of a Senior Partner at a Red Circle Law Firm: rigorous, sharp, and logically closed."
    
    html_structure_prompt = """
    【Output Format Requirements】
    1. **Must use HTML tags**: Use <h3>, <b>, <ul>, <li>, <blockquote>, <p>.
    2. **Markdown Forbidden**: Do not use # or **.
    3. **Chain of Thought Display**: Before the formal content, you must wrap your analysis process in a <blockquote> tag.
    """

    system_instruction = ""

    if request.mode == "draft":
        system_instruction = f"""
        {base_role}
        【Task】Based on user requirements, first analyze the retrieved reference cases, then draft the legal document.
        
        {memory_section}
        
        【Reference Library】
        {rag_context if rag_context else "（No specific similar cases found, drafting based on general 'Civil Code' provisions）"}
        
        {html_structure_prompt}
        
        【Output Structure】
        1. **Legal Retrieval Analysis Report** (Wrap in <blockquote>):
           - **Core Dispute Point**: Analyze the legal relationships involved in the user's request.
           - **Similar Case Judicial View**: (If references exist above) Cite and analyze whether reference cases support or reject similar claims, and what the court's reasoning was.
           - **Drafting Strategy**: Based on the above analysis, highlight the clauses to be emphasized in this document.
           - **(Important)** If the above 【User Special Instructions】 were applied, explicitly state: "Based on your preference, I have adjusted... to...".
        
        2. **Formal Legal Document**:
           - Title, Party Info (leave blank to fill), Facts & Reasons, Litigation Requests/Contract Clauses, Ending.
           - Cite reference case logic in clauses where applicable using [Reference Case X] footnotes.
        """
        
    elif request.mode == "polish":
        system_instruction = f"""
        {base_role}
        【Task】Act as a strict partner to review and polish this document based on reference materials.
        
        {memory_section}
        
        【Document Under Review】'''{request.current_doc}'''
        
        【Reference Library】
        {rag_context if rag_context else "（Based on general legal practice standards）"}
        
        {html_structure_prompt}
        
        【Output Structure】
        1. **Review Diagnosis** (Wrap in <blockquote>):
           - **Risk Warning**: Point out legal risks or logical loopholes in the original text.
           - **Revision Basis**: Combining reference materials (if any), explain why the change is needed (e.g., "Reference Case 1 shows that such high liquidated damages are usually not supported, suggest adjusting to...").
           - If the document violates 【User Special Instructions】, point it out severely.
        
        2. **Revised Full Text**:
           - Output the complete optimized document content, using <b> bold</b> to mark changes.
        """
        
    else: # selection_polish (Micro Polish)
        system_instruction = f"""
        {base_role}
        【Task】Perform a "Legalese" micro-adjustment on the text selected by the user.
        
        {memory_section}
        
        【Original】"{request.selection}"
        【Instruction】"{user_intent}"
        
        【Requirements】
        - Directly output the modified text.
        - Maintain HTML format.
        - Tone: Rigorous, professional, eliminate colloquialisms.
        - If the user has specific preference memories, prioritize satisfying them.
        """

    # 4. Message Construction
    messages = [{"role": "system", "content": system_instruction}]
    if request.mode != "selection_polish":
        # Filter out previous system messages to prevent Prompt pollution
        history = [m.dict() for m in request.messages if m.role != "system"]
        messages.extend(history)
    else:
        messages.append({"role": "user", "content": user_intent})

    # 5. Stream Generation
    async def generate_stream():
        try:
            # A. Fake System-Level Progress Bar (Adds Ritual)
            if request.mode != "selection_polish":
                status_html = f"""
                <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:16px; font-size:13px; color:#475569;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <span style="display:inline-block; width:8px; height:8px; background:#2563eb; border-radius:50%;"></span>
                        <b>AI Legal Engine Running...</b>
                    </div>
                    <ul style="margin:0; padding-left:20px;">
                        <li>Analyzing Case: {user_intent[:10]}...</li>
                        <li>Retrieving Case Database: {'✅ Matched ' + str(rag_context.count('【Reference Case')) + ' highly relevant cases' if found_cases else '⚠️ No specific cases matched, using general legal library'}</li>
                        <li>Retrieving Memory: {'✅ Found user preferences' if memory_context else 'No specific preferences found'}</li>
                        <li>Building Logic Chain: Facts -> Law Matching -> Judgment Prediction -> Document Generation</li>
                    </ul>
                </div>
                """
                yield status_html
                # Pause slightly to let the user see the retrieval process
                time.sleep(0.8)

            # B. LLM Generation
            stream = client.chat.completions.create(
                model="Qwen/Qwen2.5-32B-Instruct", 
                messages=messages,
                stream=True, 
                temperature=0.4, # Maintain rigor
                max_tokens=4000
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            print(f"❌ Generation Error: {e}")
            yield f"<p style='color:red'><b>[System Error]</b>: AI service response timeout, please try again.<br>Debug Info: {str(e)}</p>"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)