$url = 'https://mirror.tuna.tsinghua.edu.cn/Adoptium/21/jdk/x64/windows/OpenJDK21U-jdk_x64_windows_hotspot_21.0.5_11.zip'
$out = 'D:\jdk21.zip'
Write-Host "Downloading from $url ..."
$ProgressPreference = 'SilentlyContinue'
# 清理之前失败的下载
if (Test-Path $out) { Remove-Item $out -Force }
try {
  Invoke-WebRequest -Uri $url -OutFile $out -TimeoutSec 600
  Write-Host 'Download done.'
} catch {
  Write-Host "Download error: $_"
  # 尝试备用镜像
  $url2 = 'https://mirrors.huaweicloud.com/openjdk/21.0.5/openjdk-21.0.5_windows-x64_bin.zip'
  Write-Host "Trying fallback: $url2"
  try {
    Invoke-WebRequest -Uri $url2 -OutFile $out -TimeoutSec 600
    Write-Host 'Fallback download done.'
  } catch {
    Write-Host "Fallback also failed: $_"
    exit 1
  }
}
if (Test-Path $out) {
  $size = (Get-Item $out).Length
  Write-Host "File size: $size bytes"
  if ($size -gt 100000000) {
    Write-Host 'Extracting...'
    Expand-Archive -Path $out -DestinationPath 'D:\' -Force
    Write-Host 'Extract done.'
    Get-ChildItem 'D:\' -Directory -Filter 'jdk-21*' | Select-Object FullName
  } else {
    Write-Host 'File too small, download may have failed.'
  }
} else {
  Write-Host 'Download failed: file not found.'
}

