<a id="zone-control-and-delivery-sensors"></a>
# Czujniki sterowania strefą i przekazywania poleceń
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair tworzy dwa czujniki opisujące działanie strefy dla każdej zarządzanej encji `climate.*`:

- **Sterowanie strefą** pokazuje, kto obecnie steruje strefą i jaka konfiguracja Velair ma zastosowanie.
- **Diagnostyka przekazywania poleceń** pokazuje, co się stało podczas ostatniej próby przekazania ustawień docelowych urządzeniu klimatycznemu przez Home Assistant.

Opisują różne warstwy działania. Strefa może pozostawać pod automatycznym sterowaniem, mimo że ostatnie przekazanie poleceń było niemożliwe lub zakończyło się błędem. Dlatego czujniki nie zastępują się wzajemnie.

Osobny czujnik **Warunki otoczenia** udostępnia włączone `derived_metrics` oraz uporządkowaną listę bieżących wskazówek `insights`, gdy Komfort jest włączony. Wskazówki istnieją tylko w czasie działania i zawierają `code`, `kind`, `tone` oraz uzasadniające je `metrics`; nie wykonują żadnych działań sterujących. Zobacz [Komfort](comfort.pl.md#comfort-insights). Przy włączonym porównaniu z warunkami na zewnątrz ten sam czujnik udostępnia również poddrzewo `outdoor`. Zawiera ono odczyty źródłowe, jawne wartości wilgotności bezwzględnej wewnątrz i na zewnątrz, niezależną ocenę jakości danych oraz opis możliwych korzyści lub kompromisów związanych z wietrzeniem. Velair nie tworzy osobnych encji pośredniczących dla poszczególnych odczytów. Tworzy natomiast osobny czujnik **Możliwość wentylacji** z ustalonym zestawem stanów, który udostępnia podsumowanie wyznaczone przez backend na potrzeby automatyzacji.

<a id="environmental-condition"></a>
## Warunki otoczenia

Czujnik **Warunki otoczenia** udostępnia bieżący stan automatyzacjom monitorowania komfortu. Jest domyślnie włączony dla każdej zarządzanej encji klimatu i aktualizuje się na podstawie tej samej oceny backendu co panel Velair. Odczyt jego stanu nie odpytuje czujników źródłowych ani nie wykonuje działań sterujących urządzeniem.

Stan czujnika zachowuje dotychczasową klasyfikację opartą na fizycznych wartościach temperatury i wilgotności:

| Stan | Znaczenie |
| --- | --- |
| `monitoring_off` | Monitorowanie komfortu jest wyłączone dla tej encji klimatu. |
| `no_readings` | Obecnie nie ma żadnego odczytu monitorowanego parametru, który można wykorzystać do oceny. |
| `temperature_comfortable` | Można ocenić tylko temperaturę; mieści się ona w skonfigurowanym zakresie. |
| `humidity_comfortable` | Można ocenić tylko wilgotność; mieści się ona w skonfigurowanym zakresie. |
| `comfortable` | Temperatura i wilgotność mieszczą się w swoich skonfigurowanych zakresach. |
| `cold` / `hot` | Temperatura jest poniżej lub powyżej skonfigurowanego zakresu. |
| `dry` / `humid` | Wilgotność jest poniżej lub powyżej skonfigurowanego zakresu. |
| `cold_and_dry` / `cold_and_humid` | Oba odczyty można wykorzystać do oceny, a temperatura jest poniżej zakresu. |
| `hot_and_dry` / `hot_and_humid` | Oba odczyty można wykorzystać do oceny, a temperatura jest powyżej zakresu. |

Stany pozostają zgodne z istniejącymi automatyzacjami. Opisują ustawione zakresy, a nie medyczną czy uniwersalną definicję osobistego komfortu.

<a id="environmental-condition-attributes"></a>
### Atrybuty Warunków otoczenia

| Atrybut | Znaczenie |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` lub `unavailable` określają jakość monitorowanych odczytów wewnątrz pomieszczenia. `unverified` oznacza, że odczyty są użyteczne, ale co najmniej jeden nie ma weryfikowalnego czasu zgłoszenia. |
| `data_issues` | Stałe kody opisujące brakujące, nieaktualne lub nieprawidłowe dane wewnątrz pomieszczenia. Atrybut jest pomijany, gdy lista jest pusta. |
| `range_summary` | Podsumowanie skonfigurowanych zakresów, opcjonalnie uwzględniające porównanie z Humidex. |
| `ventilation_opportunity` | Bieżąca ocena możliwości wietrzenia wyznaczana przez backend: stan, zakres oceny, przewidywane zmiany, przeszkody i przyczyna. |
| `comfort_zone` | Wybrany prosty, prowadzony lub niestandardowy model obszaru komfortu z uwzględnieniem temperatury oraz zakres wilgotności obowiązujący przy bieżącej temperaturze. |
| `temperature_source` | Identyfikator encji używanej obecnie jako źródło temperatury wewnętrznej, jeśli jest dostępny. |
| `humidity_source` | Identyfikator encji używanej obecnie jako źródło wilgotności wewnętrznej, jeśli jest dostępny. |
| `derived_metrics` | Dane włączonych wskaźników: Humidex, punktu rosy i wilgotności bezwzględnej. Niemonitorowane wskaźniki są pomijane. |
| `outdoor` | Opcjonalne porównanie warunków wewnątrz i na zewnątrz: obowiązujące progi wskazówek, jakość danych, odczyty oraz opis możliwości poprawy lub kompromisu. |
| `insights` | Uporządkowane obserwacje z `code`, `kind`, `tone` i uzasadniającymi je `metrics`. Atrybut jest pomijany, gdy lista jest pusta. |

`derived_metrics` i `outdoor` są pomijane, gdy odpowiadająca im funkcja jest wyłączona. Gdy funkcja jest włączona, ale odczyty są brakujące, nieaktualne lub nieprawidłowe, dane pozostają dostępne wraz z `availability` i informacją o problemach, aby automatyzacje nie używały starej wartości. `insights` jest pomijany, gdy bieżąca lista jest pusta. Surowe odczyty temperatury i wilgotności wewnętrznej pozostają w encjach źródłowych. Klasyfikację CO2 udostępnia osobny czujnik **Jakość powietrza**.

W modelu prowadzonym lub niestandardowym `comfort_zone.effective_humidity_range` wynosi `null`, jeśli temperatura nie nadaje się do użycia. Wilgotność może pozostać widoczna, ale nie jest wtedy klasyfikowana. Nie zakładaj, że mieści się w zgadywanym zakresie lub poza nim.

`range_summary` zawiera:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Ten przykładowy szablon wykrywa rozbieżne wskaźniki termiczne bez analizowania przetłumaczonej etykiety:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

To warunek sprawdzający, czy włączony odczyt Humidex jest aktualny i przekracza skonfigurowany zakres temperatury:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Ten warunek korzysta z kodu wskazówki wyznaczonej przez backend. Działa również po zmianie języka wyświetlania:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Przy opcjonalnym porównaniu z warunkami na zewnątrz sprawdź dostępność danych przed użyciem wartości liczbowej:

```yaml
{% set outdoor =
   state_attr('sensor.velair_environmental_condition_living_room',
              'outdoor') or {} %}
{% set comparison = outdoor.get('comparison', {}) %}
{% set thresholds = outdoor.get('guidance_thresholds', {}) %}
{% set temperature = comparison.get('temperature', {}) %}
{{ temperature.get('availability') == 'current'
   and temperature.get('potential') == 'cooling'
   and thresholds.get('temperature_delta') is number }}
```

<a id="entity-or-event"></a>
### Encja czy zdarzenie?

Użyj tej encji, gdy automatyzacja potrzebuje bieżącego stanu, również po restarcie Home Assistant. Zwykły wyzwalacz stanu może reagować na dotychczasową klasyfikację temperatury i wilgotności:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Użyj `comfort_assessment_changed`, gdy automatyzacja musi wiedzieć, co się zmieniło. Pola `previous_range_summary`, `range_summary_changed` i `range_status_changed` odróżniają zmianę zakresu od niezwiązanego z nią odświeżenia oceny komfortu. [Zmiana oceny komfortu](automation-events.pl.md#comfort-assessment-changed) opisuje pełny zestaw danych i zawiera gotową automatyzację.

<a id="ventilation-opportunity"></a>
## Możliwość wietrzenia

Czujnik **Możliwość wentylacji** każdej strefy aktualizuje się w reakcji na zdarzenia i służy wyłącznie do obserwacji:

| Stan | Znaczenie |
| --- | --- |
| `unavailable` | Obecnie nie można ocenić komfortu, porównania z warunkami na zewnątrz lub wymaganego skonfigurowanego odczytu. |
| `no_opportunity` | Powietrze zewnętrzne nie przekracza progów w korzystnym kierunku. |
| `may_help` | Powietrze zewnętrzne przybliża warunki w pomieszczeniu do komfortowych, ale Velair nie może potwierdzić, że wszystkie parametry znajdą się w skonfigurowanym obszarze komfortu. |
| `comfort_possible` | Temperatura zewnętrzna mieści się w zakresie. Jeśli wilgotność jest monitorowana, wilgotność zewnętrzna również mieści się w paśmie komfortu ocenionym dla tej temperatury zewnętrznej. |
| `trade_off` | Korzystnej zmianie jednego monitorowanego parametru towarzyszy znane pogorszenie innego. |
| `already_comfortable` | Fizyczne warunki otoczenia już odpowiadają komfortowym. |

`comfort_possible` jest ostrożną prognozą warunków otoczenia, a nie obietnicą rezultatu po otwarciu okna. Velair nie zna intensywności wymiany powietrza, wiatru, deszczu, zanieczyszczeń zewnętrznych, nasłonecznienia, pojemności cieplnej pomieszczenia ani czasu otwarcia okna. Nigdy nie otwiera okien ani nie zmienia sterowania klimatem.

Atrybuty obejmują `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, zewnętrzne `data_quality` i `data_issues` oraz identyfikatory skonfigurowanych źródeł zewnętrznych. Jeśli wilgotność wewnętrzna jest monitorowana, ale źródło wilgotności zewnętrznej nie zostało skonfigurowane, temperatura może dać wynik `may_help`, lecz nigdy `comfort_possible`. Jeśli monitorowanie wilgotności zostało celowo wyłączone, wynik `comfort_possible` oparty tylko na temperaturze jest prawidłowy.

Stałe kody `reason`: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured`, `moves_toward_comfort`.

Dla urządzenia takiego jak `climate.living_room` nowo utworzone wpisy w rejestrze zwykle otrzymują identyfikatory takie jak:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

To sugerowany identyfikator, nie stałe API. Home Assistant może dodać końcówkę, aby uniknąć kolizji, a użytkownik może zmienić nazwę. Korzystaj z rzeczywistych identyfikatorów rejestru. Wyświetlana nazwa zawiera przyjazną nazwę urządzenia, a sugerowane ID jego identyfikator obiektu. Urządzenie usługowe Velair ani przypisanie do obszaru nie są częścią ID.

<a id="zone-control"></a>
## Sterowanie strefą

Czujnik jest domyślnie włączony i po restarcie odtwarzany ze stanu harmonogramu. Jego stan wskazuje, kto odpowiada za sterowanie:

| Stan | Znaczenie |
| --- | --- |
| `automatic` | Velair odpowiada za lokalne sterowanie. Obejmuje to wykonywanie harmonogramu, bezczynność, pauzę, zatrzymanie, Wzmocnienie i adaptacyjne przygotowanie temperatury. Do rozróżnienia tych sytuacji użyj `runtime_state`. |
| `manual` | Velair przekazał sterowanie tą encją regulacji ręcznej: bezpośrednio albo po wykryciu zmiany zewnętrznej. To co innego niż Tryb Velair **Ręczny**, który opisuje wybór Profili. |
| `external` | Obsługiwany zewnętrzny dostawca harmonogramów odpowiada za fizyczne wykonanie w tej strefie. Zmiana z karty klimatu, pilota lub innej automatyzacji nie wywołuje tego stanu: jeśli Velair ustąpi takiej zmianie, stanem jest `manual`. |

Czujnik pozostaje dostępny podczas migracji jednostki, ponieważ odpowiedzialność za sterowanie nie jest wartością temperatury.

<a id="zone-control-attributes"></a>
### Atrybuty sterowania

| Atrybut | Wartości/znaczenie |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required`, zastępcze `unknown`. |
| `schedule_source` | `default` dla domyślnego harmonogramu strefy, `profile` dla obowiązującego harmonogramu Profilu lub `profile_pause`, gdy obowiązujący Profil wstrzymuje strefę. |
| `profile_id` / `profile_name` | Stały identyfikator i wyświetlana nazwa Profilu odpowiadającego za strefę, jeśli ma zastosowanie. |
| `mode_id` / `mode_name` | Stały identyfikator i wyświetlana nazwa wybranego Trybu, jeśli zastosowano Tryb niestandardowy. |
| `manual_source` | Tylko w stanie `manual`: `explicit`, gdy regulację ręczną wybrano bezpośrednio; `external_change`, gdy Velair ustąpił po wykryciu zmiany ustawień urządzenia; lub wartość zastępcza `other`. |
| `manual_started_at` | Czas rozpoczęcia bieżącej regulacji ręcznej. |
| `manual_until` | Planowane zakończenie regulacji, jeśli wybrana polityka ręczna je przewiduje. Może nie występować przy regulacji bezterminowej. |
| `manual_policy` | Tylko w stanie `manual`: `until_next_block`, `for_duration`, `until_resumed` lub wartość zastępcza `unknown`. |

Opcjonalne atrybuty są pomijane, gdy nie mają zastosowania. Na przykład stan `automatic` nie zawiera `manual_source` ani `manual_until`. Stan sterowania i stan działania są celowo rozdzielone. Na przykład:

- `automatic` z `runtime_state: paused`: Velair nadal odpowiada za strefę, ale pauza blokuje normalne wykonywanie harmonogramu;
- `automatic` z `runtime_state: boost`: Velair odpowiada za tymczasowe Wzmocnienie;
- `external` z `runtime_state: externally_managed`: fizyczne wykonanie należy do skonfigurowanego zewnętrznego dostawcy, a nie do lokalnego przekazywania poleceń przez Velair.

<a id="zone-delivery-diagnostics"></a>
## Diagnostyka przekazywania poleceń strefy

**Diagnostyka przekazywania poleceń strefy** jest encją diagnostyczną, domyślnie wyłączoną. Włącz ją tylko wtedy, gdy pulpit lub automatyzacja potrzebuje danych o ostatnim lokalnym przekazaniu poleceń:

1. Otwórz Ustawienia > Urządzenia i usługi > Encje w Home Assistant.
2. Wyszukaj nazwę urządzenia i czujnik **Diagnostyka dostarczania**.
3. Otwórz ustawienia czujnika i go włącz.

Czujnik aktualizuje się w reakcji na zdarzenia, bez okresowego odpytywania. Jego stan opisuje ostatni zaobserwowany wynik przekazywania poleceń od uruchomienia integracji:

| Stan | Wystąpienie |
| --- | --- |
| `idle` | Nie zarejestrowano wyniku od uruchomienia integracji lub od wyczyszczenia bieżących danych o przekazywaniu poleceń. |
| `success` | Home Assistant przyjął pełną sekwencję wywołań klimatycznych Velair. `retry_count` wskazuje, czy nastąpiło to przy pierwszej próbie, czy po ponowieniu. |
| `failed` | Home Assistant odrzucił wywołanie usługi klimatycznej. Zadania harmonogramu zwykle przechodzą do odzyskiwania z ograniczoną liczbą prób; jednorazowe działanie bez tego mechanizmu może pozostać w stanie błędu bez ponawiania. |
| `retrying` | Velair rozpoczął jedną z ograniczonej liczby ponownych prób po błędzie, po którym można wznowić działanie. Stan może być krótkotrwały. |
| `exhausted` | Pierwsza próba zadania harmonogramu i obie opóźnione próby zakończyły się błędem. |
| `invalid_intent` | Podczas odzyskiwania lub ponownego przekazywania poleceń Velair nie mógł już przełożyć bieżących ustawień docelowych na prawidłowe wywołanie. Zwykłe błędy walidacji usług i konfiguracji są odrzucane przed osiągnięciem tego stanu. |
| `cancelled` | Aktywne lub odroczone przekazywanie poleceń zostało zastąpione nowszymi ustawieniami docelowymi, jawnie unieważnione albo zatrzymane przed wykonaniem. Stan może być krótkotrwały, jeśli od razu rozpoczyna się nowe zadanie. |
| `unavailable` | Zarządzana encja klimatu nie istniała albo miała stan `unknown` lub `unavailable`, więc Velair nie wywołał usługi klimatycznej. Ustawienia docelowe kwalifikujące się do wykonania przez harmonogram są ustalane ponownie po odzyskaniu dostępności encji. |

Sama encja diagnostyczna pozostaje dostępna, aby stan `unavailable` można było obserwować. Pozostaje dostępna również wtedy, gdy wymagana jest migracja jednostek temperatury; zapisane dane temperatury zachowują jednostkę z chwili przyjęcia celu.

Velair wykonuje obecnie najwyżej dwie opóźnione próby, po około 2 i 10 sekundach. Te czasy opisują odzyskiwanie po błędzie, a nie zalecany kontrakt dla automatyzacji. Automatyzacje powinny reagować na stany, nie polegać na dokładnych opóźnieniach.

<a id="delivery-diagnostic-attributes"></a>
### Atrybuty diagnostyki przekazywania

| Atrybut | Znaczenie |
| --- | --- |
| `updated_at` | Czas ostatniej aktualizacji stanu przekazywania poleceń. Nie występuje w początkowym stanie `idle`. |
| `retry_count` | Numer próby odpowiadającej bieżącemu stanowi końcowemu lub ponawianiu: `0` dla pierwszej próby, następnie `1` lub `2`. Anulowanie zeruje tę wartość. |
| `last_error_at` | Czas ostatnio zarejestrowanego wyniku `failed`, `exhausted` lub `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` lub wartość zastępcza `unknown_delivery_status`. Surowy tekst wyjątku nigdy nie jest udostępniany. |
| `last_accepted_at` | Czas, w którym Home Assistant przyjął ostatnią pełną sekwencję poleceń Velair. |
| `last_accepted_source` | `automatic`, `manual`, `boost`, `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off`, zastępcze `other`. |
| `last_accepted_hvac_mode` | Tryb HVAC uwzględniony w przyjętych ustawieniach docelowych, jeśli ma zastosowanie. |
| `last_accepted_temperature_unit` | Jednostka temperatury zapisana z pojedynczą temperaturą docelową lub zakresem. |
| `last_accepted_temperature` | Przyjęta pojedyncza temperatura docelowa, jeśli ma zastosowanie. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Przyjęte dolna i górna temperatura docelowa dla natywnego zakresu, jeśli ma zastosowanie. |

Wywołania przez `velair.set_temperature` i `velair.set_hvac_mode` są rejestrowane z `last_accepted_source: manual`. Udane wywołanie zmieniające tylko tryb ma `last_accepted_action: set_hvac_mode` i tryb HVAC, natomiast wszystkie atrybuty temperatur docelowych pozostają nieobecne lub mają wartość `null`.

Pola ostatniego błędu i ostatnio przyjętych ustawień tworzą niezależne historie. Późniejszy `success` zmienia bieżący stan, ale nie usuwa wcześniejszych wartości `last_error_*`. Podobnie późniejszy błąd nie usuwa ostatnio przyjętej temperatury docelowej. Sprawdzaj znaczniki czasu, gdy automatyzacja musi je porównać.

`success` oznacza, że Home Assistant przyjął wywołania usług; nie potwierdza dostarczenia do urządzenia, pracy sprzętu ani osiągnięcia temperatury docelowej w pomieszczeniu. Fizyczny stan sprawdzaj w encji klimatu i integracji urządzenia. Room Assist może później zmienić cel wysyłany do termostatu i ma własny czujnik zastosowanej korekty. Publikacja zewnętrznych harmonogramów również ma osobny status w Velair i nie jest reprezentowana przez ten czujnik lokalnego przekazywania poleceń.

Dane istnieją wyłącznie w pamięci podczas działania. Po restarcie integracji lub Home Assistant oraz po udanym resecie stan wraca do `idle`. Dane nie są odtwarzane z Recorder ani z trwałego zapisu.

<a id="automation-examples"></a>
## Przykłady automatyzacji

Ta automatyzacja powiadamia dopiero po wyczerpaniu ograniczonej liczby ponownych prób Velair. Zastąp przykładowy identyfikator rzeczywistym identyfikatorem ze swojego rejestru encji:

```yaml
alias: Velair living room delivery exhausted
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
actions:
  - action: persistent_notification.create
    data:
      title: Velair delivery problem
      message: >-
        The living room target could not be delivered after
        {{ trigger.to_state.attributes.retry_count }} retries.
```

Ten warunek szablonowy sprawdza, czy Velair obecnie odpowiada za automatyczne sterowanie i ma aktywny blok harmonogramu:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Używaj **Sterowania strefą** do sprawdzania, kto obecnie steruje strefą i jaki jest kontekst harmonogramu. **Diagnostyka przekazywania poleceń** pokazuje ostatni wynik wywołań usług, a `climate.living_room` — stan zgłaszany przez urządzenie.
