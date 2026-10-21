<a id="update-shared-presets-from-automations"></a>
# Aktualizowanie współdzielonych presetów przez automatyzacje
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.4 |
| Ostatnia synchronizacja | 2026-10-21 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Użyj `velair.update_block_preset`, aby zmienić zapisany preset Velair z automatyzacji lub skryptu Home Assistant. Trwale zmienia to wspólną definicję: każdy odwołujący się do niej blok otrzymuje nową konfigurację, w tym bloki szablonów i dni korzystające z pełnej konfiguracji tych szablonów.

Nie wybiera to innego presetu dla bloku ani nie aktywuje Profilu. Używaj Profili lub Trybów, jeśli automatyzacja ma wybierać inną rutynę.

<a id="find-the-identifier"></a>
## Znajdowanie identyfikatora

Otwórz **Szablony → Presety klimatyczne**, wybierz zapisany preset i skopiuj jego **Identyfikator automatyzacji**. Użyj tej wartości jako `preset_key`; zmiana nazwy presetu nie zmienia identyfikatora. Poniższe przykłady używają przykładowych identyfikatorów. Zastąp je własnymi skopiowanymi wartościami.

<a id="update-or-replace"></a>
## Aktualizacja lub zastąpienie

Domyślne `operation: update` zmienia tylko przesłane pola, zachowując działanie presetu i pozostałe ustawienia. Nie wysyłaj `action` w tej operacji.

`operation: replace` zastępuje całą konfigurację klimatyczną. Wyślij `action` i wszystkie ustawienia, które mają pozostać. Tak przełącza się między ustawianiem temperatury, samego trybu, samych dodatkowych ustawień i wyłączeniem. Nazwa presetu, identyfikator i miejsce w bibliotece pozostają bez zmian.

| Pole | Znaczenie |
|---|---|
| `preset_key` | Wymagany identyfikator istniejącego presetu Velair. |
| `operation` | `update` (domyślnie) lub `replace`. |
| `action` | Wymagane przy `replace`, niedozwolone przy `update`. Użyj `set_temperature`, `set_hvac_mode`, `set_climate_options` lub `turn_off`. |
| `temperature` | Pojedyncza temperatura docelowa w zadeklarowanej jednostce Velair. |
| `target_temp_low`, `target_temp_high` | Docelowy zakres natywny; zawsze wysyłaj obie granice razem. |
| `hvac_mode` | Tryb HVAC zgodnie z regułami wybranego działania. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Opcjonalne ustawienia urządzenia zgodnie z regułami działania. |
| `clear_fields` | Tylko dla `update`: lista parametrów klimatycznych do usunięcia. |

Wysłanie pojedynczej temperatury usuwa wcześniejszy zakres; wysłanie pełnego zakresu usuwa wcześniejszą pojedynczą temperaturę. Nie wysyłaj obu w jednym wywołaniu. Usunięcie wymaganej temperatury lub ostatniego ustawienia presetu zawierającego tylko opcje jest nieprawidłowe. Do zmiany samego działania używaj `replace`.

Pominięcie pola w `update` zachowuje je. Puste ciągi i `null` nie oznaczają usunięcia ustawienia; użyj `clear_fields`. W jednym wywołaniu nie można ustawić i usunąć tego samego pola. Usunięcie ustawienia urządzenia kończy wysyłanie danego polecenia, ale nie resetuje tego ustawienia na termostacie.

Standardowy formularz działania Home Assistant określa zmiany wykonywane przy każdym uruchomieniu automatyzacji. Nie ładuje do formularza bieżących wartości presetu. Rzadziej używane parametry są zgrupowane w zwiniętych sekcjach.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Przykład: dostosowanie komfortu ogrzewania do temperatury zewnętrznej

**Sytuacja:** salon i gabinet używają presetu Velair **Heating comfort**, ustawionego na ogrzewanie do 21 °C z cichym wentylatorem. Chcesz 21 °C podczas zimnej pogody i 19 °C przy łagodniejszej, zachowując tryb i wentylator.

Ta automatyzacja sprawdza warunki przy uruchomieniu Home Assistant i zmianach czujnika zewnętrznego. Poniżej 10 °C ustawia 21 °C; powyżej 12 °C ustawia 19 °C. Między progami zachowuje poprzedni cel. Odstęp zapobiega ciągłemu przełączaniu wokół jednego progu. Przy niedostępnym czujniku niczego nie zmienia.

```yaml
alias: Velair heating comfort by outdoor temperature
triggers:
  - trigger: homeassistant
    event: start
  - trigger: state
    entity_id: sensor.outdoor_temperature
conditions:
  - condition: template
    value_template: "{{ is_number(states('sensor.outdoor_temperature')) }}"
actions:
  - choose:
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            below: 10
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 21
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            above: 12
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 19
mode: queued
max: 10
```

