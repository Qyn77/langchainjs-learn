import { defineConfig } from 'vitepress'
import { redirectBootScript } from './locale.mjs'

/** 中英文用同一套文件名，切换语言时才能落到同一章。 */
const chapters = {
  zh: {
    home: '首页',
    lcBasic: 'LangChain 基础',
    lcMid: 'LangChain 进阶',
    lcAdv: 'LangChain 高级',
    lgBasic: 'LangGraph 基础',
    lgMid: 'LangGraph 进阶',
    groups: {
      lcBasic: 'LangChain · 基础篇',
      lcMid: 'LangChain · 进阶篇',
      lcAdv: 'LangChain · 高级篇',
      lgBasic: 'LangGraph · 基础篇',
      lgMid: 'LangGraph · 进阶篇',
    },
    items: [
      '01 - 基础概念',
      '02 - 环境搭建',
      '03 - 模型调用',
      '04 - 消息类型',
      '05 - 流式输出',
      '06 - Prompt 模板',
      '07 - 输出解析器',
      '08 - 链 (Chain)',
      '09 - 记忆 (Memory)',
      '10 - 工具 (Tools)',
      '11 - Zod 使用说明',
      '12 - Agent（智能体）',
      '13 - RAG（检索增强生成）',
      '14 - VectorStore（向量存储）',
      '15 - LangGraph 简介',
      '16 - 环境搭建与第一个图',
      '17 - 状态（State）详解',
      '18 - 节点与边',
      '19 - 条件边与路由',
      '20 - 构建 ReAct Agent',
      '21 - 记忆与持久化',
      '22 - 人机协同',
      '23 - 子图',
      '24 - 多 Agent 系统',
      '25 - 流式输出',
      '26 - 长期记忆与跨线程 Store',
      '27 - Functional API',
      '28 - 实战项目',
    ],
  },
  en: {
    home: 'Home',
    lcBasic: 'LangChain Basics',
    lcMid: 'LangChain Intermediate',
    lcAdv: 'LangChain Advanced',
    lgBasic: 'LangGraph Basics',
    lgMid: 'LangGraph Intermediate',
    groups: {
      lcBasic: 'LangChain · Basics',
      lcMid: 'LangChain · Intermediate',
      lcAdv: 'LangChain · Advanced',
      lgBasic: 'LangGraph · Basics',
      lgMid: 'LangGraph · Intermediate',
    },
    items: [
      '01 - Concepts',
      '02 - Environment Setup',
      '03 - Calling Models',
      '04 - Message Types',
      '05 - Streaming',
      '06 - Prompt Templates',
      '07 - Output Parsers',
      '08 - Chains',
      '09 - Memory',
      '10 - Tools',
      '11 - Zod',
      '12 - Agents',
      '13 - RAG',
      '14 - Vector Stores',
      '15 - Introduction to LangGraph',
      '16 - Setup and Your First Graph',
      '17 - State',
      '18 - Nodes and Edges',
      '19 - Conditional Edges and Routing',
      '20 - Building a ReAct Agent',
      '21 - Memory and Persistence',
      '22 - Human-in-the-loop',
      '23 - Subgraphs',
      '24 - Multi-agent Systems',
      '25 - Streaming',
      '26 - Long-term Memory and Cross-thread Store',
      '27 - Functional API',
      '28 - Capstone Project',
    ],
  },
}

const files = [
  '01-基础概念',
  '02-环境搭建',
  '03-模型调用',
  '04-消息类型',
  '05-流式输出',
  '06-Prompt 模板',
  '07-输出解析器',
  '08-链 (Chain)',
  '09-记忆 (Memory)',
  '10-工具 (Tools)',
  '11-Zod 使用说明',
  '12-Agent（智能体）',
  '13-RAG（检索增强生成）',
  '14-VectorStore（向量存储）',
  '15-LangGraph 简介',
  '16-环境搭建与第一个图',
  '17-状态（State）详解',
  '18-节点与边',
  '19-条件边与路由',
  '20-构建 ReAct Agent',
  '21-记忆与持久化',
  '22-人机协同',
  '23-子图',
  '24-多 Agent 系统',
  '25-流式输出',
  '26-长期记忆与跨线程 Store',
  '27-Functional API',
  '28-实战项目',
]

