<a id="usage-guide"></a>
# Poradnik użytkowania
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.7 |
| Ostatnia synchronizacja | 2026-10-30 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Ten poradnik opisuje Velair z perspektywy użytkownika Home Assistant.

Używaj [Grup pomieszczeń](room-groups.pl.md), gdy kilka urządzeń steruje jednym pokojem. Grupa ma jeden harmonogram, przypisanie profilu i model uczenia; przegląd nadal pokazuje urządzenia indywidualnie. Skład ustawisz na karcie Grupy pomieszczeń, a kolejność w Ustawieniach.

<a id="panel-navigation-and-direct-links"></a>
## Nawigacja panelu i bezpośrednie odnośniki

Panel boczny zmienia adres przy przełączaniu kart lub podsekcji Harmonogramów i Szablonów. Odświeżenie albo otwarcie skopiowanego adresu przywraca sekcję. Przyciski Wstecz i Dalej przeglądarki również uwzględniają tę nawigację.

| Sekcja | Ścieżka |
| --- | --- |
| Przegląd | `/velair` |
| Harmonogramy: Domyślne | `/velair/schedules/default` |
| Harmonogramy: Profile | `/velair/schedules/profiles` |
| Tryby | `/velair/modes` |
| Szablony: Szablony | `/velair/templates/templates` |
| Szablony: Presety klimatyczne | `/velair/templates/presets` |
| [Sterowanie zasilaniem](shared-climate-supply.pl.md) | `/velair/supply-control` |
| [Grupy pomieszczeń](room-groups.pl.md) | `/velair/room-groups` |
| Czujniki | `/velair/sensors` |
| Komfort | `/velair/comfort` |
| Przygotowanie wstępne | `/velair/preconditioning` |
| Planowany powrót | `/velair/planned-return` |
| Diagnostyka | `/velair/diagnostics` |
| Ustawienia | `/velair/settings` |

Używaj ścieżek w działaniach nawigacyjnych pulpitu HA lub dodaj je do swojego adresu Home Assistant. Odnośnik wybiera sekcję, nie aktywuje Trybu ani nie zmienia ustawień urządzeń.