Przykład zakłada, że Velair i czujnik zewnętrzny używają °C. Dla Fahrenheita wybierz równoważne progi i cele w odpowiednich jednostkach. Usługa nigdy nie przelicza odczytu czujnika zewnętrznego dla tej automatyzacji.

Oba pomieszczenia zachowują własne harmonogramy. Jeśli Heating comfort jest aktywny, a Velair steruje automatycznie, jego temperatura zmienia się po zapisaniu. Jeśli następny blok dopiero nastąpi, Velair przelicza zdarzenia i plan przygotowania temperatury. Powtarzane wywołania z niezmienioną konfiguracją nie zapisują danych ani nie wysyłają poleceń.

<a id="example-update-a-native-range"></a>
## Przykład: aktualizacja natywnego zakresu

**Sytuacja:** termostat obsługujący zakres ogrzewania/chłodzenia używa **Home range**. Zmień cel na 19–25 °C, zachowując tryb i opcje urządzenia:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Wyślij obie granice, nawet jeśli zmienia się tylko jedna. Termostat obsługujący wyłącznie pojedyncze temperatury nie może korzystać z tego presetu. Velair nie wyznacza zastępczej pojedynczej temperatury ani brakującej granicy zakresu.

<a id="example-change-or-remove-a-device-setting"></a>
## Przykład: zmiana lub usunięcie ustawienia urządzenia

Aby zmienić tylko wentylator, zachowując temperaturę i tryb HVAC:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Aby przestać wysyłać polecenie wentylatora w tym presecie:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` oznacza **preset urządzenia**, np. `eco` lub `sleep`. To parametr wewnątrz presetu Velair, a nie identyfikator innego presetu Velair.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Przykład: zastąpienie wyłączeniem i jawne przywrócenie

Zastąp konfigurację zapisanego presetu wyłączeniem:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Aby przywrócić ogrzewanie do 21 °C z cichym wentylatorem, ponownie jawnie zastąp konfigurację:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: set_temperature
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Nie ma czasowego wygaśnięcia ani automatycznego przywracania. Wyłączenie wpływa na wszystkie zapisane odwołania do presetu. Dla otwartego okna lub chwilowego wstrzymania jednego pomieszczenia lepiej użyć [pauzy strefy z identyfikatorem właściciela](usage.pl.md#services), która nie zmienia wspólnego presetu.

<a id="validation-and-runtime-behavior"></a>
## Sprawdzanie i zachowanie podczas działania

- Velair sprawdza każde zapisane miejsce użycia, w tym nieaktywne Profile i harmonogramy domyślne ukryte przez Profil. Niezgodne użycie odrzuca całą aktualizację; nic nie zapisuje się częściowo.
- Obsługiwane opcjonalne ustawienia mogą być filtrowane dla poszczególnych termostatów według istniejących reguł dostosowania. Nadal obowiązują granice temperatur, zgodność działań i ograniczenia sterownika zewnętrznego.
- Wzmocnienie, Pauza, regulacja ręczna i zatrzymanie zachowują pierwszeństwo. Aktualizacja presetu ich nie anuluje. Po wznowieniu automatycznego sterowania Velair używa najnowszych zapisanych ustawień.
- Aktywna automatyczna zmiana stosuje się po zapisaniu; zmiana dotycząca wyłącznie przyszłości nie wysyła niepotrzebnego polecenia teraz. Przygotowanie temperatury i Room Assist są uzgadniane, gdy zmieni się cel lub źródło. Działania ustawiające sam tryb, same opcje i wyłączenie nie zyskują wcześniejszego przygotowania temperatury.
- Sterowniki zewnętrzne otrzymują zaktualizowane harmonogramy tygodniowe z gotowymi ustawieniami po zmianie efektywnych harmonogramów. Błąd publikacji nie włącza lokalnego wykonywania.
- Nieznane identyfikatory, błędne kombinacje, niezgodne użycia i oczekująca migracja jednostki temperatury powodują błędy. Niepowodzenie przekazania poleceń po zapisaniu nie cofa zapisanego presetu.

Progi warunków otoczenia, histereza, interpretacja prognozy i moment przywrócenia ustawienia należą do automatyzacji Home Assistant. Usługa nie tworzy reguł pogodowych ani odpytywania w Velair. [Blueprint sezonowego wyboru ustawień](blueprints/seasonal-climate-selection.pl.md) może wybierać Tryby lub uruchamiać te usługi jeden raz, gdy temperatura utrzyma się w nowym zakresie sezonowym przez skonfigurowany czas. Wybierz Tryby, jeśli zima i lato mają zachować osobne definicje presetów; aktualizacja presetu zmienia wszystkie jego użycia.

Zakres wspólnych zasobów opisano w [Presetach bloków i powiązanych szablonach](linked-schedules.pl.md), a pełne konfiguracje domowe w [Praktycznych przykładach](linked-schedule-examples.pl.md).
