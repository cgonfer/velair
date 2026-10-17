<a id="block-presets-and-linked-templates"></a>
# Presety bloków i powiązane szablony
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair pozwala ponownie używać konfiguracji dzięki **presetom bloków** i powiązaniu dnia z szablonem. **Tylko godziny** współdzieli pory bloków, pozostawiając własne ustawienia dnia. **Godziny i ustawienia** współdzieli całą konfigurację. Oba typy działają w harmonogramach domyślnych i Profilach. Szablon może zawierać ustawienia ręczne lub odwołania do presetów Velair.

Zacznij od [Praktycznych przykładów](linked-schedule-examples.pl.md): wspólne ogrzewanie, sezony, kopie, konwersje i niezgodne edycje.

<a id="block-presets"></a>
## Presety bloków

Preset bloku Velair ma nazwę i taką samą konfigurację klimatyczną jak blok harmonogramu, ale bez godziny rozpoczęcia. Może ustawiać pojedynczą temperaturę lub natywny zakres wraz z obsługiwanymi opcjami, wybierać wyłącznie tryb HVAC, stosować wyłącznie opcje urządzenia albo je wyłączać. Preset Velair różni się od natywnego `preset_mode` urządzenia, który może być jedną z opcji zapisanych w jego konfiguracji.

Biblioteka jest wspólna dla całej konfiguracji. Każde miejsce użycia jest sprawdzane względem możliwości termostatu i sterownika zewnętrznego. Pominięta opcja nie jest wysyłana; pominięcie wentylatora nie resetuje jego ustawienia.

Presetami zarządzasz w **Szablony → Presety klimatyczne**. Selektor biblioteki wyjaśnia różnicę między presetami i szablonami. Przycisk dodawania znajduje się przy nagłówku listy; pusta lista zachowuje ten sam układ. Wybranie istniejącego presetu jedynie otwiera podgląd. Szkic edycji powstaje po zmianie nazwy lub ustawień, a nie po sprawdzeniu zgodności. Lista użyć jest tylko do odczytu. Edytor nie wymaga wybranego termostatu i pozwala określić ogrzewanie, chłodzenie, temperaturę, zakres oraz opcje. Opcjonalny termostat służy do podglądu zgodności bez zmiany wartości. Backend przed zapisem sprawdza każde użycie.

Zapisz preset ikoną obok nazwy. Edycja zachowuje jego miejsce na liście także po przeładowaniu; nowe presety trafiają na koniec. Pola temperatur, również granice zakresu, przyjmują kropkę lub przecinek, np. `21.5` lub `21,5`. Podczas pisania zachowują wpisany tekst, a do podglądu i zapisu wysyłają liczby. Sprawdzenie zgodności pokazuje efektywne ustawienia wybranego termostatu oraz osobny wynik powodzenia lub błędu, bez zapisywania ani oznaczania konfiguracji jako zmienionej.

Odwołania w szablonach są pokazywane oddzielnie od harmonogramów domyślnych i Profili. Liczniki obejmują bezpośrednie odwołania, także w szablonach bez powiązanych dni. Termostaty dziedziczące preset przez pełny szablon są dodatkowo wymienione, bez ponownego liczenia tego samego odwołania. Użycia są grupowane według termostatu, z osobnym wierszem dla Default i każdego Profilu.

Ikona powiązania znajduje się przy liczniku użyć. Najechanie na niedostępny przycisk usuwania wyjaśnia, gdzie preset jest używany; najpierw odłącz odpowiednie bloki. Znacznik użycia zajmuje osobny ostatni wiersz pod konfiguracją.

Wybranie presetu tworzy aktywne odwołanie: edycja jego definicji aktualizuje wszystkie miejsca użycia. Blok nie może równocześnie mieć odwołania i lokalnej konfiguracji. Odłączenie zachowuje efektywne ustawienia jako ręczne i zatrzymuje dalsze aktualizacje z presetu.

