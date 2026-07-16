const http = require("http");
const { URL } = require("url");
const OpenAI = require('openai');

// ============ 初始化服务 ============
const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'sk-demo',
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
});
const MODEL = process.env.LLM_MODEL || 'Qwen/Qwen3.5-9B';

// ============ CORS 工具 ============
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(data));
}

function sendOptions(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
    req.on("error", reject);
  });
}

// ============ 业务处理函数 ============

async function handleResumeOptimize(body, res) {
  const { resume } = body;
  if (!resume) return sendJson(res, 400, { error: '请提供简历内容' });

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

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是一位专业的 AI 产品经理求职顾问，擅长简历优化和面试辅导。回答要专业、具体、可操作。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 3000,
  });

  sendJson(res, 200, { success: true, data: completion.choices[0].message.content });
}

async function handleInterviewQuestion(body, res) {
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

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是一位资深 AI 产品经理面试官。输出严格的 JSON 格式。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.9,
    max_tokens: 1000,
  });

  const raw = completion.choices[0].message.content;
  let data;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    data = jsonMatch ? JSON.parse(jsonMatch[0]) : { question: raw, category, key_points: [], difficulty: 'medium' };
  } catch {
    data = { question: raw, category, key_points: [], difficulty: 'medium' };
  }

  sendJson(res, 200, { success: true, data });
}

async function handleInterviewEvaluate(body, res) {
  const { question, answer } = body;
  if (!question || !answer) return sendJson(res, 400, { error: '请提供题目和回答' });

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

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是专业的 AI 产品经理面试官，评估要客观、具体、有建设性。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  sendJson(res, 200, { success: true, data: completion.choices[0].message.content });
}

async function handleJDAnalyze(body, res) {
  const { jd } = body;
  if (!jd) return sendJson(res, 400, { error: '请提供 JD 内容' });

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

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是资深 AI 产品经理求职顾问，分析 JD 要深入、有洞察力。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  sendJson(res, 200, { success: true, data: completion.choices[0].message.content });
}

async function handleKnowledgeAsk(body, res) {
  const { topic } = body;
  if (!topic) return sendJson(res, 400, { error: '请提供问题主题' });

  const prompt = `你是一位 AI 产品经理领域的专家。请详细解答以下主题，帮助求职者准备面试。

## 主题
${topic}

## 要求
1. 先给出核心概念的精简解释（2-3 句话）
2. 列出 3-5 个关键知识点
3. 给出 1-2 个面试中可能被追问的问题及回答要点
4. 如果有的话，给出产品经理需要关注的实践建议
5. 用通俗易懂的语言，避免过于学术化`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是 AI 产品经理知识专家，擅长将复杂技术概念讲得通俗易懂。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  sendJson(res, 200, { success: true, data: completion.choices[0].message.content });
}

// ============ HTTP 服务 ============

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return sendOptions(res);
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();

  // 解析 JSON body
  let body = {};
  if (method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch {
      // body 解析失败，继续用空对象
    }
  }

  try {
    // 健康检查
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { status: 'ok', model: MODEL });
    }

    // 简历优化
    if (pathname === '/api/resume/optimize' && method === 'POST') {
      return await handleResumeOptimize(body, res);
    }

    // 面试出题
    if (pathname === '/api/interview/question' && method === 'POST') {
      return await handleInterviewQuestion(body, res);
    }

    // 面试评估
    if (pathname === '/api/interview/evaluate' && method === 'POST') {
      return await handleInterviewEvaluate(body, res);
    }

    // JD 分析
    if (pathname === '/api/jd/analyze' && method === 'POST') {
      return await handleJDAnalyze(body, res);
    }

    // 知识问答
    if (pathname === '/api/knowledge/ask' && method === 'POST') {
      return await handleKnowledgeAsk(body, res);
    }

    sendJson(res, 404, { error: 'Not found: ' + method + ' ' + pathname });
  } catch (error) {
    console.error('API Error:', error.message);
    sendJson(res, 500, { error: 'AI 服务暂时不可用: ' + error.message });
  }
});

server.listen(9000);
