import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

export const exportToWord = async (content: string, filename: string = '法律文书.docx') => {
  if (!content) return

  // 1. 将文本按行分割，简单处理段落
  const lines = content.split('\n')
  
  // 2. 创建文档段落
  const children = lines.map(line => {
    // 简单的逻辑：如果是短标题（比如【律师函】），加粗居中
    const isTitle = line.trim().startsWith('【') && line.trim().endsWith('】')
    
    return new Paragraph({
      text: line,
      heading: isTitle ? HeadingLevel.HEADING_1 : undefined,
      alignment: isTitle ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: {
        after: 200, // 段后间距
        line: 360,  // 行高
      },
      children: [
        new TextRun({
          text: line,
          size: isTitle ? 32 : 24, // 标题 16pt，正文 12pt (docx size 是半点)
          bold: isTitle,
          font: "SimSun", // 宋体，法律文书标准
        }),
      ],
    })
  })

  // 3. 生成文档对象
  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  })

  // 4. 打包并下载
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}