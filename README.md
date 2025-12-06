⚖️AI法律助手（AI法律文书助手）
1. 项目愿景
一个集成模块的AI法律工具编辑器。提供“编辑-版本-分析-生成”闭环。核心特色是基于本地支持数据库（RAG）提供真实有效的法条依赖和案例支撑，而不是简单依赖大模型的生成能力。

2.技术栈（Tech Stack）
本项目采用“Free Tier Driven”（免费层驱动）架构：

前端:Next.js 14+(App Router) - React 框架 (待开发)

编辑器：蒂普塔普- 无头富文本编辑器

用户界面组件：Shadcn/ui+ TailwindCSS

出租/托管：维塞尔（无服务器函数）

数据库和存储：苏帕巴(PostgreSQL + pgvector) -免费额度 500MB

人工智能推理：智普人工智能(GLM-4) - 用于最终回答生成

嵌入模型：（shibing624/text2vec-base-chinese本地运行）

数据来源：

法律参考书

中国法律法规

3.快速开始（快速开始）
3.1 环境配置
在项目根目录创建.env文件，填写以下配置：

代码片段

# Supabase 配置
SUPABASE_URL="你的_Supabase_Project_URL"
SUPABASE_SERVICE_ROLE_KEY="你的_Supabase_Service_Role_Key"

# 智谱 AI 配置
ZHIPU_API_KEY="你的_智谱AI_API_Key"
3.2 安装依赖
巴什

pip install -r scripts/requirements.txt
3.3 数据准备与入库
在根目录创建data/文件夹。

将法律文本（如民法典）保存为minfadian.txt存放data/目录。

运行脚本：

巴什

python scripts/ingest.py
3.4 运行测试
搜索（仅测试搜索，不消耗Token）：

巴什

python scripts/search.py
AI问答测试（RAG完整流程）：

巴什

python scripts/ask.py
4. 系统架构与数据流

盖蒂图片社
探索
数据稀疏 (ETL) : Python 脚本 ( scripts/ingest.py) 拉取法律文本 -> 切片 -> 嵌入 -> 存入 Supabase。

搜索（Retrieval）：scripts/search.py或API将文本支持化，调用Supabase RPC函数查找Top-K相关法条。

生成（Generation）：scripts/ask.py将“搜索到的法条”预算发给GLM-4。

展示：结果返回给用户。

5. 数据库设计（Supabase）
请在 Supabase SQL Editor 中运行以下命令初始化数据库。 注意：函数名必须match_documents以匹配代码调用。

SQL

-- 1. 启用向量搜索扩展
create extension if not exists vector;

-- 2. 创建法律知识库表
create table legal_docs (
  id bigserial primary key,
  content text,             -- 切分后的法条正文
  law_name text,            -- 法律名称 (如：中华人民共和国民法典)
  reference_id text,        -- 条款号 (如：第一千零一条)
  category text,            -- 分类 (法条/案例)
  embedding vector(768)     -- 向量数据 (对应 text2vec-base-chinese 模型维度)
);

-- 3. 创建全文检索索引 (可选，用于关键词匹配)
create index on legal_docs using gin(to_tsvector('english', content));

-- 4. 创建向量相似度搜索函数 (RPC)
-- 代码中调用名为 "match_documents"，此处必须保持一致
create or replace function match_documents (
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