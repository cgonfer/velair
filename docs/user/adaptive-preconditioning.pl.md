<a id="adaptive-preconditioning"></a>
# Adaptacyjne przygotowanie temperatury
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.2 |
| Ostatnia synchronizacja | 2026-10-17 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Adaptacyjne przygotowanie temperatury pozwala Velair rozpocząć ogrzewanie lub chłodzenie przed zaplanowanym blokiem, aby pomieszczenie było bliżej temperatury docelowej w chwili rozpoczęcia bloku.

Na przykład blok o `07:00` z temperaturą `21 °C` oznacza „zbliżyć się do `21 °C` na `07:00`”, a nie „zacząć zmieniać temperaturę na `21 °C` o `07:00`”.

Funkcja działa lokalnie w Home Assistant. Velair zapisuje ustawienia i próbki uczenia w jego pamięci i nigdy nie wysyła historii temperatur, obserwacji ani danych kalibracji do zewnętrznego sterownika. Strefy przekazane do zewnętrznego wykonywania harmonogramów nie korzystają z adaptacyjnego przygotowania; publikowany jest tylko ich efektywny harmonogram tygodniowy.

Blok **Tylko temperatura** nie zezwala na zmianę trybu HVAC. Gdy termostat jest wyłączony, Velair nie rozpoczyna wcześniejszego przygotowania ani nie zbiera próbek uczenia dla tego celu. Zewnętrzne włączenie pozwala przeliczyć przygotowanie dla rzeczywistego zgodnego trybu. Ta opcja nie może zapewnić komfortu na godzinę bloku, dopóki urządzenie pozostaje wyłączone.

<a id="setup"></a>
## Konfiguracja

Karta przygotowania temperatury udostępnia dwa narzędzia w wyborze podsekcji. Domyślnie otwiera adaptacyjne przygotowanie; wybierz Planowany powrót, aby skonfigurować obecność i cotygodniowe powroty oraz zarządzać bieżącą nieobecnością. Bezpośrednie ścieżki panelu to `/velair/preconditioning/preconditioning` i `/velair/preconditioning/planned-return`. Zobacz [Planowany powrót](planned-return.pl.md).

1. Otwórz kartę przygotowania temperatury.
2. Rozwiń encję, którą chcesz skonfigurować.
3. Włącz przygotowanie temperatury.
4. Pozostaw domyślne ustawienia modelu, chyba że masz konkretny powód, aby je dostosować.
5. Opcjonalnie wybierz czujnik temperatury zewnętrznej.

Przygotowanie konfiguruje się osobno dla każdej encji. Uczenie ogrzewania i chłodzenia jest rozdzielone: próbki chłodzenia nie zastępują próbek ogrzewania ani odwrotnie.

Obsługiwane są natywne zakresy `heat_cool`. Jeśli temperatura pomieszczenia jest niższa od dolnej granicy o więcej niż minimalna różnica temperatury, Velair prognozuje względem dolnej granicy i wcześniej uruchamia cały zakres dla ogrzewania. Jeśli jest wyższa od górnej granicy o więcej niż tę różnicę, prognozuje względem górnej i wcześniej uruchamia cały zakres dla chłodzenia. Odczyty wewnątrz zakresu lub martwych stref przy jego granicach zachowują zwykły czas bloku. Velair zawsze wysyła obie granice; nigdy nie sprowadza zakresu do jednej temperatury.

Po rozwinięciu encji każdy obsługiwany tryb pokazuje kartę bieżącej prognozy. Korzysta ona z tych samych danych backendu o następnym zdarzeniu co Przegląd, dzięki czemu pauzy, wzmocnienia, nieobsługiwane tryby i bloki nienadające się do przygotowania są traktowane spójnie. Jeśli istnieje pasujący przyszły blok, karta pokazuje obliczony czas rozpoczęcia, czas docelowy, wyprzedzenie, zaplanowaną temperaturę i tryb oraz informację, czy Velair używa modelu początkowego, czy podobnej lokalnej historii.

Aby sprawdzić konkretną kalkulację, otwórz **Szczegóły obliczeń** w karcie prognozy. Opcjonalna sekcja pokazuje wartości backendu użyte do prognozy: liczby próbek, oszacowanie z zakończonych obserwacji, dolne ograniczenie z częściowych obserwacji, łączny szacunek, zaokrąglenie i końcowe wyprzedzenie. Jest domyślnie ukryta, aby zwykły widok pozostał prosty.

