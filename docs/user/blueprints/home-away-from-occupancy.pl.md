<a id="home-and-away-from-occupancy"></a>
# Obecność i nieobecność na podstawie zajętości domu
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [Status tłumaczeń](../../translation-status.md)

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

Uruchamiaj wybrane działania Home Assistant, gdy jedna zbiorcza encja obecności zgłosi obecność lub pusty dom. Logika osób, gości i wyjątków domowych pozostaje w Home Assistant, a typowe zmiany Trybów i Profili Velair łatwiej skonfigurować. Opóźnione powiadomienie wyjaśnia, kiedy encja nie pozwala bezpiecznie rozstrzygnąć obecności lub nieobecności.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Otwórz Home Assistant i zaimportuj blueprint obecności i nieobecności" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz źródło YAML blueprintu obecności i nieobecności"></a>
</p>

[Historia zmian](../../../blueprints/changelogs/occupancy_home_away.md) · [Powrót do indeksu blueprintów](../blueprints.pl.md)

<a id="when-to-use-it"></a>
## Kiedy go używać

Użyj tego blueprintu, jeśli Home Assistant ma już jedną encję określającą, czy dom jest zajęty. Nadaje się do przełączania obecności, nieobecności i podobnych sytuacji, w których końcowe działania wymagają opóźnienia i ponownego sprawdzenia przed wykonaniem.

<a id="requirements"></a>
## Wymagania

- Blueprint 1.0.0 i Home Assistant 2024.6.0 lub nowszy.
- Jeden `binary_sensor` lub `input_boolean` ze stanami `on`/`off` albo grupa osób z `home`/`not_home`.
- Velair jest wymagany tylko wtedy, gdy skonfigurowane działania używają jego Trybów, Profili, encji lub usług. W pozostałych przypadkach blueprint może uruchamiać standardowe działania Home Assistant bez Velair.

Przed wybraniem wynikowej encji zbuduj reguły osób, gości, stref i obecności w Home Assistant. Grupa osób może wskazywać, czy którakolwiek śledzona osoba jest `home`, a szablonowy czujnik binarny może uwzględniać pomocnika gości lub inne wyjątki. Blueprint akceptuje zarówno `on`/`off`, jak i `home`/`not_home`, zamiast odtwarzać tę decyzję.

<a id="configuration"></a>
## Konfiguracja

- **Consolidated occupancy state:** pojedyncza encja reprezentująca już obecność w całym domu.
- **When occupied:** co najmniej jedno standardowe działanie Home Assistant.
- **When empty:** co najmniej jedno standardowe działanie Home Assistant.
- **Occupied delay:** czas ciągłego utrzymania `on` lub `home`.
- **Empty delay:** czas ciągłego utrzymania `off` lub `not_home`.
- **Availability warning delay:** czas utrzymania `unknown` lub `unavailable` przed utworzeniem powiadomienia diagnostycznego Home Assistant. Domyślnie 5 minut.

<a id="example"></a>
## Przykład

Dla działania przy obecności dodaj **Select: Select**, wybierz widoczną encję Trybu Velair oferowaną przez Home Assistant i opcję `Home`. Analogicznie skonfiguruj działanie przy pustym domu z `Away`. Wybierz encję w interfejsie, zamiast zakładać konkretny identyfikator.

Wygenerowane działania odpowiadają:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Aby zamiast tego bezpośrednio aktywować Profil:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Tryby są zwykle czytelniejsze dla obecności, nieobecności i wakacji, ponieważ bieżący stan pozostaje widoczny w selektorze Trybu Velair w Home Assistant.

<a id="how-it-works"></a>
## Jak działa

Wyzwalacze obecności (`on`/`home`) i pustego domu (`off`/`not_home`) używają natywnych czasów `for` Home Assistant, więc stan musi utrzymać się nieprzerwanie przez całe opóźnienie. Osobne wyzwalacze szablonowe wykrywają utrzymujące się `unknown`/`unavailable` i powrót do obsługiwanego stanu. Po opóźnieniu ostrzeżenia Home Assistant tworzy jedno trwałe powiadomienie przypisane do automatyzacji, aktualizuje je zamiast powielać i usuwa po odzyskaniu danych. Działania obecności i nieobecności nie wykonują się bez prawidłowego stanu encji.

