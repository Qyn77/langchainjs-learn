import fs from 'node:fs'
import path from 'node:path'

/**
 * 公开站点地址，不要末尾斜杠。
 * 默认是 Vercel 上的正式域名；构建时可用 SITE_URL 覆盖。
 */
export const siteUrl = (process.env.SITE_URL || 'https://langchainjs-learn.vercel.app').replace(/\/$/, '')

export function pagePath(relativePath) {
  let route = '/' + String(relativePath || '').replace(/\.md$/, '')
  if (route.endsWith('/index')) route = route.slice(0, -5)
  if (route === '/index') route = '/'
  return route
}

function cleanInline(trimmed) {
  return trimmed
    .replace(/^>\s*/, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function fitDescription(desc) {
  const text = desc.replace(/\s+/g, ' ').trim()
  if (text.length <= 160) return text
  const zh = /[\u4e00-\u9fff]/.test(text)
  const sep = zh ? '、' : '; '
  const end = zh ? '。' : '.'
  const parts = text.split(sep)
  while (parts.length > 1 && parts.join(sep).length > 157) parts.pop()
  let out = parts.join(sep).replace(/[、;.\s。]+$/, '')
  if (!/[。.!！？?]$/.test(out)) out += end
  if (out.length <= 160) return out
  return `${text.slice(0, 157).replace(/\s+\S*$/, '')}…`
}

/** 优先用本章目标；没有目标时，用第一个正文章节里的解释，不把后文的排错说明抽进来。 */
export function descriptionFromMarkdown(raw) {
  const body = String(raw || '').replace(/^---[\s\S]*?---\s*/, '')
  const lines = body.split('\n')
  let inFence = false
  let inGoals = false
  const goals = []
  const paras = []
  const goalHeading = /本章目标|项目目标|学习目标|Goals for This Chapter|Chapter Goals|Project Goals/

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      if (goals.length || paras.length) break
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (!trimmed) continue
    if (trimmed === '---') {
      if (goals.length || paras.length) break
      continue
    }
    if (trimmed.startsWith('>')) continue
    if (trimmed.startsWith('|')) {
      if (goals.length || paras.length) break
      continue
    }
    if (trimmed.startsWith('#')) {
      if (/^#\s/.test(trimmed)) continue
      const heading = cleanInline(trimmed.replace(/^#+\s*/, ''))
      const nextGoals = goalHeading.test(heading)
      if (!nextGoals && (goals.length || paras.length)) break
      inGoals = nextGoals
      continue
    }

    const text = cleanInline(trimmed)
    if (!text || text.length < 8) continue
    if (/^(注意|Note)[:：]/.test(text)) continue
    if (/^(适用于|For )/.test(text)) continue
    if (/^(重要说明|Important)[:：]/.test(text)) continue

    const isItem = trimmed.startsWith('- ') || trimmed.startsWith('* ')
    if (inGoals && isItem) {
      const item = text.replace(/^[-*]\s*/, '')
      if (item.length > 1) goals.push(item)
      continue
    }
    if (isItem || /^\d+\.\s/.test(trimmed)) continue

    paras.push(text)
    const joined = paras.join('')
    if (joined.length >= 70 && /[。.!！？?：:]$/.test(text)) break
    if (joined.length >= 140) break
  }

  if (goals.length) {
    const zh = /[\u4e00-\u9fff]/.test(goals.join(''))
    return fitDescription(`${zh ? '本章内容：' : 'In this chapter: '}${goals.join(zh ? '、' : '; ')}${zh ? '。' : '.'}`)
  }
  const zh = /[\u4e00-\u9fff]/.test(paras.join(''))
  return fitDescription(paras.join(' ').replace(/[：:]\s*$/, zh ? '。' : '.'))
}

export function transformPageData(pageData, ctx) {
  if (!pageData || pageData.relativePath === 'index.md') return
  if (pageData.frontmatter?.description) return
  const srcDir = ctx?.siteConfig?.srcDir || ''
  const filePath = pageData.filePath && path.isAbsolute(pageData.filePath)
    ? pageData.filePath
    : path.resolve(srcDir, pageData.relativePath || '')
  if (!filePath || !fs.existsSync(filePath)) return
  const description = descriptionFromMarkdown(fs.readFileSync(filePath, 'utf8'))
  if (!description) return
  return { description }
}

export function transformHead({ page, pageData, title, description }) {
  const rel = pageData?.relativePath || page
  if (rel === 'index.md') {
    return [['meta', { name: 'robots', content: 'noindex, follow' }]]
  }

  const locale = rel.startsWith('en/') ? 'en' : 'zh'
  const urlPath = pagePath(rel)
  const altPath = pagePath(locale === 'zh' ? rel.replace(/^zh\//, 'en/') : rel.replace(/^en\//, 'zh/'))
  const zhPath = locale === 'zh' ? urlPath : altPath
  const enPath = locale === 'en' ? urlPath : altPath
  const isHome = rel.endsWith('/index.md')
  const head = [
    ['meta', { property: 'og:site_name', content: 'LangChain & LangGraph' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description || '' }],
    ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
    ['meta', { property: 'og:locale', content: locale === 'zh' ? 'zh_CN' : 'en_US' }],
    ['meta', { property: 'og:locale:alternate', content: locale === 'zh' ? 'en_US' : 'zh_CN' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description || '' }],
  ]

  if (siteUrl) {
    const url = siteUrl + urlPath
    head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['link', { rel: 'alternate', hreflang: 'zh-CN', href: siteUrl + zhPath }],
      ['link', { rel: 'alternate', hreflang: 'en', href: siteUrl + enPath }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: siteUrl + zhPath }],
    )
  }

  const jsonLd = isHome
    ? {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: title,
        description,
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
        ...(siteUrl ? { url: siteUrl + urlPath } : {}),
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description,
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
        isPartOf: {
          '@type': 'Course',
          name: 'LangChain & LangGraph',
          ...(siteUrl ? { url: siteUrl + (locale === 'zh' ? '/zh/' : '/en/') } : {}),
        },
        ...(siteUrl ? { url: siteUrl + urlPath } : {}),
      }

  head.push(['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)])
  return head
}

export function sitemapConfig() {
  if (!siteUrl) return undefined
  return {
    hostname: siteUrl,
    transformItems(items) {
      return items.filter((item) => {
        const route = item.url.replace(siteUrl, '') || '/'
        return route !== '/' && route !== '/index.html' && !route.includes('404')
      })
    },
  }
}

export function writeRobots(siteConfig) {
  const outDir = siteConfig.outDir
  if (!outDir) return
  const body = siteUrl
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n'
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'robots.txt'), body)
}
