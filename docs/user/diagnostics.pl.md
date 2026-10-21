<a id="diagnostics"></a>
# Diagnostyka
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.3 |
| Ostatnia synchronizacja | 2026-10-21 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Sekcja **Diagnostyka** daje lokalny widok tylko do odczytu tego, co Velair może potwierdzić, bez wymagania Home Assistant Recorder ani usług zewnętrznych.

Pokazuje bieżący stan harmonogramu i zwarty poziomy pasek zarządzanych encji w skonfigurowanej kolejności termostatów. Wybranie encji otwiera pod paskiem jeden panel szczegółów na całą szerokość. Panel grupuje każdą informację raz: stan i przekazywanie poleceń, aktywna konfiguracja, funkcje oraz urządzenie i czujniki. Obejmuje:

- dostępność i zgłaszane możliwości HVAC/temperatury;
- wykryte problemy konfiguracji potwierdzone bezpośrednimi danymi;
- efektywny Tryb i Profile, obliczony zamiar sterowania, Wzmocnienia i pauzy;
- ostatni cel sterowania zaakceptowany przez Home Assistant, błąd przekazania i stan ograniczonych prób;
- Room Assist, adaptacyjne przygotowanie temperatury, Komfort i jawnie powiązane czujniki.

Udane wywołania `velair.set_hvac_mode` pojawiają się jako przyjęte ręczne polecenie dotyczące tylko trybu. Obejmują wybrany tryb HVAC, ale nie wymyśloną temperaturę. Błędy sprawdzania nie zastępują poprzedniego potwierdzenia przyjęcia, a błędy fizycznego przekazania nie publikują zdarzenia udanego celu.

Velair nie wnioskuje o przyczynie, gdy dane potwierdzają tylko objaw, np. niedostępność encji. Informacje o baterii są pomijane, jeśli nie można wiarygodnie powiązać źródła; pierwsza wersja nie dopasowuje urządzeń heurystycznie.

Dla Komfortu Diagnostyka obejmuje zapisane źródło każdego włączonego odczytu pochodnego, efektywne wejście lub encję zewnętrzną, bieżącą dostępność i stałe kody problemów dla brakujących, nieaktualnych, błędnych lub niezweryfikowanych danych. Punkt rosy, wilgotność bezwzględna i Humidex są tu obserwacjami: ich obecność w raporcie nie oznacza wpływu na harmonogram lub sterowanie. Te same włączone dane są w atrybucie `derived_metrics` czujnika **Warunki otoczenia** strefy; Velair nie tworzy dla nich osobnych encji pośredniczących. Aktualne odczyty zawierają `freshness: reported` lub `unverified`; drugi stan pozostaje widoczny z etykietą informacyjną i można prześledzić jego źródło.

Przy włączonym porównaniu z warunkami zewnętrznymi raport zawiera też dostępność jawnych czujników, osobną jakość danych zewnętrznych, znormalizowane porównanie, jawną wilgotność bezwzględną wewnątrz i na zewnątrz oraz kod możliwości lub kompromisu. Blok `guidance_thresholds` zapisuje efektywną czułość strefy używaną dla wniosku, co pomaga odróżnić problem czujnika od celowo bardziej rygorystycznych wskazówek. Te wartości są obserwacyjne i nie oznaczają otwarcia okna lub zmiany HVAC przez Velair. Diagnostyka obejmuje również `comfort_zone`: geometrię prostego, prowadzonego lub niestandardowego modelu zależnego od temperatury i zakres wilgotności efektywny przy bieżącej temperaturze. Zakres `null` wyjaśnia brak klasyfikacji aktualnej wilgotności przy niedostępnej temperaturze; nie zastępuje go zgadywana wartość.

Bieżąca ocena zawiera aktualne `range_summary`. Zachowane wpisy `comfort_assessment_changed` mają też `previous_range_summary` i flagi `range_summary_changed` oraz `range_status_changed`, aby pobrany raport pokazał, czy zdarzenie dotyczyło przejścia względem skonfigurowanego zakresu, czy innej zmiany Komfortu. Pola zawierają tylko stałe kody znaczeniowe, nie surowy kontekst zdarzeń Home Assistant.

<a id="learning-evidence"></a>
## Dane uczenia

Dotychczasowa sekcja funkcji Przygotowanie wstępne rozdziela aktywność ogrzewania i chłodzenia. Pokazuje, czy trwa obserwacja, czy Velair czeka na odpowiednią zmianę, oraz ostatnią zachowaną zmianę uczenia, jeśli jest dostępna. Rozwijane szczegóły zawierają tylko dane istotne dla tej decyzji: na przykład temperaturę początkową i docelową, minimalną różnicę temperatur, czas obserwacji i ustawione maksymalne wyprzedzenie.

