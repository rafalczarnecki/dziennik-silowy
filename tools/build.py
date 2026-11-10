# Buduje index.html i sw.js w repozytorium z pliku źródłowego aplikacji
import re,sys
src,repo=sys.argv[1],sys.argv[2]
s=open(src).read()
ver=re.search(r"const VER='([^']+)'",s).group(1)
s=s.replace('<title>Dziennik siłowy</title>','<title>Dziennik siłowy</title>\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">',1)
tail='\ninstallAll();\nmigrate();\nrender();\n</script>'
assert s.count(tail)==1
s=s.replace(tail,"\ninstallAll();\nmigrate();\nrender();\nif('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(r=>{window.__swr=r;r.update().catch(()=>{})}).catch(()=>{});\n  let hadCtl=!!navigator.serviceWorker.controller,rl=false;\n  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadCtl||rl)return;rl=true;save();if(typeof rt!=='undefined'&&rt&&!rt.done)return toast('Pobrano nową wersję. Zamknij i otwórz aplikację po rozgrzewce.');location.reload()})}\ntry{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}\n</script>")
open(repo+'/index.html','w').write(s)
w=open(repo+'/sw.js').read()
w=re.sub(r"const C='dziennik-[^']+';",f"const C='dziennik-{ver}';",w)
open(repo+'/sw.js','w').write(w)
print('built',ver)
