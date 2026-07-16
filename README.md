# AI 产品经理求职助手 (AgentPower)

一个面向 AI 产品经理的智能求职助手，提供简历优化、AI 知识问答、模拟面试等功能。

## 在线访问

🔗 **[https://agentpower-d0gbgj8h326707cf2-1453911330.tcloudbaseapp.com/](https://agentpower-d0gbgj8h326707cf2-1453911330.tcloudbaseapp.com/)**

## 功能模块

- **简历优化** — AI 分析并优化简历内容
- **AI 知识问答** — 回答 AI/LLM/产品相关专业问题
- **模拟面试** — AI 出题 + 评估回答质量，支持追问

## 技术架构

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | 纯 HTML/CSS/JS | 部署在 CloudBase 静态托管 CDN |
| 后端 | Node.js (SCF 云函数) | HTTP 触发器，调用 LLM API |
| AI 模型 | Qwen2.5-7B-Instruct | 通过 SiliconFlow API 调用 |

## 项目结构

```
Claw/
├── ai-pm-agent.html          # 前端页面
├── server/
│   ├── index.js              # 后端服务入口
│   ├── Dockerfile            # 云托管构建文件
│   └── .env.example          # 环境变量模板
├── cloudfunctions/
│   └── aiPmAgent/            # 云函数部署代码
├── cloudrun/
│   └── ai-pm-agent/          # 云托管部署配置
└── dist/                     # 构建产物
```

## 本地开发

```bash
# 1. 安装依赖
cd server && npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 LLM_API_KEY

# 3. 启动服务
npm start
# 访问 http://localhost:3001
```

## 部署

- 前端通过 CloudBase 静态托管部署
- 后端通过 CloudBase 云函数 SCF 部署
- 支持 CloudBase 云托管（Docker 容器模式）
