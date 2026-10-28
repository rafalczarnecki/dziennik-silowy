# Dziennik siłowy

Aplikacja na telefon do prowadzenia treningu siłowego: serie i ciężary, przerwy, rozgrzewka i rozciąganie z odliczaniem, kardio, historia, analiza objętości tygodnia i eksport do analizy.

- Działa offline po pierwszym otwarciu (PWA). Instalacja: otwórz stronę w Chrome → menu ⋮ → „Zainstaluj aplikację”.
- Wszystkie dane treningowe zapisują się wyłącznie w pamięci telefonu. Repozytorium zawiera tylko kod.
- Plany treningowe wczytuje się z plików JSON (Ustawienia → Plany treningowe). W kodzie jest tylko ogólny plan startowy.

## Format pliku planu

```json
{"type":"dziennik-plan","v":1,"id":"b21","name":"Blok 2.1","sub":"Opis","dayPrefix":"Trening ","weeks":4,
 "days":[{"name":"1","ex":[["Przysiad",4,6,"rampa",[3,3,2,2]],["Ab wheel",3,"max","",1]],
          "add":[["Rumuński martwy ciąg",3,10,8]],"warmup":[["krazenia",45]],"stretch":[["oddech",60]]}],
 "extra":{"sport":[[["Wznosy bokiem",3,12,10]]],"wolverine":[[]],"sila":[[]]},
 "alt":{},"guide":{},"moves":{},"patterns":{}}
```

Ćwiczenie: `[nazwa, serie, powtórzenia lub "max", uwaga, RIR (liczba lub lista na tygodnie), top set]`.
Ćwiczenie dodatkowe celu (`extra`): `[nazwa, serie, górna granica, dolna granica, superseria, przerwa w s, opis celu]`.
Kilka planów naraz: `{"type":"dziennik-pakiet","plans":[...],"profile":"..."}`.
