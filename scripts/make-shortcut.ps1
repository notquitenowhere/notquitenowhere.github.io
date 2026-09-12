$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('D:\Desktop\글쓰기.lnk')
$s.TargetPath = 'powershell.exe'
$s.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Desktop\ahseongchoi\scripts\quick-write.ps1"'
$s.WorkingDirectory = 'D:\Desktop\ahseongchoi'
$s.IconLocation = 'shell32.dll,132'
$s.Description = '에세이 노트/글 편집기 열기'
$s.Save()
Write-Output 'done'
