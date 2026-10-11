<a id="documentation"></a>
# Dokumentacja
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Status tłumaczeń](translation-status.md)

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

Dokumentacja Velair jest podzielona według odbiorców i tematów.

<a id="user-documentation"></a>
## Dokumentacja użytkownika

- [Instalacja](user/installation.pl.md): instalacja Velair przez HACS lub ręcznie.
- [Użytkowanie](user/usage.pl.md): konfiguracja encji klimatu, harmonogramów, szablonów, profili, wzmocnień, pauz, importu/eksportu i usług.
- [Nawigacja panelu i bezpośrednie odnośniki](user/usage.pl.md#panel-navigation-and-direct-links): odnośniki do kart i podsekcji, przywracanie sekcji po odświeżeniu i historia przeglądarki.
- [Zmiany zewnętrzne i regulacja ręczna](user/manual-control.pl.md): wybór między zachowaniem automatycznego sterowania przez Velair a respektowaniem zmian z kart HA, pilotów, urządzeń i automatyzacji.
- [Zewnętrzne wykonywanie harmonogramów](user/external-systems.pl.md): publikowanie zgodnych, efektywnych harmonogramów tygodniowych, uwzględniających Profile i Tryby, do obsługiwanych sterowników bez mieszania logiki dostawcy z harmonogramem Velair.
- [Profile klimatyczne](user/climate-profiles.pl.md): koordynowanie alternatywnych harmonogramów i udostępnianie konfigurowalnych Trybów automatyzacjom Home Assistant.
- [Presety bloków i powiązane szablony](user/linked-schedules.pl.md): ponowne używanie ustawień klimatu i współdzielenie godzin lub całych harmonogramów dziennych między harmonogramem domyślnym a profilami.
- [Przykłady presetów i szablonów](user/linked-schedule-examples.pl.md): konfiguracje domowe krok po kroku, harmonogramy sezonowe, kopie, wspólne edycje i rozwiązywanie problemów.
- [Automatyzacje presetów](user/preset-automations.pl.md): aktualizowanie wspólnych temperatur i ustawień urządzeń ze skryptów, z przykładami opartymi na temperaturze zewnętrznej i jawnym zastępowaniem.
- [Zdarzenia automatyzacji](user/automation-events.pl.md): pełne dane zdarzeń działania do wykorzystania w automatyzacjach Home Assistant.
- [Blueprinty automatyzacji](user/blueprints.pl.md): opcjonalne pomocniki obecności, otwartych okien i temperatur sezonowych, bez odpytywania.
- [Sezonowy wybór ustawień klimatu](user/blueprints/seasonal-climate-selection.pl.md): wybieranie Trybów lub innych działań na podstawie stabilnych zmian temperatury, z natychmiastowymi powiadomieniami diagnostycznymi.
- [Adaptacyjne przygotowanie temperatury](user/adaptive-preconditioning.pl.md): wcześniejsze osiąganie zaplanowanego komfortu dzięki lokalnemu uczeniu.
- [Planowany powrót](user/planned-return.pl.md): nieobecność oparta na wykrywaniu obecności i cotygodniowe lub jednorazowe powroty, z przykładami anulowania przed potwierdzonym wyjściem i po nim.
- [Room Assist](user/room-assist.pl.md): osobny czujnik temperatury pomieszczenia dla głowic TRV, termostatów i klimatyzatorów.
- [Niezawodne przekazywanie poleceń klimatycznych](user/resilient-climate-delivery.pl.md): odroczone próby i zachowanie po ponownym połączeniu chwilowo niedostępnej encji.
- [Komfort otoczenia](user/comfort.pl.md): temperatura, wilgotność, jakość powietrza CO2 i aktualność odczytów w lokalnej ocenie pomieszczeń.
- [Jednostki temperatury i migracja](user/temperature-units.pl.md): wartości domyślne Celsjusza/Fahrenheita, aktualizacje, migracja, import/eksport i przywracanie działania.
- [Rozwiązywanie problemów](user/troubleshooting.pl.md): typowe problemy konfiguracji, zasobów interfejsu i działania.
- [Diagnostyka](user/diagnostics.pl.md): lokalny stan działania, ograniczona historia i raporty zgłoszeń z usuniętymi danymi wrażliwymi.
- [Informacje o czujnikach](user/sensors.pl.md): wszystkie czujniki Velair, ich główne atrybuty i praktyczne przykłady automatyzacji.
- [Czujniki sterowania strefą i przekazywania poleceń](user/zone-sensors.pl.md): kontekst odpowiedzialności za sterowanie każdą encją i dane o przekazywaniu poleceń w pulpitach i automatyzacjach.

<a id="developer-documentation"></a>
## Dokumentacja deweloperska

- [Architektura](developer/architecture.md): granice modułów backendu i interfejsu, model zapisu i przebieg działania harmonogramu.
- [Mechanizm powiązanych harmonogramów](developer/linked-schedules.md): aktywne presety bloków, powiązania samych godzin lub całych szablonów, wspólne transakcje i rozstrzygnięte harmonogramy.
- [Utrzymanie blueprintów](developer/blueprints.md): dodawanie plików YAML, pozycji katalogu, spójnych stron szczegółowych, tłumaczeń i testów.
- [API WebSocket](developer/api.md): kontrakt API między interfejsem i backendem.
- [Mechanizm adaptacyjnego przygotowania temperatury](developer/adaptive-preconditioning.md): stany lokalnego uczenia, wagi podobieństwa, zapis i wyniki API.
- [Mechanizm Room Assist](developer/room-assist.md): wybór czujnika, obliczanie wspomaganej temperatury, stan działania, przywracanie i zdarzenia.
- [Mechanizm przekazywania poleceń klimatycznych](developer/climate-delivery.md): ponawianie na podstawie zdarzeń, odzyskiwanie dostępności, serializacja, generacje i granice potwierdzenia powodzenia.
- [Mechanizm Komfortu otoczenia](developer/comfort.md): wybór źródeł, ocena warunków, jakość danych, nasłuchiwanie, wyniki API i zdarzenia.
- [Mechanizm jednostek temperatury](developer/temperature-units.md): metadane zapisu, granice migracji, przeliczanie danych przenośnych, sprawdzanie i bezpieczeństwo działania.
- [Interfejs](developer/frontend.md): elementy interfejsu, polecenia budowania, zasób Lovelace, tłumaczenia, zasady UI i praca nad interfejsem.
- [Rozwój](developer/development.md): lokalne kontrole, generowane pliki, wytyczne kodowania i zgłaszanie zmian.
- [Testy ręczne](developer/manual-testing.md): lista kontroli wydania i zachowania.

<a id="project-documentation"></a>
## Dokumentacja projektu

- [Zrzuty ekranu](project/screenshots.md): rzeczywiste zrzuty ekranu.

Przyszłe pomysły i propozycje funkcji zgłaszaj przez Issues lub Discussions na GitHubie. Mogą dzięki temu rozwijać się z opiniami społeczności, bez składania obietnic dotyczących planu rozwoju.
