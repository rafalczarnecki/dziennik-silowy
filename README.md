# Dziennik siłowy

Aplikacja na telefon do prowadzenia treningu siłowego: serie i ciężary, przerwy, rozgrzewka i rozciąganie z odliczaniem, kardio, historia, analiza objętości tygodnia i eksport do analizy.

- Działa offline po pierwszym otwarciu (PWA). Instalacja: otwórz stronę w Chrome → menu ⋮ → „Zainstaluj aplikację”.
- Wszystkie dane treningowe zapisują się wyłącznie w pamięci telefonu. Repozytorium zawiera tylko kod.
- Plany treningowe wczytuje się z plików JSON (Ustawienia → Plany treningowe). W kodzie jest tylko ogólny plan startowy.
- Następny blok można ułożyć w telefonie (Ustawienia → Następny blok z historii, albo baner w ostatnim tygodniu bloku). Szczegóły niżej.
- Serie rozgrzewkowe: przy pierwszym boju dnia pełna drabinka (pusty gryf ×10, potem ok. 40/60/75/85% ciężaru 1. serii; martwy ciąg od ok. 60 kg), przy boju na partię, która jeszcze nie pracowała 50/70/85%, na rozgrzaną 50% i 75%; do tego talerze na stronę. Hantle, wyciągi, maszyny i masa ciała: pierwsze ćwiczenie dnia 2 serie, pierwsze złożone na nierozgrzaną partię 1 lekka seria. Izolacja i brzuch bez serii rozgrzewkowych. Gryf i talerze ustawia się w Ustawieniach.
- Po ✓ ostatniej serii ćwiczenia pytanie o zapas (RIR 0, 1, 2, 3+). Zapas o 2 mniejszy niż w planie zatrzymuje dokładanie ciężaru, o 2 większy daje podwójny krok. Zapis w historii i eksporcie.
- Aplikacja sprawdza nową wersję przy każdym powrocie do niej; w trakcie treningu nowa wersja wczytuje się dopiero po zapisaniu treningu.
- Blok wybiera się z listy rozwijanej w Treningu: bieżący, nowe, potem wg ostatniego treningu. Nowy blok zaczyna się od tygodnia 1, do robionego wcześniej wracasz za ostatnim zapisanym treningiem.

## Format pliku planu

```json
{"type":"dziennik-plan","v":1,"id":"b21","name":"Blok 2.1","sub":"Opis","dayPrefix":"Trening ","weeks":4,
 "days":[{"name":"1","ex":[["Przysiad",4,6,"rampa",[3,3,2,2]],["Ab wheel",3,"max","",1]],
          "add":[["Rumuński martwy ciąg",3,10,8]],"warmup":[["krazenia",45]],"stretch":[["oddech",60]]}],
 "extra":{"sport":[[["Wznosy bokiem",3,12,10]]],"wolverine":[[]],"sila":[[]]},
 "alt":{},"guide":{},"moves":{},"patterns":{}}
```

Ćwiczenie: `[nazwa, serie, powtórzenia lub "max", uwaga, RIR (liczba lub lista na tygodnie), top set, superseria]`.
Superseria: dwa ćwiczenia dnia z tą samą literą (7. pole ćwiczenia planu albo 5. pole dodatku celu), także ćwiczenie planu z dodatkiem celu.
Ćwiczenie dodatkowe celu (`extra`): `[nazwa, serie, górna granica, dolna granica, superseria, przerwa w s, opis celu]`.
Kilka planów naraz: `{"type":"dziennik-pakiet","plans":[...],"profile":"..."}`.

## Następny blok z historii

Generator (`genPlan`) bierze bieżący plan, historię treningów, zamienniki, komentarze z bólem, profil i cel, i układa kolejny 4-tygodniowy blok. Ocena (`evalPlan`) sprawdza wynik i wystawia punkty (błąd −15, uwaga −5, informacja −1). Zasady:

