# Diagnostique s02-today-refonte — Tableau Actions/Fonctions/Outils

```
┌─────────────────┬────────────────┬──────────────────────────────────────┬──────────────────────────────────┬───────────────┐
│        #        │     Action     │        Fonctions Principales         │              Outils              │    Statut     │
│                 │                │                                      │                                  │  Fonctionnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1. Weekly       │                │                                      │                                  │               │
│ Signal (9       │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 1               │ Voir Weekly    │ GET /api/today/signal → fetch        │ fetch API, React useState        │ ✅            │
│                 │ Signal         │ relances + RDV semaine               │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2               │ Voir nombre    │ signal.todayCount badge affiché      │ React state, badge composant     │ ✅            │
│                 │ relances       │                                      │                                  │ Opérationnel  │
│                 │ aujourd'hui    │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3               │ Voir nombre    │ signal.weekRdvCount badge affiché    │ React state, badge composant     │ ✅            │
│                 │ RDV cette      │                                      │                                  │ Opérationnel  │
│                 │ semaine        │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4               │ Voir liste     │ signal.relances.map() → affichage    │ React .map(), LinkInline(),      │ ✅            │
│                 │ relances 7j    │ fiches contacts avec days_until      │ cross-links                      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5               │ Voir score     │ lead_score badge dynamique par       │ React inline conditional, CSS    │ ✅            │
│                 │ contact        │ contact                              │ theme.ts                         │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6               │ Voir           │ pipeline_stage badge (a_contacter,   │ React state, CSS theme           │ ✅            │
│                 │ pipeline       │ premier_contact, etc.)               │                                  │ Opérationnel  │
│                 │ stage          │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7               │ Voir RDV       │ signal.rdvSemaine.map() → timeline   │ React .map(), day_label grouping │ ✅            │
│                 │ semaine        │ groupée par jour (Lundi, Mardi…)     │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 8               │ Cliquer        │ LinkInline() → navigation vers CRM   │ Next.js router, buildHref(),     │ ✅            │
│                 │ contact        │ avec query param                     │ useRouter                        │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 9               │ Voir erreur    │ if (signalError) → affiche message   │ React conditional rendering      │ ✅            │
│                 │ signal         │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 2. Timer        │                │                                      │                                  │               │
│ Centisecondes   │                │                                      │                                  │               │
│ (9 actions)     │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 10              │ Démarrer       │ setTimerRunning(true) +              │ setInterval 10ms, React          │ ✅            │
│                 │ timer          │ setInterval(10ms)                    │ useState, useRef                 │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 11              │ Pause timer    │ setTimerRunning(false) +             │ clearInterval(), saveTimer()     │ ✅            │
│                 │                │ saveTimer()                          │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 12              │ Réinitialiser  │ setTimerSec(0) + saveTimer(0)        │ localStorage, saveTimer()        │ ✅            │
│                 │ timer          │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 13              │ Voir timer     │ formatCentis(timerSec) → MM:SS.CC    │ Math.floor(), String.padStart()  │ ✅            │
│                 │ format         │                                      │                                  │ Opérationnel  │
│                 │ MM:SS.CC       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 14              │ Persistance    │ loadTimer() au mount + saveTimer()   │ localStorage TIMER_KEY(),        │ ✅            │
│                 │ timer entre    │ chaque 100 centisecondes             │ JSON.parse/stringify             │ Opérationnel  │
│                 │ sessions       │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 15              │ Reprendre      │ loadTimer() + calcul elapsed depuis  │ Date.now(), elapsed calc         │ ✅            │
│                 │ timer après    │ startedAt                            │                                  │ Opérationnel  │
│                 │ refresh page   │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 16              │ Auto-stop à    │ if (s+1 >= BLOCK_DURATION) →         │ BLOCK_DURATION (52*60*100),      │ ✅            │
│                 │ 52min          │ setTimerRunning(false)               │ conditional logic                │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 17              │ Incrémenter    │ setBlocksCompleted(b => b+1) +       │ localStorage blocks_${date},     │ ✅            │
│                 │ blocs          │ localStorage update                  │ Math.min(b+1, 6)                 │ Opérationnel  │
│                 │ completed      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 18              │ Célébration    │ celebrate('objectif_journee') ou     │ useCelebrations() hook,          │ ✅            │
│                 │ auto bloc      │ celebrate('objectif_blocs')          │ setTimeout(0)                    │ Opérationnel  │
│                 │ terminé        │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 3. Blocs        │                │                                      │                                  │               │
│ Indicateurs (2  │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 19              │ Voir           │ BlockIndicator component →           │ React component, CSS inline,     │ ✅            │
│                 │ indicateurs    │ Array.from({length:6}).map() done    │ conditional background           │ Opérationnel  │
│                 │ blocs 6/6      │ prop                                 │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 20              │ Persistence    │ localStorage.getItem/setItem         │ localStorage                     │ ✅            │
│                 │ blocs par jour │ blocks_${date}                       │ blocks_${new Date().toDateString │ Opérationnel  │
│                 │                │                                      │ ()}                              │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 4. Compteurs    │                │                                      │                                  │               │
│ Jour (9         │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 21              │ Incrémenter    │ setContacts(c => c+1) +              │ useState, saveCounters(),        │ ✅            │
│                 │ contacts       │ saveCounters()                       │ localStorage COUNTERS_KEY        │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 22              │ Incrémenter    │ setCalls(c => c+1) +                 │ useState, saveCounters()         │ ✅            │
│                 │ appels         │ saveCounters()                       │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 23              │ Incrémenter    │ setRdv1(c => c+1) +                  │ useState, saveCounters()         │ ✅            │
│                 │ RDV 1er RDV    │ saveCounters()                       │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 24              │ Incrémenter    │ setRdv2(c => c+1) +                  │ useState, saveCounters()         │ ✅            │
│                 │ RDV 2e RDV     │ saveCounters()                       │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 25              │ Charger        │ loadCounters() → JSON.parse          │ localStorage, useEffect mount    │ ✅            │
│                 │ compteurs au   │ localStorage COUNTERS_KEY            │                                  │ Opérationnel  │
│                 │ démarrage      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 26              │ Reset          │ new Date().toDateString() key →      │ Date natif, conditional load     │ ✅            │
│                 │ automatique    │ nouveau jour = nouveau compteur      │                                  │ Opérationnel  │
│                 │ minuit         │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 27              │ Célébration    │ celebrate('contact_50') si           │ useCelebrations(), conditional   │ ✅            │
│                 │ seuils         │ contacts>=50 || calls>=30 ||         │ logic                            │ Opérationnel  │
│                 │ contacts/calls │ rdv1>=10 || rdv2>=5                  │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 28              │ Voir progrès   │ (contacts/targets.contacts)*100 →    │ React inline calc, CSS width %   │ ✅            │
│                 │ barre          │ barre progression                    │                                  │ Opérationnel  │
│                 │ dynamique      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 29              │ Configurer     │ Modal targetForm + setTargets() +    │ @radix-ui/react-dialog,          │ ✅            │
│                 │ objectifs      │ localStorage TARGETS_DEF_KEY         │ useState, localStorage           │ Opérationnel  │
│                 │ quotidiens     │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 5. Agenda       │                │                                      │                                  │               │
│ Éditable (7     │                │                                      │                                  │               │
│ actions)        │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 30              │ Voir agenda    │ fetch GET /api/today/agenda?date= →  │ fetch API, React useState,       │ ✅            │
│                 │ du jour        │ agendaEvents state                   │ todayDateKey()                   │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 31              │ Ajouter        │ Modal + POST /api/today/agenda       │ @radix-ui/react-dialog,          │ ✅            │
│                 │ événement      │ {time, title, type}                  │ AgendaEventType                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 32              │ Choisir type   │ <select> type (rdv/appel/admin/      │ HTML select, AGENDA_COLORS       │ ✅            │
│                 │ événement      │ prospection/perso)                   │ mapping                          │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 33              │ Voir couleur   │ AGENDA_COLORS[type] → badge coloré   │ lib/agenda.ts mapping, CSS       │ ✅            │
│                 │ événement par  │                                      │ inline                           │ Opérationnel  │
│                 │ type           │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 34              │ Supprimer      │ DELETE /api/today/agenda/:id         │ fetch DELETE, filter state       │ ✅            │
│                 │ événement      │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 35              │ Fallback       │ loadDayAgenda(dk) si API fail        │ lib/agenda.ts localStorage       │ ✅            │
│                 │ localStorage   │                                      │ fallback                         │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 36              │ Export         │ fantasticalUrl() génère lien         │ lib/agenda.ts, x-callback-url    │ ⚠️            │
│                 │ Fantastical    │ x-callback-url avec tous les événts  │ scheme                           │ Dépend app    │
│                 │                │                                      │                                  │ externe       │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 6. Audio Player │                │                                      │                                  │               │
│ (11 actions)    │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 37              │ Ajouter        │ <input type="file" accept="audio/*"  │ HTML5 File API,                  │ ✅            │
│                 │ fichiers audio │ multiple> + URL.createObjectURL()    │ URL.createObjectURL()            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 38              │ Voir playlist  │ playlist.map() → liste scrollable    │ React .map(), useState           │ ✅            │
│                 │ audio          │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 39              │ Play/Pause     │ audio.play() / audio.pause()         │ HTMLAudioElement API, useRef     │ ✅            │
│                 │ audio          │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 40              │ Piste          │ setCurrentIdx(i-1) / setCurrentIdx   │ useState currentIdx              │ ✅            │
│                 │ suivante/      │ (i+1)                                │                                  │ Opérationnel  │
│                 │ précédente     │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 41              │ Seek barre     │ audio.currentTime = pct*duration     │ MouseEvent, getBoundingClientRect│ ✅            │
│                 │ progression    │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 42              │ Voir temps     │ audio.addEventListener('timeupdate') │ HTMLAudioElement events,         │ ✅            │
│                 │ écoulé         │ → fmt(currentTime) / fmt(duration)   │ Math.floor()                     │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 43              │ Mode repeat    │ setRepeat(true) + audio.addEventListener│ HTMLAudioElement 'ended' event   │ ✅            │
│                 │                │ ('ended') → replay si repeat         │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 44              │ Stop audio     │ audio.pause() + audio.currentTime=0  │ HTMLAudioElement API             │ ✅            │
│                 │                │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 45              │ Vider playlist │ URL.revokeObjectURL() + setPlaylist  │ URL.revokeObjectURL(), setState  │ ✅            │
│                 │                │ ([])                                 │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 46              │ Auto next      │ if (currentIdx < playlist.length-1)  │ addEventListener('ended'),       │ ✅            │
│                 │ piste          │ setCurrentIdx(i+1)                   │ conditional                      │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 47              │ Cliquer piste  │ onClick={() => setCurrentIdx(i)}     │ React onClick handler            │ ✅            │
│                 │ playlist       │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 7. Video Player │                │                                      │                                  │               │
│ (14 actions)    │                │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 48              │ Ajouter        │ <input type="file" accept="video/*"  │ HTML5 File API, IndexedDB        │ ✅            │
│                 │ fichiers vidéo │ multiple> + saveVideoFile()          │ saveVideoFile()                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 49              │ Ajouter URL    │ Input URL + addUrlVideo() → playlist │ useState urlInput, getYouTubeEmbed│ ✅            │
│                 │ YouTube        │                                      │ Url()                            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 50              │ Détection      │ getYouTubeEmbedUrl() regex patterns  │ Regex match youtube.com/watch,   │ ✅            │
│                 │ YouTube embed  │ → extract video ID                   │ youtu.be, shorts                 │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 51              │ Persist vidéo  │ saveVideoFile(id, name, blob) →      │ IndexedDB openVideoDB(),         │ ✅            │
│                 │ locale         │ IndexedDB put                        │ createObjectStore                │ Opérationnel  │
│                 │ IndexedDB      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 52              │ Charger vidéos │ loadVideoFiles() → getAll() →        │ IndexedDB transaction readonly   │ ✅            │
│                 │ depuis         │ playlist au mount                    │                                  │ Opérationnel  │
│                 │ IndexedDB      │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 53              │ Voir iframe    │ if (getYouTubeEmbedUrl()) → <iframe> │ React conditional rendering,     │ ✅            │
│                 │ YouTube        │ else <video>                         │ iframe embed                     │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 54              │ Play/Pause     │ video.play() / video.pause()         │ HTMLVideoElement API             │ ✅            │
│                 │ vidéo          │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 55              │ Vidéo          │ setCurrentIdx(i-1) / setCurrentIdx   │ useState currentIdx              │ ✅            │
│                 │ suivante/      │ (i+1)                                │                                  │ Opérationnel  │
│                 │ précédente     │                                      │                                  │               │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 56              │ Seek barre     │ video.currentTime = pct*duration     │ MouseEvent, getBoundingClientRect│ ✅            │
│                 │ progression    │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 57              │ Voir temps     │ video.addEventListener('timeupdate') │ HTMLVideoElement events          │ ✅            │
│                 │ écoulé         │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 58              │ Mode repeat    │ setRepeat(true) + 'ended' → replay   │ HTMLVideoElement 'ended' event   │ ✅            │
│                 │ vidéo          │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 59              │ Stop vidéo     │ video.pause() + video.currentTime=0  │ HTMLVideoElement API             │ ✅            │
│                 │                │                                      │                                  │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 60              │ Supprimer      │ deleteVideoFile(fileId) + filter     │ IndexedDB delete transaction,    │ ✅            │
│                 │ vidéo          │ playlist                             │ URL.revokeObjectURL()            │ Opérationnel  │
├─────────────────┼────────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────┤
│ 61              │ Vider playlist │ URL.revokeObjectURL() loop +         │ Promise.all, deleteVideoFile()   │ ✅            │
│                 │ vidéo          │ deleteVideoFile() pour chaque        │                                  │ Opérationnel  │
└─────────────────┴────────────────┴──────────────────────────────────────┴──────────────────────────────────┴───────────────┘
```

