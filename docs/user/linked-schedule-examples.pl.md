<a id="practical-examples-presets-and-linked-templates"></a>
# Praktyczne przykłady: presety i powiązane szablony
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.1 |
| Ostatnia synchronizacja | 2026-10-11 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Poradnik przedstawia konfiguracje z **Domyślny**, **Profilami**, szablonami dziennymi i presetami Velair. Nazwy, encje i temperatury są przykładowe: wybierz cele i tryby obsługiwane przez własne termostaty. Temperatury są w Celsjuszu, ale Velair obsługuje też Fahrenheita.

Pełne zasady: [Presety bloków i powiązane szablony](linked-schedules.pl.md).

<a id="choose-what-you-want-to-share"></a>
## Co chcesz współdzielić

| Cel | Wybór | Późniejsze zmiany |
|---|---|---|
| Ponownie używać temperatury i opcji o niezależnych porach | Preset Velair w każdym bloku | Edycja presetu aktualizuje te bloki; ich godziny pozostają niezależne. |
| Zacząć od szablonu i dostosować jego bloki | Kopia bloków | Edycja szablonu nie zmienia kopii. Skopiowane odwołania do presetów nadal podlegają ich aktualizacjom. |
| Powielić skonfigurowany dzień harmonogramu | Klonowanie | Klon zachowuje rodzaj powiązania z szablonem, przypisania i odwołania do presetów. |
| Stosować wspólne godziny z różnymi ustawieniami ogrzewania lub chłodzenia | Szablon z **Tylko godziny** | Zmiany godzin szablonu aktualizują każdy powiązany dzień; ustawienia klimatyczne pozostają niezależne. |
| Zachować identyczne godziny i ustawienia w kilku dniach | Szablon z **Godziny i ustawienia** | Godziny i ustawienia klimatyczne podążają za szablonem; kontrolki w dniach docelowych są tylko do odczytu. |

Szablon opisuje jeden dzień, nie cały tydzień. Powiąż jawnie każdy wybrany dzień każdego termostatu. Tydzień może łączyć dni niezależne i oba typy powiązań. Default oznacza zwykły tydzień termostatu, a nie zapisany Profil.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Jedna rutyna ogrzewania dla dwóch pomieszczeń

**Sytuacja:** salon i sypialnia mają osiągać temperaturę komfortową o 07:00 i obniżoną o 23:00. Oba urządzenia obsługują ogrzewanie i zadawanie temperatury.

1. W **Szablony → Presety klimatyczne** utwórz i zapisz:

   | Preset | Tryb | Cel |
   |---|---|---|
   | Heating comfort | Ogrzewanie | 21 °C |
   | Heating night | Ogrzewanie | 17 °C |

2. W bibliotece szablonów dziennych utwórz **Home weekday** i dodaj bloki o 07:00 i 23:00. W dodatkowych ustawieniach każdego bloku wybierz odpowiedni **Preset Velair**, a następnie zapisz szablon.
3. Otwórz domyślne harmonogramy na karcie **Harmonogramy**, wybierz salon i poniedziałek. Jako źródło harmonogramu wybierz **Home weekday**, a jako rodzaj powiązania — **Godziny i ustawienia**. Zapisz ten dzień.
4. Powtórz czynności dla sypialni i każdego dnia tygodnia, który ma korzystać z tej rutyny.

Godzina, tryb, temperatura docelowa i opcje urządzenia w tych powiązanych dniach są tylko do odczytu. Kolumna temperatury nadal pokazuje 21 °C lub 17 °C, zamiast zastępować wartość nazwą presetu. Wskaźniki pochodzenia i szczegóły bloku wskazują szablon oraz preset.

Dwie osobne zmiany:

| Zapisana zmiana | Skutek |
|---|---|
| Przesunięcie bloku szablonu z 07:00 na 07:30 | We wszystkich powiązanych dniach blok zaczyna się o 07:30; preset pozostaje bez zmian. |
| Zmiana Heating comfort z 21 °C na 21.5 °C | Wszystkie odwołania, także te dziedziczone przez szablon, korzystają z 21.5 °C; nocna temperatura pozostaje 17 °C. |

Zapis szablonu nie zapisuje niezależnego szkicu Profilu; preset nie zapisuje szkicu harmonogramu. Każdy ma własny zapis.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Zima i lato ze wspólnymi godzinami

**Sytuacja:** klimatyzator ogrzewa zimą i chłodzi latem. Godziny są wspólne, ale temperatury i działania różne.

