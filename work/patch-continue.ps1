$p = 'Arena de Serpientes.html'
$s = [IO.File]::ReadAllText($p)
$old = 'function continueSavedGame(id){const session=sessions.find(x=>x.id===id&&x.checkpoint);if(!session)return;activeSessionId=session.id;saveData.checkpoint=session.checkpoint;$( ''title'' ).style.display=''none'';initAudio();newGame(true);tryFullscreen()}'
$new = 'function continueSavedGame(id){const session=sessions.find(x=>x.id===id);if(!session)return;activeSessionId=session.id;saveData.checkpoint=session.checkpoint||null;$( ''title'' ).style.display=''none'';initAudio();if(session.checkpoint)newGame(true);else newGame(false,session.id);tryFullscreen()}'
if (-not $s.Contains($old)) { $old = $old.Replace('$( ''title'' )','$(''title'')'); $new = $new.Replace('$( ''title'' )','$(''title'')') }
if (-not $s.Contains($old)) { throw 'Could not find continue function' }
$s = $s.Replace($old,$new)
[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))