W dodatkowych ustawieniach wybierz **Preset Velair**. Jest oddzielony od opcji **Preset urządzenia** (`preset_mode`). Zwykłe kolumny czasu, trybu, celu, ustawień i usuwania pozostają na miejscu. Ustawienia z presetu są tylko do odczytu, natomiast czas można edytować, jeśli nie jest powiązany z szablonem.

Wiersz pod blokiem identyfikuje preset i wybrane opcje. Licznik dodatkowych ustawień liczy odwołanie jako jedną pozycję i dodaje każdą opcję; nie liczy czasu, HVAC ani temperatury. Wartości i ich dostosowanie pochodzą z backendu. Ładowanie lub błąd podglądu nie zastępuje ich zgadywanymi ustawieniami ręcznymi. Zmiana czasu zachowuje widoczny podgląd bez ponownego pobierania.

W dodatkowych ustawieniach możesz wybrać inny preset albo brak presetu, aby odłączyć blok i zachować efektywne ustawienia. Definicję w bibliotece edytuje się na karcie Szablony. Przy aktywnym odwołaniu opcje urządzenia są tylko do odczytu. Usuwanie pozostaje w zwykłym miejscu i jest zablokowane dla bloków o powiązanych godzinach.

Najpierw wybiera się źródło konfiguracji, następnie opcje urządzenia, a na końcu widoczne jest jedno podsumowanie wysyłanych poleceń. Obejmuje konfiguracje ręczne i presety, zakresy, sam tryb, same opcje i Off, również dla termostatów bez dodatkowych opcji. Podgląd oczekujący lub niedostępny wyświetla ten stan zamiast zgadywać polecenia.

<a id="linked-templates"></a>
## Powiązane szablony

<a id="apply-a-template-to-schedules"></a>
### Zastosowanie szablonu do harmonogramów

Otwórz **Zastosuj do…** przy zapisanym szablonie dziennym. Panel prowadzi przez **Wybór → Sprawdzenie → Zastosowanie**. Najpierw zapisz oczekujące zmiany szablonu; zastosowanie nie zapisuje go niejawnie ani nie używa niezapisanej wersji.

Wybierz ustawienia domyślne lub istniejący Profil, a następnie **Niezależna kopia**, **Tylko godziny** lub **Godziny i ustawienia**. Kopia nie ma powiązania z szablonem; odwołania do presetów Velair pozostają aktywne. Powiązania samych godzin zachowują niezależne ustawienia klimatyczne. Pełne powiązania śledzą godziny i ustawienia szablonu.

Wybierz wspólny **Układ dni** i zaznacz grupy dla każdego termostatu. **Poszczególne dni** daje siedem opcji, **Dni robocze / Weekend** dwie grupy, a **Wszystkie dni** cały tydzień. Zmiana układu czyści wybór. Zmiana miejsca docelowego lub sposobu zastosowania zachowuje zaznaczenia, ale wymaga ponownego sprawdzenia. Nagłówek dnia zaznacza całą kolumnę widocznych termostatów; ponowne naciśnięcie odznacza pełną kolumnę. Na telefonie tabela przewija się poziomo, a nazwy termostatów pozostają widoczne.

Tylko termostaty z wybranymi grupami przyjmują nowy układ. Inne dni zachowują bloki i powiązania. Gdy nowy układ grupuje niewybrane dni o różnych konfiguracjach, sprawdzenie ostrzega, że pozostaną **Różne harmonogramy**; akceptacja ich nie ujednolica.

Dla **Tylko godziny** wybierz podstawę, jeśli grupa docelowa ma różne zapisane konfiguracje. Wybór pozostaje tymczasowy do zastosowania. Velair proponuje ustawienia z tej podstawy: najpierw dokładna godzina, potem wcześniejsze godziny od najbliższej, następnie późniejsze. Presety pozostają odwołaniami. Sprawdzenie wskazuje źródło każdej propozycji i umożliwia zmianę ustawień przy stałych godzinach szablonu. Uzupełnij brakujące zgodne przypisania; ustawienia szablonu nie są niejawnym rozwiązaniem zastępczym. Wszystkie wybrane dni grupy otrzymają te same sprawdzone ustawienia. Strefa Profilu bez własnego harmonogramu wymaga ręcznych przypisań zamiast zapożyczania ustawień domyślnych.

