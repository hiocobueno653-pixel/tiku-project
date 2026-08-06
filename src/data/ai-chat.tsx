// 本地示例 AI 回复 — 未配置 API 时的 keyword-based 兜底回复（含 JSX，故为 .tsx）

import type { ReactNode } from 'react'

// Simulated AI replies for keyword-based demo responses
export function generateAiReply(question: string): { content: ReactNode } {
  const q = question.trim()
  if (/牛顿|第二定律|第三定律|力学/.test(q)) {
    return {
      content: (
        <>
          <p className="mb-2"><strong>牛顿第二定律（F = ma）</strong>描述的是力、质量和加速度之间的定量关系：物体受到的合力等于质量乘以加速度。它告诉我们力是如何改变物体运动状态的。</p>
          <p className="mb-2"><strong>牛顿第三定律（作用力与反作用力）</strong>指出，两个物体之间的作用力和反作用力总是大小相等、方向相反、作用在同一条直线上。</p>
          <p>简单来说，第二定律研究的是一个物体受力后如何运动，而第三定律描述的是两个物体之间力的相互关系。两者适用于不同的分析场景。</p>
        </>
      ),
    }
  }
  if (/导数|极值|函数/.test(q)) {
    return {
      content: (
        <>
          <p className="mb-2"><strong>求函数极值的步骤：</strong></p>
          <p className="mb-1">1. 求导数 f'(x)；</p>
          <p className="mb-1">2. 令 f'(x) = 0，解出驻点；</p>
          <p className="mb-1">3. 用 f''(x) 或列表法判断驻点是极大值还是极小值；</p>
          <p>4. 比较驻点和端点的函数值，确定最值。</p>
        </>
      ),
    }
  }
  if (/定语从句|关系代词|that|which/.test(q)) {
    return {
      content: (
        <>
          <p className="mb-2"><strong>定语从句关系代词选择要点：</strong></p>
          <p className="mb-1">• 先行词是<strong>人</strong>：用 who / whom / that</p>
          <p className="mb-1">• 先行词是<strong>物</strong>：用 which / that</p>
          <p className="mb-1">• <strong>what</strong> 不能引导定语从句，它本身包含先行词</p>
          <p>• 介词后只能用 whom / which，不能用 that</p>
        </>
      ),
    }
  }
  return {
    content: (
      <>
        <p className="mb-2">这是一个很好的问题。让我从基础概念入手帮你理解：</p>
        <p className="mb-2">学习这类知识点时，建议先掌握核心定义，再通过具体例题巩固理解，最后归纳解题套路。</p>
        <p>如果你能告诉我具体是哪道题或者哪个概念不清楚，我可以给出更针对性的解释。</p>
      </>
    ),
  }
}
