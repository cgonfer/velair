<a id="pause-a-zone-while-windows-are-open"></a>
# Wstrzymanie strefy przy otwartych oknach
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [Status tłumaczeń](../../translation-status.md)

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

Wstrzymuj co najmniej jedną encję zarządzaną przez Velair, gdy którekolwiek wybrane okno lub drzwi pozostają otwarte. Wznawiaj harmonogramy dopiero, gdy wszystkie kontaktrony potwierdzą zamknięcie i każda aktywna pauza nadal należy do tej automatyzacji. Home Assistant ostrzega, gdy niedostępny kontaktron uniemożliwia bezpieczne wznowienie.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Otwórz Home Assistant i zaimportuj blueprint wstrzymywania strefy przy otwartych oknach" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz źródło YAML wstrzymywania strefy przy otwartych oknach"></a>
</p>

[Historia zmian](../../../blueprints/changelogs/window_pause.md) · [Powrót do indeksu blueprintów](../blueprints.pl.md)

Pytania, uwagi z testów i konstruktywne opinie są mile widziane w [oficjalnym wątku blueprintu na forum społeczności Home Assistant](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389).

<a id="when-to-use-it"></a>
## Kiedy go używać

Użyj tego blueprintu, gdy otwarcie okna lub drzwi ma chwilowo powstrzymać Velair przed zmianami ustawień co najmniej jednej encji związanej z tymi samymi otworami. Nadaje się do ogrzewania i chłodzenia; może pozostawić urządzenia w bieżącym stanie lub wyłączyć je podczas pauzy.

<a id="requirements"></a>
## Wymagania

- Blueprint 1.0.0, Velair 1.6.0 lub nowszy i Home Assistant 2024.6.0 lub nowszy. Velair 1.6.0 udostępnia używane tu jednoczesne powody pauzy z identyfikatorem właściciela.
- Co najmniej jedna encja klimatu już zarządzana przez Velair.
- Co najmniej jeden `binary_sensor` z klasą urządzenia `window`, `door` lub `opening`.
- Dla każdego wybranego kontaktronu `on` musi oznaczać otwarcie, a `off` zamknięcie.

<a id="configuration"></a>
## Konfiguracja

- **Managed thermostats:** wszystkie zarządzane encje, które mają być razem wstrzymywane i wznawiane.
- **Windows and doors:** wszystkie okna i drzwi wpływające na strefę.
- **Climate action while paused:** zachowanie bieżącego stanu lub wyłączenie encji.
- **Pause ID:** stały identyfikator właściciela. Zachowaj domyślny dla jednej automatyzacji lub użyj innego dla każdej osobnej automatyzacji sterującej tym samym termostatem.
- **Open delay:** czas, przez który co najmniej jedno okno lub drzwi musi pozostać otwarte przed pauzą.
- **Close delay:** czas zamknięcia wszystkich otworów przed wznowieniem.
- **Availability warning delay:** czas utrzymania `unknown` lub `unavailable` przez kontaktron przed powiadomieniem Home Assistant. Domyślnie 5 minut.

<a id="example"></a>
## Przykład

Dla urządzeń salonu i dwóch okien:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Jeśli któreś okno pozostaje otwarte przez dwie minuty, blueprint wstrzymuje obie encje salonu i wyłącza je. Po zamknięciu ostatniego okna i utrzymaniu zamknięcia obu kontaktronów przez 30 sekund wznawia każdy aktywny harmonogram.

<a id="how-it-works"></a>
## Jak działa

Home Assistant obserwuje trzy zbiorcze warunki: co najmniej jeden kontaktron otwarty, wszystkie zamknięte i co najmniej jeden `unknown` lub `unavailable`. Każdy korzysta z natywnego wyzwalacza szablonowego ze skonfigurowanym czasem `for`. Jeśli warunek przestaje być spełniony przed końcem czasu, Home Assistant resetuje timer i nie wykonuje działania. Po jego upływie krótkie działanie ponownie sprawdza cały zestaw przed pauzą, wznowieniem lub ostrzeżeniem.

Sterowanie przy otwarciu, zamknięciu i diagnostyka dostępności używają niezależnych wyzwalaczy zdarzeniowych. Otwarty kontaktron może więc wstrzymać strefę po opóźnieniu, nawet gdy inny jest niedostępny. Niedostępny kontaktron nadal uniemożliwia spełnienie warunku wszystkich zamkniętych i wznowienie.

Jeśli kontaktron pozostaje `unknown` lub `unavailable` przez czas ostrzeżenia, Home Assistant tworzy jedno trwałe powiadomienie dla całego zestawu termostatów. Wymienia problematyczne kontaktrony i wybrane termostaty oraz wyjaśnia brak wznowienia. Po opóźnieniu stan sprawdza się ponownie, więc starsze wykonanie kończy się przed utworzeniem powiadomienia, jeśli wszystkie kontaktrony odzyskały dostępność. Zbiorczy wyzwalacz odzyskania danych usuwa ostrzeżenie. Deterministyczny identyfikator powiadomienia sprawia, że kolejne wykonania aktualizują je zamiast tworzyć duplikaty.

Po uruchomieniu Home Assistant jedno wykonanie uzgadniające przeprowadza trzy kontrole w wewnętrznych równoległych gałęziach. Każda najpierw sprawdza zbiorczy warunek, czeka na przeciwny do skonfigurowanego limitu i zatrzymuje się natychmiast, jeśli on wystąpi. Gałąź otwarcia może więc wstrzymać encje, gdy gałąź dostępności nadal czeka. Działa tylko po upływie czasu i ponownym potwierdzeniu warunku. Home Assistant nie odtwarza czasu trwania warunku sprzed uruchomienia, więc przerywalne timery startowe zaczynają od zera. Zwykłe działanie korzysta następnie z opisanych ciągłych timerów wyzwalaczy. Nie ma odpytywania.

