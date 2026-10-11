<a id="velair-sensor-reference"></a>
# Informacje o czujnikach Velair
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair tworzy encje Home Assistant do odczytywania bieżącego stanu harmonogramu, komfortu, przekazywania poleceń i kontekstu encji bez otwierania panelu.

Pokazane identyfikatory encji są przykładami. Home Assistant może dodawać do nich końcówki lub pozwalać na zmianę nazw encji, dlatego w pulpitach i automatyzacjach używaj rzeczywistych identyfikatorów z własnego rejestru encji.

<a id="quick-guide"></a>
## Krótki przegląd

| Encja | Dla kogo tworzona | Zastosowanie |
| --- | --- | --- |
| Następne zaplanowane zdarzenie | Integracja | Następne planowane działanie. |
| Stan harmonogramu | Integracja | Bezczynność, plan, pauza lub nadpisanie. |
| Stan diagnostyki | Integracja | Ostrzeżenia stanu działania. |
| Aktywna temperatura docelowa | Każda encja | Bieżący cel zarządzany przez Velair. |
| Warunki otoczenia | Każda encja | Komfort, jakość, wskaźniki pochodne i kontekst zewnętrzny. |
| Możliwość wentylacji | Każda zarządzana encja klimatu | Wyświetlanie ostrożnych możliwości otwarcia okien lub wykorzystanie ich w automatyzacjach. |
| Jakość powietrza | Każda encja | CO2 niezależnie od komfortu cieplnego. |
| Nadpisanie strefy | Każda encja | Aktywne Wzmocnienie/Pauza. |
| Sterowanie strefą | Każda encja | Velair, regulacja ręczna lub wykonywanie zewnętrzne. |
| Diagnostyka przekazywania poleceń strefy | Każda, domyślnie wyłączona | Analiza/automatyzacje ostatniego lokalnego wyniku. |
| Start przygotowania temperatury | Każda encja | Planowany wcześniejszy start. |
| Room Assist | Każda encja | Stan i zastosowana korekta. |