---

## Résumé Exécutif

**Total : 61 actions** — **60 ✅ Opérationnel** / **1 ⚠️ Partiel** / **0 ❌ À faire**

**Taux de fonctionnalité : 98.4%**

### Par Catégorie

| Catégorie | Total | ✅ | ⚠️ | ❌ | Taux |
|-----------|-------|----|----|----|----|
| Weekly Signal | 9 | 9 | 0 | 0 | 100% |
| Timer Centisecondes | 9 | 9 | 0 | 0 | 100% |
| Blocs Indicateurs | 2 | 2 | 0 | 0 | 100% |
| Compteurs Jour | 9 | 9 | 0 | 0 | 100% |
| Agenda Éditable | 7 | 6 | 1 | 0 | 86% |
| Audio Player | 11 | 11 | 0 | 0 | 100% |
| Video Player | 14 | 14 | 0 | 0 | 100% |

### Action Partielle

1. **#36 (⚠️)** : Export Fantastical — Génère lien x-callback-url correct mais dépend app Fantastical installée sur l'appareil

---

## 📊 Détails des Composants Techniques

### Weekly Signal
- **API** : `/api/today/signal` → retourne `{ relances[], rdvSemaine[], todayCount, weekRdvCount }`
- **Cross-links** : Navigation CRM via `LinkInline()` avec query params
- **Filtrage** : Relances à 7 jours (`days_until <= 7`)
- **Grouping** : RDV groupés par `day_label` (Lundi, Mardi, etc.)

