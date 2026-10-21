<a id="seasonal-climate-selection"></a>
# Sezonowy wybór ustawień klimatu
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Status tłumaczeń](../../translation-status.md)

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

Uruchamiaj wybrane działania raz po wejściu czujnika temperatury w nowy zakres zimowy, łagodnej pogody lub letni i pozostaniu w nim przez konfigurowalne opóźnienie. Wybieraj Tryby zimowe, na łagodną pogodę lub letnie bez powielania harmonogramów i umieszczania reguł pogodowych w Velair. Nieprawidłowe odczyty powodują natychmiastowe powiadomienie Home Assistant.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Otwórz Home Assistant i zaimportuj blueprint sezonowego wyboru ustawień klimatu" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz źródło YAML sezonowego wyboru ustawień klimatu"></a>
</p>

[Historia zmian](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Powrót do indeksu blueprintów](../blueprints.pl.md)

<a id="when-to-use-it"></a>
## Kiedy go używać

Użyj blueprintu, gdy Home Assistant udostępnia już dzienne maksimum prognozy, pomiar zewnętrzny lub temperaturę średnią jako jeden liczbowy czujnik temperatury. Wybiera on działania do wykonania; Velair nadal odpowiada za harmonogramy, presety, przygotowanie temperatury i przekazywanie poleceń urządzeniom.

Zarówno czujnik dziennej prognozy, jak i często zmieniający się czujnik zewnętrzny mogą potwierdzić zakres sezonowy. Zmiany w obrębie zakresu zachowują pierwotny termin. Działania wykonują się raz na wejście, więc późniejsze aktualizacje w tym samym zakresie nie wybierają Trybu wielokrotnie.

<a id="requirements"></a>
## Wymagania

- Blueprint 1.1.0 i Home Assistant 2024.6.0 lub nowszy.
- Jeden liczbowy czujnik z klasą temperatury i zadeklarowaną jednostką °C lub °F.
- Velair jest potrzebny tylko dla działań używających jego encji lub usług. Zwykłe skrypty i inne działania Home Assistant działają bez Velair.
- Jeśli dostawca pogody udostępnia prognozy, nie czujnik liczbowy, przygotuj taki czujnik osobno. Blueprint nie pobiera prognoz.

Tryby i natywny selektor Trybu Velair są dostępne od Velair 1.6.0. Współdzielone presety i powiązane szablony są opcjonalne: wybór sezonu może też wybierać Tryby oparte na niezależnych harmonogramach.

<a id="configuration"></a>
## Konfiguracja

| Pole | Zastosowanie |
|---|---|
| Temperature sensor | Istniejący czujnik do obserwowania |
| Temperature unit for thresholds | °C lub °F; odczyty są przeliczane przy porównywaniu |
| Winter threshold | Wartości poniżej progu uruchamiają działania zimowe; domyślnie 20 |
| Summer threshold | Wartości powyżej progu uruchamiają działania letnie; domyślnie 27 |
| Winter / Mild-weather / Summer actions | Standardowe sekwencje działań Home Assistant; początkowo puste |
| Range confirmation delay | Czas pozostawania temperatury w nowym zakresie sezonowym; domyślnie 30 minut |
| Language for diagnostic notifications | Dowolny język Velair dla trwałych ostrzeżeń czujnika i konfiguracji; domyślnie angielski |

Próg zimowy musi być niższy od letniego, a opóźnienie dodatnie. Wybór Fahrenheita nie zmienia automatycznie liczb progów: wpisz samodzielnie zamierzone progi w °F.

Oba wybory są jawne, ponieważ Home Assistant nie udostępnia szablonom blueprintów globalnych preferencji jednostki temperatury i języka. Język użytkownika przeglądarki również nie jest ustawieniem automatyzacji. Zadeklarowana jednostka czujnika jest odczytywana automatycznie, a wartość przeliczana na jednostkę progów; powiadomienia diagnostyczne używają wybranego tu języka.

Wybór języka zmienia tylko tekst powiadomień diagnostycznych. Etykiety i opisy formularza blueprintu pozostają po angielsku; nie tłumaczy on formularza konfiguracji Home Assistant.

Pusta sekwencja działań niczego nie robi. Nie wyłącza encji, nie wstrzymuje Velair ani nie wybiera harmonogramu domyślnego.

