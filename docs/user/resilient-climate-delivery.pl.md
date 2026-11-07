<a id="resilient-climate-delivery"></a>
# Niezawodne przekazywanie poleceń do urządzeń klimatycznych
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.10 |
| Ostatnia synchronizacja | 2026-11-04 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Velair bezpiecznie zachowuje zamiar sterowania określony przez harmonogram, gdy zarządzany termostat chwilowo odzyskuje połączenie.

Jeśli encja przechodzi w stan `unknown` lub `unavailable`, Velair czeka, aż Home Assistant ponownie zgłosi jej dostępność. Reaguje na zmiany stanu i nie odpytuje urządzenia. Po przywróceniu połączenia sprawdza, co powinno być aktywne *teraz*. Nie odtwarza polecenia, które obowiązywało przed utratą połączenia.

Przykładowo profil nieobecności mógł wymagać 17 °C, gdy termostat był niedostępny. Jeśli przed odzyskaniem połączenia wybierzesz tryb obecności, Velair ustali i przekaże aktualną temperaturę dla tego trybu, zamiast nieaktualnego polecenia 17 °C. Ta sama zasada dotyczy trybów, Wzmocnienia, Pauzy, Room Assist oraz wcześniejszego adaptacyjnego przygotowania temperatury.

Gdy Home Assistant odrzuci wywołanie usługi klimatycznej albo przyjmie je, ale urządzenie nadal zgłasza inny cel, Velair podejmuje najwyżej dwie dodatkowe próby w tym epizodzie przekazywania poleceń. Pierwsze ponowienie czeka około 2 sekund, a drugie około 10 kolejnych sekund. Po ostatniej przyjętej próbie Velair daje 5 sekund na nadejście zgłoszenia celu. Zgodne zgłoszenie może wcześniej zakończyć potwierdzanie; urządzenia zgłaszające żądaną wartość nie wymagają ponowienia.

Odzyskiwanie jest niezależne dla każdej zarządzanej strefy. Jeśli kilka osobnych urządzeń zmienia blok jednocześnie, ponawiane jest tylko polecenie dla urządzenia, którego cel pozostaje inny. Pozostałe urządzenia nie czekają ani nie otrzymują ponownie swoich poleceń. Sprawdzenia korzystają ze stanów zgłaszanych przez Home Assistant i istniejących nasłuchów zmian stanu, bez okresowego odczytywania urządzenia.

Przed ponowieniem Velair ponownie sprawdza bieżący zamiar sterowania, w tym każdy nowy blok, Wzmocnienie lub pauzę. Nowszy zamiar albo zatrzymanie lub wyładowanie Velair anuluje nieaktualne oczekujące działania dla danego urządzenia. Diagnostyka pokazuje, czy potwierdzenie oczekuje, zostało uzyskane, uzyskano je po ponowieniu, czy nadal go brak. Usunięty cichy błąd pozostaje również w ograniczonej historii przekazywania poleceń.

Rzeczywista zmiana z niedostępności na dostępność zachowuje odzyskiwanie połączenia. Jeśli potwierdzenie lub odzyskiwanie już oczekuje, zachowane zostają pierwotny termin i limit prób; zgodne zgłoszenie może zakończyć potwierdzanie bez kolejnego polecenia. W przeciwnym razie odzyskanie połączenia rozpoczyna nowy epizod przekazywania bieżącego celu. Zwykłe zgłoszenia temperatury, wilgotności lub celu nie odnawiają wyczerpanego limitu prób. Spóźnione zgłoszenie zgodne z żądanym celem usuwa rozbieżność bez wysyłania kolejnego polecenia.

Ręczne ustawienie temperatury jest jednorazowe. Velair nie zastosuje dawnej ręcznej temperatury dopiero po odzyskaniu połączenia z urządzeniem.

Zdarzenie Velair oznaczające zastosowanie ustawień informuje, że Home Assistant zaakceptował całą sekwencję wywołań, w tym żądany tryb i obsługiwane opcje. Nie potwierdza, że fizyczne urządzenie osiągnęło temperaturę. Działanie urządzenia sprawdzaj w stanie encji klimatu i diagnostyce jego integracji.

Zasada ta obejmuje ogrzewanie, chłodzenie, pojedyncze temperatury docelowe, natywne zakresy `heat_cool`, wyłączanie oraz obsługiwane opcje wentylatora, presetu, kierunku nawiewu i wilgotności. Bloki zawierające wyłącznie opcje korzystają z tego samego mechanizmu przekazywania poleceń, bez ustawiania temperatury ani trybu HVAC. Wywołania wykonują się kolejno: jeśli późniejsze wywołanie zawiedzie, wcześniejsza opcja mogła już zostać zmieniona, ale Velair nie zgłosi zastosowania całego bloku.
