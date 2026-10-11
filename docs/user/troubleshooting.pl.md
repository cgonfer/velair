<a id="troubleshooting"></a>
# Rozwiązywanie problemów
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Status tłumaczeń](../translation-status.md)

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

<a id="a-lovelace-card-shows-configuration-error"></a>
## Karta Lovelace pokazuje błąd konfiguracji

Sprawdź, czy Velair jest zainstalowany i skonfigurowany, zanim pulpit załaduje kartę. Integracja udostępnia zasób interfejsu na wczesnym etapie uruchamiania Home Assistant, dzięki czemu zwykły restart nie pozostawia kart oczekujących na moduł.

Jeśli błąd nie ustępuje:

1. Sprawdź, czy adres zasobu pulpitu to dokładnie `/velair_frontend/velair-card.js`, a jego typ to **JavaScript module**.
2. Usuń zduplikowane lub stare zasoby, np. `/local/velair-card.js`.
3. Po aktualizacji integracji uruchom ponownie Home Assistant.
4. Odśwież przeglądarkę lub aplikację mobilną Home Assistant.

Konsola przeglądarki lub panel sieci powinny pokazać, czy żądanie modułu się nie powiodło. Zgłaszając powtarzalny problem, dołącz pełną treść błędu.

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair nie pojawia się na pasku bocznym

Po zainstalowaniu lub aktualizacji integracji uruchom ponownie Home Assistant. Panel boczny jest rejestrowany podczas konfiguracji integracji.

Jeśli integrację właśnie zaktualizowano, wymuś pełne odświeżenie przeglądarki lub przeładuj aplikację mobilną Home Assistant.

<a id="the-lovelace-card-shows-old-ui"></a>
## Karta Lovelace pokazuje stary interfejs

Sprawdź zasoby pulpitu. Usuń stare zasoby deweloperskie, takie jak:

```yaml
url: /local/velair-card.js
type: module
```

Zamiast tego używaj zasobu udostępnianego przez integrację:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Velair udostępnia ten zasób z nagłówkami wyłączającymi pamięć podręczną. Panel boczny korzysta z automatycznie wersjonowanego adresu i odizolowanych elementów wewnętrznych, więc starsza karta Lovelace w pamięci podręcznej nie blokuje aktualizacji panelu. Aktualizacja integracji zwykle wymaga jedynie restartu Home Assistant i odświeżenia przeglądarki lub aplikacji mobilnej. Jeśli backend zgłasza nową wersję, ale nadal widzisz poprzedni interfejs, wymuś pełne odświeżenie lub wyczyść pamięć podręczną witryny przed zgłoszeniem problemu. Nie trzeba dodawać identyfikatorów kompilacji ani edytować adresu zasobu między wydaniami.

<a id="a-climate-entity-is-missing"></a>
## Brakuje encji klimatu

Otwórz opcje integracji Velair i sprawdź, czy wybrano daną encję. Velair zarządza tylko encjami `climate.*` skonfigurowanymi w integracji.

Jeśli encja nie istnieje już w Home Assistant, Velair pokaże potwierdzony problem w **Diagnostyce**.

<a id="a-mode-is-not-available"></a>
## Tryb jest niedostępny

Velair odczytuje obsługiwane tryby HVAC z encji klimatu. Jeśli tryb nie jest widoczny, encja nie zgłasza jego obsługi.

Podczas stosowania szablonów lub klonowania harmonogramów Velair odrzuca nieobsługiwane tryby z czytelnym komunikatem. Zmień blok na `Keep` lub wybierz tryb obsługiwany przez docelową encję.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## Temperatura zmienia się podczas stosowania szablonów

Podczas stosowania szablonu Velair sprawdza zgodność wynikowych ustawień klimatu z termostatem docelowym. Velair najpierw odrzuca temperatury poniżej minimum lub powyżej maksimum termostatu. Wartości mieszczące się w tych granicach mogą następnie zostać zaokrąglone do obsługiwanego kroku regulacji, również blisko granicy zakresu. Ta kontrola obejmuje również wspólne presety i powiązane szablony: niezgodna wspólna konfiguracja uniemożliwia zapisanie danej operacji. Zmień temperaturę lub wybierz zgodne urządzenie docelowe przed ponowną próbą.

