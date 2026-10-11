<a id="environmental-comfort"></a>
# Komfort otoczenia
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Domyślny zakres komfortowej temperatury wynosi `20–24 °C`. W instalacjach używających Fahrenheita jest to `68–75 °F`, z granicami zaokrąglonymi do wartości bez części dziesiętnej.

Progi Komfortu używają jednostki Home Assistant i są migrowane lub importowane z pozostałymi zapisanymi danymi temperatur Velair. Odczyt czujnika z inną zadeklarowaną jednostką jest przeliczany przed porównaniem z progami Komfortu zarządzanej encji.

Komfort otoczenia daje każdej zarządzanej encji czytelny opis pomieszczenia zamiast ogólnego poziomu ostrzeżenia.

Monitoruje lokalne odczyty temperatury, wilgotności i CO2. Nie zmienia harmonogramów ani nie steruje automatycznie urządzeniami. Velair udostępnia ocenę w panelu, kartach Lovelace i zdarzeniach Home Assistant, aby automatyzacje mogły zdecydować o działaniu.

<a id="sources"></a>
## Źródła

Temperatura korzysta z pierwszego dostępnego źródła w tej kolejności:

1. czujnika temperatury wybranego na karcie Komfort;
2. czujnika Room Assist skonfigurowanego dla encji;
3. `current_temperature` encji klimatu.

Wilgotność korzysta z:

1. czujnika wilgotności wybranego na karcie Komfort;
2. zmierzonego atrybutu `current_humidity` encji, jeśli jest dostępny. Atrybut `humidity` to ustawienie docelowe, nie odczyt.

Domyślne `Użyj automatycznego źródła` zachowuje ten automatyczny wybór. Wybierz `Nie monitoruj wilgotności`, jeśli wilgotność nie ma wpływać na warunki otoczenia lub jakość danych encji. Zapisany wybór czujnika pozostaje, ale Velair go nie odczytuje ani nie nasłuchuje przy wyłączonym monitorowaniu wilgotności.

CO2 jest monitorowane tylko po wybraniu czujnika CO2.

Efektywny identyfikator encji jest widoczny pod każdym wyborem źródła. Opcjonalne pomiary bez źródła nie są traktowane jako błędy.

<a id="comfort-models"></a>
## Modele komfortu

Velair oferuje trzy sposoby opisania obszaru temperatury i wilgotności względnej przydatnego dla pomieszczenia. To cel skonfigurowany przez użytkownika, nie uniwersalna ani medyczna definicja komfortu.

- **Proste zakresy** to model domyślny. Jeden zakres temperatury i jeden wilgotności tworzą znany prostokątny obszar docelowy. Istniejące konfiguracje zachowują to zachowanie.
- **Prowadzony zakres psychrometryczny** używa jednego zakresu wilgotności jako odniesienia w środku zakresu temperatury. Velair wykorzystuje fizyczną zależność temperatury i wilgotności względnej, aby automatycznie dostosowywać zakres. Wykres pokazuje zakrzywiony cel zamiast prostokąta. To praktyczna lokalna wskazówka, nie pełny standard komfortu fizjologicznego.
- **Zakresy zależne od temperatury** zachowują zakres temperatury, ale pozwalają określić różne minimalne i maksymalne wilgotności na chłodnym i ciepłym końcu. Velair stopniowo łączy zakresy wilgotności, tworząc pochyły czworokąt zamiast prostokąta.

Na przykład pomieszczenie z `20–24 °C` może akceptować `40–60%` przy `20 °C` i `35–50%` przy `24 °C`. Przy `22 °C` Velair ocenia wilgotność względem wartości pośrednich: `37.5–55%`. Poza zakresem temperatur używa najbliższego końca, zamiast ekstrapolować poza wartości użytkownika.

