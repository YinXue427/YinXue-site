/* articles.js
 * 文章配置：标题 / 简介 / Markdown 路径 / 标签 / 日期
 * 可选 content 字段：当 path 无法 fetch（例如直接 file:// 打开）时作为内联回退
 */
window.ARTICLES = [
  {
    id: 'yinxue-music',
    title: 'YinXue Music',
    tag: 'APP',
	 num:"1",
    summary: '一个优雅的网页音乐播放器，支持歌词动效与网易云音乐播放',
    date: '2026-7-14',
    path: 'https://yinxue.wuaze.com/markdown/yinxuemusic.md',
    
  },
  {
    id: 'ai-agent-guide',
	 num:"2",
    title: 'AI Agent 时代生存指南',
    tag: 'DOCS',
    summary: '从 Prompt 到 Agent，赋予其工具与记忆，探索人机协同的 20% 灵感边界。',
    date: '2026-8-8',
    path: 'articles/ai-agent-guide.md',
    content: `
# AI Agent 时代生存指南

不要把 AI 当作更聪明的搜索引擎。真正的范式转移在于让它成为一个具有“手脚”和“记忆”的 Agent。

## 从 Prompt 到 Context

在 Agent 架构中，最关键的已经不是你的提示词写得有多长，而是你喂给它的上下文（Context）质量如何。学会利用向量数据库搭建专属知识库（RAG），才是王道。

## Human-in-the-loop

不要指望 100% 全自动化。在关键节点（如执行 CLI 命令或写入文件）加入人工确认逻辑。人类负责最后的 20% 灵感与质检，让 AI 承担那 80% 的枯燥劳动。

### 推荐工具链

| 环节 | 工具 |
| --- | --- |
| 编排 | LangChain / LlamaIndex |
| 向量库 | Chroma / Qdrant |
| 本地模型 | Ollama / LM Studio |

> 记住：Agent 不是替代你，而是放大你。
`
  },
  
  
];