Zapisywalne encje automatycznego harmonogramu i Trybu są sterowaniem, nie czujnikami; zobacz [poradnik](usage.pl.md#home-assistant-entities).

<a id="global-sensors"></a>
## Czujniki globalne

<a id="next-climate-event"></a>
### Następne zdarzenie klimatyczne

Przykładowy ID:

```text
sensor.velair_next_scheduled_event
```

Główne atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `entity_id` | Encja klimatu, której dotyczy pierwsze zdarzenie w tym czasie. |
| `action` | `set_temperature`, `set_hvac_mode` lub `turn_off`. |
| `hvac_mode` | Tryb HVAC, który Velair planuje zastosować, jeśli dotyczy. |
| `temperature` | Pojedynczy cel, jeśli dotyczy. |
| `target_temp_low` / `target_temp_high` | Zakres, jeśli dotyczy. |
| `weekday` / `start` | Dzień i godzina rozpoczęcia źródłowego bloku harmonogramu. |
| `when` | Rzeczywisty czas zastosowania. |
| `target_when` | Pierwotny czas komfortu przy wcześniejszym przygotowaniu. |
| `event_count` | Liczba zdarzeń o tej samej chwili. |
| `events` | Zserializowana lista wszystkich takich zdarzeń. |

Przykład:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### Bieżący stan harmonogramu

Przykładowy ID:

```text
sensor.velair_current_schedule_state
```

Stany:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `global_mode` | Bieżący tryb globalny. |
| `paused_started_at` | Początek globalnej pauzy, jeśli dotyczy. |
| `paused_until` | Planowany koniec globalnej Pauzy, jeśli dotyczy. |

<a id="diagnostics-status"></a>
### Stan diagnostyki

Przykładowy ID:

```text
sensor.velair_diagnostics_status
```

Stany:

```text
ok
warning
error
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Zwarty kontekst harmonogramu. |
| `units_ok` / `units_warning` / `units_error` | Liczby urządzeń działających prawidłowo, z ostrzeżeniami lub z błędami. |
| `issue_count` | Wszystkie aktywne problemy. |
| `warning_count` / `error_count` | Liczby aktywnych problemów według poziomu ważności. |
| `issue_codes` | Stałe kody dla automatyzacji. |

Wyzwalacz:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Czujniki poszczególnych encji

Dla `climate.living_room` HA zwykle tworzy np. `sensor.velair_control_living_room`. Używaj rzeczywistych ID.

<a id="zone-active-target-temperature"></a>
### Aktywna temperatura docelowa strefy

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `action` | Aktywne działanie celu Velair. |
| `hvac_mode` | Tryb HVAC wybrany przez aktywny blok lub nadpisanie. |
| `temperature` | Pojedynczy cel. |
| `target_temp_low` / `target_temp_high` | Natywny zakres. |
| `weekday` / `start` | Źródło harmonogramu. |
| `when` | Czas zastosowania. |
| `target_when` | Docelowa godzina komfortu, gdy przygotowanie przesunęło czas zastosowania na wcześniej. |

Dla zakresu stan czujnika jest niedostępny, ponieważ nie istnieje jedna poprawna temperatura. Odczytaj obie granice z atrybutów.

<a id="zone-environmental-condition"></a>
### Warunki otoczenia strefy

Stany:

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale`, `unavailable`. |
| `data_issues` | Stałe kody brakujących, nieaktualnych, nieprawidłowych lub użytecznych odczytów o niezweryfikowanej aktualności. |
| `range_summary` | Wynik zakresu Komfortu i uzgodnienie Humidex. |
| `ventilation_opportunity` | Pełne dane możliwości wietrzenia. |
| `comfort_zone` | Model i efektywny zakres wilgotności. |
| `temperature_source` / `humidity_source` | Encje źródłowe używane do odczytów wewnątrz pomieszczenia. |
| `derived_metrics` | Włączone dane Humidex, punktu rosy i wilgotności bezwzględnej. |
| `outdoor` | Opcjonalne porównanie wewnątrz/zewnątrz. |
| `insights` | Uporządkowane wskazówki obserwacyjne ze stałymi kodami. |

Przykład:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Pełne dane w [Komforcie](comfort.pl.md) i [czujnikach stref](zone-sensors.pl.md#environmental-condition).

<a id="zone-ventilation-opportunity"></a>
### Możliwość wietrzenia strefy

Stany:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `evaluation_scope` | Ocena temperatury, wilgotności lub obu. |
| `reason` | Stały kod powodu przeznaczony do przetwarzania maszynowego. |
| `data_quality` / `data_issues` | Jakość porównania zewnętrznego. |
| `outdoor_temperature_source` | Encja będąca źródłem temperatury na zewnątrz. |
| `outdoor_humidity_source` | Encja będąca źródłem wilgotności na zewnątrz, jeśli została skonfigurowana. |
| `potential_effects` | Skutki, jakie według Velair może przynieść powietrze zewnętrzne. |
| `blocked_by` | Warunki blokujące silniejszy wniosek. |

Przykład:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

To obserwacja; Velair nigdy na tej podstawie nie otwiera okien lub nie steruje encją.

<a id="zone-air-quality"></a>
### Jakość powietrza strefy

Stany:

```text
not_monitored
unavailable
good
elevated
poor
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `availability` | Dostępność bieżącego CO2. |
| `co2_source` | Czujnik oceny. |

<a id="zone-override-state"></a>
### Stan nadpisania strefy

Stany:

```text
none
boost
paused
disabled
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `started_at` | Start aktywnego nadpisania. |
| `until` | Planowany czas zakończenia nadpisania, jeśli dotyczy. |
| `action` | Działanie nadpisania, jeśli dotyczy. |
| `pause_id` | ID pojedynczej aktywnej pauzy. |
| `pause_count` / `pause_ids` | Zwarty kontekst kilku pauz. |
| `manual` | Czy pauza jest regulacją ręczną. |

Ten czujnik opisuje Wzmocnienie i Pauzę. Do rozróżnienia sterowania automatycznego, ręcznego i zewnętrznego użyj czujnika Sterowanie strefą.

<a id="zone-control"></a>
### Sterowanie strefą

Stany:

```text
automatic
manual
external
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required`. |
| `schedule_source` | `default`, `profile`, `profile_pause`. |
| `profile_id` / `profile_name` | Efektywny Profil strefy, jeśli dotyczy. |
| `mode_id` / `mode_name` | Wybrany Tryb, jeśli dotyczy. |
| `manual_source` | `explicit`, `external_change`, `other`, tylko ręczne. |
| `manual_started_at` | Start regulacji ręcznej. |
| `manual_until` | Planowany koniec Regulacji ręcznej, jeśli dotyczy. |
| `manual_policy` | `until_next_block`, `for_duration`, `until_resumed`. |

Przykład:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Diagnostyka przekazywania poleceń strefy

Ta encja diagnostyczna jest domyślnie wyłączona. Włącz ją w rejestrze encji Home Assistant, jeśli pulpit lub automatyzacja potrzebują informacji o bieżącym przekazywaniu poleceń.

Stany:

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `updated_at` | Ostatnia zmiana stanu przekazania. |
| `retry_count` | Próba wykonania, którą reprezentuje bieżący stan. |
| `last_error_at` / `last_error_code` | Ostatni błąd po usunięciu danych wrażliwych. |
| `last_accepted_at` | Ostatnie przyjęcie pełnej sekwencji przez HA. |
| `last_accepted_source` | `automatic`, `manual`, `boost`, `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off`, `other`. |
| `last_accepted_hvac_mode` | Tryb HVAC przyjęty przez Home Assistant. |
| `last_accepted_temperature_unit` | Jednostka przyjętego celu. |
| `last_accepted_temperature` | Przyjęta pojedyncza temperatura docelowa, jeśli dotyczy. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Przyjęty zakres temperatury docelowej, jeśli dotyczy. |

Przykład:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` oznacza, że Home Assistant przyjął sekwencję wywołań usług. Nie dowodzi, że fizyczne urządzenie osiągnęło temperaturę docelową.

<a id="zone-preconditioning-start"></a>
### Start przygotowania strefy

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `status` | `planned` lub `active`. |
| `scheduled_for` | Pierwotny czas komfortu. |
| `lead_minutes` | Minuty wcześniejszego startu. |
| `direction` | Ogrzewanie lub chłodzenie. |
| `target_kind` / `target_boundary` | Kontekst celu pojedynczego/granicy zakresu. |
| `boundary_temperature` | Temperatura graniczna użyta do prognozy. |
| `model_source` | Wybrane źródło prognozy. |
| `target_temperature` | Pojedyncza temperatura docelowa, jeśli dotyczy. |
| `target_temp_low` / `target_temp_high` | Zakres temperatury docelowej, jeśli dotyczy. |
| `hvac_mode` | Tryb HVAC używany przez zdarzenie przygotowania. |

<a id="zone-room-assist-state"></a>
### Stan Room Assist strefy

Stany:

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Atrybuty:

| Atrybut | Znaczenie |
| --- | --- |
| `room_temperature_entity_id` | Czujnik pokoju. |
| `target_temperature` | Widoczna temperatura docelowa harmonogramu lub nadpisania. |
| `applied_temperature` | Cel zastosowany w encji. |
| `applied_offset` | Bieżąca korekta. |
| `calculated_temperature` | Cel przed limitami. |
| `assist_delta` | Aktywna korekta przy większej od zera. |
| `scheduled_target_guard` | Ochrona przed niebezpieczną zmianą celu. |
| `hysteresis_phase` / `hysteresis_target` | Bieżąca faza działania pasa utrzymania. |
| `deadband_low` / `deadband_high` | Efektywne pasmo. |
| `target_temp_low` / `target_temp_high` | Widoczny zakres. |
| `applied_target_temp_low` / `applied_target_temp_high` | Wysłany zakres po korekcie. |
| `climate_target_temp_low` / `climate_target_temp_high` | Aktualnie zgłaszany zakres encji. |
| `range_shift` | Bieżące przesunięcie zakresu, jeśli dotyczy. |
| `direction` | Ogrzewanie/chłodzenie. |
| `hvac_mode` | HVAC wspomaganego celu. |
| `active_from` / `target_when` | Czas wspomaganego bloku. |

<a id="choosing-the-right-surface"></a>
## Wybór właściwego źródła informacji

| Pytanie | Użyj |
| --- | --- |
| Co zaplanowano dalej? | Następne zaplanowane zdarzenie |
| Czy Velair jest globalnie wstrzymane, czy wykonuje harmonogram? | Stan harmonogramu |
| Czy działa prawidłowo? | Stan diagnostyki |
| Jaki cel ma Velair teraz? | Aktywna temperatura docelowa |
| Czy w pokoju jest komfortowo, czy odczyty są nieaktualne lub ich brakuje? | Warunki otoczenia |
| Czy zewnętrzne powietrze pomoże? | Możliwość wietrzenia |
| Czy poziom CO2 jest prawidłowy, czy jakość powietrza jest zła? | Jakość powietrza |
| Wzmocnienie czy pauza? | Nadpisanie strefy |
| Kto steruje? | Sterowanie strefą |
| Czy HA przyjął ostatnie polecenie? | Diagnostyka przekazywania poleceń |
| Kiedy rozpocznie się przygotowanie temperatury? | Start przygotowania |
| Co stosuje Room Assist? | Room Assist |

Zdarzenia są lepsze do reagowania na przejście i sprawdzania, co się zmieniło. Czujniki służą do odczytywania bieżącego stanu, także po restarcie.