<a id="example"></a>
## Przykład

<a id="daily-maximum-and-three-modes"></a>
### Dzienne maksimum i trzy Tryby

Utwórz w Velair Tryby Invierno, Entretiempo i Verano. Powiąż Invierno i Verano z odpowiednimi Profilami. Dla Entretiempo ustaw Profil, którego właściwe strefy używają **Pauza → Wyłącz urządzenie**, jeśli łagodna pogoda ma wyłączać ogrzewanie/chłodzenie.

W każdej sekwencji działań dodaj **Select: Select** Home Assistant, wybierz widoczną encję Trybu Velair i jej opcję w edytorze. Nie zakładaj, że Twoja encja ma przykładowy identyfikator poniżej.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Przy progach 20 i 27 °C dzienne maksimum wchodzące w zakres zimowy przy 18 °C uruchamia działania zimowe po 30 minutach nieprzerwanie poniżej 20 °C. Zmiana na 19 °C w trakcie oczekiwania zachowuje ten sam termin. Kolejna aktualizacja do 23 °C uruchamia działania dla łagodnej pogody; 30 °C uruchamia letnie. Dokładnie 20 lub 27 °C należy do łagodnej pogody. Aktualizacje w już potwierdzonym zakresie nie powtarzają działań. Wyjście z zakresu i powrót rozpoczynają pełne nowe oczekiwanie, nawet jeśli zakres pośredni trwał zbyt krótko, aby wykonać swoje działania.

<a id="shared-hours-different-indoor-temperatures"></a>
### Wspólne godziny, różne temperatury w domu

Powiąż harmonogramy Profili Invierno i Verano z tym samym szablonem dziennym, używając **Tylko godziny**. Przypisz presety zimowe, np. ogrzewanie do 21 °C, i letnie, np. chłodzenie do 25 °C. Przesunięcie pozycji 07:00 w szablonie zmienia oba harmonogramy; wybór Trybu wybiera odpowiednie cele. Blueprint nie edytuje presetów ani szablonu. Zobacz [praktyczne przykłady powiązanych harmonogramów](../linked-schedule-examples.pl.md).

<a id="average-temperature-and-fahrenheit"></a>
### Temperatura średnia i Fahrenheit

Czujnik średniej może zmieniać się kilka razy na godzinę. Przy dziesięciominutowym opóźnieniu wejście w zakres letni przy 28 °C o 10:00 i zmiana na 29 °C o 10:07 nadal uruchamiają działania letnie o 10:10. Jeśli odczyt spadnie do 27 °C o 10:07, potwierdzanie lata zostaje anulowane i zamiast niego zaczyna się potwierdzanie łagodnej pogody.

Czujnik Fahrenheita może korzystać z progów Celsjusza, ponieważ odczyt jest przeliczany. Możesz też wybrać °F i wpisać progi np. 68 i 80.6 °F, równoważne 20 i 27 °C. Wartość 77 °F wybiera wtedy działania dla łagodnej pogody.

<a id="alternative-script-or-service"></a>
### Alternatywny skrypt lub usługa

Każda gałąź akceptuje zwykłe działania Home Assistant. Na przykład uruchom skrypt domowy w gałęzi letniej:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

Można również aktywować Profil bezpośrednio przez `velair.activate_profile` i jego stały identyfikator. Aby zmieniać wspólne ustawienia zamiast wybierać Tryb, zobacz [automatyzacje presetów](../preset-automations.pl.md); przed zmianą uwzględnij wszystkie użycia wspólnego presetu.

<a id="how-it-works"></a>
## Jak działa

Natywne wyzwalacze Home Assistant klasyfikują każdy odczyt temperatury po przeliczeniu na jednostkę progów. Wejście w zakres zimowy, łagodnej pogody lub letni rozpoczyna jego opóźnienie potwierdzenia. Odczyty w tym samym zakresie zachowują pierwotny termin; zmiany samych atrybutów lub formatowania nie rozpoczynają oczekiwania od nowa ani nie powtarzają działań.