Sprawdzenie podsumowuje zastępowane dni i powiązania, zmiany układu, problemy zgodności i strefy Profilu przechodzące na harmonogram Profilu. **Wróć do wyboru** nie zapisuje zmian. Zastosowanie waliduje i zapisuje cały wybór jednokrotnie; nieprawidłowy cel lub konflikt rewizji nie powoduje częściowego zastosowania w innych strefach. Błąd zapisu zachowuje poprzednią konfigurację. Po zmianie źródła lub konfiguracji sprawdź ponownie. Zamknięcie z oczekującymi zmianami sprawdzenia używa zwykłej ochrony przed ich utratą.

Zastosowanie do Profilu zapisuje wybrane harmonogramy bezpośrednio; nie aktywuje Profilu, nie wybiera Trybu ani nie zmienia wyboru bazy i wyjątków. Zmiana obowiązującego harmonogramu może wpłynąć na sterowanie. Publikacja zewnętrzna i reakcje urządzeń podlegają zwykłym ograniczeniom dostarczania; spójny zapis nie gwarantuje jednoczesnej fizycznej reakcji.

Lista powiązań jest tylko do odczytu i grupuje je według termostatu, Default lub Profilu oraz dni. Licznik powiązanych dni liczy każdy dzień raz, niezależnie od liczby bloków, i zajmuje ostatni wiersz pod liczbą bloków. Niezależne kopie nie są liczone ani pokazywane jako powiązania. Przed usunięciem szablonu usuń wszystkie powiązania; niedostępny przycisk wyjaśnia ten warunek.

Każdy dzień termostatu można powiązać z szablonem. Opcja Tylko godziny pozwala przypisać każdej pozycji własne działanie ręczne lub preset, tak aby wspólne godziny mogły mieć różne ustawienia.

Opcja Godziny i ustawienia udostępnia całą konfigurację szablonu, ręczną lub opartą na presetach. Wszystkie kontrolki ustawień bloku są wtedy tylko do odczytu i pokazują efektywne wartości. Aby je zmienić, edytuj szablon lub odłącz dzień. Nie ma lokalnych nadpisań bloków. Zmiany ustawień szablonu wpływają na pełne powiązania, ale nie na powiązania samych godzin.

Na przykład szablon Workday może zawierać bloki o 07:00 i 23:00. Harmonogram domyślny może przypisywać im swój zwykły preset komfortu, Profil Winter — presety ogrzewania, a Profil Summer — chłodzenie i wyłączenie. Przesunięcie godziny 07:00 na 07:30 aktualizuje wszystkie trzy harmonogramy, bez zamiany ich konfiguracji klimatycznych.

Godziny edytuj w szablonie, zamiast przeciągać bloki powiązanego dnia. Temperatury i tryby szablonu nie zmieniają konfiguracji powiązań samych godzin. Tydzień może łączyć dni niezależne z oboma typami powiązań.

Selektor źródła pozwala wybrać własny harmonogram lub szablon, a następnie Tylko godziny albo Godziny i ustawienia, z objaśnieniem obu opcji. Przejście z samych godzin na pełne powiązanie wymaga potwierdzenia zastąpienia ustawień. Przejście w drugą stronę zachowuje bieżące ustawienia, także odwołania do presetów, jako własne przypisania dnia. Odłączenie zachowuje godziny i konfigurację szkicu wraz z presetami. Ręczne wartości stają się wartościami efektywnymi po dopasowaniu, np. 18.3 °C zmienia się na 18.5 °C przy kroku 0.5. Odwołania do presetów pozostają aktywne, a ich definicje nie zmieniają się. Najechanie, dotknięcie lub fokus blokady wyjaśnia sposób edycji. Ta sama pomoc działa w Default i Profilach.

