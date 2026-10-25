$p = 'Arena de Serpientes.html'
$s = [IO.File]::ReadAllText($p)
$s = $s.Replace("(c?'<button class=`"session-resume`" data-session-id=`"'+x.id+'`">SEGUIR</button>':'<span class=`"session-done`">FINALIZADA</span>')", "'<button class=`"session-resume`" data-session-id=`"'+x.id+'`">CONTINUAR SESIÓN</button>'")
$s = $s.Replace("function continueSavedGame(id){const session=sessions.find(x=>x.id===id&&x.checkpoint);if(!session)return;activeSessionId=session.id;saveData.checkpoint=session.checkpoint;$('title').style.display='none';initAudio();newGame(true);tryFullscreen()}", "function continueSavedGame(id){const session=sessions.find(x=>x.id===id);if(!session)return;activeSessionId=session.id;saveData.checkpoint=session.checkpoint||null;$('title').style.display='none';initAudio();if(session.checkpoint)newGame(true);else newGame(false,session.id);tryFullscreen()}")
$s = $s.Replace('function newGame(resume=false){', 'function newGame(resume=false,sessionId=null){')
$old = "if(!resume){stats.runs++;saveData.checkpoint=null;activeSessionId='run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);sessions.unshift({id:activeSessionId,name:'Partida '+new Date().toLocaleString(),createdAt:Date.now(),updatedAt:Date.now(),level:1,score:0,checkpoint:null,ended:false})}"
$new = "if(!resume){saveData.checkpoint=null;if(sessionId){activeSessionId=sessionId;const existing=sessions.find(x=>x.id===sessionId);if(existing){existing.checkpoint=null;existing.ended=false;existing.updatedAt=Date.now()}}else{stats.runs++;activeSessionId='run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);sessions.unshift({id:activeSessionId,name:'Partida '+new Date().toLocaleString(),createdAt:Date.now(),updatedAt:Date.now(),level:1,score:0,checkpoint:null,ended:false})}}"
if (!$s.Contains($old)) { throw 'Could not find new session creation block' }
$s = $s.Replace($old,$new)
[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))