Wyjście z zakresu natychmiast anuluje jego oczekujące potwierdzenie. Krótkie wyjście i powrót rozpoczynają pełne nowe oczekiwanie, nawet jeśli inny zakres nie zdążył wykonać swoich działań. Dokładne wartości progów należą do łagodnej pogody. Równoważne odczyty Celsjusza/Fahrenheita pozostają w tym samym zakresie.

Uruchomienie Home Assistant sprawdza wyłącznie diagnostykę. Nie wybiera sezonowego Trybu. Oczekujące timery nie przetrwają restartu, przeładowania automatyzacji ani wyłączenia i ponownego włączenia. Zakres obecny podczas dołączania wyzwalaczy jest stanem początkowym: późniejsze zmiany w jego obrębie nie wybierają go. Przejście między zakresami lub odzyskanie prawidłowych odczytów rozpoczyna potwierdzanie. Nie ma wyzwalacza okresowego ani codziennego ani trwałego pomocnika zapisującego ostatni wybór. Jeśli encji brakowało podczas dołączania wyzwalaczy, jej pierwsze pojawienie się ustala zakres początkowy bez jego wybierania.

Sprawdzanie czujnika działa osobno od potwierdzania sezonu. Brak encji, `unknown`, `unavailable`, wartość nieskończona lub nieliczbowa albo nieobsługiwana jednostka natychmiast tworzy jedno trwałe powiadomienie przypisane do automatyzacji w wybranym języku. Wskazuje ono automatyzację i czujnik oraz wyjaśnia wstrzymanie działań sezonowych. Nieprawidłowa konfiguracja ma osobne powiadomienie.

Nieprawidłowe odczyty anulują oczekiwanie. Odzyskanie danych po stanie nieliczbowym lub nieobsługiwanej jednostce rozpoczyna pełne nowe opóźnienie potwierdzenia. To nowy nieprzerwany okres prawidłowych odczytów, więc odzyskanie danych może ponownie wykonać te same działania sezonowe. Usuwa też ostrzeżenie czujnika.

Na przykład czujnik niedostępny o 09:00 ostrzega natychmiast. Powrót do 25 °C o 09:10 umożliwia działania dla łagodnej pogody o 09:40, jeśli temperatura przez cały ten okres pozostanie między progami, nawet gdy dokładna wartość się zmienia.

<a id="safety-and-precedence"></a>
## Bezpieczeństwo i pierwszeństwo

Wybór Trybu lub Profilu Velair używa polityk jego bloków. **Tylko temperatura** aktualizuje cel bez żądania zmiany trybu HVAC; użyj jawnych bloków **Ogrzewanie** lub **Chłodzenie**, jeśli wybór sezonu ma uruchomić urządzenie. Polityka nie blokuje bezpośrednich akcji HVAC skonfigurowanych w blueprincie.

Przy nieprawidłowym czujniku blueprint nie wybiera nowego sezonu i nie wyłącza urządzeń automatycznie. Poprzednio wybrany Tryb i harmonogram pozostają aktywne. Zareaguj na powiadomienie, jeśli takie zachowanie nie odpowiada Twojemu domowi.

Skonfigurowane działania korzystają ze zwykłej semantyki i śladów Home Assistant. Błąd działania nie cofa poprzednich działań. Blueprint nie potrafi ogólnie sprawdzić, czy dowolne działanie wybrało zamierzoną rutynę lub dotarło do fizycznego urządzenia.

Nowo potwierdzony zakres sezonowy może zastąpić ręcznie wybrany Tryb nieobecności. Skoordynuj automatyzacje sezonu i obecności, zamiast pozwalać im wybierać konkurujące Tryby. Na przykład skrypt domowy może wybierać nieobecność, gdy nikogo nie ma, a sezonowy Tryb obecności tylko wtedy, gdy pozwala na to obecność.

Nadal obowiązuje zachowanie Trybów/Profili Velair, w tym pierwszeństwo pauzy i anulowanie Wzmocnienia w objętych strefach. Przygotowanie temperatury przelicza się z efektywnego harmonogramu wybranego działaniem; nie przewidzi wyboru sezonu przed jego dokonaniem.

<a id="limitations"></a>
## Ograniczenia