Zmiana źródła wymaga potwierdzenia przed zastąpieniem szkicu, również niepełnego. Pozycje o dokładnie zgodnych godzinach zachowują ustawienia; nowe godziny wymagają przypisania. Anulowanie zachowuje dotychczasowy wybór i szkic. Zmiana zaczyna obowiązywać dopiero po zapisaniu.

Wybór własnego harmonogramu prosi o potwierdzenie odrzucenia szkicu i przywraca zapisany dzień z tego samego źródła. Jeśli zapisany dzień był powiązany, jego zapisane godziny i przypisania stają się niezależnym szkicem, z zachowaniem presetów. Nie jest odzyskiwany dawny harmonogram ręczny sprzed powiązania. Inne dni pozostają bez zmian.

Odłączenie działa inaczej: zachowuje bieżący szkic, również zmiany wprowadzone od ostatniego zapisu.

<a id="copy-or-link"></a>
## Kopia czy powiązanie

- **Kopia bloków** kopiuje godziny i ustawienia klimatyczne szablonu. Zachowuje odwołania do presetów i dostosowuje ustawienia ręczne do urządzenia docelowego. Powstały dzień nie podąża za późniejszymi zmianami szablonu.
- **Powiązanie godzin** łączy godziny z szablonem, pozostawiając osobne ustawienia klimatyczne w każdym dniu docelowym.
- **Powiązanie pełnej konfiguracji** przejmuje godziny i ustawienia klimatyczne szablonu, w tym aktywne odwołania do presetów, bez możliwości lokalnego nadpisania bloków.
- Klonowanie dnia harmonogramu kopiuje jego konfigurację, w tym rodzaj powiązania z szablonem, przypisania przy powiązaniu samych godzin i odwołania do presetów. Powiązany dzień źródłowy tworzy kolejny powiązany dzień, a niezależny — kolejny niezależny. Powiązania w dniach docelowych nieobjętych klonowaniem pozostają bez zmian.
- Zapisanie dnia jako szablonu zachowuje jego efektywne ustawienia ręczne i odwołania do presetów. Nie zmienia pierwotnego szablonu ani wspólnych presetów.
- Wyczyszczenie dnia usuwa jego lokalne bloki i powiązanie z szablonem, bez zmiany samego szablonu ani innych dni docelowych.

Klonowanie do innego termostatu sprawdza zgodność. Niezgodne wspólne ustawienia powodują odrzucenie bez usuwania powiązania ani zastępowania go konfiguracją ręczną. Krok temperatury i opcje nadal podlegają zwykłemu dostosowaniu. W Default wszystkie cele są zapisywane razem albo żaden przy błędzie; najpierw zapisywany jest szkic źródłowy. W Profilu operacja zmienia szkic i sprawdza cały proponowany Profil. Trwały zapis następuje dopiero przy zapisaniu całego Profilu.

Jeśli sklonowany dzień ma być niezależny, odłącz go i zapisz. Kopiowanie bloków z biblioteki nadal tworzy niezależny dzień.

<a id="shared-edits"></a>
## Wspólne edycje

Edycja szablonu zachowuje jego pozycję w bibliotece, także po przeładowaniu.

Nowa pozycja szablonu proponuje konfigurację dla każdego dnia powiązanego tylko godzinami, także w nieaktywnych Profilach i ukrytym Default. Najpierw sprawdzane są ustawienia nowej pozycji. Przy niezgodności Velair przegląda wcześniej zapisane bloki danego dnia: najpierw o dokładnie tej samej godzinie, potem wcześniejsze od najbliższego, a następnie późniejsze od najbliższego. Pierwsza zgodna konfiguracja zostaje skopiowana z zachowaniem odwołania do presetu bloku źródłowego.

Bloki źródłowe należą do tego samego dnia i urządzenia, według godzin sprzed edycji. Blok przesuwany lub usuwany może dostarczyć swoje zapisane ustawienia, lecz nowy blok nie może. Przypisania urządzenia są niezależne od szablonu; powiązane pozostają tylko godziny. Nowa pozycja wskazująca zgodny preset zachowuje jego odwołanie.

