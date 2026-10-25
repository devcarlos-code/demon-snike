$p='Arena de Serpientes.html'
$s=[IO.File]::ReadAllText($p)
$s=$s.Replace('const base=Math.min(60,12+Math.floor(n*3));','const base=Math.min(100,18+Math.floor(n*4));')
$s=$s.Replace('t:.65+i*.2','t:.45+i*.14')
$s=$s.Replace('c.hp * (1 + .12 * (Math.max(1, lvl) - 1))','c.hp * (1 + .16 * (Math.max(1, lvl) - 1))')
$s=$s.Replace('hp=Math.min(maxHp,hp+30);fury=Math.min(100,fury+25)','hp=Math.min(maxHp,hp+18);fury=Math.min(100,fury+18)')
[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))
$out=Join-Path (Get-Location) 'outputs'
Copy-Item -LiteralPath $p -Destination (Join-Path $out 'Arena de Serpientes.html') -Force
Copy-Item -LiteralPath $p -Destination (Join-Path $out 'index.html') -Force
$js=[regex]::Match($s,'(?s)<script[^>]*>(.*?)</script>').Groups[1].Value
[IO.File]::WriteAllText((Join-Path (Get-Location) 'work\game-script-check.js'),$js,[Text.UTF8Encoding]::new($false))
node --check 'work\game-script-check.js'
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
'JavaScript syntax OK'