- Potwierdzenie wymaga nieprzerwanego pozostawania w jednym zakresie sezonowym; wielokrotne przekraczanie granic może odkładać działania bez końca.
- Brak automatycznego działania sezonowego przy starcie, codziennego harmonogramu, odpytywania, zapisanego oczekującego timera, dodatkowej zgody przy 24 °C i opóźnionego wyłączenia.
- Usunięcie i ponowne utworzenie czujnika anuluje potwierdzanie. Ponowne pojawienie się ustala stan początkowy bez wybierania sezonu; wymagane jest późniejsze przejście do innego zakresu. Zapobiega to niespójnemu ponownemu uzbrajaniu natywnych wyzwalaczy Home Assistant po usunięciu encji. Dotyczy to również encji nieobecnej podczas ładowania automatyzacji. Normalne odzyskanie danych po `unknown`/`unavailable` lub błędnej jednostce rozpoczyna nowe potwierdzanie.
- Powiadomienia nie wykryją czujnika, który po cichu przestał się aktualizować, zachowując prawidłową liczbę. Jeśli potrzeba, monitoruj aktualność źródła osobno.
- Nie ma histerezy; opóźnienie potwierdzenia filtruje krótkie zmiany zakresu. Działania wykonują się raz na wejście w zakres, a nie raz na nowy odczyt.
- Liczba równoległych wykonań jest ograniczona. Długie sekwencje użytkownika mogą zajmować miejsca; skróć działania lub przekaż pracę skryptom.
- Rozpoczęta sekwencja nie jest anulowana przez późniejszy odczyt. Kontrole zabezpieczają początek, nie każde działanie użytkownika.
- Zmiana nazwy automatyzacji może pozostawić wcześniejsze powiadomienie do ręcznego usunięcia. Zmienione lub usunięte opcje Trybów wymagają poprawienia działań.

<a id="troubleshooting"></a>
## Rozwiązywanie problemów

- Jeśli nic się nie wykonuje, sprawdź, czy czujnik wszedł w inny zakres sezonowy lub odzyskał prawidłową wartość albo jednostkę, a następnie pozostał w tym zakresie przez całe opóźnienie. Start i przeładowanie nie rozpoczynają wyboru; aktualizacje w tym samym zakresie go nie powtarzają.
- Jeśli pojawia się ostrzeżenie, sprawdź wskazany czujnik, liczbowy stan i `unit_of_measurement`. Nieznane jednostki nigdy nie są zgadywane.
- Jeśli timer nigdy się nie kończy, sprawdź historię czujnika pod kątem przekroczeń granic lub nieprawidłowych odczytów. Dostosuj progi lub dodatnie opóźnienie do źródła.
- Jeśli wykonuje się niewłaściwa gałąź, sprawdź jednostkę progów i oba progi liczbowe.
- Jeśli przy łagodnej pogodzie urządzenia nadal działają, skonfiguruj rzeczywisty Tryb pauzy i wyłączenia; pusta lista działań nie jest poleceniem wyłączenia.
- Jeśli Tryb nie zostaje wybrany, przetestuj działanie ręcznie i sprawdź ślad automatyzacji. Wybierz aktualną nazwę opcji z edytora Home Assistant.
- Jeśli adres importu jest niedostępny przed publikacją, testuj plik YAML z pobranego repozytorium. Publiczne odnośniki działają po publikacji pliku na `main`.

<a id="updating-and-customizing"></a>
## Aktualizacja i dostosowanie

Zaimportuj blueprint jawnie; instalacja lub aktualizacja Velair przez HACS go nie instaluje. Zaimportuj ponownie ten sam bieżący adres `main` dla zgodnych aktualizacji. Wersja 1.1.0 zastępuje sposób odmierzania czasu z początkowej bety pod tym samym adresem, z tymi samymi nazwami parametrów i bez opcji zachowania dawnego zachowania czasowego. Zaimportuj ponownie i przeładuj objęte automatyzacje, aby korzystać z potwierdzania zakresu. Inne blueprinty zachowują opublikowane zasady zgodności.

Home Assistant odpowiada za wynikową automatyzację. Velair nie migruje automatyzacji ani `.storage`. Użyj **Take control** dla innej logiki, pamiętając, że niezależna automatyzacja przestaje otrzymywać aktualizacje blueprintu. Wspólne zasady dystrybucji i aktualizacji opisuje [katalog blueprintów](../blueprints.pl.md).
