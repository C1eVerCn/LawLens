import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from zhipuai import ZhipuAI

# 1. 加载配置
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY")

if not ZHIPU_API_KEY:
    print("❌ 错误: 请先在 .env 中填入 ZHIPU_API_KEY")
    exit()

# 2. 初始化客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
zhipu_client = ZhipuAI(api_key=ZHIPU_API_KEY)

print("⏳ 正在加载嵌入模型 (用于搜索)...")
# 本地模型，用于把问题变成向量
embed_model = SentenceTransformer('shibing624/text2vec-base-chinese')

def get_relevant_laws(query: str):
    """ 去数据库搜索相关的法律条款 """
    query_vector = embed_model.encode(query).tolist()
    
    response = supabase.rpc("match_documents", {
        "query_embedding": query_vector,
        "match_threshold": 0.4, # 稍微放宽一点，确保能搜到东西
        "match_count": 5        # 给 AI 提供前 5 条相关法律
    }).execute()
    
    return response.data

def ask_lawyer_glm(user_question: str):
    """ 核心函数：RAG 流程 """
    print(f"\nThinking... (正在查阅法典并咨询 GLM-4)")
    
    # 1. 检索 (Retrieve)
    relevant_docs = get_relevant_laws(user_question)
    
    if not relevant_docs:
        print("🤷‍♂️ 抱歉，数据库里没找到相关法律，但我会尝试用通用知识回答。")
        context_text = "（未找到具体法律条文，请依据通用法律常识回答）"
    else:
        # 把搜到的几条法律拼成一段话
        context_text = "\n\n".join([
            f"《{doc['law_name']}》{doc['reference_id']}:\n{doc['content']}" 
            for doc in relevant_docs
        ])

    # 2. 组装提示词 (Prompt Engineering)
    # 这是 RAG 的灵魂：告诉 AI "利用上面的资料回答下面的问题"
    system_prompt = """
你是一位专业的中国法律顾问。请根据下面提供的【法律法规依据】来回答用户的提问。
要求：
1. 引用具体的法律条款名称（如《民法典》第一千xxx条）。
2. 解答要通俗易懂，但逻辑严密。
3. 如果提供的依据不足以回答问题，请诚实说明，不要瞎编法律条文。
"""
    
    user_prompt = f"""
【法律法规依据】：
{context_text}

【用户问题】：
{user_question}
"""

    # 3. 生成 (Generate) - 调用 GLM-4
    try:
        response = zhipu_client.chat.completions.create(
            model="glm-4",  # 这里使用 GLM-4 模型
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            stream=True, # 开启流式输出，像打字机一样
        )
        
        print("\n🤖 === AI 律师的回答 ===\n")
        # 实时打印结果
        for chunk in response:
            print(chunk.choices[0].delta.content or "", end="")
        print("\n\n" + "="*30)
        
    except Exception as e:
        print(f"❌ 调用 GLM-4 出错: {e}")

if __name__ == "__main__":
    while True:
        question = input("\n请简述您的法律问题 (输入 q 退出): ")
        if question.lower() in ['q', 'quit', 'exit']:
            break
        
        ask_lawyer_glm(question)