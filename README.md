# ⚖️ AI Legal Assistant (AI 法律文书助手)

## 1. 项目愿景
打造一个集成了 AI 的法律文书编辑器。提供“编辑-模版-分析-导出”闭环。核心特色是基于本地向量数据库（RAG）提供真实有效的法条依据和案例支撑，而非单纯依赖大模型的生成能力。

## 2. 零成本技术栈 (Tech Stack)

本项目采用 "Free Tier Driven"（免费层驱动）架构：

* **前端**: [Next.js 14+](https://nextjs.org/) (App Router) - React 框架
* **编辑器**: [Tiptap](https://tiptap.dev/) - 无头富文本编辑器
* **UI 组件**: [Shadcn/ui](https://ui.shadcn.com/) + TailwindCSS
* **后端/托管**: [Vercel](https://vercel.com/) (Serverless Functions)
* **数据库 & 向量存储**: [Supabase](https://supabase.com/) (PostgreSQL + pgvector) - **免费额度 500MB**
* **AI 推理**: [Groq API](https://groq.com/) (Llama 3 免费版) 或 Google Gemini API (Flash 免费版)
* **数据源**:
    * [LawRefBook](https://github.com/RanKKI/LawRefBook)
    * [Chinese-Law-Code](https://github.com/CyberMickey/Chinese-Law-Code)

---

## 3. 系统架构与数据流



[Image of RAG Data Flow Diagram]


1.  **数据预处理 (ETL)**: Python 脚本拉取 GitHub 开源法律文本 -> 切片 -> Embedding -> 存入 Supabase。
2.  **用户撰写**: 前端 Tiptap 编辑器输入内容。
3.  **触发分析**: 用户点击“分析”，文本发送至 Next.js API。
4.  **检索 (Retrieval)**: API 将文本向量化，在 Supabase 中查找 Top-K 相关法条。
5.  **生成 (Generation)**: 将“原文 + 检索到的法条”打包发给 LLM。
6.  **展示**: 结果以“批注”形式返回前端。

---

## 4. 数据库设计 (Supabase)

在 Supabase SQL Editor 中运行以下命令初始化数据库：

```sql
-- 1. 启用向量搜索扩展
create extension if not exists vector;

-- 2. 创建法律知识库表
create table legal_docs (
  id bigserial primary key,
  content text,             -- 切分后的法条正文
  law_name text,            -- 法律名称 (如：中华人民共和国民法典)
  reference_id text,        -- 条款号 (如：第一千零一条)
  category text,            -- 分类 (法条/案例)
  embedding vector(768)     -- 向量数据 (根据选用模型调整维度，这里假设768)
);

-- 3. 创建全文检索索引 (可选，用于关键词匹配)
create index on legal_docs using gin(to_tsvector('english', content));

-- 4. 创建向量相似度搜索函数 (RPC)
create or replace function match_legal_docs (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  law_name text,
  reference_id text,
  similarity float
)
language plpgsql
as $$
begin
  return query (
    select
      legal_docs.id,
      legal_docs.content,
      legal_docs.law_name,
      legal_docs.reference_id,
      1 - (legal_docs.embedding <=> query_embedding) as similarity
    from legal_docs
    where 1 - (legal_docs.embedding <=> query_embedding) > match_threshold
    order by legal_docs.embedding <=> query_embedding
    limit match_count
  );
end;
$$;