<a id="export-does-not-download-on-mobile"></a>
## Eksport nie pobiera pliku na urządzeniu mobilnym

Na razie eksport jest celowo dostępny tylko na komputerze, ponieważ aplikacje mobilne różnie obsługują pobieranie. Import jest dostępny zarówno na komputerze, jak i na urządzeniach mobilnych.

<a id="scheduler-does-not-apply-after-restart"></a>
## Harmonogram nie stosuje ustawień po restarcie

Domyślnie Velair przywraca stan po uruchomieniu Home Assistant, nie wymuszając ustawień na urządzeniach.

Włącz **Zastosuj aktywny harmonogram po uruchomieniu** w Ustawieniach, jeśli chcesz stosować aktywny harmonogram po restarcie.

<a id="reset-to-defaults"></a>
## Przywrócenie ustawień domyślnych

Użyj **Ustawienia > Konserwacja > Zresetuj Velair**. Usuwa to wszystkie zapisane dane Velair: harmonogramy, szablony, preferencje panelu, aktywne wzmocnienia i pauzy, ustawienia Komfortu i Room Assist, ustawienia i dane uczenia adaptacyjnego przygotowania temperatury oraz zachowanie przy uruchomieniu. Następnie odtwarza wartości domyślne dla aktualnie zarządzanych encji z uwzględnieniem jednostki.

Najpierw wykonaj eksport, jeśli możesz potrzebować odzyskania istniejących danych.

<a id="temperature-unit-requires-attention"></a>
## Jednostka temperatury wymaga uwagi

Velair odczytuje jednostkę temperatury z Home Assistant. Jeśli Ustawienia wskazują różnicę między zapisaną jednostką a jednostką Home Assistant, automatyczne wykonywanie harmonogramów i zapisy ustawień temperatury pozostają zatrzymane, aby starsza temperatura nie została zastosowana w błędnym znaczeniu.

- Jeśli Velair proponuje migrację zapisanych temperatur, sprawdź, czy wszystkie zapisane wartości nadal używają wskazanej jednostki źródłowej, i wykonaj migrację raz. Brak działania po prostu pozostawia harmonogram zatrzymany; Velair nigdy nie przelicza tych danych po cichu.
- Jeśli aktualizacja starszych opublikowanych danych w stopniach Celsjusza wymaga resetu, najpierw zachowaj eksport do wglądu, jeśli jest potrzebny, a następnie użyj **Zresetuj Velair**, aby utworzyć wartości domyślne w aktualnej jednostce Home Assistant.
- Jeśli reset, migracja lub import zostały zapisane, ale odtworzenie działania się nie powiodło, przeładuj integrację Velair albo uruchom ponownie Home Assistant. Velair celowo pozostaje zatrzymany do czasu przywrócenia działania.

Jeśli harmonogram zostanie oznaczony jako niezgodny po odzyskaniu dostępności encji, sprawdź jego temperaturę docelową względem zgłaszanego zakresu i efektywnego kroku. Gdy brakuje `target_temp_step`, ustaw rzeczywisty krok urządzenia w jego wierszu Ustawień. Pole pokazuje ostatni prawidłowy krok zapamiętany przez Velair, następnie ręczną wartość zastępczą albo `1`, jeśli żadna nie istnieje. Zapisanie ręcznej wartości przy brakującym atrybucie zastępuje zapamiętany odczyt. Gdy Home Assistant publikuje prawidłowy krok, ręczna wartość jest pomijana, ale pozostaje zapisana.

Starsze kopie bez oznaczonej jednostki są traktowane jako dane w stopniach Celsjusza. Ekran importu pokazuje to założenie i przelicza wybrane wartości, jeśli aktualna jednostka Home Assistant to stopnie Fahrenheita.

Pełny opis decyzji i obsługi kopii znajdziesz w poradniku [Jednostki temperatury i migracja](temperature-units.pl.md).