### Timer Centisecondes
- **Précision** : `setInterval(10ms)` — tick toutes les 10ms (1 centiseconde)
- **Format** : `MM:SS.CC` via `formatCentis()`
- **Persistence** : `localStorage` avec clé `today_timer_${date}` — reset automatique nouveau jour
- **Reprise** : Calcul `elapsed = (Date.now() - startedAt) / 10` pour reprendre après refresh
- **Durée bloc** : `BLOCK_DURATION = 52 * 60 * 100` centisecondes (52 minutes)

### Blocs Indicateurs
- **Composant** : `BlockIndicator({ done })` — 6 indicateurs visuels
- **État** : `blocksCompleted` persisted dans `localStorage blocks_${date}`
- **Célébrations** : `celebrate('objectif_journee')` si 6/6, `celebrate('objectif_blocs')` si 5/6

### Compteurs Jour
- **Types** : `contacts`, `calls`, `rdv1`, `rdv2`
- **Persistence** : `localStorage COUNTERS_KEY()` — reset automatique minuit
- **Objectifs** : Configurables via modal, persisted `TARGETS_DEF_KEY`
- **Barres progrès** : `(current/target)*100` → CSS width dynamique
- **Célébrations** : Seuils auto (contacts≥50, calls≥30, rdv1≥10, rdv2≥5)

