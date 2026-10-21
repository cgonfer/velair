<a id="automation-blueprints"></a>
# Blueprinty automatyzacji
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair pozostawia obecność, drzwi, gości i warunki właściwe dla domu w Home Assistant, zamiast tworzyć drugi silnik automatyzacji. Opcjonalne blueprinty dają wskazówki na początek w typowych sytuacjach, działając w pełni lokalnie i na podstawie zdarzeń.

Sam import blueprintu nie zmienia Velair. Home Assistant najpierw dodaje szablon wielokrotnego użytku, z którego następnie tworzysz i konfigurujesz automatyzację. Istniejące automatyzacje otrzymują aktualizacje przez ponowny import; możesz też użyć **Take control**, aby przekształcić automatyzację w niezależną automatyzację Home Assistant.

Pakiety integracji HACS nie kopiują automatycznie blueprintów do katalogu Home Assistant. Użyj poniższych odnośników importu.

<a id="available-blueprints"></a>
## Dostępne blueprinty

Blueprinty są wymienione alfabetycznie według angielskich nazw.

- [Obecność i nieobecność na podstawie zajętości domu](#home-and-away-from-occupancy)
- [Wstrzymanie strefy przy otwartych oknach](#pause-a-zone-while-windows-are-open)
- [Sezonowy wybór ustawień klimatu](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Obecność i nieobecność na podstawie zajętości domu

Uruchamia wybrane działania Home Assistant, gdy jedna zbiorcza encja obecności zgłosi obecność lub pusty dom. Działania mogą wybrać Tryb Velair, aktywować Profil albo skoordynować Velair z resztą domu. Opóźnione powiadomienie informuje o niedostępności danych obecności.

**Wersja:** 1.0.0 · **Wymagania:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.pl.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz dokumentację obecności i nieobecności na podstawie zajętości domu"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Otwórz Home Assistant i zaimportuj blueprint obecności i nieobecności" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Wstrzymanie strefy przy otwartych oknach

Wstrzymuje co najmniej jedną zarządzaną encję Velair, gdy którekolwiek wybrane okno lub drzwi pozostają otwarte. Następnie wznawia harmonogramy tylko tam, gdzie automatyzacja nadal odpowiada za aktywną pauzę. Opóźnione powiadomienie Home Assistant wskazuje niedostępne kontaktrony i powiązane termostaty.

**Wersja:** 1.0.0 · **Wymagania:** Home Assistant 2024.6.0+ i Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.pl.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz dokumentację wstrzymywania strefy przy otwartych oknach"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Otwórz Home Assistant i zaimportuj blueprint wstrzymywania strefy przy otwartych oknach" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Sezonowy wybór ustawień klimatu

Uruchamia konfigurowalne działania zimowe, na łagodną pogodę lub letnie jeden raz, gdy temperatura utrzyma się w nowym zakresie sezonowym przez dodatni czas, domyślnie 30 minut. Zmiany w obrębie tego zakresu zachowują termin zakończenia oczekiwania i nie powtarzają działań. Standardowy edytor działań pozwala wybrać Tryby Velair lub inne działania Home Assistant. Nieprawidłowe odczyty powodują natychmiastowe powiadomienie; przy uruchomieniu sprawdzana jest diagnostyka, bez wybierania sezonu.

Powiadomienia diagnostyczne obsługują te same języki co Velair. Język wybiera się jawnie w blueprincie.

**Wersja:** 1.1.0 · **Wymagania:** Home Assistant 2024.6.0+ · **Kategoria:** Automatyzacja temperatury / sezonowa

<p>
  <a href="blueprints/seasonal-climate-selection.pl.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz dokumentację sezonowego wyboru ustawień klimatu"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Otwórz Home Assistant i zaimportuj blueprint sezonowego wyboru ustawień klimatu" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Otwórz źródło YAML sezonowego wyboru ustawień klimatu"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Wspólne zachowanie

- Blueprinty reagują na zmiany stanu i uruchomienie Home Assistant; nie odpytują.
- Konfigurowalne opóźnienia filtrują krótkie zmiany stanu.
- Stany `unknown` i `unavailable` są traktowane ostrożnie.
- Blueprint obecności zgłasza utrzymujące się problemy dostępności i usuwa ostrzeżenie po odzyskaniu danych.
- Blueprint okien zgłasza utrzymujące się problemy kontaktronów, nie opóźniając sterowania na podstawie działających kontaktów.
- Blueprint sezonowy natychmiast zgłasza nieprawidłowe temperatury i nigdy nie wybiera sezonu przy uruchomieniu.
- Konfiguracja blueprintów pozostaje w Home Assistant, nie w pamięci Velair.
- Ponowny import tego samego adresu aktualizuje blueprint używany przez istniejące automatyzacje.

Każda strona blueprintu opisuje wymagania, konfigurację, przykład, zasady bezpieczeństwa, ograniczenia i rozwiązywanie problemów.

<a id="versions-and-updates"></a>
## Wersje i aktualizacje

Blueprinty mają własne wersje semantyczne, niezależne od integracji Velair. Odnośniki importu celowo śledzą bieżącą wersję `main`. Zaimportuj ponownie ten sam adres, aby otrzymać zgodną aktualizację istniejącej automatyzacji. Home Assistant nie aktualizuje importowanych blueprintów automatycznie.

Aktualizacje wersji 1 zachowują nazwy istniejących parametrów wejściowych; każdy nowy parametr ma wartość domyślną. Zmiana niezgodna wstecz jest publikowana pod nową nazwą pliku i wersją główną, pozostawiając dotychczasowy adres. Velair nie sprawdza ani nie migruje automatyzacji Home Assistant lub danych `.storage`. **Take control** zachowuje niezależność automatyzacji, ale kończy też otrzymywanie aktualizacji blueprintu.
