// pre-push 校验：推送前运行测试与构建，失败则阻止推送。
// 由 Git hook（scripts/hooks/pre-push）调用，也可手动运行：node scripts/pre-push-check.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'

function run(label, args) {
  // Windows 上 npm 是 .cmd，需要通过 cmd /c 启动
  const cmd = isWin ? 'cmd.exe' : 'npm'
  const cmdArgs = isWin ? ['/c', 'npm', ...args] : args
  process.stdout.write(`\n▶ ${label} (npm ${args.join(' ')})\n`)
  const res = spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: 'inherit',
  })
  if (res.status !== 0) {
    process.stdout.write(`\n✗ ${label} 失败，中止推送。\n`)
    process.exit(res.status ?? 1)
  }
  process.stdout.write(`✓ ${label} 通过\n`)
}

run('单元测试', ['test'])
run('生产构建', ['run', 'build'])
process.stdout.write('\n✓ pre-push 校验全部通过，可以推送。\n')