### Agenda Éditable
- **Backend** : `/api/today/agenda` (GET/POST/DELETE)
- **Fallback** : `lib/agenda.ts` localStorage si API fail
- **Types** : `rdv`, `appel`, `admin`, `prospection`, `perso`
- **Couleurs** : `AGENDA_COLORS` mapping par type
- **Export** : `fantasticalUrl()` génère `x-callback-url` avec tous événements

### Audio Player
- **API** : HTMLAudioElement natif
- **Formats** : mp3, mp4, mpeg, wav
- **Multi-fichiers** : `<input multiple>`
- **Features** : Play/Pause, Next/Prev, Seek, Repeat, Stop, Clear playlist
- **État** : `playlist`, `currentIdx`, `playing`, `progress`, `timeDisplay`, `repeat`

### Video Player
- **Dual mode** : `<iframe>` pour YouTube, `<video>` pour fichiers locaux
- **Persistence** : IndexedDB (`ted_videos` database, `files` store)
- **YouTube** : Regex extraction video ID → `https://youtube.com/embed/{id}`
- **Formats** : mp4, webm, ogg, quicktime, 3gpp, 3gpp2
- **Features** : Play/Pause, Next/Prev, Seek, Repeat, Stop, Clear, Delete individual
- **Storage** : Blobs persistés dans IndexedDB avec `{ id, name, blob }`