Pełne powiązania otrzymują nową pozycję bez szukania zastępczego źródła. Niezgodność dowolnego w pełni powiązanego dnia powoduje odrzucenie całego zapisu, także gdy dotyczy nieaktywnego Profilu lub ukrytego Default.

Przejrzyj propozycje w powiązanych dniach, grupowanych według termostatu i Default lub Profilu, z podanym typem powiązania. Pełne powiązania pokazują wartości i błędy bez edytora lokalnych przypisań. Propozycje zastępcze wskazują źródło. Gdy brak zgodnej propozycji, uzupełnij ustawienia ręcznie lub presetem. Trzeba również rozwiązać błędy całego tygodnia, takie jak niezgodne godziny lub limit sterownika.

Zwykły przycisk zapisu zatwierdza szablon i wszystkie przypisania razem, bez osobnego panelu. Niepełne lub niezgodne przypisania pozostają szkicami, a dotychczas zapisana konfiguracja nadal działa. Przesunięcie pozycji zachowuje ustawienia urządzenia; usunięcie pozycji usuwa powiązane przypisania w tej samej operacji.

Nie można usuwać używanych presetów ani szablonów. Preset wskazany w szablonie nadal jest używany, nawet gdy żaden dzień nie jest z nim powiązany. Najpierw zastąp odwołanie lub je odłącz. Konflikt równoczesnych zmian wymaga odświeżenia; nie powoduje częściowej aktualizacji.

Aktywne cele automatyczne zmieniają się po zapisaniu. Pauza, regulacja ręczna i Wzmocnienie zachowują pierwszeństwo. Edycja Default ukrytego pod Profilem nie zastępuje Profilu; powrót do Default użyje nowej wersji. Sterowniki zewnętrzne otrzymują gotowe harmonogramy tygodniowe, a nie odwołania do zasobów. Błąd publikacji nie włącza lokalnego wykonywania.

<a id="seasonal-automations"></a>
## Automatyzacje sezonowe

Użyj [`velair.update_block_preset`](preset-automations.pl.md), aby aktualizować wspólny preset z automatyzacji. Aktualizacja częściowa zachowuje pozostałe pola, a jawne zastąpienie konfiguracji może zmienić rodzaj działania. Aktualizacje są trwałe i obejmują wszystkie odwołania, z zachowaniem zwykłej walidacji i zasad pierwszeństwa podczas działania. Poradnik zawiera przykłady wykorzystujące temperaturę na zewnątrz, natywne zakresy, opcje urządzenia oraz wyłączanie i przywracanie wcześniejszej konfiguracji.

Home Assistant decyduje o wyborze Profilu lub Trybu. Wspólne godziny i presety ograniczają powielanie, ale nie dodają reguł pogodowych ani odpytywania. Okna mogą korzystać z niezależnych powodów pauzy z identyfikatorami. Sam preset nie wyznacza daty inteligentnego powrotu ani nie wydłuża chłodzenia.

<a id="backups-and-compatibility"></a>
## Kopie i zgodność

Model 16 zachowuje presety, tożsamość pozycji szablonu i oba typy powiązań. Eksport dołącza wymagane zasoby, a import sprawdza całą konfigurację. Starsze kopie bez powiązań nadal są użyteczne; starsze powiązania bez podanego typu oznaczają same godziny. Aktualizacja nie tworzy powiązań automatycznie.

Temperatury zachowują istniejące zasady jednostek i migracji. Preset jest dostosowywany osobno dla każdego urządzenia, bez zmiany wspólnej definicji na krok jednego termostatu.

Osie czasu pokazują efektywny cel z backendu. Ikona powiązania wskazuje preset, a ikona kopiowania przy godzinie — czas pochodzący z szablonu. Podpowiedź zawiera działanie, tryb, opcje i wspólne zasoby. Oczekiwanie i niedostępność są pokazane jawnie. Bloki odziedziczone opisują zasoby dnia źródłowego.

Na krótkich odcinkach osi czas i temperatura mają pierwszeństwo przed ikonami i opcjami. Szczegóły zachowują pełne wartości i nazwy bez zmiany długości bloku.