Utwórz szablon **Workday** z blokami o 07:00 i 23:00 oraz odpowiednie presety. Powiąż z nim poniedziałek salonu w harmonogramie domyślnym i w obu Profilach, wybierając **Tylko godziny**:

| Wspólny czas | Default | Profil Winter | Profil Summer |
|---|---|---|---|
| 07:00 | Usual comfort: ogrzewanie 20 °C | Winter comfort: ogrzewanie 21 °C | Summer comfort: chłodzenie 25 °C |
| 23:00 | Ręczne Off | Winter night: ogrzewanie 17 °C | Preset Off |

Utwórz Profil w harmonogramach Profili i ustaw salon tak, aby korzystał z harmonogramu Profilu. Wybierz dzień i **Workday → Tylko godziny**, uzupełnij przypisania i zapisz cały Profil. W Default każdy dzień zapisuje się osobno.

Przesunięcie godziny szablonu na 07:30 przesuwa wszystkie trzy harmonogramy. Zmiana własnej temperatury szablonu ich nie zmienia. Edycja **Winter comfort** zmienia jego użycia, także Winter, ale nie zamienia chłodzenia Summer w ogrzewanie.

Wybrany Profil nadal określa, który tydzień jest wykonywany. Home Assistant może wybrać Winter lub Summer za pomocą istniejących działań Profili; sam szablon nie decyduje o sezonie. Na przykład po utworzeniu Profilu z identyfikatorem automatyzacji `summer` można go wybrać takim działaniem:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Powrót do Default:

```yaml
action: velair.deactivate_profile
```

Użyj identyfikatora pokazanego w Profilu, niekoniecznie nazwy. [Profile klimatyczne](climate-profiles.pl.md) opisują Tryby/aktywację.

Na okres łagodnej pogody możesz utworzyć osobny Profil dla lokalnie sterowanego urządzenia z zachowaniem **Pauza → Wyłącz urządzenie** i wybierać go automatyzacją. Różni się to od zaplanowanego bloku Off: wstrzymana strefa nie wraca do wykonywania kolejnych bloków harmonogramu. Zachowanie Pauza jest niedostępne dla stref sterowanych zewnętrznie; obowiązują tam działania harmonogramu obsługiwane przez dostawcę.

Progi prognozy, okresowe pomiary zewnętrzne, powiadomienia okien i odroczenie wieczornego wyłączenia należą do HA, nie presetów/powiązań Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Kopia dnia i dostosowanie pokoju gościnnego

**Sytuacja:** pokój gościnny ma początkowo korzystać z Home weekday, ale goście potrzebują ogrzewania na śniadanie o 08:00 zamiast 07:00.

W Harmonogramach wybierz pokój i dzień, pozostaw własny harmonogram i wybierz Home weekday w osobnym selektorze kopiowania szablonów. Przesuń poranny blok na 08:00 i zapisz. Dzień pozostaje niezależny: późniejsza zmiana szablonu na 07:30 nie przesunie jego 08:00.

Skopiowany blok Heating comfort nadal odwołuje się do presetu. Zmiana tego presetu na 21.5 °C wpłynie również na pokój gościnny. Niezależność od szablonu nie oznacza niezależności od presetu.

Aby zachować stałe 20 °C, wybierz brak presetu w dodatkowych ustawieniach, wpisz ręcznie 20 °C i zapisz. Odłączenie zachowuje konfigurację zamiast opróżniać blok.

Klonowanie dnia działa inaczej: zachowuje powiązanie z szablonem. Jeśli sklonujesz poniedziałek korzystający z **Home weekday → Godziny i ustawienia** do wtorku, oba dni będą powiązane. Przesunięcie godziny w szablonie na 07:30 przesunie blok w obu dniach.

Klonowanie dnia z powiązaniem Tylko godziny zachowuje powiązanie i kopiuje przypisania wraz z presetami. Ustawienia wtorku można zmienić bez zmiany poniedziałku, ale oba dni nadal korzystają z godzin szablonu.

Poniedziałek można też sklonować do poniedziałku innego termostatu. Jeśli konfiguracja jest zgodna z urządzeniem docelowym, zachowuje ono ten sam rodzaj powiązania, a jego pozostałe dni tygodnia pozostają bez zmian. Jeśli wspólny preset ogrzewania nie jest obsługiwany przez urządzenie wyłącznie chłodzące, Velair odrzuca klonowanie zamiast po cichu usuwać powiązanie. W harmonogramach domyślnych sprawdzane są razem wszystkie wybrane cele. W Profilach klonowanie aktualizuje tylko zweryfikowany szkic; zapis następuje dopiero po zapisaniu Profilu.