---

## 🔧 Outils Utilisés

### Frontend
- React hooks : `useState`, `useEffect`, `useRef`, `useCallback`
- Next.js : `useSearchParams`, `useRouter`, `Suspense`
- HTML5 APIs : File API, Audio/Video API, IndexedDB
- Custom hooks : `useCelebrations`
- Cross-links : `LinkButton`, `LinkBadge`, `LinkChip`, `LinkInline`, `buildHref()`

### Backend
- API routes : `/api/today/signal`, `/api/today/agenda`
- Supabase tables : `prospects`, `interactions`, `user_agenda`, `daily_kpis`, `user_relances`

### Persistence
- **localStorage** : Timer, compteurs, blocs, objectifs (clés par date)
- **IndexedDB** : Vidéos locales persistées (DB `ted_videos`, store `files`)
- **Supabase** : Agenda du jour (`user_agenda` table)

### Calculs & Formats
- `Date.now()` — timestamps centisecondes
- `Math.floor()`, `String.padStart()` — formatage timer
- `URL.createObjectURL()` / `URL.revokeObjectURL()` — blobs fichiers
- `getBoundingClientRect()` — calcul seek position

---

## 🎨 Design Intégration

- **Thème PSG Cosmos** : Via `C` importé de `@/lib/theme.ts`
- **Couleurs** : `C.bgDeep`, `C.gold`, `C.green`, `C.indigo`, `C.textHi/Mid/Lo`
- **Inline CSS** : Aucun Tailwind, tout en style inline
- **Animations** : Transitions CSS (progress bars), confetti via `useCelebrations()`

---

## ⚡ Performance

- **Timer** : setInterval 10ms performant (tick précis)
- **IndexedDB** : Async load au mount, pas de blocage UI
- **Fetch** : Appels API parallèles, fallback localStorage si fail
- **Memory** : `URL.revokeObjectURL()` nettoyage blobs
- **Reset automatique** : Clés localStorage par date → pas d'accumulation

---

## 🚀 Prochaines Améliorations Possibles

1. **Synchro Google Calendar** : Import auto RDV dans agenda
2. **Export CSV compteurs** : Historique des compteurs quotidiens
3. **Push notifications** : Rappel bloc 52min via Notification API
4. **Thèmes audio/vidéo** : Playlists pré-configurées (focus, motivation, etc.)
5. **Stats historiques** : Graph evolution compteurs/blocs sur 30j
6. **Drag-drop événements** : Réorganiser agenda directement dans grille
7. **Fantastical fallback** : Si app absent, export .ics universel

---

**Document généré par analyse exhaustive — 61 actions documentées pour s02-today-refonte**
