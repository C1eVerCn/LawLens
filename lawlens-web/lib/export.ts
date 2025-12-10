import { asBlob } from 'html-docx-js-typescript'
import { saveAs } from 'file-saver'

export const exportToWord = async (htmlContent: string, filename: string = '法律文书.docx') => {
  // 1. 构建一个完整的 HTML 结构，包含针对 Word 优化的 CSS
  // Word 对 CSS 的支持有限，但 font-family 和 font-size 是支持的
  const fullHtml = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body {
          font-family: 'SimSun', 'Songti SC', serif; /* 强制宋体 */
          font-size: 16px; /* 对应 Word 小三/四号 */
          line-height: 1.5;
        }
        p {
          margin-bottom: 12pt;
          text-align: justify;
        }
        h1 {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-top: 24pt;
          margin-bottom: 24pt;
        }
        h2 {
          font-size: 18px;
          font-weight: bold;
          margin-top: 18pt;
          margin-bottom: 12pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12pt;
        }
        td, th {
          border: 1px solid #000;
          padding: 8px;
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
    // @ts-ignore (这个库的类型定义有时候会报错，忽略即可)
    const blob = await asBlob(fullHtml, {
      orientation: 'portrait',
      margins: { top: 720, right: 720, bottom: 720, left: 720 } // 模拟页边距
    })
    
    // 3. 触发下载
    saveAs(blob as Blob, filename)
    
  } catch (error) {
    console.error("导出失败:", error)
    alert("导出失败，请检查浏览器兼容性")
  }
}