Historia Przygotowania wstępnego obejmuje rozpoczęcia, przerwania i wyniki obserwacji oraz rzeczywiste zmiany, które nie pozwoliły na rozpoczęcie obserwacji. Wyniki rozróżniają obserwacje pełne, częściowe i nieprawidłowe. Dla nieprawidłowych mogą wskazywać zbyt małą różnicę temperatur, zbyt krótki czas albo czas przekraczający ustawione maksimum. Starsze zapisane obserwacje mogą zachować ogólny powód przekroczenia granic. Velair nie przypisuje im wstecz dokładniejszej przyczyny.

Ponowne obliczanie przyszłych prognoz nie tworzy wpisów uczenia. Ostatnia zmiana podlega tym samym ustawieniom przechowywania i globalnemu limitowi historii co oś czasu. Wyłączenie historii Przygotowania wstępnego lub wyczyszczenie historii usuwa te dane historyczne; nie zatrzymuje uczenia ani nie usuwa zapisanych próbek. Po restarcie poprzednia aktywność wykonania i historia nie są odtwarzane. Bez danych Diagnostyka nie wymyśla przyczyny niezmiennych liczników ani nie wnioskuje o pracy kotła.

<a id="preconditioning-dependency-evidence"></a>
### Dane o zależności przygotowania

Dla strefy z ustawionym **Nadrzędnym termostatem przygotowania** sprawdź szczegóły zależności obok dotychczasowych informacji o przygotowaniu. Rozróżniają niezależny szacunek strefy, wybraną zmianę i początek nadrzędnego oraz efektywny początek lub powód uniemożliwiający przygotowanie. Polecenie przyjęte przez Home Assistant dowodzi działania Velair, nie jest pomiarem stanu przekaźnika kotła. Obserwacja uczenia nadal opisuje własną temperaturę i czas strefy zależnej.

Gdy są dane, wyjaśnienie rozróżnia dostępność w Home Assistant od wyłączonego harmonogramu lub Przygotowania wstępnego, wstrzymanego Profilu, aktywnego nadpisania, niedozwolonego nadrzędnego lub brakującej zmiany. To samo wyjaśnienie pojawia się na kartach i w Diagnostyce. Niedostępne urządzenie może nadal mieć obliczoną prognozę, jeśli inny skonfigurowany czujnik dostarcza temperaturę pomieszczenia; prognoza nie potwierdza, że urządzenie może przyjąć polecenie ani dostarczyć ogrzewanie lub chłodzenie.

<a id="runtime-history-and-privacy"></a>
## Historia działania i prywatność

Diagnostyka zachowuje najwyżej 100 istotnych zdarzeń na jednej globalnej osi czasu. Sekcja **Ustawienia historii** pozwala niezależnie zachowywać zdarzenia sterowania i harmonogramów, Room Assist, przygotowania temperatury, Komfortu, przekazywania poleceń oraz dostępności. Nowe typy zdarzeń Velair, które nie zostały jeszcze przypisane do kategorii, trafiają do sterowania i harmonogramów zamiast być pomijane. Zmiany zewnętrzne i przejścia między sterowaniem automatycznym a ręcznym również należą do tej kategorii. Ich wpisy pokazują tylko zmieniony tryb HVAC lub pojedynczą temperaturę albo zakres, efektywną politykę zmian zewnętrznych oraz ewentualny czas zakończenia lub powód wznowienia. Nie zachowują dowolnych atrybutów encji ani identyfikatorów Context Home Assistant. Wszystkie kategorie są domyślnie włączone. Backend zapisuje wybór kategorii lokalnie; wyłączenie kategorii natychmiast usuwa jej zachowane zdarzenia. **Wyczyść historię** usuwa wszystkie zachowane zdarzenia bez zmiany bieżących informacji o stanie działania, przekazywaniu poleceń i konfiguracji.

Dziennik można filtrować lokalnie bez zmiany tego, co Velair zachowuje. Wybierz dowolne połączenie źródła systemowego Velair i zarządzanych encji albo opcję **All**, a następnie opcjonalnie kategorię i zakres dat obejmujący również obie daty graniczne od/do. **Wyczyść filtry** przywraca pełną zachowaną oś. Pusta historia jest wyświetlana inaczej niż zestaw filtrów bez wyników. Filtry są tymczasowym stanem interfejsu, nie zapisują się.

Na komputerze szerokość kolumn dziennika można zmieniać przeciągając separatory lub klawiaturą przy fokusie separatora. Strzałki zmieniają ją małymi krokami, Shift+strzałka większymi, Home/End przesuwają do dozwolonych granic, a dwuklik przywraca szerokość domyślną. Szerokości są tymczasowe. Na telefonie czas, encja, typ i komunikat zajmują cztery osobne wiersze. Wiersz może przewijać się poziomo, jeśli wartość nie mieści się bez zawijania.