Przy uruchomieniu sprawdzanie obecności, pustego domu i dostępności działa w wewnętrznych równoległych gałęziach. Każda sprawdza stan początkowy, czeka z możliwością przerwania na stan przeciwny do skonfigurowanego limitu, kontynuuje tylko po upływie tego czasu i sprawdza stan ponownie przed działaniem. Ograniczony zewnętrzny tryb równoległy sprawia, że oczekiwanie na dostępność przy uruchomieniu nie blokuje późniejszej prawidłowej zmiany obecności. Nie ma odpytywania.

<a id="safety-and-precedence"></a>
## Bezpieczeństwo i pierwszeństwo

Akcje Trybów i Profili używają polityki bloku wybranego harmonogramu. **Tylko temperatura** aktualizuje cel bez żądania zmiany trybu HVAC, dlatego wybór Home nie musi włączyć wyłączonego urządzenia. Użyj jawnego bloku **Ogrzewanie** lub **Chłodzenie**, jeśli Home ma rozpocząć pracę. Bezpośrednie akcje klimatyczne skonfigurowane w blueprincie pozostają jawnymi akcjami Home Assistant; polityka bloku ich nie blokuje.

Blueprint wykonuje tylko skonfigurowane działania. Nadal obowiązuje pierwszeństwo Trybów, Profili, Wzmocnienia i Pauzy Velair. Encja obecności w stanie `unknown` lub `unavailable` nie aktywuje ani obecności, ani nieobecności; ostrzeżenie wskazuje encję i wyjaśnia wstrzymanie działań do powrotu obsługiwanego stanu zajętego lub pustego domu.

<a id="limitations"></a>
## Ograniczenia

- Blueprint celowo przyjmuje jedną encję z rozstrzygniętą obecnością; sam nie łączy reguł osób ani gości.
- Timery `for` Home Assistant nie przetrwają restartu, więc ścieżka uruchomienia zaczyna opóźnienie od nowa.
- Identyfikator powiadomienia używa identyfikatora encji automatyzacji. Zmiana nazwy automatyzacji może pozostawić poprzednie powiadomienie do ręcznego usunięcia.
- Wykonanie równoległe jest ograniczone do 20 uruchomień i ostrzega, gdy nietypowy natłok zdarzeń zajmie wszystkie miejsca.
- Automatyzacje przejęte przez **Take control** nie otrzymują już aktualizacji blueprintu automatycznie.

<a id="troubleshooting"></a>
## Rozwiązywanie problemów

- Jeśli żadna gałąź nie działa, sprawdź, czy encja zgłasza `on`/`home` lub `off`/`not_home`.
- Jeśli pojawia się ostrzeżenie, sprawdź wskazaną encję i źródłową grupę, szablon, osoby lub pomocnika gości.
- Jeśli nieobecność aktywuje się zbyt szybko, zwiększ opóźnienie pustego domu.
- Jeśli oczekiwany Tryb nie zostaje wybrany, uruchom wybrane działanie ręcznie w Home Assistant i sprawdź nazwę opcji.
- Jeśli działanie Profilu zawiedzie, użyj jego stałego identyfikatora, nie edytowalnej nazwy wyświetlanej.

<a id="updating-and-customizing"></a>
## Aktualizacja i dostosowanie

Zaimportuj ponownie bieżący adres `main`, aby zainstalować zgodną aktualizację. Aktualizacje wersji 1 zachowują nazwy istniejących parametrów i dają wartości domyślne nowym, więc nie wymagają migracji automatyzacji. Przyszła niezgodna wersja użyje nowego pliku i wersji głównej, zamiast zastępować ten adres. Velair nigdy nie edytuje automatyzacji Home Assistant ani `.storage` w celu migracji blueprintu. Używaj **Take control** tylko wtedy, gdy potrzebnej logiki nie da się wyrazić dostępnymi parametrami; niezależna automatyzacja przestaje wtedy otrzymywać aktualizacje blueprintu.