Aby wtorek był niezależny, sklonuj dzień, następnie wybierz odłączenie powiązania i zapisz. Dzień zachowuje bieżące ustawienia oraz aktywne odwołania do presetów, ale przestaje podążać za szablonem. Operacja kopiowania bloków z biblioteki szablonów nadal tworzy niezależną kopię.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Zmiana powiązania i zachowanie właściwego szkicu

**Sytuacja:** poniedziałek jest powiązany z Home weekday. Chcesz dostosować tylko ten poniedziałek, pozostawiając inne powiązane dni bez zmian.

| Wybór | Wynik szkicu |
|---|---|
| Zmiana **Godziny i ustawienia** na **Tylko godziny** | Bieżące ustawienia szablonu stają się własnymi przypisaniami tego dnia, z zachowaniem presetów. Godziny nadal podążają za szablonem. |
| Zmiana **Tylko godziny** na **Godziny i ustawienia** | Potwierdź zastąpienie przypisań dnia ustawieniami szablonu. Anulowanie zachowuje pierwotny wybór i szkic. |
| Wybór innego szablonu | Potwierdź zastąpienie szkicu. Anulowanie zachowuje dotychczasowy szablon i ustawienia. |
| Odłączenie powiązania | Bieżące godziny i ustawienia szkicu stają się niezależnym dniem, z zachowaniem presetów. |
| Wybór własnego harmonogramu | Potwierdź odrzucenie zmian tego dnia, aby przywrócić jego zapisany harmonogram jako niezależny szkic. |

Te operacje nie zapisują zmian automatycznie. Zapisz dzień Default albo cały Profil.

Przykładowo zapisany poniedziałek zawiera niezależny blok o 09:00 z temperaturą 20 °C. Wybierasz szablon rozpoczynający się o 08:00 i zmieniasz przypisanie powiązane tylko godzinami na 21 °C, ale jeszcze nie zapisujesz zmian:

- Odłączenie zachowuje 08:00 i 21 °C w niezależnym szkicu.
- Wybór własnego harmonogramu przywraca zapisane 09:00 i 20 °C.

Jeśli zapisany poniedziałek sam był powiązany, wybór własnego harmonogramu wykorzystuje aktualne wartości tego zapisanego dnia i czyni je niezależnymi. Nie przywraca wcześniejszego ręcznego harmonogramu sprzed utworzenia powiązania.

Przekształcenie w niezależną konfigurację dopasowuje wartości do termostatu, np. ręczne 18.3 °C do 18.5 °C przy kroku 0.5 °C. Po odłączeniu pozostaje 18.5 °C, natomiast preset zachowuje aktywne odwołanie. Biblioteka nie zmienia się.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Dodanie południowego bloku do wspólnego szablonu

**Sytuacja:** Workday zawiera już bloki o 07:00 i 23:00. Dodajesz blok o 12:00 z ręcznie ustawionym ogrzewaniem do 18 °C. Z szablonu korzystają różne pomieszczenia i Profile.

<a id="a-compatible-hours-only-destination"></a>
### Zgodny cel powiązany tylko godzinami

Jeśli termostat obsługuje ogrzewanie do 18 °C, Velair proponuje skopiowanie konfiguracji na 12:00. Przejrzyj powiązane dni i zapisz. Wspólna jest tylko godzina; późniejsza zmiana temperatury szablonu na 19 °C nie zmieni przypisania dnia. Nowy zgodny preset pozostaje aktywnym odwołaniem, więc jego późniejsze zmiany obejmą także ten blok.

<a id="an-incompatible-hours-only-destination"></a>
### Niezgodny cel powiązany tylko godzinami

Inny termostat ma minimum 19 °C, a o 07:00 używa zgodnego presetu **Office comfort: Heat, 21 °C**. Nowe 18 °C jest niezgodne, więc Velair szuka zapisanej konfiguracji w tym samym dniu:

1. Blok o dokładnie 12:00, jeśli istniał przed tą edycją.
2. Wcześniejsze bloki, zaczynając od najbliższego.
3. Późniejsze bloki, zaczynając od najbliższego.

Velair proponuje Office comfort z 07:00 i wskazuje źródło propozycji. Przyjmij ją lub wybierz inną zgodną konfigurację. Odwołanie do presetu pozostaje aktywne. Niezgodne bloki źródłowe są pomijane. Blok przesunięty lub usuwany może dostarczyć wcześniejsze zapisane ustawienia, ale nowy blok nie może. Bez zgodnego źródła przypisanie pozostaje oczekujące; uzupełnij je ręcznie lub presetem. Dopóki oczekuje na uzupełnienie, nic nie jest zapisywane.