Wykonania automatyzacji mogą się nakładać, więc zdarzenie `opened_due` nie jest blokowane przez startowe oczekiwanie na dostępność. Oczekiwanie zajmuje tylko jedno z ograniczonych miejsc równoległych. Działania bezpiecznie zmierzają do aktualnego stanu: każda iteracja encji ponownie sprawdza kontaktrony, Velair szereguje zmiany ręcznych nadpisań dla każdej encji, a przeciwny zbiorczy wyzwalacz stosuje późniejszą decyzję pauzy lub wznowienia po zmianie warunków.

<a id="safety-and-precedence"></a>
## Bezpieczeństwo i pierwszeństwo

Blueprint tworzy każdą pauzę ze skonfigurowanym **Pause ID**. Domyślnie to `velair_window_guard`; Velair zapisuje właściciela niezależnie dla każdego wybranego termostatu.

- Nie zastępuje pauzy ręcznej ani pauzy innej automatyzacji.
- Zamknięcie wszystkich okien wznawia tylko pauzy z tym samym identyfikatorem.
- Ręczna pauza lub wznowienie w Velair ma pierwszeństwo.
- Istniejące skrypty i automatyzacje bez `pause_id` zachowują dotychczasowe działanie.
- Kontaktrony `unknown` i `unavailable` nigdy nie są uznawane za bezpiecznie zamknięte.
- Ostrzeżenia dostępności nie omijają ani nie zmieniają właściciela pauzy. Tylko wyjaśniają brak możliwości bezpiecznego wznowienia.

Każda encja otrzymuje osobne wywołanie usługi, bezpośrednio przed którym ponownie sprawdza się odpowiedni zbiorczy stan kontaktronów. Błąd usługi Home Assistant zapisuje się w śladzie automatyzacji, ale `continue_on_error` pozwala kontynuować pozostałe encje. Zmiany Wzmocnienia, pauzy, wznowienia i wygaśnięcia nadal są szeregowane osobno dla każdej strefy.

<a id="limitations"></a>
## Ograniczenia

- Najlepiej używać jednej automatyzacji ze wszystkimi istotnymi otworami dla tego samego zestawu termostatów.
- Jeśli osobne automatyzacje okien muszą sterować tym samym termostatem, nadaj każdej inny stały **Pause ID**. Utworzą niezależne powody pauzy, a każda usunie tylko własny.
- Blueprint nie potrafi wiarygodnie interpretować zmian pilotem podczerwieni, jeśli integracja urządzenia nie zgłasza ich Home Assistant.
- Przerywalne timery uzgadniania przy uruchomieniu zaczynają od zera, ponieważ Home Assistant nie odtwarza ich historii sprzed restartu.
- Powiadomienia wymagają wbudowanej integracji `persistent_notification` Home Assistant.
- Identyfikator powiadomienia używa identyfikatora encji automatyzacji, więc jest krótki i niezależny od wyboru lub kolejności termostatów. Zmiana nazwy automatyzacji może pozostawić wcześniejsze powiadomienie do ręcznego usunięcia.
- Równocześnie może działać do 50 wykonań. Home Assistant ostrzega, jeśli nietypowy natłok zdarzeń zajmie wszystkie miejsca; zwykłe wykonania wyzwalane warunkami są krótkie.

<a id="troubleshooting"></a>
## Rozwiązywanie problemów

- Jeśli strefa nigdy się nie wstrzymuje, sprawdź, czy co najmniej jeden kontaktron zgłasza `on` przy otwarciu i pozostaje otwarty dłużej niż opóźnienie.
- Jeśli strefa się nie wznawia, sprawdź, czy wszystkie kontaktrony zgłaszają `off`. Po czasie ostrzeżenia powiadomienie wymienia te, które nadal zgłaszają `unknown` lub `unavailable`.
- Jeśli ostrzeżenie pozostaje po odzyskaniu danych, sprawdź, czy kontaktron wygenerował nowe zdarzenie stanu. Przeładowanie lub uruchomienie automatyzacji także sprawdza cały zestaw i usuwa nieaktualne ostrzeżenie.
- Jeśli usługa zgłasza niezarządzaną encję, dodaj ją do Velair. Błędy usług nie zatrzymują pozostałych encji; sprawdź ślad automatyzacji, aby ustalić pojedyncze błędy.
- Jeśli po zamknięciu okien strefa pozostaje w pauzie, sprawdź, czy aktywną pauzę utworzono ręcznie lub przez inną automatyzację. Blueprint celowo jej nie zmienia.
- Jeśli kilka automatyzacji steruje tą samą encją, połącz monitorowane okna i drzwi w jednej automatyzacji lub sprawdź, czy każda używa innego stałego **Pause ID**.

<a id="updating-and-customizing"></a>
## Aktualizacja i dostosowanie

Zaimportuj ponownie bieżący adres `main`, aby zainstalować zgodną aktualizację. Aktualizacje wersji 1 zachowują nazwy istniejących parametrów i dają wartości domyślne nowym, więc nie wymagają migracji automatyzacji. Przyszła niezgodna wersja użyje nowego pliku i wersji głównej, zamiast zastępować ten adres. Velair nigdy nie edytuje automatyzacji Home Assistant ani `.storage` w celu migracji blueprintu. Używaj **Take control** tylko wtedy, gdy potrzebujesz zachowania wykraczającego poza dostępne kontaktrony, działania i opóźnienia; niezależna automatyzacja przestaje wtedy otrzymywać aktualizacje blueprintu.
