import DefaultTheme from 'vitepress/theme'
import '../custom.css'
import { redirectPath } from '../locale.mjs'

const LANG_KEY = 'docs-lang'

function rememberChoice(href) {
  if (href.includes('/en/') || href.endsWith('/en') || href.includes('/en.')) {
    localStorage.setItem(LANG_KEY, 'en')
  } else if (href.includes('/zh/') || href.endsWith('/zh') || href.includes('/zh.')) {
    localStorage.setItem(LANG_KEY, 'zh')
  }
}

/** 根语言和 zh 标签相同，英文页的菜单里会多一条指向 / 的「简体中文」。去掉它。 */
function hideRootLocaleLinks() {
  document
    .querySelectorAll('.VPNavBarTranslations .VPMenuLink, .VPNavScreenTranslations .VPMenuLink')
    .forEach((item) => {
      const href = item.querySelector('a')?.getAttribute('href') || ''
      if (href.startsWith('/zh') || href.startsWith('/en')) return
      item.remove()
    })
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return

    router.onBeforeRouteChange = (href) => {
      const url = new URL(href, window.location.origin)
      const target = redirectPath(url.pathname)
      if (!target) return
      const next = target + url.search + url.hash
      if (next === url.pathname + url.search + url.hash) return
      router.go(next)
      return false
    }

    window.addEventListener(
      'click',
      (event) => {
        const anchor = event.target.closest?.('a')
        if (!anchor?.closest('.VPNavBarTranslations, .VPNavScreenTranslations')) return
        rememberChoice(anchor.getAttribute('href') || '')
      },
      true
    )

    const observer = new MutationObserver(hideRootLocaleLinks)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    router.onAfterRouteChange = () => hideRootLocaleLinks()
  }
}