Bieżący efektywny zakres wilgotności jest widoczny pod mapą. Ten sam zakres obliczony przez backend steruje wyświetlanymi warunkami, podsumowaniem zakresu, encją Warunków otoczenia, zdarzeniami, Diagnostyką i opcjonalnymi wskazówkami zewnętrznymi; klienci nie tworzą drugiej interpretacji. Jeśli temperatura jest brakująca lub nieaktualna, Velair może pokazać aktualną wilgotność, ale nie klasyfikuje jej i nie tworzy wskazówek wilgotności do czasu obliczenia zakresu.

Model prowadzony wymaga rozpoznawalnego źródła wilgotności z zarządzanej encji lub wybranego czujnika Home Assistant. Opcja jest niedostępna, dopóki źródła nie rozpoznano. Jeśli źródło chwilowo znika, Velair zachowuje model i ustawienia oraz czeka na bieżące dane, zamiast zmieniać model.

Niestandardowe zakresy wilgotności na końcach mogą rosnąć, maleć lub pozostawać równe wraz z temperaturą. Velair nie narzuca kierunku, ponieważ budynki i mieszkańcy różnią się. Model prowadzony jest prostym wyborem, gdy tego samego procentu wilgotności względnej nie należy traktować identycznie przy każdej temperaturze. Wybierz model niestandardowy tylko wtedy, gdy zmierzone zachowanie pomieszczenia uzasadnia kontrolę obu końców.

Przed dostosowaniem końcowych zakresów zmiana wilgotności modelu prostego utrzymuje zgodność obu końców z nią. Po dostosowaniu zakresu zależnego od temperatury Velair zachowuje go przy przełączaniu modeli, aby nie tracić alternatywnej konfiguracji.

<a id="additional-environmental-information"></a>
## Dodatkowe informacje o otoczeniu

Konfiguracja Komfortu może opcjonalnie dodać trzy odczyty do istniejących informacji o encji:

| Odczyt | Co dodaje w Velair |
| --- | --- |
| **Punkt rosy** | Zwięzła informacja o zbliżaniu się powietrza do warunków kondensacji. Nie potwierdza skraplania, bo Velair nie zna temperatury ścian, okien ani innych powierzchni. |
| **Wilgotność bezwzględna** | Masa pary wodnej w metrze sześciennym powietrza, w `g/m³`. W przeciwieństwie do wilgotności względnej nie jest procentem nasycenia powietrza. Velair nie narzuca uniwersalnego dobrego/złego zakresu. |
| **Humidex** | Dodatkowy wskaźnik odczuwalnego ciepła z temperatury i wilgotności. Velair pokazuje wartość, ale nie zamienia opublikowanych przedziałów w zalecenia ani nie traktuje jej jako pełnej oceny komfortu w domu. |

Włącz tylko odczyty przydatne w pulpicie lub automatyzacjach. Nie są wymagane dla zwykłych warunków Komfortu i każdy jest domyślnie wyłączony.

Rozwinięty widok encji oddziela bieżące informacje od konfiguracji. Włączone odczyty tworzą zwartą, responsywną grupę bezpośrednio pod mapą temperatury/wilgotności i skalą CO2. Każdy pokazuje bieżącą wartość lub stan dostępności i dostępną pomoc informacyjną; nie ma przełącznika ani wyboru źródła. Wyłączone odczyty nie pozostawiają pustych kart lub miejsc.

Wszystkie ustawienia są w **Konfiguracji komfortu**, domyślnie zwiniętej, aby najważniejsza była bieżąca ocena. Sekcje rozdzielają źródła, model, jego preferencje, zalecenia i dodatkowe informacje. Ustawienia wskaźników pochodnych zawierają tylko włączenie i źródło, nie drugi bieżący odczyt. Panel konfiguracji pozostaje dostępny przy wyłączonym monitorowaniu, aby przygotować encję wcześniej. Jego rozwinięcie lub zwinięcie to lokalny wybór interfejsu, nie zapisana konfiguracja.

Każdy wskaźnik jest domyślnie wyłączony i ma jeden wybór źródła. Pierwsza opcja to **Calculated by Velair**, pozostałe to zgodne czujniki Home Assistant, więc odczyt zewnętrzny nie wymaga drugiego wyboru encji:

- **Calculated by Velair** wykorzystuje efektywne odczyty temperatury i wilgotności Komfortu. Jeśli wilgotność nie jest monitorowana lub brakuje wejścia, obliczony odczyt jest brakujący.
- **Home Assistant entity** odczytuje istniejącą encję `sensor.*`. Może pochodzić z Thermal Comfort, szablonu lub innej integracji; Thermal Comfort nie jest wymagane ani specjalnie wykrywane.

Zewnętrzny czujnik punktu rosy musi publikować `°C` lub `°F`. Velair pokazuje go w jednostce encji klimatu. Czujnik wilgotności bezwzględnej musi publikować `g/m³` lub `mg/m³`; Velair pokazuje `g/m³`. Czujnik Humidex może publikować typową reprezentację `°C` lub `°F` używaną przez encje temperatury albo wartość bez jednostki. Velair normalizuje ją do kanonicznego bezwymiarowego Humidex, także w instalacjach Fahrenheita. Normalizuje prawidłowe odczyty i zgłasza brakujące, nieaktualne lub błędne źródła bez zmiany istniejącej oceny warunków lub jakości danych. Włączony wskaźnik zewnętrzny można zapisać bez wybranej encji; ten poprawny niekompletny stan jest brakujący i przetrwa eksport/import. Stany `unknown` i `unavailable` są brakujące, a wartości nieliczbowe, niezgodne jednostki i ujemna wilgotność bezwzględna są błędne.

Wskaźniki są obserwacyjne. Nigdy nie zmieniają harmonogramu, trybu HVAC, celu, korekty Room Assist ani decyzji przygotowania. W szczególności Humidex uzupełnia rzeczywistą temperaturę i wilgotność, nie zastępując żadnej, aby nie liczyć wilgotności dwukrotnie.

<a id="comfort-insights"></a>
## Informacje o komforcie

Velair zachowuje skonfigurowane warunki temperatury/wilgotności jako główne podsumowanie i grupuje nad odczytami zwarte karty kontekstu. Wyjaśniają przekroczenia CO2, istotny wzrost Humidex i bieżącą możliwość lub kompromis wietrzenia, bez powtarzania warunków i zastępowania mapy lub skali CO2.

Sformułowania są ostrożne. Informacja Humidex pojawia się tylko, gdy odczuwalne ciepło jest co najmniej 1 °C powyżej temperatury powietrza. Podwyższony lub zły CO2 również może dodać informację. Punkt rosy i wilgotność bezwzględna pozostają odczytami zamiast stałych komunikatów: przyciski informacji wyjaśniają odpowiednio potencjalny próg kondensacji na powierzchni i ilość pary wodnej. Pomoc jest dostępna po najechaniu, ustawieniu fokusu klawiaturą lub dotknięciu. Brakujące, nieaktualne i błędne odczyty są pomijane. Dane zewnętrzne nie zmieniają warunków w domu ani sterowania.

Bieżące wartości są w rozwiniętym wierszu encji na karcie **Komfort**. Widok Lovelace ma ten sam układ. Gdy Komfort jest włączony w karcie jednej encji, rozwinięte podsumowanie obejmuje każdy włączony aktualny odczyt pochodny. Edytor karty może również dodać te odczyty do zwiniętego wiersza Komfortu w Bieżącym stanie, jeśli pulpit potrzebuje gęstszych informacji. Brakujące, nieaktualne i błędne odczyty pozostają widoczne ze statusem zamiast starej lub wymyślonej liczby. Humidex pokazuje się obok temperatury z kierunkowym porównaniem; w Fahrenheitach skaluje się tylko różnicę, nigdy nie dodaje 32. Różnice pojawiają się też w kontekstowym komunikacie Humidex w jednostce strefy z jedną cyfrą dziesiętną. Sam Humidex jest bezwymiarowym wskaźnikiem odczuwalnego ciepła odnoszącym się do Celsjusza: nie jest fizyczną temperaturą i Velair nie dopisuje jednostki.