Przygotowanie na zaplanowany powrót jest oddzielone od wyprzedzenia harmonogramu tygodniowego. Dla przyjętego przyszłego powrotu informacje termostatu pokazują stan powrotu, szacowany początek, cel na przybycie i powód wstrzymania lub niedostępności. Przegląd, Planowany powrót i karty termostatów korzystają z tych samych danych backendu; nie jest to kolejne zdarzenie harmonogramu tygodniowego. Pomieszczenie może nadal realizować tryb nieobecności, pokazując oszacowanie przyszłego powrotu. **Przygotowanie** opisuje zamiar sterowania Velair, a nie potwierdzenie odbioru polecenia przez urządzenie ani fizycznego grzania lub chłodzenia. Oś powrotu pokazuje upływ czasu do zapisanego przybycia, a nie procent postępu temperaturowego. Znaczenie stanów opisuje [przygotowanie pomieszczeń](planned-return.pl.md#room-preparation).

<a id="how-it-starts"></a>
## Jak rozpoczyna się przygotowanie

Velair oblicza bieżącą różnicę temperatury dla następnego zaplanowanego bloku z temperaturą.

Dla zakresu `heat_cool` „temperatura docelowa” poniżej oznacza dolną granicę podczas ogrzewania i górną podczas chłodzenia.

Dla ogrzewania:

```text
delta = target temperature - current temperature
```

Dla chłodzenia:

```text
delta = current temperature - target temperature
```

Jeśli różnica jest mniejsza od minimalnej różnicy temperatury, Velair zachowuje zwykły czas bloku i nie rozpoczyna wcześniej.

<a id="schedule-boundaries-and-other-climates"></a>

## Granice harmonogramu i inne urządzenia

Wcześniejszy start w harmonogramie tygodniowym nie może sięgać ani przekraczać bezpośrednio poprzedzającego efektywnego bloku harmonogramu tego samego urządzenia, także bloku `Off`. Jeśli obliczone okno sięga tej granicy lub ją przekracza, Velair zachowuje zwykły czas komfortu. Na przykład przy `Off` o `19:00` i `heat` o `20:00` obliczony start o `18:00` zostaje pominięty: `Off` jest stosowane o `19:00`, a ogrzewanie rozpoczyna się o `20:00`. Blok `Off` o `22:00` poprzedniego wieczoru nie uniemożliwia startu o `05:35` dla `07:00`, jeśli pomiędzy nimi nie ma innego bloku. Reguła dotyczy też chłodzenia i natywnych zakresów `heat_cool`; nie zmienia przewidywań przyjazdu dla planowanego powrotu.

Urządzenie, które już wstępnie ogrzewa lub chłodzi pomieszczenie, nie opóźnia bloków ani wcześniejszych startów innych urządzeń. Jeśli podczas przetwarzania działania zostanie przekroczony czas innego przejścia, Velair ustala aktualnie dozwolony cel dla danego urządzenia zamiast odtwarzać nieaktualne polecenia. Pauzy, podbicia, regulacja ręczna, wyłączone strefy i zewnętrzne wykonywanie harmonogramu nadal określają, czy cel można wysłać. To odzyskiwanie działa podczas pracy harmonogramu; skonfigurowane stosowanie ustawień przy uruchomieniu pozostaje bez zmian.

<a id="initial-model-example"></a>
## Przykład modelu początkowego

Gdy lokalna historia jest niewystarczająca, Velair używa modelu początkowego:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Przykład:

- zaplanowany blok: `21 °C`, `heat`, czas docelowy `07:00`;
- temperatura pomieszczenia: `18 °C`;
- minimalne wyprzedzenie: `10 min`;
- model początkowy: `25 min/°C` lub równoważne `13.89 min/°F`;
- maksymalne wyprzedzenie: `24 h`.

Obliczenie:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair stosuje zaplanowaną temperaturę o `05:35` i zachowuje `07:00` jako widoczny czas docelowego komfortu.

<a id="heating-with-learned-history"></a>
## Ogrzewanie z wykorzystaniem historii uczenia

Po zebraniu dostatecznej liczby udanych obserwacji Velair może używać podobnej lokalnej historii zamiast modelu początkowego.

Przykład:

- zaplanowany blok: `21 °C`, `heat`, czas docelowy `07:00`;
- bieżąca temperatura pomieszczenia: `18.5 °C`;
- bieżąca różnica: `2.5 °C`;
- podobne zakończone obserwacje:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Przy percentylu komfortu ustawionym na `80` Velair wybiera ostrożną wartość z podobnych zakończonych próbek. W tym przykładzie jest to `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair zaokrągla końcowe wyprzedzenie w górę do następnej obsługiwanej minuty harmonogramu, zamiast poniżej obliczonej wartości.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Przykład chłodzenia

Przykład:

- zaplanowany blok: `23 °C`, `cool`, czas docelowy `22:00`;
- temperatura pomieszczenia: `27 °C`;
- minimalne wyprzedzenie: `10 min`;
- model początkowy: `25 min/°C`;
- maksymalne wyprzedzenie: `24 h`.

Obliczenie:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Gdy encja zbierze później dostatecznie dużo obserwacji chłodzenia, Velair użyje wyłącznie historii chłodzenia. Nie miesza jej z ogrzewaniem, ponieważ to samo pomieszczenie i urządzenie mogą ogrzewać i chłodzić z różną szybkością.

<a id="partial-and-invalid-observations"></a>
## Obserwacje częściowe i nieprawidłowe

Po próbach przygotowania Velair zapisuje zwięzłe lokalne obserwacje.

Zakończone obserwacje są użytecznymi przykładami osiągnięcia progu temperatury docelowej na czas.

Częściowe obserwacje oznaczają, że Velair rozpoczął wcześniej, ale pomieszczenie nie osiągnęło progu do zaplanowanej chwili komfortu. Stanowią dolne ograniczenia: Velair wie, że potrzebne było więcej czasu, ale nie wymyśla fikcyjnego czasu zakończenia.

Nieprawidłowe obserwacje służą wyłącznie diagnostyce i nie wpływają na model. Przykłady to znikome różnice, niemożliwe czasy, przerwane sesje, brakujące temperatury, wzmocnienia, pauzy i zmiany stanu harmonogramu.

Jeśli po starszych częściowych obserwacjach pojawi się dostatecznie wiele zakończonych obserwacji potwierdzających niezawodne osiąganie celu, starsze częściowe obserwacje przestają zwiększać prognozę.

<a id="outdoor-temperature-sensor"></a>
## Czujnik temperatury zewnętrznej

Czujnik temperatury zewnętrznej jest opcjonalny.

Jeśli go skonfigurujesz, Velair zapisuje jego wartość jako lokalny kontekst obserwacji, a następnie porównuje bieżące warunki z podobnymi wcześniejszymi obserwacjami. Nie wywołuje usług pogodowych, nie wymaga internetu i nie dodaje stałej poprawki do modelu początkowego.

Jeśli czujnik jest niedostępny podczas zapisu próbki, Velair po prostu zapisuje obserwację bez tego kontekstu.

<a id="room-assist-interaction"></a>
## Współpraca z Room Assist

Domyślnie adaptacyjne przygotowanie korzysta z `current_temperature` encji klimatu.

Jeśli dla encji włączono wspomaganie czujnikiem pokojowym i wybrano czujnik, funkcja używa go jako efektywnej temperatury pomieszczenia przy podejmowaniu decyzji i uczeniu.

To przydatne przy głowicach TRV lub termostatach, których wbudowany czujnik jest zbyt blisko grzejnika, nawiewu lub innego lokalnego źródła ciepła. Zachowanie po stronie urządzenia opisuje [Room Assist](room-assist.pl.md).

<a id="automation-events"></a>
## Zdarzenia automatyzacji

Velair używa trzech zdarzeń `velair_event` w tym cyklu:

- `preconditioning_plan_updated`, gdy obliczony plan pojawia się lub zmienia;
- `preconditioning_plan_cancelled`, gdy opublikowany plan przestaje obowiązywać;
- `preconditioning_observation_recorded` po zapisaniu próbki uczenia.

Dokładne reguły emisji i pełne przykłady danych opisano w [Zdarzeniach automatyzacji](automation-events.pl.md#preconditioning-plan-updated).

Przykładowy wyzwalacz automatyzacji:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Kiedy Velair nie podejmuje działania

Adaptacyjne przygotowanie nie rozpoczyna wcześniej, gdy:

- jest wyłączone dla danej encji;
- harmonogram nie działa w trybie automatycznym;
- strefa jest wstrzymana lub ma aktywne wzmocnienie;
- następny blok to `Wyłączony`;
- encja nie obsługuje wymaganego kierunku ogrzewania lub chłodzenia;
- różnica temperatur jest mniejsza od minimalnej;
- wymagana temperatura jest niedostępna lub nieliczbowa.

<a id="lovelace"></a>
## Lovelace

Widok przygotowania temperatury jest dostępny jako karta Lovelace:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

Karta korzysta z tej samej konfiguracji backendu co główny panel Velair.

<a id="technical-details"></a>
## Szczegóły techniczne

Szczegóły dla deweloperów dotyczące zapisu, algorytmu uczenia, obsługi częściowych obserwacji, wag podobieństwa i wyników API opisano w [Mechanizmie adaptacyjnego przygotowania temperatury](../developer/adaptive-preconditioning.md).