Przykład przycisku otwierającego bibliotekę presetów:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Zmień `navigation_path` na ścieżkę z tabeli. To standardowe [działanie nawigacji pulpitu](https://www.home-assistant.io/dashboards/actions/) Home Assistant. Dla zakładki lub odnośnika z innej aplikacji dodaj ścieżkę do własnego adresu, np. `https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` otwiera harmonogram domyślny, a `/velair/templates` Szablony. `/velair/preconditioning` otwiera adaptacyjne przygotowanie, a `/velair/planned-return` osobną kartę Planowany powrót. Dawne odnośniki do podsekcji przygotowania nadal otwierają odpowiednie karty. `/velair/overview` otwiera Przegląd, a dawny adres `/velair/profiles` Tryby. Nieznana podsekcja otwiera domyślną podsekcję swojej karty, a nieznana karta Przegląd. Normalizacja nie dodaje wpisu historii.

Odnośniki nie zachowują wyboru encji, dnia, Profilu, szablonu lub presetu. Odświeżenie nie odzyskuje niezapisanych zmian. Nawigacja odrzucająca szkic korzysta z istniejących potwierdzeń; anulowanie zachowuje sekcję i adres. Opcjonalne karty Lovelace zachowują adresy pulpitu.

Otwarte karty panelu współdzielą ostatnie potwierdzone dane backendu. Po pierwszym załadowaniu przełączanie nie powtarza ładowania. Aktualizacje trwają podczas nawigacji, a potwierdzenia szkiców nadal obowiązują. Odświeżenie ładuje ponownie bez odzyskania szkiców. Karty Lovelace mają osobną sesję. Zamontowane karty na tym samym połączeniu HA współdzielą ładowanie i aktualizacje, zachowując własne sterowanie i szkice. Lovelace może zachować karty po przejściu do innego widoku, umożliwiając powrót bez ładowania. Sesja zamyka się po odmontowaniu ostatniej; odświeżenie zaczyna nowe ładowanie. Nie trzeba zmieniać YAML.

<a id="help-and-documentation"></a>
## Pomoc i dokumentacja

Otwórz **Ustawienia → Pomoc i społeczność**, aby czytać dokumentację, zgłaszać problemy w Issues GitHuba lub pytania/sugestie w Discussions. Ikona pomocy przy nagłówku lub po prawej wyboru podmenu otwiera krótkie wyjaśnienie i **Otwórz poradnik**. Pomoc podmenu nie wybiera sekcji ani nie zmienia szkicu; wyjaśnienie i poradnik dotyczą danej opcji, także nieaktywnej. Pomoc zmian zewnętrznych w Ustawieniach również oferuje poradnik. Ikony pomocy mają spójny znak zapytania i podświetlają się po najechaniu; ikony informacji nadal krótko wyjaśniają pola. Zamknij dialog przyciskiem, Escape lub kliknięciem poza nim; fokus wraca do ikony.

Krótkie wyjaśnienia są we wszystkich językach interfejsu, także offline. Odnośnik wybiera język Home Assistant, jeśli istnieje tłumaczenie, a dla każdego poradnika bez tłumaczenia osobno wybiera angielski. Pokazuje **W języku angielskim** tylko przy tym zastępstwie. Tłumaczenia pokazują stan synchronizacji i przeglądu językowego, z oryginałem przy oczekujących zmianach. Wydania otwierają dokumentację z odpowiedniego tagu, kompilacje deweloperskie z bieżącego `main`. Odnośniki dokumentacji/społeczności otwierają GitHub w nowej karcie i wymagają internetu tylko po otwarciu; nie przesyłają automatycznie diagnostyki ani lokalnej konfiguracji.

<a id="concepts"></a>
## Pojęcia

Velair zarządza harmonogramami encji `climate.*` wybranych podczas konfiguracji integracji. Każda jest zarządzaną strefą klimatyczną.

Harmonogram składa się z bloków dni tygodnia. Blok zaczyna się o konkretnej godzinie i może:

- ustawić temperaturę, opcjonalnie z trybem HVAC i obsługiwanymi opcjami wentylatora, presetu, oscylacji, oscylacji poziomej lub wilgotności docelowej;
- ustawić opcje bez temperatury i zmiany HVAC;
- zmienić tylko HVAC, pozostawiając temperaturę pod kontrolą urządzenia;
- wyłączyć encję.

Blok trwa do następnego bloku tygodnia, także przez północ i puste dni. Przed pierwszym blokiem dnia pozostaje ostatni z wcześniejszego dnia. Oś czasu osobno pokazuje odziedziczony okres, wskazując pierwotny dzień konfiguracji.

<a id="external-adjustments-and-manual-adjustment"></a>
## Zmiany zewnętrzne i regulacja ręczna

Strefa może wybrać reakcję na zmianę HVAC/nastawy poza Velair, np. z karty HA, pilota IR lub automatyzacji. Skonfiguruj zmiany zewnętrzne w wierszu encji w **Ustawieniach**:

- **Zachowaj sterowanie automatyczne** domyślnie ponownie stosuje bieżący zamiar Velair;
- **Do następnego bloku** respektuje zmianę do następnego efektywnego bloku;
- **Przez określony czas** wznawia automatykę po skonfigurowanej liczbie minut;
- **Do czasu wznowienia** czeka na jawne wznowienie.

Po oddaniu sterowania Przegląd wybiera regulację ręczną w stałym wyborze automatyczne/ręczne. Regulacja ręczna różni się od Trybu Velair **Ręczny**. Tryb opisuje sposób wyboru Profili, a Regulacja ręczna — to, kto obecnie steruje jedną encją klimatu. Wznowienie stosuje aktywny Profil, harmonogram domyślny lub inny bieżący zamiar. Niezależne powody pauzy nadal obowiązują.

Przegląd wybiera automatyczny harmonogram, gdy steruje Velair. Wybierz regulację ręczną, aby zachować stan bez wcześniejszej zmiany urządzenia; korzysta z zapisanej polityki ręcznej. Jeśli zapisana jest polityka **Zachowaj sterowanie automatyczne**, jawne przejście do Regulacji ręcznej utrzymuje ją do wznowienia, bez zmiany zapisanego ustawienia. `velair.enter_manual_adjustment` wykonuje to samo: przejmuje bieżący stan ogrzewania, chłodzenia, wyłączenia lub zakresu i przyjmuje tylko identyfikator encji.

Przy polityce **Zachowaj sterowanie automatyczne** Room Assist przelicza i ponownie stosuje obowiązującą temperaturę docelową. Przy polityce ręcznej oddaje sterowanie bez przywracania zaplanowanej korekty. Obsługuje pojedyncze cele i zakresy.

Pełny poradnik opisuje granice wykrywania, polityki, powtarzane zmiany, Profile/Tryby, Wzmocnienie/Pauzę, restart, dokładny YAML i praktyczne osie czasu: [Zmiany zewnętrzne i regulacja ręczna](manual-control.pl.md).

Velair oblicza przyszłe zdarzenia w backendzie i planuje dokładne jednorazowe wywołania zwrotne przez HA. Interfejs subskrybuje aktualizacje przez WebSocket, bez ciągłego odpytywania.

Podczas epizodu Planowanego powrotu Przegląd pokazuje kompaktowe podsumowanie domu: wskazuje, czy powrót pochodzi z rutyny tygodniowej, czy z jednorazowego zgłoszenia, opisuje bieżący proces i podaje właściwy termin potwierdzenia albo przyjazdu. Wybierz podsumowanie, aby otworzyć kartę Planowany powrót. Podsumowanie nie powiela kontrolek wyjścia. Problem może pozostać widoczny także wtedy, gdy żadne wyjście nie jest obecnie realizowane.

Objęte zmianą encje pokazują fioletowy wskaźnik Planowanego powrotu, gdy backend zgłasza bieżące sterowanie nieobecnością lub przygotowaniem do przyjazdu. Zwykły stan działania, Profil i informacje Room Assist pozostają widoczne. Przyszłe godziny przygotowania są prognozą, a nie sygnałem aktywnego sterowania. Regulacja ręczna, Wzmocnienie, niezależne Pauzy, zatrzymany harmonogram i wykonywanie zewnętrzne zachowują pierwszeństwo. Encja, która pod niestandardowym Trybem nieobecności po prostu zachowuje harmonogram domyślny, nie otrzymuje wskaźnika nieobecności. Wskaźnik opisuje zamiar sterowania, a nie dowodzi udanego przekazania polecenia czy osiągnięcia temperatury docelowej.

Gdy zarządzana encja klimatu nie publikuje `target_temp_step`, jej wiersz w **Ustawieniach** pokazuje krok temperatury. Velair domyślnie używa `1`; możesz podać rzeczywisty dodatni krok urządzenia. Velair pamięta ostatni prawidłowy krok zgłoszony przez Home Assistant, więc zniknięcie atrybutu nie unieważnia istniejących nastaw dziesiętnych. Bieżący publikowany krok zawsze ma pierwszeństwo. Ręczny zapis kroku przy brakującym atrybucie zastępuje zapamiętaną wartość zastępczą. Jeśli urządzenie później znowu opublikuje krok, Velair go zapamięta, zachowując jednocześnie skonfigurowaną wartość ręczną.

**Diagnostyka** udostępnia migawkę harmonogramu i stref tylko do odczytu, ograniczoną historię bieżącego działania oraz raport JSON oczyszczony z danych wrażliwych, który można dołączyć do zgłoszenia. Nie prowadzi odpytywania i nie korzysta z Recorder. Historię przechowuje tylko w pamięci. Na komputerze można zmieniać szerokość kolumn dziennika w bieżącej sesji; odświeżenie przywraca ich domyślny układ. Na telefonie dziennik korzysta z kompaktowego układu dostosowanego do ekranu.

Diagnostyka pokazuje także stan powrotu całego domu oraz udział każdej encji w przygotowaniu, jej szacunek i powód zawieszenia. Wyłączona rutyna tygodniowa jest pokazywana niezależnie od dostępności jednorazowego powrotu. Kategoria Planowanego powrotu zapisuje przyjęte planowanie, potwierdzenie nieobecności, wyjście, zmiany przyjazdu, rozpoczęcie przygotowania, zakończenie, anulowanie i błędy. Jej wpisy współdzielą limit 100 zdarzeń działania i są usuwane po restarcie; zapisane preferencje kategorii pozostają. Odświeżenie panelu nie dodaje kolejnych wpisów. Raporty usuwają operacyjne identyfikatory Trybów i Profili nawet wtedy, gdy jawnie dołączysz identyfikatory encji.

Podsumowanie powrotu w Przeglądzie ma standardowe tło motywu, delikatną fioletową ramkę i główną ikonę; pozostałe ikony zachowują kolor tekstu. Przyjęty przyszły powrót dodaje liczniki przygotowania z pomocą przez najechanie, fokus i dotyk. Potwierdzone wyjście ma oś czasu obok podsumowania lub pod nim przy mniejszej szerokości. Nawigacja otwiera szczegóły, bez powielania kontroli wyjścia. Informacje przygotowania są oddzielone od wskaźnika bieżącego sterowania: termostat może nadal realizować nieobecność i pokazywać oczekiwanie, przygotowanie, gotowość, wstrzymanie, niedostępność lub działanie przy przyjeździe, szacowany początek, cel i powód. Brak szacunku nie daje wymyślonej godziny; nieaktywny powrót nie zachowuje podglądu przyszłego przygotowania.

<a id="home-assistant-entities"></a>
## Encje Home Assistant

Velair tworzy trwałe encje uzupełniające chwilowe zdarzenia:

- **Następne zaplanowane zdarzenie**: znacznik najwcześniejszego działania; atrybuty obejmują wszystkie zdarzenia o tej godzinie, czas zastosowania i pierwotny cel przy wcześniejszym przygotowaniu.
- **Stan harmonogramu**: bezczynność, zaplanowanie, nadpisanie lub pauza, z globalnym trybem i końcem pauzy. Szczegóły przyszłych zdarzeń/nadpisań są w osobnych czujnikach, bez duplikowania Recorder.
- **Stan diagnostyki**: diagnostyczny czujnik wyliczeniowy `ok`, `warning`, `error`; zwarte atrybuty stanu harmonogramu, liczby zdrowych/ostrzegawczych/błędnych urządzeń, problemów i kodów. Daje bieżący stan pulpitom i automatyzacjom bez surowych wyjątków.
- **Aktywna temperatura docelowa**: osobny czujnik każdej encji pokazuje temperaturę docelową zarządzaną przez Velair, z uwzględnieniem Wzmocnienia i wcześniej rozpoczętych bloków, w jednostce danej encji klimatu. Przy zakresie pojedyncza wartość stanu jest niedostępna; korzystaj z atrybutów `target_temp_low` i `target_temp_high`.
- **Warunki otoczenia**: osobny czujnik każdej encji opisuje warunki w pomieszczeniu, np. komfortowo, zimno, wilgotno albo gorąco i wilgotno. Udostępnia jakość danych i identyfikatory źródeł, bez kopiowania oryginalnych odczytów temperatury i wilgotności.
- **Możliwość wentylacji**: osobny czujnik każdej encji ostrożnie ocenia, czy powietrze zewnętrzne może przybliżyć warunki w pomieszczeniu do zakresu Komfortu. Ma charakter wyłącznie obserwacyjny: nie otwiera okien ani nie steruje urządzeniami.
- **Jakość powietrza**: osobny czujnik każdej encji przedstawia niezależną ocenę CO2: dobrą jakość, podwyższony poziom, złą jakość, niedostępność albo brak monitorowania.
- **Nadpisanie strefy**: brak nadpisania, aktywne wzmocnienie lub pauza.
- **Sterowanie strefą**: osobny czujnik każdej encji wskazuje lokalne sterowanie `automatic`, Regulację ręczną albo zewnętrznego dostawcę. Atrybuty opisują kontekst harmonogramu, Profilu, Trybu i Regulacji ręcznej.
- **Diagnostyka dostarczania strefy**: osobny, domyślnie wyłączony czujnik każdej encji pokazuje ostatni wynik przekazania polecenia, przechowywany tylko podczas bieżącego działania, oraz cel, którego pełną sekwencję wywołań przyjął Home Assistant. Nie ujawnia surowych błędów ani nie potwierdza fizycznego działania urządzenia.
- **Początek przygotowania wstępnego**: pokazuje godzinę następnego lub aktualnie aktywnego bloku rozpoczynanego wcześniej. Atrybuty podają godzinę komfortu, wyprzedzenie, kierunek, źródło modelu, temperaturę docelową i tryb HVAC.
- **Room Assist**: bieżący stan i zwarty kontekst celu bez powielania oryginalnych odczytów.
- **Automatyczny harmonogram** i **Tryb**: encje sterujące. Wyłączenie harmonogramu zatrzymuje go bezterminowo, włączenie wznawia. Niestandardowy Tryb aktywuje przypisane Profile, **Domyślny** usuwa aktywny zestaw. **Ręczny** oznacza brak niestandardowego Trybu sterującego zestawem, zwykle po bezpośredniej aktywacji; jest pokazywany, nie oferowany jako działanie. Dla czasowej pauzy użyj `velair.pause`.

Encje wykorzystują migawki backendu i aktualizacje dyspozytora, bez odpytywania HA. Zdarzenia służą przejściom; encje odczytywaniu bieżącego stanu. Room Assist może skorygować cel po przyjęciu; jego czujnik daje kontekst korekty. [Informacje o czujnikach](sensors.pl.md) mają pełną listę, a [Czujniki sterowania i przekazywania](zone-sensors.pl.md) szczegółowe kontrakty sterowania, Komfortu, wietrzenia i poleceń.

Usunięcie encji z opcji integracji usuwa jej wygenerowane czujniki z rejestru HA po przeładowaniu. Encje globalne i innych integracji pozostają. Ponowne dodanie odtwarza czujniki z deterministycznymi unikatowymi identyfikatorami.

HA wybiera tłumaczone nazwy przy pierwszym tworzeniu według języka backendu. Zmiana języka interfejsu jednego użytkownika nie przemianowuje rejestru. Możesz ręcznie zmienić nazwę w HA bez zmiany działania Velair.

<a id="open-velair"></a>
## Otwieranie Velair

Po konfiguracji Velair jest na pasku bocznym Home Assistant.

Panel jest zalecanym interfejsem. Opcjonalna karta Lovelace przydaje się do osadzania konkretnych paneli w istniejącym pulpicie.

W panelach typu Sekcje karty Velair używają automatycznej wysokości, dzięki czemu rozwinięte elementy sterujące, dodatkowe strefy i tekst w kilku wierszach zajmują miejsce nad następną kartą. Jeśli po aktualizacji istniejąca karta nadal nachodzi na inną, sprawdź jej YAML w panelu: usuń liczbową wartość `grid_options.rows` lub zmień ją na `auto`. Zapisane opcje układu mają pierwszeństwo przed domyślnymi ustawieniami karty:

```yaml
grid_options:
  columns: 12
  rows: auto
```

Lista następnych zdarzeń w Przeglądzie i karty zdarzeń pokazują następną prognozowaną zmianę sterowania każdej strefy, w tym szacowane przygotowanie i przyjazd podczas potwierdzonego powrotu. Wspólny zwarty układ to nazwa/źródło/godziny/akcja/HVAC, bez podtytułu stanu pod nazwą. Końcowa ikona informacji wyjaśnia fazę oraz Tryb przybycia, wstrzymanie i bieżące odniesienie tygodniowe, gdy powrót ma pierwszeństwo. Pomoc działa przez najechanie, fokus lub dotyk. Wstrzymanie wyjaśnia blokady, a nie obiecuje zablokowanego startu. Czujniki następnego zdarzenia i widoki tygodniowego wyprzedzenia zachowują znaczenie tygodniowe. Prognoza nie zmienia wykonania harmonogramu i nie potwierdza dostarczenia polecenia.

Przegląd stref korzysta z kompaktowych kart dostosowanych do szerokości ekranu, które opisują bieżące działania Velair i urządzeń. Gdy encja udostępnia prawidłowe `hvac_action`, główny stan podsumowania opiera się na zgłaszanym ogrzewaniu, chłodzeniu, osuszaniu, pracy wentylatora, bezczynności, wyłączeniu, rozgrzewaniu lub odszranianiu. Następnie podsumowanie wyjaśnia kontekst harmonogramu, Regulacji ręcznej, Wzmocnienia, Pauzy, przygotowania albo wyłączonej automatyki, wraz z trybem HVAC i czasem. Nie powtarza aktywności urządzenia w osobnym wskaźniku. Bez prawidłowego `hvac_action` pokazuje własny stan Velair, nie wyciągając wniosków o fizycznym działaniu urządzenia.

Najpierw widoczne są nazwa i identyfikator encji, a następnie Profil oraz uporządkowane wskaźniki Room Assist, Komfortu, jakości powietrza i danych. W bardzo szerokich kartach mieszczą się w nagłówku obok podsumowania. Na wąskich ekranach, także w telefonie i Lovelace, nazwa i stan są obok siebie, a wskaźniki zajmują wiersz poniżej na całej szerokości. Wskaźniki Profilu, powrotu, Room Assist i Komfortu/powietrza/danych mają kompaktową typografię i podział ikony/etykiety oraz wartości. Powrót ma przygaszony fiolet; komfort rozróżnia normalność, informację, ostrzeżenie i błąd. Długie wartości mogą być skrócone wizualnie dla stałej wysokości; pełny tekst jest dostępny przez najechanie, fokus lub dotyk. Podsumowanie ma spójną ikonę, czytelną hierarchię tekstu i subtelny akcent stanu, bez stałej etykiety nagłówka ani ozdobnej ramki. Przy aktywnym lub utrzymującym cel Room Assist grupuje temperaturę (odczyt encji i czujnika pokojowego), nastawę (encja i harmonogram) oraz kierunek korekty. Pomija brakujące wartości. Neutralne wskaźniki są dyskretne, a kolor ostrzegawczy jest używany tylko wtedy, gdy stan wymaga uwagi.

Karta Lovelace obsługuje `view`:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `supply-live`;
- `diagnostics`.

<a id="supply-live-status-card"></a>
### Karta bieżącego stanu zasilania

W edytorze wizualnym wybierz widok `supply-live`, a następnie skonfigurowane zasilanie według nazwy. Karta osadza ten sam monitor tylko do odczytu co panel boczny: odczyty backendu, wartości docelowe, histerezę i zapotrzebowanie na ogrzewanie lub chłodzenie, z jednym climate w wierszu i wysokością dostosowaną do zawartości. Subskrybuje aktualizacje na żywo, dopóki jest zamontowana, także poza widocznym obszarem; usunięcie karty zwalnia subskrypcję. Nie zmienia zasilania ani jego reguł.

Edytor zapisuje stabilny wewnętrzny identyfikator zasilania w `supply_id`. W przykładzie zastąp `boiler` identyfikatorem zapisanym przez edytor; nie jest to identyfikator encji `switch.*` ani grupy pomieszczeń. Żadne zasilanie nie jest wybierane automatycznie. Jeśli wybrane zasilanie zostanie usunięte, karta poprosi o wybór innego, zamiast przełączyć się na pierwsze dostępne.

```yaml
type: custom:velair-card
view: supply-live
supply_id: boiler
supply_show_header: true
supply_show_connection: true
supply_show_switch_state: true
supply_show_room_count: true
supply_show_legend: true
supply_show_demand_description: true
```

Wszystkie sześć opcji wyświetlania ma domyślnie wartość `true`. Ustaw daną opcję na `false`, aby ukryć zwykłą informację. Opcjonalne pole `title` zastępuje domyślny tytuł, gdy nagłówek jest widoczny.

| YAML | Informacja |
| --- | --- |
| `supply_show_header` | Nagłówek |
| `supply_show_connection` | Wskaźnik połączenia na żywo |
| `supply_show_switch_state` | Stan przełącznika |
| `supply_show_room_count` | Liczba pomieszczeń zgłaszających zapotrzebowanie |
| `supply_show_legend` | Legenda wykresu |
| `supply_show_demand_description` | Zwykły opis zapotrzebowania, np. Szacowane zapotrzebowanie |

Ładowanie, błędy, rozłączenie, zawieszenie, nieznany stan przełącznika lub zapotrzebowania oraz trwające oczekiwanie pozostają widoczne nawet po wyłączeniu wszystkich opcji. Ukrycie zwykłych informacji nie ukrywa warunków wpływających na interpretację odczytów.

<a id="planned-return-card"></a>
### Karta Planowanego powrotu

Dodaj te same domowe działania powrotu do dowolnego pulpitu:

```yaml
type: custom:velair-card
view: planned-return
```

Przy zwykłym oczekującym wyjściu wiersz zegara wyjaśnia sprawdzanie pustego domu i pokazuje termin backendu w lokalnym czasie Home Assistant. Tryb nieobecności włącza się po potwierdzeniu, jeśli wszystkie źródła nadal wskazują nieobecność. Wcześniej nie ma bieżącego odliczania ani osi wyjścia. Z **Zastosuj tryb Nieobecność teraz** Nieobecność i oś czasu zaczynają się natychmiast; potwierdzenie wyjścia osobno odblokowuje automatyczny powrót na podstawie obecności, a zaplanowane przygotowanie i przybycie pozostają aktywne.

Edytor wizualny nazywa ten widok **Planowany powrót**. Karta pokazuje tylko kompaktowe kontrolki jednorazowego powrotu. W prawym górnym rogu nagłówka podaje liczby źródeł wskazujących obecność, nieobecność lub stan nieznany. Zapisane opóźnienie potwierdzenia nieobecności jest widoczne w tym miejscu tylko przed potwierdzeniem aktywnej nieobecności. Jeśli nie zapisano źródeł obecności, te wskaźniki są pomijane: **Zaplanuj powrót** jawnie potwierdza wyjście i od razu włącza Tryb nieobecności, bez czekania. Zapisany przyjazd nadal wyznacza przygotowanie i aktywację konfiguracji docelowej, ale bez źródeł Velair nie może wykryć fizycznego powrotu. Skonfigurowane źródła o stanie nieznanym lub niedostępnym nadal powodują zwykłe oczekiwanie, chyba że wybrano **Zastosuj tryb Nieobecność teraz**, a rutyna tygodniowa wymaga źródeł obecności.

Ustaw przyszłą datę i godzinę powrotu przed wyjściem albo gdy jesteś już poza domem. Podczas aktywnego epizodu dostępne są tylko anulowanie i zmiana przyjazdu. Anulowanie zatrzymuje automatykę powrotu i po potwierdzonym wyjściu lub natychmiastowej ręcznej Nieobecności przywraca poprzedni wybór Trybu i Profili, nawet przed potwierdzeniem monitorowanego wyjścia. Zwykłe oczekujące potwierdzenie nie zmienia wyboru. Przykładowo zacznij od Comfort z pięciominutowym opóźnieniem: anulowanie po dwóch minutach pozostawia Comfort, a anulowanie po zastosowaniu Away przywraca Comfort i jego pierwotne Profile. Zobacz [przykłady anulowania](planned-return.pl.md#cancelling-a-return-examples), w tym rozpoczęcie bez czujników, zmiany przyjazdu i jawny wybór Trybów. Po zakończeniu lub anulowaniu powrotu karta pokazuje nowy formularz daty i godziny, nawet jeśli źródła nadal wskazują nieobecność wszystkich domowników. **Zaplanuj powrót** pozostaje widoczny, ale jest niedostępny, gdy brakuje zapisanej konfiguracji lub dostępnego harmonogramu.

Panel boczny korzysta z tych samych przycisków anulowania i zmiany przyjazdu oraz nowego formularza planowania. Tylko dodatkowe wskaźniki obecności i opóźnienia w nagłówku są właściwe dla karty; panel zachowuje pełną konfigurację tygodniową, obecności i przygotowania. Oba widoki pokazują przy tytule krótki opis fazy z pomocą kontekstową. Podczas potwierdzania tę rolę pełni nagłówek procesu. Przed potwierdzonym wyjściem dostępna ikona przyjazdu i etykieta **Oczekiwane przybycie** identyfikują zapisany powrót, wyrównane do tytułu i opisu stanu. Zapisana wartość jest kompaktowym klikalnym znacznikiem bez ołówka i podkreślenia. Potwierdzony wykres używa ciemnego pola przyjazdu z typografią wyjścia, bez ołówka i podkreślenia. Obie formy otwierają ten sam edytor przyjazdu.

Niebieski przycisk **Wstecz** ze strzałką w lewo, umieszczony w wierszu działań edytora, lokalnie odrzuca zmianę przyjazdu i zamyka edytor, przywracając ostatni zapisany przyjazd. Usuwa jego ostrzeżenie i ochronę przed nawigacją, ale niezależne niezapisane zmiany rutyny nadal są chronione. Ponowne otwarcie zaczyna od zapisanej wartości. Udany zapis zamyka edytor; nieudany zapis i aktualizacje na żywo zachowują szkic. Wyjście i przyjazd używają tej samej typografii. Anulowanie jest kompaktowym czerwonym przyciskiem z białym tekstem po lewej, pod danymi epizodu, widocznym tylko gdy aktywny powrót można anulować i edytor jest zamknięty. Podczas edycji **Wstecz** zamyka edytor z lewej, a zmiana przyjazdu pozostaje po prawej na kompaktowym zielonym tle. Widoczna powierzchnia obu przycisków ma 32 piksele, a obszar dotykowy — 44 piksele. Wskaźniki obecności karty pozostają w prawym górnym rogu nagłówka; wskaźnik opóźnienia znika po potwierdzonym wyjściu.

Źródła obecności, Tryby, potwierdzenie nieobecności i rutynę tygodniową skonfiguruj na karcie **Planowany powrót** panelu bocznego. Karta używa zapisanej konfiguracji domu; nie udostępnia pól konfiguracji ani przełącznika rutyny tygodniowej. Filtry wyświetlanych termostatów nie ograniczają tej karty obejmującej cały dom. Kontrolki pulpitu i panelu bocznego aktualizują ten sam epizod backendu. Szkic przyjazdu pozostaje lokalny dla każdej otwartej karty do chwili przesłania.

Zapisane godziny wyjścia i edytowalnego przybycia są nad osią, a etykiety Trybów nieobecności i celu pod nią. Obie daty mają tę samą typografię; przybycie jest ciemniejszym polem otwierającym edytor, bez ołówka ani podkreślenia. Osobne podpowiedzi wyjścia, ikony przybycia i Trybów otwierają się po najechaniu, fokusie lub dotknięciu. Neutralna pionowa kreska **Teraz** odpowiada końcowi odcinka upływu czasu UTC. Daty pojawiają się, gdy końce przypadają na różne dni w strefie Home Assistant. Szkic przybycia nie przesuwa zapisanej osi przed akceptacją. Oczekujące i końcowe stany oraz brak potwierdzonego wyjścia nie mają ruchomej osi; aktywny błąd z poprawnym wyjściem zachowuje oś i anulowanie. Zegar lokalny odświeża się co minutę tylko przy widocznej aktywnej karcie lub panelu, także po ponownym pokazaniu; nie odpytuje backendu.

Każdy kwalifikujący się termostat adaptacyjny ma kolorowy punkt przygotowania wielkości 8 px, dopasowany do koła legendy i odpowiadającą legendę z nazwą oraz szacowanym początkiem pod nazwą. Czas używa strefy i formatu 12/24 godzin Home Assistant, z datą przy późniejszym dniu. Podpowiedzi zachowują pełną nazwę i rzeczywisty szacunek. Nakładające się punkty tworzą koło z równymi kolorowymi sektorami. Legenda domowa zaczyna w jednym wierszu ze skróconymi długimi nazwami; przycisk dodatkowych termostatów rozwija ją w panelu, a **Pokaż mniej** zwija. Zwykłe aktualizacje zachowują rozwinięcie; zmiana zapisanego przybycia, celu lub epizodu resetuje je i usuwa stare szacunki. Samo rozwijanie nie zmienia powrotu i nie nawiguje.

Wstrzymane, gotowe, niedostępne i działające tylko przy przybyciu pomieszczenia nie otrzymują punktów. Punkt spoza granicy wyjścia pozostaje na krawędzi, ale podpowiedź zachowuje rzeczywistą godzinę. Oś mierzy upływ czasu, a nie postęp temperaturowy lub fizyczną pracę HVAC. Brak szacunku nie oznacza wyłączonego przygotowania: podpowiedzi wyjaśniają znany stan bez wymyślania czasu. Edycja przybycia zachowuje zaakceptowaną projekcję; Wstecz przywraca zapisany przyjazd. Anulowanie i zmiana przybycia pozostają dostępne.

<a id="climate-status-and-control-card"></a>
### Karta stanu i sterowania encją

Użyj `view: climate`, aby wyświetlić kompaktową kartę jednej zarządzanej encji `climate.*`. Karta korzysta z kolorów i powierzchni motywu Home Assistant oraz dostosowuje się do motywu jasnego i ciemnego oraz ekranów telefonu, tabletu i komputera.

Łączy zgłaszaną temperaturę, wilgotność, HVAC i `hvac_action` z bieżącym sterowaniem Velair. Używa tej samej efektywnej osi dnia, ikony i koloru Profilu co Przegląd. Informacje o Trybie, Profilu, Komforcie, Room Assist i przygotowaniu pojawiają się tylko wtedy, gdy te funkcje są skonfigurowane i mają znaczenie dla bieżącego stanu. Encja zewnętrzna pokazuje dostawcę i publikację zamiast funkcji lokalnych lub działań encji. Opcjonalny jednorazowy powrót steruje domem niezależnie od sterowania wybranej encji.

W przypadku członka grupy karta zachowuje własne odczyty i indywidualny Komfort termostatu, korzystając ze wspólnego sterowania i harmonogramu. Sterowanie temperaturą uwzględnia wspólne granice grupy. Trzeci wiersz nagłówka pokazuje ikonę, nazwę grupy i przycisk informacji pod dotychczasowym stanem, bez zmiany wyrównania ikony trybu. Pomoc wyjaśnia wspólne działania i wymienia członków. Opcja **Pokaż grupę** jest domyślnie włączona (`climate_show_group: true`), niezależnie od wyświetlania nazwy termostatu. Jej wyłączenie ukrywa tylko te informacje. Termostat bez grupy nie pokazuje tego wiersza, nawet gdy opcja jest włączona.

Karty Przegląd, Dzisiejsza oś czasu i Podsumowanie stref ograniczają filtr pojedynczego członka do wybranego termostatu. Wybranie grupy obejmuje wszystkich jej członków.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_group: true
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

Obszar sterowania łączy uporządkowane szybkie działania z niezależnie konfigurowanym wyborem sterowania automatycznego lub ręcznego, korzystając z tego samego modelu odpowiedzialności co Przegląd. Dolny panel grupuje tryb HVAC, bieżącą temperaturę docelową włączonego urządzenia i skrót do natywnego okna sterowania Home Assistant. Każdy zgłaszany tryb HVAC ma swoją ikonę. Gdy Velair steruje aktywnym harmonogramem, bezpośrednie kontrolki są tylko do odczytu: najpierw wybierz sterowanie ręczne, poczekaj na potwierdzenie Regulacji ręcznej, a następnie używaj kontrolek temperatury i trybu. Wybór sterowania automatycznego wznawia harmonogram. Wzmocnienie, niezależne Pauzy, zatrzymanie i niedostępność blokują bezpośrednią edycję z wyjaśnieniem. Wewnętrzna Pauza reprezentująca samą Regulację ręczną nie blokuje tych kontrolek. Strefy wykonywane zewnętrznie zachowują skrót do natywnego okna Home Assistant; włączone działanie jednorazowego powrotu nadal może otworzyć kontrolki wyjścia całego domu.

Obsługiwane są pojedyncze temperatury i zgodne natywne zakresy, także w Ogrzewaniu, Chłodzeniu i Auto dla encji przyjmujących tylko dwie nastawy. Zmiana zakresu wysyła obie granice razem. Velair używa zgłaszanych przez encję `min_temp`, `max_temp` i `hvac_modes`. Zmiany temperatury korzystają z `target_temp_step`, jeśli jest publikowany. Po zniknięciu tego atrybutu Velair nadal korzysta z ostatniego prawidłowego zgłoszonego kroku, aby zachować poprawność istniejących temperatur dziesiętnych. Następna w kolejności jest ręczna wartość zastępcza strefy z Ustawień, a na końcu `1`, jeśli żadnego kroku nigdy nie zgłoszono ani nie skonfigurowano. Velair nie wymyśla trybów HVAC.

Starsze karty używały `climate_show_boost_action`, `climate_show_pause_action`, `climate_custom_actions`. Velair nadal je odczytuje, a edytor zapisuje `climate_actions` po zmianie listy.

Jednorazowy powrót jest kolejnym działaniem dostarczanym przez Velair. Ma takie same opcje widoczności, ukrycia nazwy i umieszczenia automatycznie lub w menu **Więcej** jak Wzmocnienie i Pauza. Edytor najpierw wymienia działania dostarczone przez Velair: Wzmocnienie, Pauzę i jednorazowy powrót, także gdy są ukryte. Powrót używa fioletowego akcentu, aby odróżnić go od Pauzy. Otwarcie zastępuje dolny obszar sterowania kompaktowym formularzem wyjścia lub osią czasu i kontrolkami bieżącego epizodu. Zamknij go przyciskiem X, aby wrócić do sterowania urządzeniem; zamknięcie nie anuluje aktywnego wyjścia. Niezapisane zmiany przyjazdu wymagają potwierdzenia przed zamknięciem, a trwające działanie musi najpierw się zakończyć. Ustawienia i skutki wyjścia dotyczą całego domu, nie tylko wybranego urządzenia.

Panele Wzmocnienia, Pauzy i jednorazowego powrotu łączą się z obramowaniem i powierzchnią paska narzędzi, tak jak zwykłe kontrolki termostatu. Bezpośrednie działania pokazujące tylko ikonę zachowują kompaktową szerokość i wyśrodkowaną ikonę. Otwarcie panelu dodaje miejsce na ikonę zamknięcia.

Istniejące karty zachowują to działanie ukryte, dopóki nie zostanie jawnie włączone. Karty utworzone przez wybór kart Home Assistant mają je włączone na początkowej liście działań; dotyczy to także zmiany widoku takiej nowej karty na `climate`. Karta YAML bez działania `planned-return` pozostawia je ukryte. Włącz je w edytorze wizualnym albo dodaj pokazane powyżej działanie.

Edytor zachowuje działania dostarczone przez Velair w stałej sekcji, a własne działania można porządkować. Samo otwarcie edytora nie zmienia kolejności zapisanej listy.

Domyślnie wilgotność i skrót historii korzystają z atrybutów encji. `climate_humidity_entity` wybiera bieżący odczyt i natywną historię osobnego czujnika. Velair nie wnioskuje o powiązaniu, bo integracje HA nie publikują go spójnie.

Temperatura na zewnątrz i encje okien są opcjonalnym kontekstem pulpitu. Velair nie wykrywa ich, nie zarządza nimi i nie automatyzuje ich przez tę kartę. Stany okien są wyłącznie informacyjne, także wtedy, gdy korzysta z tych encji osobna automatyzacja lub [blueprint okien Velair](blueprints/pause-zone-for-open-windows.pl.md). Ustaw `climate_window_display` na `grouped` albo `individual`. Edytor wizualny ma osobne pola wyboru odczytu temperatury na zewnątrz i okien; nie pokazuje tych sekcji, dopóki nie zostanie wybrana encja.

Kliknięcie całego nagłówka Bieżącego stanu zwija rozwinięty panel. Kompaktowe odczyty i kontekst używają znaczników zawijających się do kolejnych wierszy zamiast przewijania poziomego, dzięki czemu każdy włączony czujnik pozostaje widoczny przy małej szerokości. Dostępna ocena Komfortu pojawia się w osobnym opisowym wierszu pod zwiniętym nagłówkiem, z warunkami, kontekstową wskazówką Komfortu, ikoną i akcentem stanu. Edytor może również pokazać w tym zwiniętym wierszu włączone odczyty pochodne Komfortu; w przeciwnym razie pozostają one w rozwiniętym wierszu. Wiersz Komfortu jest pomijany, jeśli ocena jest niedostępna. Kontrolka rozwijania pozostaje na stałym miejscu, a znaczniki zajmują tyle kompaktowych wierszy, ile wymaga dostępna szerokość. Ten stan prezentacji obowiązuje tylko w bieżącej sesji karty. Bieżący stan jest domyślnie zwinięty, ale edytor może ustawić początkowe rozwinięcie. Zmiana wartości domyślnej nie blokuje późniejszego ręcznego zwijania lub rozwijania.

Edytor wizualny zachowuje tę samą kolejność od góry do dołu co karta. Pozwala niezależnie ukrywać pasek stanu, nazwę urządzenia, stan działania, poszczególne kontrolki i działania termostatu, bieżącą temperaturę, wilgotność, odczyt na zewnątrz, okna, Komfort, opcjonalne odczyty Komfortu w zwiniętym widoku, oś czasu, Room Assist i przygotowanie temperatury. Nazwę urządzenia można zastąpić niezależną etykietą lokalną dla karty, nawet pustą, a następnie przywrócić bieżącą przyjazną nazwę encji. Wyłączenie wszystkich elementów Bieżącego stanu usuwa cały jego obszar. Pominięte ustawienia widoczności domyślnie oznaczają widoczność, dzięki czemu istniejące karty zachowują prezentację. Każdy widoczny odczyt bieżącej temperatury lub wilgotności ma kompaktowy skrót do natywnej historii Home Assistant skonfigurowanego źródła; ukrycie odczytu usuwa także skrót.

Każdą kategorię konfiguracji można zwinąć, a poszczególne własne działania skryptowe pozostają zwinięte do chwili edycji, aby edytor był wygodny na wąskich ekranach. Wybór innego skryptu odświeża nazwę skrótu z jego encji; potem można ją ponownie dostosować. Skrót w nagłówku Velair jest zawsze obecny, aby karta była rozpoznawalna i zapewniała spójny powrót do integracji. Każde bezpośrednie działanie może ukryć widoczną nazwę i przyjąć rozmiar przycisku z samą ikoną. Etykieta dostępności i pełna nazwa w menu **Więcej** pozostają zachowane.

Szybkie działania dzielą górny wiersz obszaru sterowania z wyborem sterowania automatycznego lub ręcznego. Przy każdej szerokości karty pozostają w osobnej grupie wyrównanej do przeciwnego końca tego samego wiersza. Jeśli etykiety przekraczają dostępne miejsce, każda pełna etykieta zachowuje naturalną szerokość, a grupa przewija się poziomo zamiast zawijać lub ucinać tekst. Otwarcie Wzmocnienia lub Pauzy zastępuje zwykły panel termostatu w tym samym miejscu; anulowanie albo ponowne naciśnięcie wybranego działania przywraca zwykłe kontrolki. Natywny pasek przewijania jest ukryty. Przy nadmiarze działań kontrolki kierunkowe zajmują stałe miejsca na zewnątrz i pojawiają się tylko wtedy, gdy kolejne działania pozostają poza ekranem. Nie zasłaniają ani nie zmieniają rozmiaru wiersza, a gdy wszystkie działania się mieszczą, ich miejsca są całkowicie usuwane. Ten sam wiersz obsługuje przesuwanie dotykiem oraz przeciąganie myszą lub piórem bez wykonania działania, od którego rozpoczęto gest. Działania skryptowe krótko potwierdzają przyjęcie wykonania lub błąd na samym przycisku, a otwarte Wzmocnienie i Pauza pokazują ikonę zamknięcia.

Nagłówek pokazuje bieżące działanie jako główny sygnał stanu. Pod nazwą urządzenia grupuje jego działanie, źródło wykonywania harmonogramu i tryb HVAC. Kompaktowa sygnatura Velair służy jako skrót do panelu bocznego; nazwa projektu i autor pozostają w dwóch wierszach niezależnie od szerokości karty.

Oś czasu i Room Assist używają tych samych grafik co panel Velair. Na wąskich ekranach można je przewijać poziomo. Ustawienie `climate_room_assist_display` przyjmuje `text`, `chart` lub `both`, aby pokazywać wyjaśnienie tekstowe, wykres albo oba elementy. Stan pozostaje przy tytule, a wyjaśnienie zajmuje drugi wiersz. Zwijanie i rozwijanie jest dostępne tylko w widokach zawierających wykres; widok samego tekstu nie pokazuje niepotrzebnej kontrolki rozwijania.

Ustawienie `climate_preconditioning_display` działa analogicznie. Przyjęte przygotowanie na powrót jest odróżnione od wyprzedzenia tygodniowego: stan pomieszczenia, szacowany początek, cel przyjazdu i powód. Opisuje zapisany powrót oraz zamiar sterowania, nie fizyczną pracę. Osadzony jednorazowy powrót pokazuje tylko kwalifikujący się punkt wybranego termostatu z nazwą i szacowanym początkiem w legendzie, bez znaczników przygotowania. Gdy brak bieżącego punktu, krótkie wyjaśnienie stanu/powodu zastępuje oś. Przyjazd pozostaje edytowalny, anulowanie dostępne, a działania obejmują cały dom. Oś mierzy czas do przyjazdu, nie postęp cieplny. Nagłówek zachowuje stan zaplanowanego lub aktywnego przygotowania, a drugi wiersz może pokazywać temperaturę docelową i godzinę rozpoczęcia. Widok samego wykresu pokazuje tylko stan nad rozwijanym podglądem. Obie grafiki są domyślnie zwinięte; opcja początkowego rozwinięcia jest dostępna tylko po wybraniu widoku z wykresem. Tytuł osi czasu oraz znaczniki aktywnego Profilu i Trybu mają niezależne ustawienia widoczności. Znaczniki Trybu i Profilu mają mniejszą wysokość, dostosowaną do karty. Ręczna zmiana rozwinięcia jest zachowywana w bieżącej sesji.

Wzmocnienie otwiera formularz obsługiwanych opcji encji i usługi: pojedynczej temperatury lub zakresu, czasu trwania, trybu HVAC, wentylatora, presetu, oscylacji, oscylacji poziomej i wilgotności. Pauza pozwala wybrać czas trwania albo wstrzymanie bezterminowe oraz pozostawienie urządzenia w obecnym stanie albo jego wyłączenie. Karta nie udostępnia `pause_id`, ponieważ to pole służy powodom Pauzy tworzonym przez automatyzacje. Jeśli Pauza może należeć do innego właściciela lub obejmować inny powód, karta otwiera Velair zamiast usuwać ją bez wyraźnej decyzji. Z karty można też wznowić automatykę po Regulacji ręcznej. Lokalne działania Velair nie są dostępne dla stref wykonywanych zewnętrznie. Wzmocnienie oraz Pauzę i Wznowienie można niezależnie ukrywać i przesuwać na liście razem z własnymi skrótami skryptowymi. Ich działanie, etykiety, ikony i formularze dostarcza Velair i nie można ich konfigurować.

Lista działań może także zawierać wybrane przez użytkownika encje `script.*` Home Assistant. Każdy skrót ma nazwę lokalną dla karty, ikonę MDI, kolor i opcjonalne potwierdzenie. Velair zapisuje w karcie Lovelace tylko te ustawienia prezentacji i uruchamia wybraną encję przez `script.turn_on`; sam skrypt, jego uprawnienia i działania nadal należą do Home Assistant. Karta nie przyjmuje dowolnego JavaScript, szablonów, danych usług ani osadzonych sekwencji działań. Skróty skryptowe muszą więc działać bez wymaganych pól wejściowych. Wymagane wartości zdefiniuj wewnątrz skryptu Home Assistant albo zapewnij tam wartości domyślne.

Każde działanie może korzystać z `placement: auto` lub `placement: more`. Działania automatyczne zajmują pierwsze trzy dostępne pozycje bezpośrednie, a po ich zapełnieniu trafiają do menu **Więcej**. Działania przypisane do `more` zawsze pozostają w tym menu, niezależnie od swojej pozycji na uporządkowanej liście. Limit trzech pozycji jest stały i nie stanowi osobnego ustawienia widoku. **Więcej** jest pomijane, gdy nie zawiera działań. **Otwórz Velair** pozostaje stałą ostatnią pozycją i samo nie powoduje pojawienia się menu. Skróty skryptowe są dostępne także w strefach wykonywanych zewnętrznie, ponieważ są niezależnymi działaniami Home Assistant; działania właściwe tylko Velair nadal podlegają zwykłym ograniczeniom odpowiedzialności i dostępności.

Cienka linia u góry karty jest wskaźnikiem stanu, a nie paskiem postępu. Ogrzewanie i rozgrzewanie mają ciepły akcent, chłodzenie — chłodny, osuszanie i wentylator — stały. Bezczynność pokazuje przygaszony akcent aktywnego trybu, wyłączenie pozostaje neutralne, a niedostępność ma przerywany akcent błędu. Krótka animacja zwraca uwagę na zmianę i jest pomijana przy preferencji ograniczonego ruchu. Stan `off` ma pierwszeństwo przed starym `idle`, więc karta pokazuje wyłączenie z ikoną zasilania. Bezczynny, ale aktywny tryb używa neutralnej ikony termostatu, aby nie przypominał Pauzy Velair.

Karty dotyczące stref można ograniczyć do wybranych termostatów. Filtr zmienia tylko prezentację pulpitu, bez wpływu na zapisane harmonogramy lub działanie integracji. Globalne widoki `overview-status` i `active-setup` nie udostępniają wyboru termostatów ani dni tygodnia, ponieważ nie są widokiem jednej encji ani edytorem harmonogramu.

Dodaj `view: active-setup` niezależnie od stanu harmonogramu. Edytor lub `active_setup_controls` wybiera sterowanie `modes`, `profiles`, `both`:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

Domyślnie `both`; każdy wariant pokazuje **Bazę** i **Wyjątki**, rzeczywisty typ i nazwę bazy Trybu/Profilu/ustawień domyślnych oraz liczby stref wyjątków. Typ i Baza są nad nazwą w małym wierszu; długie nazwy zawijają się na telefonie i wąskiej karcie. Zasięg bazy obejmuje tylko strefy nadal ją dziedziczące, bez wyjątków i ustawień domyślnych poza Profilem. Baza domyślna obejmuje wszystkie strefy. To wybór, nie praca urządzeń.

**Podział domu** pod bazą jest początkowo zwinięty. Naciśnięcie nagłówka pokazuje pasek i całą legendę; ponowne naciśnięcie lub Escape zwija, zachowując pozycję nagłówka. Pasek obejmuje wszystkie zarządzane strefy, z sumą w etykiecie, kolorami Profili, mniejszymi ikonami i prawą kolumną liczb. Liczby wyjątków zgadzają się z listą także poza bazą. Strefy nieobjęte bazą bez wyjątków tworzą neutralny segment domyślny. Suma domu jest oddzielna od zasięgu bazy; bez zarządzanych stref nie ma paska. Profile bazy są w legendzie bez dodatkowej listy Trybu. Szeroki układ daje więcej miejsca wyjątkom, wąski stosuje pionowe podsumowanie.

Naciśnij dowolne miejsce wiersza wyjątku, aby rozwinąć pomieszczenia pod nim. Ponowne naciśnięcie lub Escape zwija, a otwarcie innej grupy zamyka poprzednią. Wiersz i liczba pozostają na miejscu, treść rośnie w dół, a długie listy przewijają się wewnątrz. Inne wyjątki pozostają widoczne. To szczegóły tylko do odczytu we wszystkich wariantach, bez osobnego edytora stref. Widok Profili ma działanie przywrócenia harmonogramów domyślnych. Bezpośredni Profil zastępuje całą bazę i wybiera Manual; strefy poza nim wracają do ustawień domyślnych. Tryb łączy niepokrywające się Profile jako bazę. Warstwy stosują Profil tylko do skonfigurowanych stref jako wyjątki, zachowując inne wybory. Zobacz [bazę i wyjątki](climate-profiles.pl.md#a-base-with-independent-zone-exceptions).

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Bez `entities` karty strefowe pokazują wszystkie zarządzane termostaty.

Dla `view: sensors` edytor pozwala niezależnie ukrywać przełącznik wspomagania, wybór czujnika, strefę nieczułości, maksymalną korektę, opóźnienie odświeżenia lub stan. Dzięki temu możesz utworzyć kompaktową kartę albo widok służący wyłącznie odczytowi.

Dla `view: comfort` edytor pozwala wybrać termostaty i niezależnie ukrywać panel konfiguracji oraz wykresy temperatury, wilgotności i CO2. Te opcje zmieniają wyłącznie wygląd karty, bez zmiany ustawień Komfortu, wybranych źródeł, progów, zdarzeń ani encji Home Assistant.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>
## Tworzenie harmonogramu dziennego

**Harmonogramy** otwierają bieżący lokalny dzień. Wybór pozostaje podczas zmiany termostatów, harmonogramów domyślnych/Profili i odświeżanych danych.

1. Wybierz zarządzaną encję klimatu.
2. Wybierz **Układ dni**, a następnie dzień lub grupę dni.
3. Wybierz własny harmonogram, jeśli chcesz niezależne bloki, albo szablon z powiązaniem **Tylko godziny** lub **Godziny i ustawienia**. Dla własnego harmonogramu wykonaj kolejne kroki.
4. Dodaj blok.
5. Ustaw godzinę rozpoczęcia.
6. Wybierz tryb HVAC albo `Zachowaj bieżący tryb`.
7. Podaj pojedynczą temperaturę, zakres temperatur albo obsługiwane opcje bez temperatury docelowej.
8. Zapisz harmonogram.

W dodatkowych ustawieniach **Preset Velair** dostarcza konfigurację, zachowując własny czas bloku. W powiązanych dniach wspólne są godziny albo godziny i ustawienia, zależnie od wybranego rodzaju powiązania. Przed wyborem kopii/powiązania przeczytaj [pełne zasady](linked-schedules.pl.md) i [przykłady domowe](linked-schedule-examples.pl.md).

Po wybraniu jawnego trybu HVAC innego niż `off` możesz przyciskiem z termometrem wyłączyć pole temperatury docelowej. Przygaszone pole pokazuje kreskę, a blok wywołuje tylko `climate.set_hvac_mode`, bez pojedynczej temperatury ani zakresu. Przydaje się to np. dla `auto`, gdy urządzenie ma wznowić własny program, ale działa dla każdego zgłaszanego trybu HVAC innego niż `off`. Ten sam przycisk ponownie włącza pole i przywraca szkic temperatury docelowej, który musi być prawidłowy przed zapisaniem. Istniejące bloki zachowują dotychczasowe działanie.

Bloki zmieniające tylko tryb nie korzystają z przygotowania temperatury ani Room Assist, ponieważ nie definiują temperatury docelowej. Nie mogą też zawierać dodatkowych opcji urządzenia, aby ich działaniem była jednoznacznie sama zmiana HVAC. Zewnętrzni dostawcy wykonywania harmonogramu muszą jawnie deklarować obsługę takich bloków; Velair nie przekształca ich w polecenia temperatury.

Aby zaplanować preset urządzenia lub inną opcję bez temperatury, wybierz ją w dodatkowych ustawieniach i wyłącz temperaturę docelową. Można łączyć preset, tryb wentylatora, oscylację, oscylację poziomą i wilgotność. Velair wywołuje wyłącznie odpowiednie usługi Home Assistant: nie używa `climate.set_temperature`, nie zmienia trybu HVAC i nie włącza wyłączonej encji. Wymagana jest co najmniej jedna obsługiwana opcja. Bezpośrednie zmiany tych opcji między zdarzeniami harmonogramu nie są natychmiast cofane. Takie bloki nie korzystają z przygotowania temperatury ani Room Assist. Przy kilku opcjach usługi są wywoływane po kolei; błąd późniejszej usługi może pozostawić wcześniejsze zmiany, a Velair zgłasza wtedy nieudane przekazanie polecenia.

Przy zastosowaniu szablonu/Profilu do innej encji pozostają obsługiwane opcje. Jeśli w bloku tylko opcji nic nie zostaje, harmonogram jest odrzucany, nie zapisywany jako puste działanie.

Edytor używa możliwości encji, nie oferuje nieobsługiwanych trybów i ogranicza temperatury jej zakresem.

W bloku temperatury `Zachowaj bieżący tryb` wysyła temperaturę docelową i wybrane opcje bez żądania innego trybu, gdy urządzenie jest włączone. Jeśli jest wyłączone, Velair uruchamia je w pierwszym obsługiwanym trybie zgodnym z rodzajem temperatury docelowej. Taki blok można zapisać, jeśli urządzenie zgłasza przynajmniej jeden zgodny tryb inny niż `off`; nie gwarantuje to jednak zgodności trybu działającego w chwili wykonania bloku. Jeśli bieżący tryb nie przyjmuje danego rodzaju temperatury, przekazanie polecenia kończy się błędem bez przełączania na inny tryb. Niektóre integracje zgłaszają obsługę pojedynczej temperatury dopiero po uruchomieniu trybu, więc Velair najpierw uruchamia zgodny tryb, a następnie pozostawia usłudze Home Assistant zgłoszenie ewentualnego błędu urządzenia. Natywne zakresy nadal wymagają jawnej obsługi. Velair nigdy nie zamienia pojedynczej temperatury na zakres ani zakresu na pojedynczą temperaturę.

Wybrane opcje pojawiają się w kompaktowym wierszu pod blokiem. Przycisk informacji wyjaśnia wysyłaną temperaturę docelową, sposób obsługi HVAC i opcjonalne ustawienia, w tym brak zamiany pojedynczej temperatury na zakres. Pomoc działa w harmonogramach domyślnych, Profilach i szablonach. Warunkowe ostrzeżenie pojawia się bez blokowania zapisu, jeśli wcześniejszy blok wybranego dnia ustawia niezgodny tryb HVAC. Jeśli nie ma wcześniejszego jawnego trybu ani wyłączenia, podgląd korzysta z obecnego trybu urządzenia. Ten tryb może jednak zmienić się przed wykonaniem bloku.

Blok temperatury może mieć pojedynczą temperaturę docelową albo pełny zakres dolnej i górnej granicy. Nowe bloki `heat_cool` domyślnie korzystają z zakresu, jeśli urządzenie go obsługuje. Panel pokazuje obie granice, np. `20–24 °C`. Velair nie tworzy zakresu za użytkownika i odrzuca niepełne, odwrócone lub niezgodne cele przed wysłaniem polecenia.

Encje obsługujące tylko zakresy używają obu granic w zgłaszanych trybach `heat`, `cool`, `auto` i `heat_cool`. Edytor zachowuje te wartości podczas zmiany zgodnych trybów, **Zachowaj bieżący tryb** i **Tylko temperatura**. Granice mogą być równe. Przy obsłudze obu formatów obowiązuje polityka trybu dla encji z Ustawień. Dla encji zakresowych Osuszanie i Tylko wentylator pozostają blokami trybu bez temperatury; przy obu formatach polityka wyznacza format, lecz integracja nadal może odrzucić nieobsługiwaną operację.

Zachowanie trybu uruchamia wyłączoną encję zakresową w pierwszym zgłaszanym zgodnym trybie. Nie omija niezgodnego działającego trybu przez jego zmianę. Przy obu formatach zakres z Zachowaj nadal preferuje `heat_cool` przy starcie z Off. Tylko temperatura może wysłać obie granice przy wyłączeniu, jeśli encja zgłasza obsługę zakresu i zgodny tryb klimatyzacji, bez włączenia ani zmiany trybu. Znana encja wyłącznie zakresowa nie przyjmuje pojedynczej temperatury także przy wyłączeniu.

Edytor zakresu pokazuje dolny i górny cel. To wartości przyjmowane przez integrację; Velair nie zakłada, że Auto ma automatyczny pas ogrzewania/chłodzenia jak `heat_cool`. Te same kontrole dotyczą Profili, presetów, Wzmocnienia i kopiowanych lub powiązanych szablonów. Szablony i Presety używają formatów możliwych miejsc docelowych; przy stosowaniu sprawdzane jest każde rzeczywiste miejsce. Gdy Wzmocnienie nie ma użytecznych bieżących granic, podaj obie przed zastosowaniem.

Room Assist i adaptacyjne przygotowanie obsługują natywne zakresy `heat_cool` oraz stałe zakresy ogrzewania lub chłodzenia z odniesieniem wybranym w **Ustawienia → Urządzenia klimatyczne i grupy**. Bez wyboru nominalna para obowiązuje o zaplanowanej godzinie bez korekty, wcześniejszego startu i uczenia; Planowany powrót stosuje ją przy przybyciu. Zakresy Auto zachowują ograniczenie.

Edytor pokazuje dodatkowe obsługiwane kontrolki, np. wentylator, preset, oscylację/poziomą i wilgotność AC. Tylko obsługiwane są zapisywane i wysyłane; reszta pomijana.

Przy wyborze `Wyłączony` pola temperatury docelowej nie są używane, ponieważ blok wyłącza encję klimatu.

Wybierz **Tylko temperatura** w trybie bloku, aby zmienić cel bez żądania włączenia lub zmiany HVAC. Wyłączony termostat pozostaje wyłączony, jeśli integracja przyjmuje wtedy cele; działający zachowuje rzeczywisty tryb. To oddzielny wybór; **Zachowaj bieżący tryb**, jawne tryby i istniejące harmonogramy zachowują działanie. Bloki tylko temperatury nie mogą zawierać dodatkowych opcji, np. presetu, które mogłyby zmienić stan urządzenia.

Polityka obowiązuje przez cały blok, także po ręcznej zmianie HVAC, przy starcie, wznowieniu i odzyskiwaniu dostarczania. Sama zmiana HVAC nie rozpoczyna regulacji ręcznej; zmiana temperatury nadal podlega polityce zewnętrznych zmian. Room Assist i przygotowanie nie działają przy wyłączonym termostacie; mogą wrócić po zewnętrznym włączeniu w zgodnym bieżącym trybie. Jawne Wzmocnienie jest oddzielnym żądaniem i może włączyć urządzenie.

Wsparcie zależy od integracji: niektóre ukrywają lub odrzucają cele przy wyłączeniu albo same włączają urządzenie po ich odebraniu. Velair nie wysyła zmiany trybu ani włączenia w zastępstwie i nie włącza chwilowo urządzenia, aby ustawić cel; błąd jest zgłaszany. Natywne zakresy wymagają obsługi zakresu. Zewnętrzny dostawca harmonogramu musi jawnie obsługiwać tę politykę.

**Układy dni i edycja wielu dni**

Harmonogram domyślny każdej strefy i harmonogram strefy w Profilu zapamiętują własny **Układ dni**: **Poszczególne dni**, **Dni robocze / Weekend**, **Wszystkie dni**. Istniejące harmonogramy zaczynają od dni indywidualnych. Siedem komórek zachowuje ustawioną kolejność tygodnia; kliknięcie wybiera jeden dzień, poniedziałek–piątek lub sobotę–niedzielę albo cały tydzień. Przy niedzieli pierwszej weekend obejmuje oba końce paska. Sąsiadujące wybrane komórki łączą się wizualnie; rozdzielone zachowują pozycje. Kliknięcie już wybranej grupy zachowuje szkic.

Wybór podziału zachowuje bloki; zapisz go z harmonogramem domyślnym lub całym Profilem. Każda strefa może mieć inny układ, a szablony pozostają listami dziennymi. Identyczne konfiguracje wybranych dni można edytować razem. Przy różnicach **Różne harmonogramy** pokazuje alternatywy; identyczne bloki i powiązania są grupowane z etykietami dni. Alternatywy używają zwartych pasków Przeglądu z celem i trybem, bez stałej listy bloków. Ikona informacji otwiera godziny, ustawienia i odwołania przez najechanie, fokus lub dotyk, bez wyboru podstawy. Wybierz alternatywę kliknięciem albo strzałkami, Spacją i Enter; tło i obramowanie wskazują jedną podstawę, a inne pozostają dostępne do zapisu.

Dla wszystkich dni lub dni roboczych/weekendu najpierw wybierz i zapisz podstawę dla siedmiu, pięciu lub dwóch dni. Zapis stosuje ją bez dodatkowego potwierdzenia; wspólny edytor bloków otwiera się dopiero po sukcesie. Błąd zachowuje wybór i porównanie. Puste alternatywy pokazują **Brak własnych bloków**, bez zbędnego licznika zera; pomoc wyjaśnia usunięcie własnych bloków. Pusty dzień nie jest wyłączeniem i może trwać poprzedni harmonogram. Układ pasuje do telefonu.

Wybór podstawy nic nie zapisuje. Zapis jest niedostępny bez niej i znajduje się pod treścią po prawej. Podsumowanie podaje źródłowy dzień i odbiorców. Zapis zastępuje tylko dni grupy; inne pozostają bez zmian. Te same widoczne temperatury nie oznaczają tej samej konfiguracji: kompaktowe etykiety wskazują szablon, zakres powiązania, preset lub niezależny harmonogram, a pełne odwołania są w pomocy.

Dodanie, usunięcie i przesunięcie bloków, zastosowanie szablonu, zmiana rodzaju i usunięcie powiązania obejmują całą wybraną grupę po zapisaniu. Zapis jako szablon tworzy jedną listę dzienną. Kopia do innych termostatów obejmuje te same dni tygodnia, zachowując układ celów. Klonowanie między dniami wymaga **Poszczególne dni**. Wspólna oś pokazuje edytowane bloki bez osobnego wyboru podglądu dnia ani odziedziczonego segmentu. Indywidualne dni nadal pokazują ciągłość poprzedniego dnia. Ciągłość tygodniowa nie zmienia się, a odziedziczone bloki nie są kopiowane do zapisu. Limity urządzeń sprawdzane są dla wszystkich dni przed pełnym zapisem. Układy przetrwają restart i eksport; starszy import bez układu lub wcześniejsze własne odwołania otwierają dni indywidualne, zachowując wszystkie bloki i powiązania.

<a id="target-format-by-climate-and-mode"></a>
## Format celu według encji i trybu

Home Assistant zgłasza obsługę pojedynczych temperatur i zakresów, ale nie tabelę zgodności każdego trybu HVAC. W **Ustawienia → Urządzenia klimatyczne i grupy** każda encja z oboma formatami ma listę **Tryby z dwiema nastawami**. Zamknięta pokazuje wybrane tryby, a otwarta pozwala je zaznaczać i usuwać. Dostępne są tylko zgłaszane tryby poza Off. Ogrzewanie/chłodzenie jest początkowo wybrane, jeśli dostępne; inne tryby nie są wybierane automatycznie. Pusty wybór jest poprawny. Encje z jednym formatem używają go bez selektora. Pomoc przy etykiecie wyjaśnia ograniczenia. Zmiany przed zastosowaniem przechodzą sprawdzenie niezgodności.

To ustawienie opisuje wysyłanie celów przez Velair, a nie potwierdza przyjmowania i używania obu wartości przez urządzenie. Integracja może odrzucić lub zignorować parametr. Velair zgłasza znane niezgodności przed zapisem i otrzymane błędy dostarczenia. Nie ma automatycznego testu urządzenia ani próbnego przełączania trybów.

Dla trybów z dwiema wartościami **Wartość zadana odniesienia** pojawia się w Ogrzewaniu i Chłodzeniu, także na urządzeniach obsługujących tylko zakresy. Wybierz **Dolna wartość zadana** lub **Górna wartość zadana** zgodnie z urządzeniem. **Nie skonfigurowano** zachowuje wysyłanie harmonogramu, ale wyłącza Room Assist i adaptacyjne przygotowanie tego stałego zakresu. Skonfiguruj raz na urządzenie i tryb; obie funkcje współdzielą wybór backendu, eksportowany i importowany. Zmiana usuwa nieaktualne wspomaganie i obserwacje bez zmiany temperatur harmonogramu ani formatu celu.

Room Assist oblicza histerezę wokół wybranej granicy i przesuwa obie wartości razem, zachowując odstęp w granicach urządzenia. Przygotowanie przewiduje i uczy się z tej granicy w kierunku trybu oraz wysyła wcześniej całą pierwotną parę. `heat_cool` zachowuje dotychczasowe sterowanie pasmem bez selektora. Zakresy `auto` pozostają nieobsługiwane przez te funkcje.

**Domyślny**, strefy w **Profilach**, **Wzmocnienie** i sterowanie klimatem używają tej polityki do pokazania jednego lub dwóch pól jawnego trybu. Zmiana trybów zachowuje oddzielne tymczasowe wersje robocze każdego formatu. Powrót przywraca wartości wpisane podczas tej edycji; brakujące trzeba uzupełnić. Velair nie tworzy zakresu ani nie sprowadza pary do jednej temperatury. Alternatywne szkice nie są zapisywane i znikają po odświeżeniu.

**Zachowaj bieżący tryb** i **Tylko temperatura** nie podają jawnego trybu. Jeśli encja używa obu formatów w różnych trybach, wybierz zamierzony format w **Dodatkowych ustawieniach** bloku. Rzeczywisty tryb jest ponownie sprawdzany przy wykonaniu. Tylko temperatura nie włącza ani nie zmienia trybu HVAC.

<a id="formats-in-templates-and-presets"></a>
### Formaty w Szablonach i Presetach

Dla jawnego trybu Velair uwzględnia zarządzane encje, które go oferują:

- Gdy wszystkie używają jednej temperatury, edytor pokazuje jedno pole.
- Gdy wszystkie używają dwóch nastaw, pokazuje dwa pola.
- Przy obu formatach pierwsza akcja w **Dodatkowych ustawieniach** przełącza **Użyj dwóch nastaw** i **Użyj jednej temperatury**. Nowe bloki zaczynają od jednej temperatury, poza Ogrzewaniem/chłodzeniem z dwiema.
- Bez zgodnych encji lub przy niepewnych możliwościach wybór pozostaje dostępny.

Zachowaj i Tylko temperatura łączą możliwe tryby efektywne. Ogrzewanie/chłodzenie także pozwala przełączać, gdy rzeczywiste miejsca docelowe mają różne formaty. Akcja używa istniejącego przycisku ustawień na komputerze i telefonie, bez dodatkowej kolumny obok temperatur. Powiązane wartości presetów są tylko do odczytu do czasu odłączenia.

Istniejące Szablony i Presety zachowują wartości po zmianach ustawień urządzeń. Niezgodny format jest oznaczony jawną akcją poprawy; otwarcie edytora nie przekształca ani nie usuwa wartości. Przypisywanie i kopiowanie sprawdza każde miejsce docelowe.

<a id="reviewing-changes-to-the-mode-policy"></a>
### Sprawdzanie zmian polityki trybów

Zmiana wyboru najpierw pokazuje wpływ na harmonogramy domyślne, wszystkie Profile i użycia wspólnych Szablonów i Presetów. Poprawki dotyczą lokalnie dnia i encji w harmonogramie domyślnym lub Profilu. Brakujące cele wpisuje użytkownik; Velair nie wybiera zastępczych temperatur. Jeśli aktywna korekta Room Assist jest niezgodna, przegląd wyjaśnia, że zapis zakończy ją automatycznie. Ustawienia pozostają dla zgodnych trybów. Inne niezgodne cele tymczasowe trzeba wcześniej poprawić lub zakończyć.

Przegląd grupuje dni pod harmonogramem domyślnym lub Profilem. Po **Sprawdź zmiany** grupy i dni są zwinięte, aby liczby były czytelne. Otwórz dzień do edycji; tylko jeden edytor dnia jest rozwinięty naraz. Duże listy mają strony. **Następny element do sprawdzenia** prowadzi do kolejnej poprawki, także na innej stronie. Zwijanie i zmiana strony zachowują wpisy. Przed pierwszym sprawdzeniem obok Anuluj jest tylko Sprawdź zmiany; później zastępuje je **Zapisz**. Uzupełnij pola i zapisz: backend sprawdza aktualne poprawki i blokady i zapisuje tylko po powodzeniu. Nie trzeba oddzielnego drugiego sprawdzenia. Błędy walidacji, połączenia i zapisu zachowują wpisy.

Dodanie lub usunięcie trybu z dwiema nastawami przywraca Sprawdź zmiany i ukrywa Zapisz do ponownego przeglądu. Szkice temperatur pozostają, także alternatywne wartości pojedyncze i zakresowe przy powrocie do formatu. Poprawiane są tylko bloki objęte bieżącym wyborem; znów zgodne zachowują oryginalne odwołania.

Nie ma selektora zasięgu poprawek. Naprawa bloku z Presetem tworzy lokalną wartość w bloku. Naprawa dnia powiązanego z Szablonem usuwa powiązanie tego dnia; pozostałe bloki zachowują wartości i nieobjęte presety. Inne dni zachowują powiązania. Przegląd pokazuje te konsekwencje przed zapisem. Szablony, Presety i inne miejsca docelowe nie zmieniają się, więc każdy dzień wymaga własnych pełnych poprawek. Przyszłe zmiany pierwotnego zasobu nie aktualizują odłączonych bloków ani dni.

Bieżąca konfiguracja pozostaje bez zmian, dopóki polityka i poprawki nie mogą zostać zapisane razem. Równoczesna edycja wymaga nowego przeglądu; błąd zapisu zachowuje wcześniejszą konfigurację. Gdy encja przestaje zgłaszać zapisany tryb, Velair zachowuje go i zgłasza zamiast usuwać bez informacji. Room Assist kończy się dopiero po udanym zapisie, bez przywracania starego celu. Następnie Velair stosuje bieżący nominalny cel harmonogramu, a błędy dostarczenia używają zwykłego odzyskiwania. Nieudany zapis zachowuje poprzednią korektę i konfigurację.

Wybranie dwóch nastaw dla Ogrzewania, Chłodzenia lub Auto nie włącza Room Assist ani adaptacyjnego przygotowania. Termiczne wspomaganie zakresów pozostaje ograniczone do Ogrzewania/chłodzenia; Planowany powrót stosuje nominalny cel przy przyjeździe.

<a id="timeline-editing"></a>
## Edycja osi czasu

Oś wizualizuje 24 godziny wybranego dnia.

- Przeciągnij blok, aby przesunąć start.
- Przeciągnij krawędź, aby zmienić odcinek między blokami.
- Lista bloków daje dokładne godziny, tryby i temperatury.

<a id="preconditioning"></a>
## Przygotowanie temperatury

Obsługę nieobecności opartą na obecności domowników, z wcześniej skonfigurowanymi przyjazdami tygodniowymi lub jednorazowymi, opisuje [Planowany powrót](planned-return.pl.md). Skonfiguruj rutynę na karcie **Planowany powrót**. Jej bieżący stan pokazuje stany poszczególnych źródeł i pozwala zmieniać jednorazowy przyjazd bez edycji zapisanego tygodnia. **Zaplanuj powrót** może czekać na potwierdzone wyjście z jednorazową godziną nawet wtedy, gdy automatyczna rutyna tygodniowa jest wyłączona. Bez zapisanych źródeł obecności jawne rozpoczęcie od razu stosuje Tryb nieobecności; zwykłe przygotowanie i zapisany przyjazd nadal są realizowane.

Przygotowanie pozwala wcześniej zastosować temperaturę docelową komfortu dla jednej zarządzanej encji klimatu. Po włączeniu traktuje godzinę bloku jako godzinę, o której ma panować komfort, i adaptacyjnie stosuje blok wcześniej, zachowując pierwotną godzinę komfortu w danych zdarzenia. Jeśli przeliczenie nastąpi już w oknie przygotowania, Velair stosuje blok od razu, o ile nadal potrzebne jest ogrzewanie lub chłodzenie.

Karta wyświetla urządzenia w kolejności skonfigurowanej w Ustawieniach i pozwala:

- włączać i wyłączać przygotowanie temperatury;
- ustawiać maksymalne wyprzedzenie do 1440 minut;
- ustawiać parametry modelu adaptacyjnego i minimalną różnicę temperatury;
- przeglądać osobno uczenie ogrzewania i chłodzenia;
- przywracać domyślne parametry dostrajania bez usuwania próbek uczenia;
- resetować uczenie jednego kierunku bez wpływu na drugi.

Konfiguracja grupuje ustawienia czasu i limitów, modelu, historii oraz opcjonalnego kontekstu temperatury na zewnątrz. Wyłączenie tego kontekstu wyłącza także wybór jego czujnika. Dla niedostępnej encji nie można włączyć przygotowania temperatury; panel wyjaśnia przyczynę.

Każda kontrolka dostrajania ma krótką pomoc kontekstową. Najedź na ikonę informacji, ustaw na niej fokus albo ją dotknij, aby sprawdzić, jak zwiększenie, zmniejszenie lub włączenie tego ustawienia wpływa na przygotowanie temperatury.

Przygotowanie temperatury jest adaptacyjne. Velair prognozuje każde przyszłe zdarzenie na podstawie bieżącej różnicy temperatury: najpierw używa lokalnego modelu początkowego, a po zgromadzeniu wystarczającej liczby pełnych obserwacji — podobnych danych z lokalnej historii. Prognozy historyczne uczą się potencjału zmiany temperatury na stopień, dzięki czemu niewielkie wcześniejsze zmiany można przeskalować do większych przyszłych różnic, a duże zmiany — do mniejszych. Większy wpływ mają obserwacje bardziej podobne i nowsze.

Velair nie rozpoczyna wcześniej bloków Off. Jeśli bieżąca temperatura jest już dostatecznie bliska docelowej, zachowuje zwykłą godzinę bloku. Dla natywnych zakresów `heat_cool` korzysta z dolnej granicy, gdy pomieszczenie wymaga ogrzewania, albo z górnej, gdy wymaga chłodzenia. Nadal stosuje wcześniej cały zakres, a uczenie zapisuje, która granica wyznaczała przebieg sesji. Szczegółowe przykłady opisuje [Adaptacyjne przygotowanie temperatury](adaptive-preconditioning.pl.md).

Przed wcześniejszym startem Velair nasłuchuje istotnych zmian temperatury zarządzanych urządzeń z włączonym przygotowaniem. Domyślnie korzysta z własnego `current_temperature` termostatu. Jeśli Room Assist jest włączone, wybrany czujnik pokojowy staje się efektywnym źródłem temperatury dla decyzji i uczenia przygotowania. Gdy zmiana temperatury jest wystarczająca, aby wpłynąć na bieżącą różnicę, Velair grupuje aktualizacje z opóźnieniem i lokalnie przelicza następne działanie harmonogramu. Otwarte panele również łączą istotne zmiany temperatury w pomieszczeniu lub na zewnątrz w jedno odświeżenie, bez ciągłego odpytywania. Jeśli wcześniejszy start tego samego widocznego zdarzenia się zmieni, jego wiersz zostaje krótko podświetlony, aby zwrócić uwagę bez okna dialogowego ani globalnego powiadomienia.


<a id="room-assist"></a>
## Room Assist

Karta Room Assist wyświetla zarządzane encje klimatu w kolejności skonfigurowanej w Ustawieniach. Dla każdej pozwala skonfigurować Asystenta czujnika pokojowego.

Osobny czujnik jest przydatny przy TRV/termostacie blisko grzejnika, nawiewu lub źródła ciepła. Sam wybór nie zmienia sterowania. Staje się efektywną temperaturą dopiero po włączeniu wspomagania, bo wtedy Velair koryguje cel termostatu, aby urządzenie ogrzewało/chłodziło według odczytu pokojowego. Przykłady ogrzewania, chłodzenia, automatyzacji i Lovelace opisuje [Room Assist](room-assist.pl.md).

Room Assist jest zaawansowaną opcją wymagającą czujnika temperatury w pomieszczeniu, ale nie wymaga adaptacyjnego przygotowania temperatury. Dla bloku o stałym trybie `heat` lub `cool` i niezerowej strefie nieczułości Velair traktuje jej dolną i górną granicę jako progi przełączania. Zachowuje jedną fazę działania, dopóki osobny czujnik pokojowy nie osiągnie przeciwnej granicy, a następnie odwraca kierunek. Stałe ogrzewanie zaczyna bezpiecznie w kierunku dolnej granicy, a stałe chłodzenie — górnej. Maksymalna różnica wspomagania ogranicza korektę ze znakiem względem aktualnie aktywnej granicy. Strefa nieczułości `0` zachowuje poprzednie działanie korekty ze znakiem wokół środkowej temperatury docelowej. Pojedyncze cele `auto` i `heat_cool` zachowują takie neutralne działanie, a natywne zakresy `heat_cool` — stabilny pas utrzymania. Velair nie zmusza więc automatycznego urządzenia do aktywnego przechodzenia na przemian między ogrzewaniem i chłodzeniem.

Strefa nieczułości ma domyślnie `0.3 °C` lub `1 °F`, obsługuje krok `0.1` stopnia od `0` do `5 °C` lub `9 °F` i zaczyna obowiązywać od razu po zapisaniu. Maksymalna różnica wspomagania ma domyślnie `2 °C` lub `4 °F`; można ją ustawiać z krokiem `0.1` stopnia do `10 °C` lub `18 °F`. Widoczna temperatura lub zakres harmonogramu pozostają bez zmian. Nadal obowiązują dopasowanie do kroku nastawy, ochrona zaplanowanych wartości i fizyczne limity urządzenia. Faza istnieje tylko w czasie działania i zaczyna od nowa po zmianie bloku, celu lub trybu, wyczyszczeniu stanu Room Assist albo przeładowaniu integracji. Velair wpływa na urządzenie przez nastawę; nie może ominąć jego histerezy, ochrony sprężarki ani minimalnego czasu pracy. Użyj bloku Off, gdy potrzebujesz jawnego wyłączenia.

Velair używa jednostki temperatury skonfigurowanej w Home Assistant, bez osobnego wyboru Celsjusza albo Fahrenheita. Ustawienia pokazują ją tylko do odczytu, aby można było sprawdzić bieżące działanie. Zmieniaj ją w ustawieniach systemu jednostek Home Assistant. Nowe harmonogramy, wbudowane szablony, progi Komfortu, limity Room Assist i domyślne parametry adaptacyjnego przygotowania są fizycznie równoważne w obu jednostkach. Odczyty z osobnych czujników temperatury są przeliczane przed porównaniem z temperaturą docelową encji klimatu.

Velair zapisuje wartości związane z temperaturą bez przeliczania, w jednostce odnotowanej razem z danymi. Po zmianie jednostki Home Assistant zatrzymuje wykonywanie harmonogramu i zapis takich wartości, tworzy trwałe powiadomienie oraz oferuje w Ustawieniach jawną migrację z zapisanej jednostki do bieżącej jednostki Home Assistant. Kontynuuj tylko wtedy, gdy wszystkie zapisane wartości nadal używają wskazanej jednostki źródłowej. Wartości już podane w jednostce docelowej zostałyby przeliczone nieprawidłowo. Harmonogramy, szablony, aktywne i poprzednie cele nadpisań, progi Komfortu, wartości Room Assist, ustawienia adaptacyjnego przygotowania, tempa zmian i obserwacje uczenia są migrowane atomowo.

Jednorazowa aktualizacja z opublikowanych wersji Velair zapisujących wyłącznie Celsjusza przebiega inaczej. Jeśli Home Assistant już używa Fahrenheita, Velair bez pytania uznaje dawne dane za zapisane w Celsjuszu, pozostawia harmonogram zatrzymany i kieruje do **Zresetuj Velair**. Reset usuwa dawną konfigurację i atomowo tworzy nowe ustawienia domyślne w Fahrenheitach. Po tej aktualizacji kolejne zmiany jednostki Home Assistant korzystają z pełnego jawnego przeliczenia opisanego wyżej, z zachowaniem danych.

Eksporty przenośnego modelu v25 zachowują surowe wartości i podają ich jednostkę. Wcześniejsze wersje Velair nie potrafią importować eksportów v25; do ich odtworzenia użyj wersji obsługującej ten model. Starsze obsługiwane pliki, w tym v4, v5, v8 i v9, nadal można importować. Import przelicza wybrane dane związane z temperaturą, jeśli jednostka pliku różni się od bieżącej jednostki Home Assistant. Starsze pliki bez jednostki są interpretowane jako Celsjusz, ponieważ wszystkie opublikowane wersje Velair, które tworzyły te pliki, zapisywały wartości w Celsjuszu. Eksport pozostaje dostępny, gdy harmonogram jest zatrzymany na czas aktualizacji jednostki. Dzięki temu możesz zachować kopię odniesienia przed resetem i zaimportować ją później.

Jeśli urządzenie było niedostępne podczas migracji lub importu, Velair sprawdza jego limity i efektywny krok temperatury po odzyskaniu dostępności. Prawidłowy `target_temp_step` ma pierwszeństwo przed ostatnim zgłoszonym i ręcznym zastępczym. Panel ostrzega o niezgodnych celach do edycji przed użyciem. Pełne zasady w [Jednostkach temperatury i migracji](temperature-units.pl.md).

Przy włączonym Room Assist karta pokazuje kompaktową bieżącą skalę temperatury, gdy aktywny jest zarządzany blok temperatury. Dla pojedynczego celu oznacza temperaturę z harmonogramu, odczyt czujnika pokojowego, nastawę urządzenia i odczyt jego termometru. Neutralny kreskowany pas wskazuje dolną i górną granicę strefy nieczułości. Dla stałego `heat` lub `cool` stan pokazuje również, czy sterowanie zmierza ku dolnej czy górnej granicy; dla pojedynczych celów automatycznych pas pozostaje neutralnym marginesem. Przy natywnym zakresie rozciąga się od dolnej zaplanowanej granicy pomniejszonej o strefę nieczułości do górnej powiększonej o tę strefę. Osobne nawiasy nadal pokazują pełny zakres zaplanowany i zastosowany, a jeden łącznik ich środków wskazuje przesunięcie całego zakresu ze znakiem. Odczyty pokojowy i urządzenia pozostają osobnymi znacznikami. Dla skonfigurowanego stałego zakresu ogrzewania lub chłodzenia pas oznacza zamiast tego wybraną wartość odniesienia minus i plus strefa nieczułości.

Pełna tłumaczona legenda pozostaje wyśrodkowana względem przedstawionej strefy nieczułości, także gdy pas jest węższy od etykiety. Zerowa strefa usuwa powierzchnię pasa i jest opisana wprost. Ukrycie `show_room_assist_deadband` ukrywa razem ustawienie, pas i legendę. Wartości pochodzą ze stanów Home Assistant i bieżącego stanu Velair; nie są zapisywane jako nowa historia. Bez aktywnego zarządzanego bloku temperatury karta pokazuje oczekiwanie zamiast wartości zastępczych. Jeśli czujnik wybrano, ale wspomaganie jest wyłączone, karta pokazuje, że czujnik jest zapisany, lecz nie bierze udziału w działaniu.

Room Assist działa na podstawie zdarzeń. Velair nie odpytuje temperatur. Nasłuchuje tylko skonfigurowanego czujnika pokojowego i encji klimatu, gdy wspomaganie jest aktywne. Grupuje zmiany według ustawienia **Opóźnienie odświeżenia** urządzenia, dopasowuje tymczasowe nastawy do efektywnego kroku — publikowanego, ostatnio zgłoszonego lub skonfigurowanego — i ignoruje przesunięcia mniejsze od tego kroku. Przywraca rzeczywistą temperaturę harmonogramu, gdy zostanie wstrzymany harmonogram lub strefa, zacznie się Wzmocnienie, blok wyłączy urządzenie, czujnik przestanie dostarczać użyteczne dane albo funkcja zostanie wyłączona. Wyczyszczenie bieżącego stanu usuwa także fazę histerezy stałego trybu. Jeśli adaptacyjne przygotowanie rozpoczęło już przyszły blok wcześniej, Room Assist podąża za tym przyszłym celem do zaplanowanej godziny komfortu, zamiast wracać do poprzedniego bloku.

Gdy przygotowanie temperatury jest wyłączone dla encji, Velair nie rejestruje dla niej nasłuchiwania temperatury ani wywołań przeliczających harmonogram, nie rozpoczyna sesji uczenia i nie zapisuje nowych obserwacji. Wcześniejsze próbki uczenia pozostają zapisane i można je ponownie wykorzystać po włączeniu funkcji.

Velair zachowuje również niewielką lokalną historię prób przygotowania. Rozpoczyna sesję uczenia po wcześniejszym zastosowaniu temperatury docelowej komfortu, a następnie zapisuje obserwację po osiągnięciu progu docelowego lub nadejściu godziny komfortu. Sesje przerwane Wzmocnieniem, Pauzą, zatrzymaniem harmonogramu lub zmianą jego konfiguracji są odrzucane.

Karta przygotowania pokazuje stan lokalnego uczenia osobno dla każdego urządzenia. Ogrzewanie i chłodzenie są śledzone oddzielnie, a kierunek nieobsługiwany przez encję jest pokazany jako niedostępny. Po zgromadzeniu dostatecznej liczby pełnych obserwacji dla obsługiwanego kierunku Velair może używać podobnej lokalnej historii zamiast modelu początkowego. Każdy obsługiwany kierunek ma kompaktową kartę informującą o gotowości uczenia, aktywnym źródle modelu oraz liczbach próbek pełnych, częściowych i nieprawidłowych.

Karta udostępnia też reset uczenia dla każdego obsługiwanego kierunku. Rozpoczyna on kalibrację ogrzewania lub chłodzenia od zera, niezależnie, zachowując harmonogramy, ustawienia przygotowania i historię drugiego kierunku. Przywrócenie parametrów urządzenia jest osobną operacją: przywraca wyłącznie parametry dostrajania adaptacyjnego przygotowania, zachowuje bieżący stan włączenia, ustawienia czujnika pokojowego i każdą zapisaną próbkę ogrzewania oraz chłodzenia.

Obserwacje częściowe nie stają się fikcyjnymi czasami zakończenia. Stanowią dolne granice: Velair wie, że wymagany czas był dłuższy od wypróbowanego okna przygotowania. Jeśli wystarczająca liczba późniejszych pełnych obserwacji potwierdzi, że mniejsze wyprzedzenie działa, starsze obserwacje częściowe przestają wymuszać zwiększanie prognozy. Uczenie pozostaje ostrożne, ale wysokie wyprzedzenie nie staje się trwałe. Velair zachowuje osobne kompaktowe historie ogrzewania i chłodzenia, aby sezonowe używanie jednego kierunku nie usuwało historii drugiego. Wszystkie ustawienia i obliczenia działają lokalnie w Home Assistant; Velair nie wysyła historii urządzeń ani harmonogramów do usług zewnętrznych. Szczegóły dla programistów dotyczące stanów uczenia, wyników API i zasad prognozowania opisuje [mechanizm adaptacyjnego przygotowania](../developer/adaptive-preconditioning.md).

<a id="environmental-comfort"></a>
## Komfort otoczenia

Karta Komfortu wyświetla zarządzane encje klimatu w kolejności skonfigurowanej w Ustawieniach. Dla każdej może monitorować temperaturę pomieszczenia, wilgotność i CO2. Może też pokazywać opcjonalne odczyty punktu rosy, wilgotności bezwzględnej i Humidex, obliczane lokalnie z efektywnej temperatury i wilgotności albo pobierane z istniejącego czujnika Home Assistant.

Komfort służy wyłącznie monitorowaniu. Nie zmienia bloków harmonogramu, temperatur docelowych, trybów wentylatora, presetów ani Pauz. Zamiast tego Velair opisuje warunki w pomieszczeniu, np. `Zimno i wilgotno`, oddzielnie ocenia jakość powietrza na podstawie CO2, wskazuje kompletność odczytów i emituje zdarzenia automatyzacji po zmianie oceny.

Temperatura może pochodzić z osobnego czujnika wybranego dla Komfortu, z czujnika pokojowego skonfigurowanego dla Room Assist albo z `current_temperature` encji klimatu. Wilgotność może pochodzić z wybranego czujnika wilgotności lub z dostępnego `current_humidity` encji klimatu. CO2 jest oceniane tylko po wybraniu czujnika CO2.

Domyślny prosty model Komfortu używa jednego prostokątnego zakresu temperatury i wilgotności. Model prowadzony przekształca zakres wilgotności określony dla środka przedziału temperatury w krzywą psychrometryczną zależną od temperatury. Model niestandardowy pozwala ustawić inne granice wilgotności na chłodniejszym i cieplejszym końcu przedziału. Velair interpoluje efektywny zakres i pokazuje nachylony obszar docelowy, nie przedstawiając go jako uniwersalnej definicji komfortu. Istniejące strefy zachowują model prosty, dopóki nie zmienisz go jawnie.

Dodatkowe odczyty są domyślnie wyłączone i mają charakter informacyjny: nie zmieniają klasyfikacji Komfortu ani działania urządzeń. Gdy Komfort jest wyłączony dla encji, Velair nie rejestruje dla niej nasłuchiwania czujników Komfortu. Po włączeniu nasłuchuje tylko właściwych wybranych czujników i encji klimatu. Nie prowadzi ciągłego odpytywania.

Porównanie z wybranym czujnikiem temperatury na zewnątrz i opcjonalnym czujnikiem wilgotności pokazuje różnicę temperatur, wilgotność bezwzględną w obu miejscach oraz wilgotność względną powietrza zewnętrznego po osiągnięciu temperatury w pomieszczeniu. Jeśli wietrzenie może pomóc lub wiąże się z kompromisem, panel pokazuje ostrożną wskazówkę, nigdy polecenie sterujące. Konfiguracja jest domyślnie zwinięta, a wyłączenie porównania zachowuje wybór czujników. W **Ventilation guidance** można zwiększyć lub zmniejszyć wymaganą różnicę temperatury, przewidywanej wilgotności względnej i zawartości pary wodnej; domyślnie obowiązują ostrożne marginesy. Pełne przykłady znajdziesz w [Komforcie otoczenia](comfort.pl.md).

<a id="templates"></a>
## Szablony

Szablony to zestawy bloków dziennych wielokrotnego użytku. Ich ustawienia można określać ręcznie albo za pomocą wspólnych presetów Velair. Karta Szablony zawiera również bibliotekę presetów klimatycznych. Preset Velair współdzieli ustawienia urządzenia bez współdzielenia godzin bloków.

Pozwala:

- tworzyć nowe szablony;
- zmieniać nazwę szablonu;
- edytować bloki szablonu;
- stosować szablon do wybranych encji klimatu i dni tygodnia;
- usuwać szablony, z którymi nie są powiązane żadne dni.

W Harmonogramach wybierz szablon jako źródło dnia, aby powiązać jego godziny albo całą konfigurację. Kopiowanie szablonu pozostaje osobną operacją. Na tej karcie można również zapisać bieżący dzień jako nowy szablon.

Podczas kopiowania lub wiązania szablonu z encją klimatu Velair sprawdza tryby HVAC, rodzaje temperatury docelowej, limity temperatury i ograniczenia dostawcy wykonującego harmonogram. Odrzuca cele poza zakresem i niezgodne tryby. Ręczne ustawienia są dopasowywane do obsługiwanego kroku temperatury, a wartości wspólnych presetów — osobno do każdego urządzenia docelowego, bez zmiany biblioteki. Nieobsługiwane ustawienia opcjonalne są usuwane, o ile blok nadal zawiera prawidłowe działanie.

Skopiowanie bloków tworzy niezależne godziny szablonu, ale zachowuje odwołania do wspólnych presetów, których późniejsze zmiany nadal obowiązują. Powiązanie **Tylko godziny** współdzieli godziny, pozostawiając własne przypisania ustawień klimatycznych. Powiązanie **Godziny i ustawienia** współdzieli cały szablon, a kontrolki w miejscu docelowym pozostają tylko do odczytu. Zmiany szablonu są sprawdzane we wszystkich powiązanych dniach, także w nieaktywnych Profilach. Edycja zachowuje miejsce szablonu w bibliotece. [Zasady](linked-schedules.pl.md) i [przykłady](linked-schedule-examples.pl.md) opisują nowe bloki, konwersje, liczby użyć i problemy.

Szablon może zawierać opcje wszystkich zarządzanych encji dla mieszanych instalacji. Przy stosowaniu pozostają obsługiwane, np. `fan_mode: quiet` dla AC znika na TRV bez wentylatora.

<a id="climate-profiles"></a>
## Profile klimatyczne

Profile klimatyczne przełączają kilka stref między skoordynowanymi planami tygodniowymi bez nadpisywania ich harmonogramów domyślnych. Dla każdej strefy Profil może wskazać alternatywny tydzień, wstrzymać ją, wstrzymać i wyłączyć urządzenie albo pozostawić harmonogram domyślny. Strefy pominięte w Profilu nadal korzystają ze swoich harmonogramów domyślnych.

Tryb może wspólnie aktywować kilka Profili, jeśli ich skonfigurowane strefy nie nakładają się. Bezpośrednia aktywacja zastępuje cały aktywny zestaw jednym Profilem i wybiera Tryb Ręczny. Strefy objęte poprzednim zestawem, ale pominięte w nowym Profilu, wracają do harmonogramów domyślnych. Aktywacja stosuje bloki obowiązujące w danej chwili, również te rozpoczęte we wcześniejszym dniu, oraz anuluje Wzmocnienia w objętych zmianą strefach. Pauzy globalne i strefowe zachowują pierwszeństwo.

Panel boczny udostępnia **Harmonogramy** jako pełne miejsce planowania. Wybierz harmonogramy domyślne, aby edytować zwykły plan tygodniowy, albo harmonogramy Profili, aby utworzyć Profil i konfigurować po jednym termostacie z zachowaniem harmonogramu domyślnego, harmonogramu Profilu lub Pauzy. Oba źródła udostępniają tę samą oś czasu, opcje bloków, szablony i narzędzia klonowania. Różnią się zasadami zapisu: dzień domyślny zapisuje się bezpośrednio, a metadane Profilu i zachowania termostatów zapisują się razem jako jeden Profil. Profil można nadal aktywować bezpośrednio z jego wiersza. Osobna karta **Tryby** łączy Profile w konfiguracje wielokrotnego użytku i nie powiela edytora harmonogramów.

Gdy Velair przetwarza objęte zmianą strefy, globalny pasek operacji pokazuje bieżącą strefę, liczbę przetworzonych stref i końcowy wynik powodzenia lub częściowego błędu we wszystkich kartach panelu. W Lovelace pojawia się tylko w karcie aktywnej konfiguracji, gdzie aktywuje się Tryby i Profile. Przetworzenie oznacza, że Home Assistant i Velair zakończyły obsługę strefy, także gdy Pauza lub nadpisanie sprawia, że polecenie urządzenia nie jest potrzebne. Nie oznacza osiągnięcia temperatury docelowej przez pomieszczenie. Udane wyniki znikają automatycznie po krótkim potwierdzeniu; wyniki częściowe i nieudane pozostają do zamknięcia. Automatyzacje Home Assistant mogą aktywować jeden Profil przez `velair.activate_profile` albo wybrać konfigurowalną wartość natywnej encji `select.velair_mode`. Szczegóły konfiguracji, automatyzacji, restartu, współdziałania i przenoszenia opisują [Profile klimatyczne](climate-profiles.pl.md).

<a id="external-schedule-execution"></a>
## Zewnętrzne wykonywanie harmonogramów

Zwykle Velair zapisuje tygodniowy plan strefy i wykonuje go przez encję `climate.*` Home Assistant. Gdy systemy zewnętrzne w Ustawieniach wykryją zgodny sterownik, kwalifikująca się strefa może przekazać mu wykonywanie. Velair publikuje wtedy cały efektywny tydzień wybrany przez harmonogram domyślny, Profil lub Tryb. Strefa musi najpierw mieć zapisany efektywny harmonogram zawierający co najmniej jeden blok temperatury. W przeciwnym razie Velair zachowuje wykonywanie lokalne i wyjaśnia wymaganie w Ustawieniach.

Strefa zarządzana zewnętrznie korzysta wyłącznie z harmonogramu. Velair nie wysyła bezpośrednich poleceń dla Wzmocnienia, Pauzy i wznowienia, Regulacji ręcznej, Room Assist ani adaptacyjnego przygotowania. Zachowanie Pauza w Profilu jest niedostępne, a harmonogram domyślny i harmonogram Profilu wybierają tydzień do opublikowania. Ograniczenia konkretnego sterownika są pokazane raz dla każdego używanego systemu w Ustawieniach i egzekwowane także podczas edycji zgodnych harmonogramów domyślnych oraz Profili. Jeśli sterownik wymaga niejawnego punktu ciągłości o północy, edytor uwzględnia go w widocznej liczbie dziennych punktów przełączenia.

Po próbie publikacji w bieżącym uruchomieniu Home Assistant Przegląd pokazuje wyłącznie stan Publishing, Published lub Failed. Published oznacza, że integracja zewnętrzna przyjęła wywołanie usługi; nie potwierdza zastosowania harmonogramu przez fizyczny sterownik. Strefa zachowuje zwykłą aktywność harmonogramu i następne zdarzenie, a kompaktowy wskaźnik External pokazuje sterownik oraz stan publikacji. Velair nie odpytuje go, nie odczytuje harmonogramu zwrotnie i nie ponawia automatycznie. [Poradnik wykonywania zewnętrznego](external-systems.pl.md) opisuje obsługiwane systemy, limity, przekazanie sterowania i bieżący stan walidacji.

<a id="clone-schedules"></a>
## Klonowanie harmonogramów

Pod edytorem można klonować dzień:

- na inne dni tej encji;
- na ten sam dzień innych encji.

Przy klonowaniu na dni tygodnia skróty poniedziałek–piątek, weekend, wszystkie dni i wyczyszczenie wyboru przyspieszają wskazanie celów, pozostawiając możliwość wyboru pojedynczych dni. Zmieniają tylko wybrane cele; klonowanie wymaga jawnego działania i nigdy nie obejmuje dnia źródłowego.

Klonowanie w razie potrzeby najpierw zapisuje oczekujące zmiany. Kopiuje konfigurację źródła wraz z szablonem, rodzajem powiązania, przypisaniami przy powiązaniu samych godzin i odwołaniami do presetów. Klonowanie niezależnego dnia usuwa powiązanie dnia docelowego, ale inne dni zachowują swoje powiązania. Niezgodny cel powoduje odrzucenie klonowania bez zmiany żadnego wybranego celu. Po klonowaniu odłącz powiązanie i zapisz, jeśli nowy dzień ma przestać podążać za szablonem.

<a id="pause-stop-and-resume"></a>
## Pauza, zatrzymanie i wznowienie

Sterowanie globalne:

- Pauza wstrzymuje automatyczne wykonywanie na wybraną liczbę minut;
- zatrzymanie wyłącza automatyczne wykonywanie bezterminowo;
- wznowienie przywraca automatyczne wykonywanie harmonogramu.

Podczas pauzy Przegląd pokazuje pozostały czas i postęp. Czasy pauzy/Wzmocnienia są w minutach; formularz HA pozwala do 10 080 minut, siedmiu dni.

Pauza strefy przez usługi dotyczy jednej encji; reszta działa. Wznowienie stosuje aktywny teraz blok, jeśli istnieje; inaczej nie zmienia encji.

<a id="boost"></a>
## Wzmocnienie

Wzmocnienie tymczasowo zastępuje harmonogram jednej strefy, zostawiając pozostałe.

Przy rozpoczęciu Wzmocnienia Velair przechwytuje możliwy do przywrócenia tryb HVAC oraz temperaturę lub pełny zakres udostępniany przez Home Assistant. Obraz stanu może również zawierać obsługiwane opcje urządzenia, takie jak preset urządzenia, tryb wentylatora, ustawienia oscylacji i wilgotność docelowa. Używa tego obrazu stanu wyłącznie do ustalenia działania po zakończeniu Wzmocnienia.

Podczas przywracania zapisanego stanu Velair nie wysyła ponownie trybów HVAC ani opcji urządzenia, które już mają odpowiednią wartość. Jeśli opcja wymaga zmiany, Velair stosuje ją przed końcową temperaturą lub zakresem, aby preset urządzenia nie zastąpił zamierzonego celu powrotu starszą temperaturą. Wpływ presetu urządzenia na jego własny harmonogram lub czas trwania nadpisania nadal zależy od integracji Home Assistant.

Wzmocnienie jest dostępne w usługach, skryptach, automatyzacjach i pulpitach bez dodawania tych wyzwalaczy do edytora harmonogramu. Możesz je uruchamiać:

- przyciskiem pulpitu;
- po wykryciu ruchu;
- poleceniem głosowym;
- z preferowanym trybem HVAC.

Po wygaśnięciu:

1. Jeśli aktywny blok ma jawny tryb HVAC, Velair stosuje zaplanowaną temperaturę docelową.
2. Jeśli aktywny blok wyłącza urządzenie, Velair je wyłącza.
3. Jeśli nie ma aktywnego bloku, Velair przywraca zapamiętany stan urządzenia.
4. Blok `Keep` również przywraca zapamiętany stan, ponieważ nie określa nowego trybu HVAC po zakończeniu nadpisania.

Velair nie wymyśla celu ogrzewania/chłodzenia bez jawnego określenia.

<a id="startup-behavior"></a>
## Zachowanie przy uruchomieniu

Domyślnie Velair po uruchomieniu Home Assistant odtwarza zapisany stan harmonogramu bez wymuszania nastaw urządzeń. Włącz w Ustawieniach stosowanie aktywnego harmonogramu po uruchomieniu, jeśli chcesz od razu zastosować bieżący blok podczas działania automatyki. Blok rozpoczęty we wcześniejszym dniu nadal obowiązuje do następnego bloku w tygodniu. Aktywne Wzmocnienia są respektowane.

<a id="automation-blueprints"></a>
## Blueprinty automatyzacji

Opcjonalne blueprinty:

- obecność/nieobecność z jednej encji;
- pauza przy otwartych oknach/drzwiach;
- sezonowe Tryby lub inne działania wykonywane jednorazowo po potwierdzeniu nowego zakresu sezonowego, z natychmiastowym zgłaszaniem nieprawidłowych odczytów.

Blueprinty korzystają ze zdarzeń i konfigurowalnych opóźnień, bez ciągłego odpytywania. Blueprint obecności zgłasza niedostępność wybranej grupy, encji szablonowej lub pomocnika, nie wykonując wtedy działań obecności ani nieobecności. Blueprint okien używa zidentyfikowanego powodu Pauzy, więc zamknięcie okna nie usuwa Pauzy ręcznej ani należącej do innej automatyzacji. Kontaktron o nieznanym stanie powoduje jedno opóźnione powiadomienie dla całego skonfigurowanego zestawu. Powiadomienie znika po odzyskaniu danych, a dopóki ich brakuje, wznowienie pozostaje zablokowane. [Blueprinty](blueprints.pl.md) opisują konfigurację, start i jedną automatyzację na strefę.

[Blueprint sezonowy](blueprints/seasonal-climate-selection.pl.md) domyślnie potwierdza nowy zakres sezonowy przez 30 minut. Zmiany w obrębie tego zakresu zachowują pierwotny termin; działania są wykonywane raz przy każdym wejściu w zakres. Przy uruchomieniu sprawdza wyłącznie diagnostykę. Standardowy edytor działań Home Assistant pozwala wybierać Tryby Velair. Jeśli przy łagodnej pogodzie chcesz wyłączyć urządzenia, skonfiguruj odpowiedni Tryb z Pauzą i wyłączeniem, zamiast pozostawiać listę działań pustą.

<a id="portability"></a>
## Przenoszenie konfiguracji

Ustawienia eksportują/importują wersjonowany JSON zawierający:

- harmonogramy;
- szablony;
- wspólne presety;
- ustawienia panelu;
- uczenie przygotowania;
- definicje Profili;
- definicje Trybów.

Bieżący model eksportu 25 zachowuje oba powiązania szablonów, odwołania presetów, zależności nadrzędnego przygotowania, polityki formatów i odniesień, własność grup pomieszczeń i wspólną konfigurację. Przyjęte kotwice wykonania nadrzędnego pozostają lokalne. Eksport harmonogramów lub profili automatycznie dołącza wymagane szablony i presety jako dodatkowe sekcje. Przy danych grup dołączane są wymagane grupy, harmonogramy i profile, także przy eksporcie uczenia. Import sprawdza łączną konfigurację, w tym istniejących użytkowników zastępowanych zasobów. Presety są scalane po stałym kluczu: zgodne zastępowane, nieobecne lokalne zachowane. Dawne kopie nadal można importować; starsze wersje Velair nie importują modelu 25. Zobacz [przykład kopii](linked-schedule-examples.pl.md#back-up-the-whole-setup).

Podczas importu możesz wybrać sekcje do nadpisania. Import zastępuje wybrane dane, więc najpierw wykonaj eksport, jeśli potrzebujesz punktu odzyskania. Definicje Profili i Trybów są przenośne, ale ich aktywny wybór nie jest. Velair zachowuje aktywne identyfikatory Profili, które nadal istnieją, i wraca do harmonogramów domyślnych tylko wtedy, gdy żaden z nich nie pozostał.

Każdy nowy eksport zapisuje jednostkę temperatury. Przy imporcie pliku z innego systemu jednostek Velair przelicza wybrane wartości temperatury na bieżącą jednostkę Home Assistant. Wartości powiązane z dostępnym urządzeniem są dopasowywane do jego efektywnego kroku nastawy; niezależne wartości korzystają z bezpiecznej precyzji, gdy nie ma wspólnego kroku urządzeń. Ręczny zastępczy krok strefy jest przenośny, ale ostatni krok zaobserwowany w lokalnej encji celowo nie jest eksportowany. Starsze eksporty bez jednostki są wskazywane na ekranie importu i interpretowane jako Celsjusz.

Uczenie dopasowuje się według dokładnego identyfikatora jednostki sterowania: encji klimatycznej Home Assistant dla niezależnego urządzenia lub stałego wewnętrznego identyfikatora grupy. Niedopasowane dane są pokazywane przed importem i pomijane. Pasujące zastępują kalibrację; lokalne nieobecne w pliku pozostają bez zmian. Historii grup nie rozdziela się między urządzenia. Przed usuwaniem lub rozwiązaniem przeczytaj [Grupy pomieszczeń](room-groups.pl.md#learning-and-membership-changes).

Przywrócenie kopii uczenia grupy przywraca także wymaganą własność grupy i wspólną konfigurację. Sprawdź zależności w podglądzie importu; nie jest to izolowane przywrócenie kalibracji bez wpływu na skład grupy.

<a id="maintenance"></a>
## Konserwacja

Ustawienia pokazują:

- kompilację interfejsu;
- wersję modelu eksportu;
- wersję zapisu/modelu;
- wersję integracji.

Reset usuwa zapisane dane Velair: harmonogramy, szablony, preferencje panelu, Wzmocnienia i Pauzy, polityki zmian zewnętrznych i Regulacje ręczne, ustawienia Komfortu i Room Assist, przygotowanie temperatury wraz z uczeniem oraz zachowanie przy uruchomieniu. Odtwarza ustawienia domyślne zarządzanych encji odpowiednie dla bieżącej jednostki temperatury. Osobno zapisywane preferencje kategorii Diagnostyki i bieżący dziennik działania nie są częścią resetu. Velair prosi o potwierdzenie przed jego wykonaniem.

<a id="services"></a>
## Usługi

Velair udostępnia:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Usługi dotyczące encji działają tylko na urządzeniach wybranych podczas konfiguracji integracji. Encje niezarządzane przez Velair są odrzucane przed wprowadzeniem zmian.

<a id="velairupdate_block_preset"></a>
### `velair.update_block_preset`

Aktualizuje zapisany wspólny preset przy użyciu stałego `preset_key`. Aktualizacja częściowa zachowuje pominięte pola; jawne zastąpienie może zmienić rodzaj działania. Zmiany obejmują wszystkie odwołania i korzystają ze zwykłej walidacji, zasad pierwszeństwa nadpisań oraz ponownego przeliczenia przygotowania. [Automatyzacje presetów](preset-automations.pl.md) zawierają opis pól oraz przykłady temperatury na zewnątrz, zakresów, opcji urządzenia i wyłączenia z przywróceniem. Usługa zmienia wspólną definicję; nie wybiera innego presetu dla bloku.

<a id="velairactivate_profile"></a>
### `velair.activate_profile`

Aktywuje jeden zapisany Profil klimatyczny i od razu stosuje jego zachowanie obowiązujące w danej chwili. Zastępuje cały aktywny zestaw Profili; strefy nieobjęte wybranym Profilem wracają do swoich harmonogramów domyślnych. Użyj stałego identyfikatora Profilu pokazywanego przez Velair, a nie jego nazwy, którą można edytować. Bezpośrednia aktywacja ustawia wybór Trybu na `Manual`. Pominięcie `profile_id` nadal przywraca harmonogramy domyślne dla zgodności z wcześniejszymi automatyzacjami; w nowych używaj jawnie `velair.deactivate_profile`.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>
### `velair.deactivate_profile`

Dezaktywuje wszystkie aktywne Profile i od razu przywraca harmonogram domyślny każdej strefy.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>
### `velair.set_temperature`

Ustawia jedną zarządzaną encję klimatu na pojedynczą temperaturę albo dolną i górną granicę zakresu. `hvac_mode` jest opcjonalny. To wygodna usługa ograniczona do Velair, a nie zastępstwo dla `climate.set_temperature` Home Assistant. Różni się tym, że:

- przyjmuje tylko encje klimatu zarządzane przez Velair;
- sprawdza temperaturę docelową względem znanych Velair możliwości i limitów urządzenia;
- korzysta z zasad zastępczego wyboru HVAC Velair, gdy podano tryb lub trzeba włączyć urządzenie.

Korzystaj z natywnych usług Home Assistant do ogólnego sterowania, a z usług Velair, aby ograniczyć działanie do zarządzanych urządzeń. Możesz też podać opcjonalne pola `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` i `humidity`. Velair stosuje tylko te, które obsługuje docelowa encja klimatu.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Dla zakresu pomiń `temperature`, podaj obie granice:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

Pole `temperature` i pola zakresu wzajemnie się wykluczają. Obie granice zakresu trzeba podać razem.

<a id="velairset_hvac_mode"></a>
### `velair.set_hvac_mode`

Usługa ustawia jeden publikowany tryb inny niż `off`, bez temperatury docelowej. Przyjmuje tylko lokalnie zarządzane urządzenia, sprawdza tryb względem ich możliwości i rejestruje polecenie jako działanie Velair, aby nie zostało pomylone ze zmianą zewnętrzną.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Używaj tej usługi, gdy automatyzacja Velair ma zmienić tylko tryb HVAC. Wywołanie nie zawiera pojedynczej temperatury ani zakresu, choć integracja lub urządzenie mogą wewnętrznie zmienić swój stan przy zmianie trybu. Udane przekazanie wyłącza aktywne Room Assist, ponieważ Velair nie zarządza już temperaturą docelową tego polecenia. Nieudane przekazanie pozostawia Room Assist bez zmian i nie emituje zdarzenia udanego zastosowania celu. Do ogólnego sterowania poza Velair używaj natywnego `climate.set_hvac_mode` Home Assistant. Tryb `off` jest celowo odrzucany; dla tego osobnego zamiaru użyj odpowiedniej Pauzy, harmonogramu albo działania urządzenia.

<a id="velairapply_schedule"></a>
### `velair.apply_schedule`

Od razu stosuje aktualnie aktywny blok harmonogramu. Jeśli pominiesz `entity_id`, Velair zastosuje aktywny blok do wszystkich zarządzanych encji klimatu.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>
### `velair.boost`

Tymczasowo nadpisuje ustawienia jednej encji klimatu. Gdy Wzmocnienie wygaśnie, Velair stosuje aktywną temperaturę docelową wyraźnie określoną w harmonogramie, jeśli taka istnieje. Jeśli nie ma takiego celu, przywraca stan urządzenia zapamiętany przed rozpoczęciem Wzmocnienia.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Przed zastosowaniem Wzmocnienia Velair zapisuje stan urządzenia, który można potem przywrócić. Odrzuca Wzmocnienie, gdy encja jest niedostępna i nie można bezpiecznie zapamiętać tego stanu.

Wzmocnienie z zakresem korzysta z `target_temp_low` i `target_temp_high` zamiast `temperature`, zgodnie z tymi samymi zasadami co `velair.set_temperature`.

<a id="velaircancel_boost"></a>
### `velair.cancel_boost`

Anuluje aktywne Wzmocnienie przed upływem jego czasu. Powrót przebiega tak samo jak przy zwykłym wygaśnięciu: Velair stosuje aktywny cel wyraźnie określony w harmonogramie, jeśli taki istnieje. W przeciwnym razie, także przy bloku `Keep`, przywraca zapisany stan urządzenia, w tym obsługiwane opcje urządzenia. Wywołanie bez aktywnego Wzmocnienia nie ma skutku.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>
### `velair.enable_room_sensor_assist`

Włącza wspomaganie zarządzanej encji z już skonfigurowanym czujnikiem Room Assist.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>
### `velair.disable_room_sensor_assist`

Wyłącza Asystenta czujnika pokojowego dla jednej zarządzanej encji klimatu. Jeśli Velair stosował temperaturę skorygowaną przez wspomaganie, przywraca aktualną temperaturę docelową harmonogramu.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>
### `velair.pause`

Wstrzymuje automatyczne wykonywanie harmonogramu. Pomiń `duration_minutes`, aby zatrzymać je bezterminowo.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>
### `velair.resume`

Wznawia automatyczne wykonywanie i stosuje bieżący harmonogram.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>
### `velair.pause_zone`

Wstrzymuje automatyczne wykonywanie harmonogramu jednej zarządzanej encji klimatu, gdy reszta Velair nadal działa. Pomiń zarówno `duration_minutes`, jak i `until_next_block`, aby wstrzymać strefę bezterminowo.

Ustaw `until_next_block: true`, aby zakończyć tę pauzę na początku następnego bloku efektywnego harmonogramu strefy. Używa nominalnej godziny bloku, nie wcześniejszego początku adaptacyjnego przygotowania. Termin jest ustalany przy wywołaniu i przetrwa restarty; późniejsza edycja harmonogramu go nie przesuwa. Nie można łączyć z `duration_minutes`. Bez przyszłego bloku wywołanie kończy się błędem bez zmiany strefy. Inne powody pauzy nadal utrzymują strefę wstrzymaną, dopóki również się nie zakończą.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  pause_id: external_control
  action: none
  until_next_block: true
```

Opcjonalne pole `action` przyjmuje:

- `none`: pozostawia encję klimatu dokładnie w obecnym stanie i tylko zatrzymuje jej automatyczne zmiany przez Velair;
- `turn_off`: od razu wyłącza urządzenie i utrzymuje Pauzę.

Automatyzacja może też wysłać opcjonalne `pause_id` o długości od 1 do 128 znaków: liter, cyfr, kropek, podkreśleń, dwukropków lub myślników, zaczynające się od litery albo cyfry. Pauza z identyfikatorem dodaje powód bez zastępowania powodów o innych identyfikatorach. Ponowne użycie tego samego identyfikatora aktualizuje tylko ten powód, a dokładne powtórzenie nie ma skutku. Wywołania bez `pause_id` zachowują pierwszeństwo ręczne i zastępują wszystkie powody jedną ręczną Pauzą.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>
### `velair.resume_zone`

Wznawia automatyczne wykonywanie harmonogramu jednej zarządzanej encji klimatu. Domyślnie Velair stosuje aktualnie aktywny blok tej encji, jeśli taki istnieje. Jeśli w danej chwili żaden blok nie obowiązuje, pozostawia urządzenie bez zmian.

Po podaniu `pause_id` Velair usuwa tylko wskazany powód. Inne powody nadal utrzymują Pauzę, a harmonogram zostaje zastosowany dopiero po zakończeniu ostatniego z nich. Użyj `resume_all: true`, aby jawnie usunąć każdy powód. Pominięcie obu pól zachowuje wcześniejsze działanie wznawiające wszystkie powody. Pól nie można łączyć, a `resume_all: false` bez identyfikatora jest odrzucane. Powody wygasają niezależnie. Jeśli choć jeden pozostały powód używa `turn_off`, efektywne działanie Pauzy nadal oznacza wyłączenie. Wzmocnienia są odrzucane, gdy strefa jest wstrzymana.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>
### `velair.set_daily_schedule`

Zastępuje harmonogram jednego dnia tygodnia dla jednej zarządzanej encji klimatu.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Bloki harmonogramu mogą zawierać opcjonalne wartości `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` i `humidity`. Wartości nieobsługiwane przez docelową encję są usuwane przed zapisaniem lub zastosowaniem harmonogramu.

Użyj `action: set_climate_options` z co najmniej jednym z tych pól, bez temperatury ani `hvac_mode`, aby wywołać tylko odpowiednie usługi Home Assistant. Na przykład:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>
### `velair.copy_day_schedule`

Kopiuje zapisany dzień harmonogramu domyślnego wraz z powiązaniem z szablonem i odwołaniami do presetów na wybrane dni tygodnia. Pomiń `target_entity_ids`, aby kopiować w obrębie urządzenia źródłowego, albo podaj tę listę, aby kopiować do innych zarządzanych urządzeń. Każda wybrana kombinacja urządzenia i dnia jest sprawdzana i zapisywana w jednej transakcji.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Aby skopiować tę samą konfigurację poniedziałku do innych termostatów:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

Usługa kopiuje ostatnią zapisaną konfigurację źródła pod blokadą konfiguracji. Opcjonalne `expected_revision` odrzuca operację, jeśli konfiguracja się zmieniła; panel automatycznie przekazuje bieżącą rewizję. Profile są edytowane i zapisywane przez osobny proces zapisu całego Profilu. Kopiowanie zapisanego niezależnego dnia usuwa powiązania z szablonami w wybranych dniach docelowych; pozostałe dni zachowują konfigurację.

<a id="velairclear_schedule"></a>
### `velair.clear_schedule`

Usuwa harmonogram jednego dnia tygodnia. Pomiń `weekday`, aby usunąć harmonogramy wszystkich dni tej zarządzanej encji klimatu.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>
## Zdarzenia automatyzacji

Velair emituje także zdarzenia Home Assistant, których można używać jako wyzwalaczy automatyzacji. Zdarzenia są chwilowe: nie są zapisywane jako konfiguracja i nie zastępują encji diagnostycznych.

Wszystkie zdarzenia działania używają tego samego typu zdarzenia Home Assistant:

```text
velair_event
```

Pole `event` identyfikuje zmiany Profili, harmonogramu, cele, plany/obserwacje adaptacyjne, Komfort, Room Assist, Wzmocnienia i pauzy. [Zdarzenia automatyzacji](automation-events.pl.md) opisują emisję, deduplikację, pola i pełny przykład każdego typu.

