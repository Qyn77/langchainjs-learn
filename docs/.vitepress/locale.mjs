/** 浏览器语言与上次手动选择。手动选择存在 localStorage，优先于浏览器。 */

export function preferredLang() {
  try {
    var saved = localStorage.getItem('docs-lang')
    if (saved === 'zh' || saved === 'en') return saved
  } catch (e) {}

  var list = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || 'zh']

  for (var i = 0; i < list.length; i++) {
    var tag = String(list[i] || '').toLowerCase()
    if (tag === 'zh' || tag.indexOf('zh-') === 0) return 'zh'
    if (tag === 'en' || tag.indexOf('en-') === 0) return 'en'
  }
  return 'zh'
}

/** 已经在 /zh 或 /en 下则不跳转。其余路径（含 /）补上语言前缀，并去掉 .html。 */
export function redirectPath(pathname) {
  if (/\.(css|js|mjs|map|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|txt|xml)$/i.test(pathname)) {
    return null
  }

  var path = pathname
  if (path.slice(-5) === '.html') path = path.slice(0, -5)
  if (path.slice(-6) === '/index') path = path.slice(0, -6) || '/'
  if (path === '/index') path = '/'
  if (path === '/zh' || path === '/en') path = path + '/'

  var localized =
    path === '/zh/' ||
    path.indexOf('/zh/') === 0 ||
    path === '/en/' ||
    path.indexOf('/en/') === 0
  if (localized) return path === pathname ? null : path

  var lang = preferredLang()
  if (path === '/') return '/' + lang + '/'
  return '/' + lang + (path.charAt(0) === '/' ? path : '/' + path)
}

export function redirectBootScript() {
  return `(function () {
    ${preferredLang.toString()}
    ${redirectPath.toString()}
    var target = redirectPath(location.pathname)
    if (!target || target === location.pathname) return
    location.replace(target + location.search + location.hash)
  })()`
}
