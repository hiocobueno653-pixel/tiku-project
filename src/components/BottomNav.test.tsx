// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'

function renderNav(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  afterEach(cleanup)

  it('renders all five navigation items', () => {
    renderNav('/')
    for (const label of ['首页', '题库', 'AI问答', '练习', '我的']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(document.querySelectorAll('.bottom-nav-bar a')).toHaveLength(5)
  })

  it('marks the current route item as active', () => {
    renderNav('/statistics')
    const active = document.querySelectorAll('.bottom-nav-bar a.active')
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toContain('我的')
  })

  it('matches nested routes for non-exact items', () => {
    renderNav('/practice-setup')
    const active = document.querySelectorAll('.bottom-nav-bar a.active')
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toContain('练习')
  })

  it('uses exact matching for the home item', () => {
    renderNav('/question-bank')
    const homeLink = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.bottom-nav-bar a'),
    ).find((a) => a.textContent?.includes('首页'))
    expect(homeLink?.classList.contains('active')).toBe(false)
  })
})
