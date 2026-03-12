import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "LangChain.js 入门教程",
  description: "适用于 2026 年 LangChain.js v1.x 版本的零基础入门教程",

  themeConfig: {
    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      { text: '基础篇', link: '/01-基础概念' },
      { text: '进阶篇', link: '/06-Prompt 模板' },
      { text: '高级篇', link: '/12-Agent（智能体）' },
    ],

    // 侧边栏 - 按章节分组
    sidebar: {
      '/': [
        {
          text: '基础篇',
          items: [
            { text: '01 - 基础概念', link: '/01-基础概念' },
            { text: '02 - 环境搭建', link: '/02-环境搭建' },
            { text: '03 - 模型调用', link: '/03-模型调用' },
            { text: '04 - 消息类型', link: '/04-消息类型' },
            { text: '05 - 流式输出', link: '/05-流式输出' },
          ]
        },
        {
          text: '进阶篇',
          items: [
            { text: '06 - Prompt 模板', link: '/06-Prompt 模板' },
            { text: '07 - 输出解析器', link: '/07-输出解析器' },
            { text: '08 - 链 (Chain)', link: '/08-链 (Chain)' },
            { text: '09 - 记忆 (Memory)', link: '/09-记忆 (Memory)' },
            { text: '10 - 工具 (Tools)', link: '/10-工具 (Tools)' },
            { text: '11 - Zod 使用说明', link: '/11-Zod 使用说明' },
          ]
        },
        {
          text: '高级篇',
          items: [
            { text: '12 - Agent（智能体）', link: '/12-Agent（智能体）' },
            { text: '13 - RAG（检索增强生成）', link: '/13-RAG（检索增强生成）' },
            { text: '14 - VectorStore（向量存储）', link: '/14-VectorStore（向量存储）' },
          ]
        }
      ]
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/langchain-ai/langchainjs' }
    ],

    // 页脚
    footer: {
      message: '基于 LangChain.js v1.x 版本',
      copyright: 'MIT License'
    },

    // 搜索
    search: {
      provider: 'local'
    },

    // 提纲
    outline: {
      level: [2, 3],
      label: '目录'
    }
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true
  }
})