<a id="a-completely-linked-destination"></a>
### Cel z pełnym powiązaniem

Dzień powiązany przez Godziny i ustawienia otrzymuje blok 12:00 z szablonu, bez zastąpienia dawną konfiguracją. Jeśli 18 °C jest niezgodne z dowolnym urządzeniem, cały zapis jest blokowany. Zmień szablon tak, aby pasował do wszystkich, albo najpierw zapisz dzień jako powiązany tylko godzinami lub niezależny. Sprawdzenie obejmuje nieaktywne Profile i ukryte Default. Bez udanego zapisu wszystkie miejsca użycia zachowują poprzednią konfigurację.

<a id="move-or-remove-an-existing-block"></a>
### Przesunięcie lub usunięcie bloku

Przesunięcie 07:00 na 07:30 zachowuje ustawienia dni powiązanych tylko godzinami, a pełne powiązania podążają za szablonem. Usunięcie usuwa przypisania i w pełni powiązane bloki w tym samym zapisie. Blok ma stałą tożsamość: usunięcie go i dodanie innego o tej samej godzinie tworzy nowy blok, zamiast przesuwać dotychczasowy.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Użycia przed edycją lub usunięciem

**Sytuacja:** preset Heating comfort został wybrany w następujących miejscach:

- Jednym bloku szablonu Home weekday.
- Jednym niezależnym bloku harmonogramu domyślnego w piątek.
- Jednym przypisaniu powiązanym tylko godzinami w Profilu Winter.

Preset ma **trzy bezpośrednie odwołania**. Dwa dni w pełni powiązane z Home weekday dziedziczą go przez szablon i są pokazywane jako dodatkowe miejsca docelowe. Nie zwiększają licznika bezpośrednich odwołań do pięciu.

Edycja presetu obejmuje wszystkie te odwołania i dziedziczące go dni docelowe. Każde miejsce użycia musi być zgodne, zanim będzie można zapisać zmianę. Presetu wskazanego w szablonie nie można usunąć nawet wtedy, gdy szablon nie ma powiązanych dni: najpierw usuń odwołanie w szablonie.

Licznik powiązanych dni oznacza coś innego: poniedziałek i wtorek to dwa dni, a niezależna kopia w piątek nie jest liczona ani śledzona jako użycie szablonu. Szablon można usunąć po odłączeniu wszystkich zapisanych dni Default i Profili. Edycja jego nazwy, godzin lub ustawień zachowuje pozycję w bibliotece.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. Co dzieje się przy aktywnym harmonogramie?

Jeśli salon automatycznie korzysta z Heating comfort przy 21 °C, zapisanie 21.5 °C aktualizuje polecenie Velair. Urządzenie nadal musi je przyjąć; sam zapis nie potwierdza ogrzania pomieszczenia.

Jeśli w salonie działa Wzmocnienie do 23 °C, edycja presetu go nie anuluje. Po zakończeniu Wzmocnienia Velair korzysta z aktualnej konfiguracji harmonogramu. Pauzy i Regulacja ręczna również zachowują pierwszeństwo. Aktywacja Profilu jest osobnym działaniem: anuluje Wzmocnienia w objętych nim strefach, ale Pauzy globalne i strefowe nadal mają pierwszeństwo. Zobacz [zasady sterowania przez Profile](climate-profiles.pl.md).

Winter z własnym tygodniem nie zostaje zastąpiony edycją Default. Powrót do Default używa jego najnowszej zapisanej wersji. Profil korzystający z harmonogramu domyślnego dziedziczy jego powiązania i presety bez kopiowania.

Pusty dzień tygodnia nie wyłącza urządzenia automatycznie. Nocny blok z piątku o 23:00 obowiązuje przez pustą sobotę aż do rozpoczęcia kolejnego zaplanowanego bloku. Jeśli urządzenie ma się wyłączyć, dodaj jawny blok Off.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Opcje urządzenia, chłodzenie i zakresy

**Sytuacja:** klimatyzator w sypialni obsługuje `sleep` i `quiet`. Chcesz stosować obie opcje o 23:00 razem z chłodzeniem do 25 °C.

Utwórz preset **Bedroom summer night** z chłodzeniem do 25 °C, presetem urządzenia `sleep` i wentylatorem `quiet`. Wybierz go w dodatkowych ustawieniach bloku 23:00. Preset Velair jest wspólną konfiguracją, a preset urządzenia jednym z jej poleceń. Podsumowanie łączy temperaturę, tryb i opcje.

