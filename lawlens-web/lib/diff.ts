import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch'

export function generateDiffHtml(oldText: string, newText: string): string {
  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  let html = ''
  diffs.forEach(([type, text]) => {
    // 转义 HTML 标签防止注入，保留换行
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
    
    if (type === DIFF_DELETE) {
      // 红色删除线
      html += `<span class="bg-red-100 text-red-600 line-through decoration-red-500 mx-0.5 px-0.5 rounded-sm">${safeText}</span>`
    } else if (type === DIFF_INSERT) {
      // 绿色新增
      html += `<span class="bg-green-100 text-green-700 font-bold mx-0.5 px-0.5 rounded-sm">${safeText}</span>`
    } else {
      // 原文保持
      html += `<span class="text-slate-500">${safeText}</span>`
    }
  })
  
  return html
}