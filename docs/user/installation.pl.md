<a id="installation"></a>
# Instalacja
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair jest dostępny w domyślnym katalogu HACS. Instalacja ręczna pozostaje dostępna, jeśli nie używasz HACS lub chcesz przetestować konkretną kompilację.

<a id="hacs"></a>
## HACS

1. Otwórz HACS.
2. Wyszukaj **Velair** w dostępnych integracjach.
3. Otwórz Velair i wybierz **Download**.
4. Uruchom ponownie Home Assistant.
5. Przejdź do **Ustawienia > Urządzenia i usługi**.
6. Dodaj integrację Velair.
7. Wybierz encje `climate.*`, którymi Velair może zarządzać.

Velair używa jednostki temperatury wybranej w Home Assistant. Nowa instalacja tworzy harmonogramy, szablony, progi Komfortu, ustawienia Room Assist i wartości domyślne adaptacyjnego przygotowania temperatury w tej jednostce. Jednostka jest widoczna tylko do odczytu w Ustawieniach Velair. Zmienia się ją przez Home Assistant, a nie Velair.

Istniejące instalacje aktualizowane z opublikowanej wersji Velair obsługującej tylko stopnie Celsjusza mogą wymagać resetu, jeśli Home Assistant używa stopni Fahrenheita. Przed kontynuowaniem przeczytaj [Jednostki temperatury i migracja](temperature-units.pl.md), aby w razie potrzeby zachować eksport do wglądu.

<a id="manual-installation"></a>
## Instalacja ręczna

Instalacja ręczna jest zwykle potrzebna tylko bez HACS albo przy testowaniu kompilacji z GitHub Actions lub GitHub Release.

Pliki wydania zawierają `velair-custom-component-<version>.zip`. Rozpakuj go tak, aby istniał ten folder:

```text
<home_assistant_config>/custom_components/velair
```

Jeśli korzystasz z pobranego repozytorium, skopiuj:

```text
custom_components/velair
```

do:

```text
<home_assistant_config>/custom_components/velair
```

Uruchom ponownie Home Assistant i dodaj Velair w **Ustawienia > Urządzenia i usługi**.

<a id="github-actions-artifacts"></a>
## Artefakty GitHub Actions

Każde udane wykonanie CI udostępnia tymczasowe artefakty:

- `velair-custom-component`: cały folder `custom_components/velair` z pakietem interfejsu wygenerowanym przez dane wykonanie.
- `velair-lovelace-resource`: skompilowane pliki `velair-card.js` do zaawansowanych ręcznych testów zasobu Lovelace.

Wykonania dla oznaczonych tagiem wydań dołączają również pliki ZIP do GitHub Release. Do zwykłego użytkowania wybierz HACS; z artefaktów korzystaj, gdy chcesz przetestować konkretne wykonanie procesu lub instalować ręcznie.

<a id="optional-lovelace-card"></a>
## Opcjonalna karta Lovelace

Panel boczny rejestruje się automatycznie. Karta Lovelace jest opcjonalna.

Dodaj zasób udostępniany przez integrację:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Następnie dodaj jedną lub więcej kart Velair. Każda używa tych samych danych backendu i komponentów wizualnych co panel boczny.

```yaml
type: custom:velair-card
view: overview-status
```

Obsługiwane wartości `view`:

- `climate`: stan i sterowanie jedną zarządzaną encją, z opcjonalnym jednorazowym powrotem dla domu obok Wzmocnienia i Pauzy. Istniejące karty nie pokazują tego działania; nowe konfiguracje z wyboru kart je włączają.
- `overview-status`: stan harmonogramu i sterowanie pauzą, zatrzymaniem i wznowieniem.
- `overview-boosts`: aktywne wzmocnienia.
- `overview-events`: najbliższe zdarzenia.
- `overview-timeline`: dzisiejsza oś czasu.
- `overview-zones`: przegląd stref.
- `active-setup`: bieżący Tryb i Profile, z opcjonalnym sterowaniem.
- `schedules`: pełny edytor harmonogramów.
- `sensors`: konfiguracja Room Assist i bieżący stan.
- `comfort`: konfiguracja i stan komfortu otoczenia.
- `preconditioning`: konfiguracja adaptacyjnego przygotowania temperatury i stan lokalnego uczenia.
- `planned-return`: kompaktowe sterowanie jednorazowym powrotem, liczby skonfigurowanych źródeł obecności i oś czasu potwierdzonego wyjścia. Bez zapisanych źródeł obecności zaplanowanie powrotu od razu stosuje tryb nieobecności; automatyczna cotygodniowa rutyna nadal wymaga źródeł.
- `diagnostics`: stan działania, ograniczona historia, filtry i eksport raportu zgłoszenia.

<a id="updating"></a>
## Aktualizacja

Po aktualizacji Velair:

1. Uruchom ponownie Home Assistant.
2. Wymuś pełne odświeżenie przeglądarki lub przeładuj aplikację mobilną Home Assistant.
3. Sprawdź, czy sekcja konserwacji w Ustawieniach pokazuje oczekiwaną wersję integracji.