Przy aktualnym Humidex panel pokazuje zwartą skalę porównania. Dwa znaczniki określają temperaturę powietrza i Humidex, a podświetlony pas to skonfigurowany zakres temperatur. Status określa, czy Humidex jest poniżej, wewnątrz lub powyżej zakresu; nie twierdzi, że pomieszczenie jest komfortowe lub niebezpieczne. Skala sięga 5 °C poniżej i powyżej zakresu dla czytelności bliskich różnic. W Fahrenheitach etykiety wartości bezwzględnych przelicza się normalnie, a różnicę tylko mnoży przez `9 / 5`; liczba Humidex pozostaje bez jednostki. Brak lub błąd danych nie tworzy wymyślonej pozycji. Punkt rosy jest neutralnie opisywany jako powyżej lub poniżej temperatury powietrza. Wilgotność bezwzględna pozostaje neutralnym odczytem `g/m³`. Definicje są pod dostępnymi przyciskami informacji, aby panele były zwarte.

Główne podsumowanie zawsze zaczyna od fizycznych Warunków otoczenia na podstawie wybranych odczytów. Jeśli Humidex jest włączony i jego pozycja w zakresie różni się od temperatury powietrza, drugi znacznik **Humidex** wskazuje odczuwalne ciepło poniżej, wewnątrz lub powyżej zakresu. Zachowuje to widoczne fizyczne warunki, zamiast zastępować je pochodną interpretacją. Panel Humidex wyjaśnia zmierzoną różnicę bez nazywania pomieszczenia gorącym, zimnym lub komfortowym. Brakujące lub błędne dane pochodne nie zmieniają warunków fizycznych.

Opisana niżej zgodna wartość Warunków otoczenia nie zmienia się. Istniejące automatyzacje nadal mogą jej używać; Humidex i podsumowanie zakresu to dodatkowy kontekst obserwacyjny, który nigdy nie steruje encją.

<a id="indoor-vs-outdoor"></a>
## Wewnątrz i na zewnątrz

Opcjonalne porównanie z warunkami na zewnątrz dodaje kontekst bez zmiany oceny Komfortu w pomieszczeniu. Włącz **Indoor vs outdoor** w zwiniętej **Konfiguracji komfortu**, wybierz czujnik mierzący temperaturę na zewnątrz i opcjonalnie czujnik wilgotności na zewnątrz. Wyłączenie porównania zachowuje wybór czujników, dzięki czemu można je ponownie włączyć bez powtarzania konfiguracji.

Panel bieżących danych jest osobny od wykresu. Pokazuje temperaturę wewnętrzną i zewnętrzną oraz różnicę, wilgotność bezwzględną w obu miejscach i wilgotność względną, jaką powietrze zewnętrzne miałoby po osiągnięciu bieżącej temperatury wewnętrznej. Oba obszary są symetryczne na szerokich ekranach i ułożone pionowo na telefonie.

Obie wilgotności bezwzględne pochodzą bezpośrednio z backendu. Jeśli starszy backend nie podaje wartości wewnętrznej, interfejs pokazuje brak dostępności zamiast odtwarzać odczyt fizyczny z zaokrąglonych różnic.

Velair może pokazać jedną ostrożną możliwość lub kompromis wietrzenia z backendu we wspólnym obszarze informacji nad odczytami. Możliwość oparta tylko na temperaturze wyraźnie informuje o braku danych wpływu na wilgotność. Brakujące, nieaktualne, błędne i niemonitorowane odczyty są stanami, nie ponownie używanymi wartościami lub fałszywymi porównaniami.