function localePrefix(locale) {
  return locale === 'en' ? '/en' : '/zh'
}

function item(locale, index) {
  return {
    text: chapters[locale].items[index],
    link: `${localePrefix(locale)}/${files[index]}`,
  }
}

function range(locale, start, end) {
  const items = []
  for (let i = start; i <= end; i++) items.push(item(locale, i))
  return items
}

function sidebar(locale) {
  const prefix = `${localePrefix(locale)}/`
  const g = chapters[locale].groups
  return {
    [prefix]: [
      { text: g.lcBasic, collapsed: true, items: range(locale, 0, 4) },
      { text: g.lcMid, collapsed: true, items: range(locale, 5, 10) },
      { text: g.lcAdv, collapsed: true, items: range(locale, 11, 13) },
      { text: g.lgBasic, collapsed: true, items: range(locale, 14, 19) },
      { text: g.lgMid, collapsed: true, items: range(locale, 20, 27) },
    ],
  }
}

function nav(locale) {
  const t = chapters[locale]
  const prefix = localePrefix(locale)
  // 顶部只留两个菜单，给语言切换、外观和 GitHub 留出位置。
  // 章节入口仍在侧边栏。
  return [
    { text: t.home, link: `${prefix}/` },
    {
      text: 'LangChain',
      items: [
        { text: t.lcBasic, link: `${prefix}/${files[0]}` },
        { text: t.lcMid, link: `${prefix}/${files[5]}` },
        { text: t.lcAdv, link: `${prefix}/${files[11]}` },
      ],
    },
    {
      text: 'LangGraph',
      items: [
        { text: t.lgBasic, link: `${prefix}/${files[14]}` },
        { text: t.lgMid, link: `${prefix}/${files[20]}` },
      ],
    },
  ]
}

const zhSearch = {
  translations: {
    button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
    modal: {
      noResultsText: '没有找到结果',
      resetButtonTitle: '清除',
      footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
    },
  },
}

const searchLocales = {
  root: zhSearch,
  zh: zhSearch,
  en: {
    translations: {
      button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
      modal: {
        noResultsText: 'No results for',
        resetButtonTitle: 'Reset search',
        footer: { selectText: 'to select', navigateText: 'to navigate', closeText: 'to close' },
      },
    },
  },
}

const zhTheme = {
  nav: nav('zh'),
  sidebar: sidebar('zh'),
  outline: { level: [2, 3], label: '目录' },
  docFooter: { prev: '上一页', next: '下一页' },
  sidebarMenuLabel: '菜单',
  returnToTopLabel: '回到顶部',
  darkModeSwitchLabel: '外观',
  langMenuLabel: '切换语言',
  footer: {
    message: '基于 LangChain.js v1.x 与 LangGraph.js v1.x',
    copyright: 'MIT License',
  },
}

export default defineConfig({
  title: 'LangChain & LangGraph',
  description: '适用于 2026 年 LangChain.js / LangGraph.js v1.x 的零基础入门教程',

  // 在页面脚本运行前跳转，避免先画出错误语言。
  head: [['script', {}, redirectBootScript()]],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'LangChain & LangGraph',
      description: '适用于 2026 年 LangChain.js / LangGraph.js v1.x 的零基础入门教程',
      themeConfig: {
        sidebar: false,
        langMenuLabel: '切换语言',
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'LangChain & LangGraph',
      description: '适用于 2026 年 LangChain.js / LangGraph.js v1.x 的零基础入门教程',
      themeConfig: zhTheme,
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'LangChain & LangGraph',
      description: 'A beginner tutorial for LangChain.js and LangGraph.js v1.x (2026)',
      themeConfig: {
        nav: nav('en'),
        sidebar: sidebar('en'),
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        darkModeSwitchLabel: 'Appearance',
        langMenuLabel: 'Change language',
        footer: {
          message: 'Based on LangChain.js v1.x and LangGraph.js v1.x',
          copyright: 'MIT License',
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/langchain-ai/langchainjs' },
    ],
    search: {
      provider: 'local',
      options: { locales: searchLocales },
    },
    i18nRouting: true,
  },

  markdown: {
    lineNumbers: true,
  },
})
