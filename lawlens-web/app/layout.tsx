import type { Metadata } from "next";
// 引入两种字体：Inter (正文) 和 Playfair Display (标题-律政感)
import { Inter, Playfair_Display } from "next/font/google"; 
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "LawLens - AI 法律助手",
  description: "基于 RAG 技术的智能法律文书分析系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}