Zapisuje się tylko wybór kategorii. Historia zdarzeń istnieje wyłącznie w pamięci, znika po restarcie integracji lub Home Assistant i nie korzysta z Recorder. Powstaje z istniejących zdarzeń Velair, zmian dostępności i wyników przekazywania, więc nie dodaje odpytywania.

**Pobierz raport** otwiera opcje prywatności przed utworzeniem JSON do zgłoszenia. Domyślnie identyfikatory zarządzanych encji są zastępowane stałymi aliasami; możesz zachować surowe identyfikatory do lokalnej analizy. Identyfikatory Profili, Trybów i pauz są zawsze usuwane. Zamknięcie panelu lub zakończenie pobierania przywraca bezpieczniejszą wartość domyślną. Standardowe pobieranie diagnostyki wpisu konfiguracji Home Assistant zawsze używa wersji z usuniętymi danymi wrażliwymi. Sekcja eksportu jest ukryta na układach telefonu, ponieważ pobieranie w widoku webview aplikacji mobilnej bywa zawodne. Aby pobrać raport, otwórz Velair na tablecie lub w przeglądarce komputerowej. Sprawdź raport przed publikacją. Identyfikatory powiązanych czujników również są zastępowane; lokalny widok zachowuje je, bo pomagają sprawdzić konfigurację.

Lokalna Diagnostyka używa przyjaznych nazw encji przy filtrowaniu, ale panel szczegółów celowo pokazuje ich lokalne identyfikatory. Przy domyślnej ochronie prywatności pobrane raporty zastępują zarówno identyfikatory strukturalne, jak i te w zachowanym tekście błędów deterministycznymi aliasami, np. `climate_unit_1` i `associated_entity_1`. Powtórzone odwołania zachowują ten sam alias, więc relacje nadal są użyteczne bez ujawniania oryginalnych identyfikatorów. Jeśli jawnie zachowasz surowe identyfikatory, pozostaną one w raporcie; identyfikatory Profili, Trybów i pauz nadal są usuwane. Sprawdź każdy raport przed udostępnieniem.

Diagnostyka nie steruje harmonogramem, próbami, cofaniem zmian ani encjami. Konfiguracja i konserwacja pozostają w Ustawieniach; możliwości i stan urządzeń należą teraz do Diagnostyki.

Każde zarządzane urządzenie zgłasza też niezapisywane dane o stabilizowaniu poleceń. Gdy niedawne polecenie Velair się stabilizuje, migawka Diagnostyki wymienia objęte pola sterowania. Jeśli urządzenie nie osiągnie zgodności przed ograniczonym terminem, następna świeża migawka oznacza je ostrzeżeniem `command_settling_mismatch`. Rozwiń ostrzeżenie w panelu Diagnostyki wybranego urządzenia, aby porównać oczekiwaną wartość każdego pola z wartością zgłoszoną przez termostat. Temperatury zawierają jednostkę urządzenia, tryby HVAC używają zwykłych etykiet, a brakujące wartości są jawnie oznaczone. To zapisane porównanie, nie bieżący harmonogram ani nowy odczyt. Pobrany raport zachowuje też blok `command_settling`. To dane do rozwiązywania problemów: Diagnostyka nie ponawia polecenia, nie zmienia urządzenia ani nie tworzy regulacji ręcznej. Dane są usuwane przez nowsze polecenie dla danego pola lub restart.

<a id="automating-diagnostic-health"></a>
## Automatyzowanie kontroli diagnostycznej

Velair tworzy encję **Stan diagnostyki** ze stanami `ok`, `warning` i `error`. Aktualizuje ją z tej samej migawki backendu co widok, bez odpytywania. Zwarte atrybuty obejmują stan harmonogramu, liczby urządzeń i problemów oraz stałe kody; nie zawierają surowych błędów ani identyfikatorów operacyjnych.

Użyj wyzwalacza stanu, jeśli potrzebny jest tylko bieżący zbiorczy stan. Użyj `diagnostic_issue_changed`, jeśli automatyzacja ma reagować na wykrycie lub usunięcie jednego problemu przy innych nadal aktywnych. Dane i przykłady opisują [Zdarzenia automatyzacji](automation-events.pl.md#diagnostic-issue-changed).

Każda encja ma też domyślnie wyłączony czujnik **Diagnostyka dostarczania strefy**. Pokazuje te same niezapisywane informacje o przekazywaniu i ostatnim przyjętym celu co Diagnostyka, bez surowego tekstu błędu. Przyjęty cel oznacza zaakceptowanie sekwencji usług Velair przez Home Assistant; nie potwierdza stanu urządzenia ani transportu. Room Assist może później skorygować wysyłany cel i pokazuje kontekst we własnym czujniku. Potwierdzenia przekazywania nie są odtwarzane po restarcie i są usuwane po udanym resecie danych Velair. Pełny kontrakt stanów i atrybutów, włączenie i przykłady opisują [Czujniki sterowania i przekazywania poleceń](zone-sensors.pl.md#zone-delivery-diagnostics).
