import { asBlob } from 'html-docx-js-typescript'
import { saveAs } from 'file-saver'

export const exportToWord = async (htmlContent: string, filename: string = '法律文书.docx') => {
  // 1. 构建一个完整的 HTML 结构
  // 我们增加了专门针对 Word 解析的 CSS，比如 table 的边框处理
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        @page {
          size: A4;
          margin: 1in; /* 标准 A4 页边距 */
        }
        body {
          font-family: "SimSun", "Songti SC", serif; /* 核心：宋体 */
          font-size: 12pt; /* 正文小四 */
          line-height: 1.5;
          color: #000;
        }
        h1 {
          font-size: 22pt; /* 二号 */
          font-weight: bold;
          text-align: center;
          margin: 24pt 0;
        }
        h2 {
          font-size: 16pt; /* 三号 */
          font-weight: bold;
          margin: 18pt 0 12pt 0;
        }
        h3 {
          font-size: 14pt; /* 四号 */
          font-weight: bold;
          margin: 14pt 0 12pt 0;
        }
        p {
          margin-bottom: 10pt;
          text-align: justify;
          text-justify: inter-ideograph;
        }
        /* 表格样式优化，确保 Word 能显示边框 */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
        }
        td, th {
          border: 1px solid #000; /* 纯黑边框 */
          padding: 8px 12px;
          vertical-align: top;
        }
        blockquote {
          border-left: 3px solid #666;
          padding-left: 10px;
          margin-left: 0;
          color: #666;
          background-color: #f5f5f5;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `

  try {
    // 2. 转换为 Word Blob
    // margins: 1440 twips = 1 inch (Word 标准)
    const blob = await asBlob(fullHtml, {
      orientation: 'portrait',
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } 
    })
    
    // 3. 触发下载
    saveAs(blob as Blob, filename)
    return true // 返回成功状态
    
  } catch (error) {
    console.error("导出 Word 失败:", error)
    alert("导出失败，请重试或检查浏览器兼容性")
    return false
  }
}