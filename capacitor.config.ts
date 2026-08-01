import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tiku.app',
  appName: '智能题库',
  webDir: 'dist',
  backgroundColor: '#F8FAFC',
  android: {
    // 默认允许 http 明文（部分本地大模型代理用 http）；
    // 发布构建时设置 TIKU_DISABLE_MIXED_CONTENT=1 即可关闭。
    allowMixedContent: process.env.TIKU_DISABLE_MIXED_CONTENT !== '1',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      // 不强制要求权限弹窗，按需请求
    },
  },
}

export default config
