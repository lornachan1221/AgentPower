'use strict';

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'sk-demo',
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
  timeout: 60000,
  maxRetries: 2,
});

const MODEL = process.env.LLM_MODEL || 'Qwen/Qwen3.5-9B';

// ============ LLM 调用工具 ============
async function callLLM(messages, options = {}) {
  const { temperature = 0.7, max_tokens = 600 } = options;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        temperature,
        max_tokens,
      });
      const content = (completion.choices[0]?.message?.content || '').trim();
      if (content) return content;
      console.warn(`LLM returned empty content, attempt ${attempt + 1}/2`);
    } catch (err) {
      console.error(`LLM error attempt ${attempt + 1}/2:`, err.message);
      if (attempt === 1) throw err;
    }
  }
  throw new Error('LLM returned empty content after 2 attempts');
}

// ============ CORS 工具 ============

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(data),
  };
}

// ============ 路由处理 ============

async function handleResumeOptimize(body) {
  const { resume } = body;
  if (!resume) return json(400, { error: '请提供简历内容' });

  const prompt = `你是一位资深的 AI 产品经理面试官和简历优化专家。请分析以下简历，针对「AI 产品经理」岗位给出优化建议。

## 简历内容
${resume}

## 输出要求
请按以下格式输出（用 Markdown）：

### 📊 匹配度评分
给出 0-100 分的评分，说明理由

### 🔍 AI 关键词识别
列出简历中已有的 AI/LLM 相关关键词，标注缺失的关键词

### 💡 具体优化建议
1. 逐条给出具体可操作的修改建议（至少 5 条）
2. 每条建议包含：问题描述 → 优化方案 → 示例写法
3. 重点关注：AI 技术理解、数据驱动、量化成果、项目经验

### ✨ 优化后的简历片段
给出 2-3 段改写后的简历描述示例，融入 AI PM 所需的亮点`;

  const content = await callLLM([
    { role: 'system', content: '你是一位专业的 AI 产品经理求职顾问，擅长简历优化和面试辅导。回答要专业、具体、可操作。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.7, max_tokens: 800 });

  return json(200, { success: true, data: content });
}

async function handleInterviewQuestion(body) {
  const category = body.category || 'all';
  const history = body.history || [];

  const categoryMap = {
    all: '综合（产品设计、AI技术、数据分析、策略思考、行为面试）',
    product: '产品设计',
    ai: 'AI/LLM 技术',
    data: '数据分析与指标',
    strategy: '策略思考与商业化',
    behavior: '行为面试',
  };

  const catName = categoryMap[category] || '综合';
  const historyStr = history.length > 0
    ? `\n注意：以下题目已经问过了，请换一道不同的：\n${history.join('\n')}`
    : '';

  const prompt = `你是一位 AI 产品经理面试官。请出一道「${catName}」方向的面试题。${historyStr}

要求：
1. 题目要有深度，能考察候选人的思考能力
2. 如果是 AI 技术类，要结合最新趋势（LLM、Agent、RAG 等）
3. 题目不要太宽泛也不要太偏门
4. 同时给出这道题的考察要点（2-3 个关键点）

请用 JSON 格式输出：
{
  "question": "面试题内容",
  "category": "${category}",
  "key_points": ["考察点1", "考察点2", "考察点3"],
  "difficulty": "medium|hard"
}`;

  const content = await callLLM([
    { role: 'system', content: '你是一位资深 AI 产品经理面试官。输出严格的 JSON 格式。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.9, max_tokens: 500 });

  let data;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    data = jsonMatch ? JSON.parse(jsonMatch[0]) : { question: content, category, key_points: [], difficulty: 'medium' };
  } catch {
    data = { question: content, category, key_points: [], difficulty: 'medium' };
  }

  return json(200, { success: true, data });
}

async function handleInterviewEvaluate(body) {
  const { question, answer } = body;
  if (!question || !answer) return json(400, { error: '请提供题目和回答' });

  const prompt = `你是 AI 产品经理面试官。请评估以下面试回答。

## 面试题
${question}

## 候选人回答
${answer}

## 评估要求
请按以下格式输出：

### ⭐ 总体评分
X/10 分，简要说明理由

### 👍 亮点
列出回答中的 2-3 个亮点

### 🔧 改进建议
列出 2-3 条具体改进建议，每条包含「不足之处 → 如何改进 → 示例表达」

### 📝 参考回答框架
给出一个更好的回答思路或框架`;

  const content = await callLLM([
    { role: 'system', content: '你是专业的 AI 产品经理面试官，评估要客观、具体、有建设性。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.7, max_tokens: 800 });

  return json(200, { success: true, data: content });
}

async function handleJDAnalyze(body) {
  const { jd } = body;
  if (!jd) return json(400, { error: '请提供 JD 内容' });

  const prompt = `你是一位 AI 产品经理求职顾问。请分析以下岗位 JD，帮助候选人准备面试。

## JD 内容
${jd}

## 分析要求
请按以下格式输出：

### 📌 岗位核心画像
用一句话概括这个岗位要找什么样的人

### 🔧 硬技能要求
列出关键技术栈和工具要求（按重要程度排序）

### 🧠 软素质要求
列出隐性能力要求

### 🎯 面试重点准备方向
按优先级列出 3-5 个最可能被考察的方向

### ⚠️ 风险点与注意事项
这个岗位可能的坑或需要注意的地方

### 💼 简历针对性优化建议
针对这个 JD，简历应该突出哪些经验和关键词`;

  const content = await callLLM([
    { role: 'system', content: '你是资深 AI 产品经理求职顾问，分析 JD 要深入、有洞察力。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.7, max_tokens: 800 });

  return json(200, { success: true, data: content });
}

async function handleKnowledgeAsk(body) {
  const { topic } = body;
  if (!topic) return json(400, { error: '请提供问题主题' });

  const prompt = `你是一位 AI 产品经理领域的专家。请详细解答以下主题，帮助求职者准备面试。

## 主题
${topic}

## 要求
1. 先给出核心概念的精简解释（2-3 句话）
2. 列出 3-5 个关键知识点
3. 给出 1-2 个面试中可能被追问的问题及回答要点
4. 如果有的话，给出产品经理需要关注的实践建议
5. 用通俗易懂的语言，避免过于学术化`;

  const content = await callLLM([
    { role: 'system', content: '你是 AI 产品经理知识专家，擅长将复杂技术概念讲得通俗易懂。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.5, max_tokens: 800 });

  return json(200, { success: true, data: content });
}

// ============ 主入口 ============

exports.main = async (event, context) => {
  // 从 event.path 提取实际路径
  // 网关 Path 是 /api，PathTransmission=2 时 event.path 是 /health（去掉前缀）
  // 直接路径则是 /api/health
  let path = (event.path || '/').replace(/\/+$/, '') || '/';
  // 如果 path 不以 /api 开头，自动补上（兼容 PathTransmission=2 的情况）
  if (!path.startsWith('/api') && path !== '/') {
    path = '/api' + path;
  }
  const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  // 解析请求体
  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      body = {};
    }
  }

  try {
    // 路由分发
    if (path === '/api/health' && method === 'GET') {
      return json(200, { status: 'ok', model: MODEL });
    }

    if (path === '/api/resume/optimize' && method === 'POST') {
      return await handleResumeOptimize(body);
    }

    if (path === '/api/interview/question' && method === 'POST') {
      return await handleInterviewQuestion(body);
    }

    if (path === '/api/interview/evaluate' && method === 'POST') {
      return await handleInterviewEvaluate(body);
    }

    if (path === '/api/jd/analyze' && method === 'POST') {
      return await handleJDAnalyze(body);
    }

    if (path === '/api/knowledge/ask' && method === 'POST') {
      return await handleKnowledgeAsk(body);
    }

    return json(404, { error: 'Not found: ' + method + ' ' + path, debug: { rawPath: event.path, method: method } });
  } catch (error) {
    console.error('API Error:', error.message);
    return json(500, { error: 'AI 服务暂时不可用: ' + error.message });
  }
};