Przy zgodnym urządzeniu licznik dodatkowych ustawień wynosi trzy: odwołanie i dwie opcje, bez liczenia temperatury ani HVAC. Usunięcie `quiet` kończy wysyłanie polecenia wentylatora, ale nie resetuje go do innej wartości.

**Quiet fan only** zawiera wyłącznie wentylator, bez temperatury i HVAC. Wysyła tę opcję bez zmiany trybu ani włączania urządzenia; nie uruchamia przygotowania ani Room Assist. Kopia do urządzenia bez wentylatora byłaby pusta, więc jest odrzucana.

Dla natywnego ogrzewania i chłodzenia preset **Home range** może określać dolne 19 °C i górne 24 °C. Zmiana górnej granicy na 25 °C aktualizuje wszystkie użycia bez zmiany dolnej. Termostat obsługujący tylko pojedynczą temperaturę nie może użyć zakresu. Velair nie wymyśla pojedynczego celu ani brakującej granicy; utwórz dla niego osobny zgodny preset.

Bloki samego trybu nie zawierają temperatury ani opcji, a Off nie zawiera celu ani opcji. Współdzielenie przez szablon zachowuje ich działanie i nie dodaje ciągłego sterowania temperaturą.

<a id="troubleshooting-shared-configurations"></a>
## Rozwiązywanie problemów wspólnej konfiguracji

| Objaw | Działanie |
|---|---|
| Nie można edytować godziny | Dzień podąża za godzinami szablonu. Edytuj szablon albo odłącz powiązanie. |
| Tryb i temperatura docelowa też są zablokowane | Dzień korzysta z pełnego powiązania z szablonem albo blok odwołuje się do presetu Velair. Edytuj wspólne źródło. |
| Temperatura skopiowanego dnia nadal się zmienia | Kopia zachowała odwołanie do presetu. Wybierz brak presetu Velair, aby ustawiać ten blok ręcznie. |
| Edycja szablonu nie daje się zapisać, mimo że aktywne pomieszczenie wygląda poprawnie | Sprawdź powiązane dni w nieaktywnych Profilach, ukryte dni harmonogramu domyślnego i inne termostaty. |
| Nowa pozycja powiązana tylko godzinami oczekuje na konfigurację | W powiązanych dniach wybierz zgodną konfigurację ręczną albo preset. |
| Nadal występuje błąd całego tygodnia u dostawcy zewnętrznego | Uwzględnij siatkę godzin, obsługiwane działania lub limit bloków dostawcy. Wybór bloku źródłowego nie usuwa tych ograniczeń. |
| Sprawdzenie zgodności kończy się powodzeniem, ale zapis nie | Sprawdzenie dotyczyło jednego termostatu. Zapis sprawdza każde rzeczywiste, zapisane miejsce użycia. |
| Przycisk usuwania jest niedostępny | Najpierw usuń wszystkie zapisane odwołania. Szablon może wskazywać preset, nawet jeśli nie ma powiązanych dni. |
| Inna sesja zmieniła konfigurację | Odśwież konfigurację i sprawdź zachowany szkic przed ponowną próbą. |
| Podgląd kończy się błędem lub nadal się ładuje | Zachowaj szkic i spróbuj ponownie. Velair nie zgaduje ustawień ani nie usuwa odwołań, aby umożliwić zapis. |

Nieobsługiwane opcje mogą być filtrowane. Temperatury poza zakresem i niezgodne tryby HVAC są odrzucane. Blok samych opcji nie może stać się pusty. Sterowniki zewnętrzne mają dodatkowe ograniczenia; nieudana publikacja nie przywraca lokalnego wykonywania.

<a id="back-up-the-whole-setup"></a>
## Kopia całej konfiguracji

Korzystaj z eksportu Velair zamiast kopiować tylko widoczny dzień z obliczonymi ustawieniami. Eksport modelu 16 zachowuje oba rodzaje powiązań, presety i tożsamości bloków. Eksport harmonogramów lub Profili dołącza szablony i presety, od których one zależą; ekran eksportu pokazuje automatycznie dodane sekcje.

Przed importem sprawdź zastąpienia, także lokalne użycia wspólnych zasobów. Całość musi być zgodna; nowe Profile nie aktywują się samym importem. Starsze kopie nadal można importować, ale starsze wersje Velair nie obsługują importu modelu 16. Zobacz [Przenoszenie konfiguracji](usage.pl.md#portability).