Velair tworzy też jeden czujnik wyliczeniowy **Możliwość wentylacji** dla każdej zarządzanej encji klimatu. Udostępnia on bieżący wynik pulpitom i automatyzacjom także po restarcie, bez zmiany zgodnego stanu Warunków otoczenia. Zobacz [Możliwość wentylacji](zone-sensors.pl.md#ventilation-opportunity).

**Ventilation guidance** w tym samym panelu pozwala określić wielkość użytecznej różnicy, zanim Velair pokaże kontekst:

| Ustawienie | Domyślnie | Co filtruje |
| --- | --- | --- |
| Różnica temperatury | `1 °C` / `1.8 °F` | Małe różnice temperatury wewnątrz i na zewnątrz. |
| Różnica skorygowanej wilgotności | `5` punktów procentowych | Małe przewidywane zmiany wilgotności względnej po osiągnięciu przez powietrze zewnętrzne temperatury wewnętrznej. |
| Różnica zawartości pary wodnej | `1 g/m³` | Małe różnice wilgotności bezwzględnej, które mogłyby wyglądać korzystnie tylko z powodu temperatury. |

Ustawienia wilgotności pojawiają się po wyborze zewnętrznego czujnika wilgotności. Ich wartości pozostają, jeśli później wyłączysz czujnik lub porównanie. Niższe wartości zwiększają czułość wskazówek; wyższe wymagają wyraźniejszej różnicy. Marginesy nie zastępują zakresów Komfortu: powietrze zewnętrzne nadal musi przybliżać pomieszczenie do właściwego zakresu.

Funkcja jest wizualna i zdarzeniowa. Nie otwiera ani nie zamyka okien i nie zmienia temperatury docelowej, trybu, harmonogramu, pauzy ani wzmocnienia. Używa tylko wybranych encji `sensor.*` i nie zastępuje ich danymi pogodowymi.

Velair nie tworzy trzech dodatkowych encji pośredniczących. Włączone odczyty są dostępne w `derived_metrics` istniejącego czujnika strefy **Warunki otoczenia**, API harmonogramu, Diagnostyce i zdarzeniu `comfort_assessment_changed`. Zachowuje to jedno źródło danych, a nadal umożliwia użycie w pulpitach i automatyzacjach. Pełne stany, atrybuty, bezpieczne szablony i wybór encji lub zdarzenia opisują [Warunki otoczenia](zone-sensors.pl.md#environmental-condition).

<a id="environmental-conditions"></a>
## Warunki otoczenia

Temperatura i wilgotność są klasyfikowane względem skonfigurowanych zakresów i łączone w jeden zgodny stan:

| Temperatura | Wilgotność | Warunki |
| --- | --- | --- |
| Poniżej zakresu | Poniżej zakresu | `Zimno i sucho` |
| Poniżej zakresu | W zakresie | `Zimno` |
| Poniżej zakresu | Powyżej zakresu | `Zimno i wilgotno` |
| W zakresie | Poniżej zakresu | `Suche powietrze` |
| W zakresie | W zakresie | `Komfortowo` |
| W zakresie | Powyżej zakresu | `Wilgotno` |
| Powyżej zakresu | Poniżej zakresu | `Gorąco i sucho` |
| Powyżej zakresu | W zakresie | `Gorąco` |
| Powyżej zakresu | Powyżej zakresu | `Gorąco i wilgotno` |

Jeśli dostępny jest tylko jeden użyteczny pomiar, Velair zgłasza to, co może potwierdzić, bez deklarowania pełnego komfortu:

- `Temperatura w zakresie`;
- `Wilgotność w zakresie`;
- `Zimno`, `Gorąco`, `Suche powietrze` lub `Wilgotno`.

Bez użytecznych odczytów warunki to `Żadnych odczytów`. Jeśli wszystkie monitorowane źródła są nieaktualne, to `Odczyty nieaktualne`.

<a id="air-quality"></a>
## Jakość powietrza

CO2 pozostaje osobne od temperatury i wilgotności, bo opisuje jakość powietrza, nie komfort cieplny:

- `Dobre powietrze`: poniżej progu uwagi;
- `Podwyższony poziom CO2`: na progu uwagi lub powyżej;
- `Zła jakość powietrza`: na progu złej jakości lub powyżej;
- `CO2 niedostępne`: skonfigurowanego źródła nie można teraz odczytać.

Pomieszczenie może więc pokazywać jednocześnie np. `Gorąco i wilgotno` i `Podwyższony poziom CO2`.

<a id="data-quality"></a>
## Jakość danych

Velair udostępnia jedną wartość jakości danych:

- `complete`: każdy monitorowany pomiar ma aktualny odczyt z niedawnym raportem Home Assistant;
- `unverified`: wszystkie pomiary można wykorzystać, ale co najmniej jeden nie ma możliwego do potwierdzenia czasu raportu;
- `partial`: ocena jest dostępna, ale co najmniej jeden monitorowany odczyt jest brakujący lub nieaktualny;
- `stale`: nie ma aktualnego odczytu i wszystkie monitorowane źródła są nieaktualne;
- `unavailable`: z innego powodu nie można wykorzystać żadnego aktualnego odczytu.

Panel grupuje użyteczne odczyty o niezweryfikowanej aktualności w sekcji **Świeżość danych**, zamiast powtarzać uwagę przy każdym odczycie pochodnym. Karta Komfortu Lovelace ukrywająca konfigurację pokazuje jedno podsumowanie nad odczytami; Diagnostyka również udostępnia kontekst aktualności. Zwinięta lista stref pomija ten rutynowy status dla czytelności. To prawidłowa konfiguracja automatycznego źródła encji, nie błąd. Brakujące i nieaktualne odczyty nadal pokazują ostrzeżenie na liście.

<a id="visual-status"></a>
## Stan wizualny

Zwinięty wiersz encji pokazuje:

- warunki otoczenia;
- osobny znacznik Humidex tylko, gdy aktualna temperatura i Humidex zajmują różne części zakresu;
- opcjonalne znaczniki Humidex, punktu rosy i wilgotności bezwzględnej, jeśli edytor karty jednej encji włącza dodatkowe odczyty w zwiniętym widoku;
- jakość powietrza przy monitorowanym CO2;
- ikonę ostrzeżenia przy niekompletnych odczytach;
- przełącznik Komfortu.

Rozwinięty stan bieżący używa:

- tych samych fizycznych warunków jako głównego nagłówka;
- mapy temperatury/wilgotności przy obu aktualnych odczytach;
- pojedynczej skali poziomej przy aktualnej tylko temperaturze lub wilgotności;
- osobnej skali CO2 przy aktualnym monitorowanym CO2.

Mapa ma dziewięć subtelnych obszarów zimna, gorąca, suchości, wilgotności i połączeń. Podświetlony cel zawsze odpowiada modelowi: prostokąt dla prostego, krzywa backendu dla prowadzonego i skonfigurowany wielokąt dla niestandardowego. Mały znacznik pokazuje pozycję; etykieta zawiera oba odczyty.

Na skalach pojedynczego pomiaru zielona część środkowa jest skonfigurowanym zakresem komfortu. Etykiety minimum i maksimum odpowiadają jej początkowi i końcowi; części zewnętrzne dają kontekst wartości poniżej i powyżej.

<a id="lovelace"></a>
## Lovelace

Widok Komfortu jest dostępny jako karta Lovelace:

```yaml
type: custom:velair-card
view: comfort
```

Kartę można ograniczyć do wybranych encji:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Można też ukrywać lokalne sekcje UI, jeśli pulpit ma pokazywać tylko istotne odczyty:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Pominięte opcje `show_comfort_*` domyślnie mają `true`. Gdy `show_comfort_configuration` to `false`, karta ukrywa cały panel konfiguracji, zachowując włączone odczyty pochodne w ocenie.

Widoczność temperatury, wilgotności i CO2 wpływa tylko na wykresy danej karty Lovelace. Nie zmienia konfiguracji Komfortu, źródeł, progów, zdarzeń ani czujników Home Assistant. Jeśli widoczne są temperatura i wilgotność, ale istnieje tylko jeden aktualny odczyt, karta używa tej samej skali pojedynczego pomiaru co główny panel.

<a id="freshness"></a>
## Aktualność

`Nieaktualne po` to maksymalny czas od ostatniego raportu stanu wybranego czujnika do Home Assistant (`last_reported`). Powtórzenie wartości odświeża czas raportu i aktualność. Velair nasłuchuje raportów i planuje następne wygaśnięcie, więc panel, czujniki i zdarzenia mogą pokazać `stale` po terminie bez kolejnego raportu.

Ustawienie ma osobną sekcję **Świeżość danych** po wyborze źródeł. Grupuje też bieżące odczyty o niezweryfikowanej aktualności, w tym pochodne i zewnętrzne, bez powtarzania obliczonych wartości zewnętrznych. Wymienia bezpośrednie źródła objęte limitem, w tym czujnik pokojowy Room Assist, czujnik CO2, czujniki na zewnątrz oraz osobne czujniki odczytów pochodnych. Czujniki na zewnątrz mogą utrzymać pole aktywne nawet wtedy, gdy temperatura i wilgotność wewnątrz pochodzą z encji klimatu. Limit nie powoduje oznaczenia tych odczytów encji jako nieaktualnych. Możesz ustawić go przed włączeniem Komfortu. Bez bezpośredniego źródła pole jest wyłączone z wyjaśnieniem, a wartość zachowana dla przyszłego wyboru.

Automatyczne atrybuty temperatury i wilgotności `climate.*` nie mają niezależnego czasu raportu. Velair zachowuje prawidłową wartość i oznacza aktualność jako `unverified`; zmiana celu encji nie potwierdza nowego pomiaru. Wybierz oryginalny czujnik temperatury lub wilgotności, jeśli istnieje. Jeśli wybrany czujnik nie ma `last_reported`, jego wartość też jest `unverified`. Encja `unavailable` lub `unknown` nie daje użytecznego odczytu, nawet przy zachowanych starych atrybutach liczbowych.

Raport Home Assistant nie dowodzi ponownego fizycznego pomiaru. Integracja raportująca tylko przy zmianie wartości zostanie ostatecznie oznaczona jako nieaktualna przy stałej wartości.

<a id="automation-event"></a>
## Zdarzenie automatyzacji

Gdy zmienią się warunki, jakość powietrza, jakość danych, problemy danych lub znaczeniowy stan włączonego wskaźnika pochodnego, Velair emituje:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Przykładowe dane:

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "freshness": "reported",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "freshness": "reported",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "freshness": "reported",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "freshness": "reported",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Przykładowa automatyzacja:

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Otwarcie lub odświeżenie panelu nie emituje zdarzenia. Ruch liczbowy oryginalnych lub pochodnych odczytów nie tworzy duplikatów przy niezmienionej klasyfikacji i dostępności. Panel i atrybuty czujników nadal odświeżają najnowsze wartości.

Użyj `range_status_changed: true`, aby reagować tylko na zmianę zbiorczego statusu zakresu. Użyj `range_summary_changed: true`, jeśli istotne są też pozycje pojedynczych wartości lub ich relacja cieplna. Inne zmiany Komfortu mogą emitować to samo zdarzenie z obiema flagami `false`; bieżące i poprzednie podsumowanie jasno pokazują przejście.

Pełne dane, dokładne pola pochodne tworzące stan znaczeniowy i wspólny wzorzec wyzwalacza `velair_event` opisują [Zdarzenia automatyzacji](automation-events.pl.md#comfort-assessment-changed).

<a id="performance-and-privacy"></a>
## Wydajność i prywatność

Komfort jest domyślnie wyłączony.

Gdy jest wyłączony dla encji, Velair nie rejestruje dla niej nasłuchiwania Komfortu. Przy włączeniu nasłuchuje tylko zarządzanej encji i wybranych lub automatycznie ustalonych czujników, w tym aktywnych zewnętrznych źródeł pochodnych. Natywne wskaźniki wykorzystują istniejące nasłuchiwanie temperatury i wilgotności. Nie ma ciągłego odpytywania.

Wszystkie odczyty i oceny pozostają lokalne w Home Assistant.