- fazy na zmianę: po bloku siłowym (boje po 5–6 powt.) akumulacja (boje po 8, martwy ciąg po 6, pomocnicze 10–15), po akumulacji blok siłowy; 4. tydzień lżejszy;
- boje główne zostają; ćwiczenie pomocnicze bez postępu w 3 treningach o tym samym zakresie zmienia się na inne z tego wzorca (izolacja wg kolejności w bazie, złożone najlepiej z tym samym sprzętem);
- nie wraca nic, co użytkownik zamienił na stałe albo oznaczył bólem (także ból zapisany w profilu); jego zamienniki zostają;
- jedna partia na dzień; tył uda: jeden skłon i jedno uginanie nóg w tygodniu, skłon w dniu najdalej od martwego ciągu wg rzeczywistych dni treningów;
- najwyżej jedno ciężkie wyciskanie na przednie barki dziennie; superserie tylko z izolacji, brzucha i kondycji, bez wspólnej okolicy (np. nie wznosy bokiem z face pull);
- partie priorytetowe celu do ok. 11 serii tygodniowo, pozostałe najwyżej ok. 10, minimum na partię (np. tył uda 6, brzuch 6);
- czas dnia z modelu opartego na zapisach (odstępy między seriami, przejścia, rozgrzewka, rozciąganie, superserie, poprawka o błąd z ostatnich treningów) do ok. 1 h 50 min; najpierw superserie i seria mniej, dopiero potem usunięcie ćwiczenia;
- ćwiczenia z masą ciała: najpierw powtórzenia (cel = ostatni wynik + 2 w akumulacji), potem ciężar;
- powody każdej zmiany, czas dni i wynik oceny zapisują się w planie (`gen`) i trafiają do eksportu dla Claude.

## Cykl kilku bloków

Bloki układają się w cykle po 3 (ok. 12 tygodni, tyle co przegląd z Claude): akumulacja → siła → szczyt z tygodniem testu (`"test":{"weeks":[4]}` w pliku planu).

- Cel cyklu: szacowane 1RM bojów (start z ostatnich 4 tygodni, cel ok. +3%, do zmiany o 2,5 kg w podglądzie pierwszego bloku).
- Serie na partie priorytetowe rosną o 1 w każdym bloku (11, 12, 13 dla celu sportowego), jeśli zmieszczą się w czasie; w blokach 2–3 dzień może mieć do ok. 1 h 55 min.
- Cel osiągnięty przed testem (2 treningi na poziomie celu albo 1 wyraźnie, o 2%, powyżej): cel rośnie do najlepszego wyniku + ok. 3% w proporcji do tygodni, które zostały; poprzedni cel zostaje w historii. Ciężary na treningu dalej prowadzą podpowiedzi, niezależnie od celu.
- Cel nowego cyklu bierze tempo z poprzedniego: 80% osiągniętego przyrostu, od 2 do 6%.
- Tydzień testu: w bojach jedna ciężka trójka z 1–2 powtórzeniami w zapasie (ciężar z szacowanego 1RM) i 2 serie po 5 ok. 10% lżej, reszta jak w lżejszym tygodniu. Wyniki testu nie zmieniają podpowiedzi ani zastoju; trafiają do podsumowania cyklu.
- Cykle (`macros` w kopii) widać w Analizie i w eksporcie dla Claude: start, cel, najlepszy wynik w cyklu, test, serie na priorytety i średni czas treningu w każdym bloku.

## Budowa i testy

- `src/dziennik-silowy.html`: źródło aplikacji (jeden plik). `index.html` i `sw.js` powstają z niego przez `npm run build`.
- `tests/app.test.js`: testy aplikacji w jsdom na sztucznych danych (trening, podpowiedzi, zastój, lżejszy tydzień, plany, kopia na GitHubie, import, migracja, budowanie wszystkich animacji, generator bloku i ocena planu, model czasu, ekran podglądu bloku, cykl z tygodniem testu, lista bloków, zapas w ostatniej serii, serie rozgrzewkowe i talerze).
- `tests/collide.js`: test kolizji animacji (ciało ze sprzętem i części ciała ze sobą) względem wzorca `tests/collide-baseline.json`.
- `npm test` uruchamia oba. Zmiany trafiają na gałąź `dev`; GitHub Actions uruchamia testy i dopiero po ich zaliczeniu przenosi zmianę na `main`, skąd publikuje się strona.
- W repozytorium nie ma danych treningowych ani prywatnych planów: testy używają sztucznego planu.
