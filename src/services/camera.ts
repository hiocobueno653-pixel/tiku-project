import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * 检测当前是否运行在 Capacitor 原生环境（Android/iOS）
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * 调用原生相机拍照，返回 base64 dataURL
 * - 在原生平台：调用 @capacitor/camera，体验最佳
 * - 在 Web 平台：fallback 到 <input type="file" capture="environment">
 *
 * @returns dataURL 字符串（如 "data:image/jpeg;base64,..."），或 null 表示用户取消
 */
export async function takePhoto(): Promise<string | null> {
  if (!isNativePlatform()) {
    // Web 端 fallback：触发带相机的 file input
    return await takePhotoViaInput()
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
    })
    if (!photo.base64String) return null
    const format = photo.format || 'jpeg'
    return `data:image/${format};base64,${photo.base64String}`
  } catch (err) {
    // 用户取消或权限被拒
    if (err instanceof Error && /cancel|denied/i.test(err.message)) {
      return null
    }
    throw err
  }
}

/**
 * 从相册选择图片（可多选），返回 dataURL 数组
 */
export async function pickPhotos(maxImages = 9): Promise<string[]> {
  if (!isNativePlatform()) {
    // Web 端 fallback：用 input multiple
    return await pickPhotosViaInput(maxImages)
  }

  try {
    // 单选用 getPhoto，多选用 pickImages
    if (maxImages <= 1) {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
      })
      if (!photo.base64String) return []
      const format = photo.format || 'jpeg'
      return [`data:image/${format};base64,${photo.base64String}`]
    }

    const result = await Camera.pickImages({
      quality: 85,
      limit: maxImages,
    })
    if (!result.photos || result.photos.length === 0) return []
    // pickImages 返回的 GalleryPhoto 默认只有 webPath（无 base64String）
    // 需要 fetch 一下转成 dataURL
    const dataUrls = await Promise.all(
      result.photos.map(async (p) => {
        if (!p.webPath) return ''
        try {
          const res = await fetch(p.webPath)
          const blob = await res.blob()
          return await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => resolve('')
            reader.readAsDataURL(blob)
          })
        } catch {
          return ''
        }
      }),
    )
    return dataUrls.filter((s) => s.length > 0)
  } catch (err) {
    if (err instanceof Error && /cancel|denied/i.test(err.message)) {
      return []
    }
    throw err
  }
}

/* ── Web fallback 实现 ── */

function takePhotoViaInput(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

function pickPhotosViaInput(maxImages: number): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = maxImages > 1
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, maxImages)
      if (files.length === 0) {
        resolve([])
        return
      }
      const results = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolveFile) => {
              const reader = new FileReader()
              reader.onload = () => resolveFile(reader.result as string)
              reader.onerror = () => resolveFile('')
              reader.readAsDataURL(file)
            }),
        ),
      )
      resolve(results.filter((s) => s.length > 0))
    }
    input.click()
  })
}
