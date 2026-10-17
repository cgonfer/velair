<a id="climate-profiles"></a>
# Profile klimatyczne
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Profile pozwalają przełączać strefy między skoordynowanymi planami tygodniowymi bez zastępowania ich domyślnych harmonogramów. Home Assistant decyduje, kiedy zmienić profil na podstawie obecności, okien, sezonu, selektorów, czujników lub automatyzacji. Velair zapisuje, stosuje i pokazuje wynikowe zachowanie urządzeń.

**Profil** definiuje alternatywną rutynę dla skonfigurowanych stref. **Tryb** wybiera jeden lub kilka Profili bez nakładających się stref jako **bazę** domu. Następnie Profile można stosować jako **wyjątki stref**, również tylko w części wielostrefowego Profilu, bez zmiany innych pomieszczeń. Ustanów bazę, gdy cała konfiguracja ma się zmienić; stosuj wyjątki dla niezależnych rutyn.

Przykłady to obecność, nieobecność, wakacje, lato, goście lub sen. Ogrzewanie i chłodzenie mogą mieć różne godziny bloków, cele i HVAC.

<a id="default"></a>
## Harmonogram domyślny

`Domyślny` jest wbudowanym wyborem i zawsze oznacza tygodniowe harmonogramy skonfigurowane na karcie Harmonogramy. Nie jest zapisanym Profilem, dlatego nie można zmienić jego nazwy ani go usunąć.

Aktywacja innego Profilu nigdy nie nadpisuje tych harmonogramów. Powrót do harmonogramów domyślnych od razu stosuje domyślny blok obowiązujący w danej chwili.

<a id="configure-a-profile"></a>
## Konfiguracja Profilu

Otwórz **Harmonogramy**, przejdź do harmonogramów Profili i dodaj pusty Profil. Wybierz go z listy, aby edytować kolor, ikonę, nazwę, opis i zachowanie termostatów. Edytor pokazuje jeden termostat naraz, dzięki czemu pozostaje wygodny na komputerze, tablecie i telefonie. Nazwę zmienisz przyciskiem z ołówkiem w nagłówku. Stały identyfikator automatyzacji pod nazwą i na liście można kopiować do usług lub skryptów; nie należy mylić go z edytowalną nazwą.

Ikony podaje się jako klucze MDI, np. `mdi:briefcase-outline`. Edytor wyświetla kolorowy podgląd, odnośnik do przeszukiwalnego katalogu Material Design Icons i komunikat przy nieprawidłowym formacie `mdi:icon-name`. Opis może mieć do 500 znaków; licznik pokazuje, ile pozostało. Nowe i istniejące Profile mają zapisany kolor, który można zmienić selektorem lub wartością `#RRGGBB`. Nieprawidłowy kolor uniemożliwia zapis. Kolor jest częścią eksportu, a Default używa stałego koloru.

Każdy wiersz Profilu ma oddzielną prawą kolumnę działań: ustawienie bazy, zastosowanie wyjątku, usunięcie. Przy małej szerokości pozostają obok nazwy. Przyciski mają przezroczyste tło i odstęp od krawędzi; aktywność wskazuje ikona i kolor. Opis jest widoczny, a pod nim kompaktowe etykiety **Baza** i **Wyjątek** pokazują bieżące użycie. Nieużywane Profile nie mają etykiet, a ikona bazy pozostaje neutralna, dopóki Profil nie należy do bazy. Profil używany tylko jako wyjątek podświetla warstwy, a nie bazę. Całkowicie nadpisana baza zachowuje tożsamość bazy. To stan wyboru, nie pracy urządzenia. Wiersz otwiera edytor; działania aktywacji i wyjątków nie zmieniają wyboru edycji. Potwierdzone usunięcie edytowanego Profilu zamyka jego edytor.

Dla każdej encji wybierz zachowanie:

- **Nie uczestniczy**: Profil nie obejmuje tej strefy.

- harmonogram domyślny: encja korzysta ze swojego zwykłego planu tygodniowego;
- harmonogram Profilu: encja korzysta z pełnego alternatywnego planu tygodniowego;
- **Pauza** z pozostawieniem termostatu: Velair nie wykonuje zaplanowanych zmian i pozostawia urządzenie w obecnym stanie;
- **Pauza** z wyłączeniem: Velair wyłącza urządzenie i nie wykonuje zaplanowanych zmian.

Każda strefa z harmonogramem Profilu zapisuje własny **Układ dni**: **Poszczególne dni**, **Dni robocze / Weekend** lub **Wszystkie dni**. Siedem komórek zachowuje pozycje; wybór obejmuje dzień, grupę lub tydzień. Edycja grupy zmienia te dni w szkicu, a **Zapisz profil** utrwala cały Profil wraz z innymi oczekującymi zmianami. Różne dni wymagają jawnego wyboru podstawy przed zastąpieniem. Są pokazane jako zwarte alternatywy z osią czasu Przeglądu, temperaturą i trybem. Identyczne konfiguracje są grupowane; nie ma stałej listy bloków. Ikona informacji pokazuje godziny i ustawienia po najechaniu, fokusie lub dotknięciu, bez wyboru podstawy. Naciśnij alternatywę, aby wybrać ją jako jedyną podstawę; tło i obramowanie wskazują wybór. Alternatywy pozostają dostępne, także po błędzie zapisu. Strzałki, Spacja i Enter umożliwiają wybór klawiaturą. Dla grup pięciu, dwóch lub siedmiu dni najpierw wybierz i zapisz podstawę bez dodatkowego potwierdzenia; wspólny edytor bloków otwiera się po udanym zapisie. Pozostałe dni zachowują harmonogramy. Bez wyboru podstawy zapis mieszanej grupy jest niedostępny. Podsumowania obok zapisu wskazują źródło, strefę i dni docelowe. Wizualnie podobne alternatywy mają etykiety zależności szablonów lub presetów. Puste pokazują **Brak własnych bloków**: zastosowanie usuwa własne bloki, a pusty dzień nie wyłącza urządzenia. Układ zostaje w szkicu przy tymczasowej zmianie zachowania. Szczegóły: [edycja grup dni](usage.pl.md#create-a-daily-schedule).

Harmonogram domyślny jawnie obejmuje strefę, także przy walidacji nakładania. Nieuczestnicząca strefa dziedziczy bazę lub ustawienia domyślne, jeśli baza jej nie obejmuje. Szablon można skopiować jako niezależny dzień, powiązać tylko jego godziny i ustawić własne temperatury albo powiązać zarówno godziny, jak i ustawienia klimatyczne. W ostatnim przypadku powiązany dzień jest tylko do odczytu. Szablony i bloki mogą odwoływać się do wspólnych presetów. [Presety i powiązania](linked-schedules.pl.md) opisują propagację zmian, odłączanie i wymagania zgodności, a [przykład zimy i lata](linked-schedule-examples.pl.md#2-winter-and-summer-with-one-set-of-times) pokazuje wspólne godziny z różnymi ustawieniami. Klonowanie zachowuje rodzaj powiązania, przypisania godzin i odwołania do presetów. Przed sklonowaniem do innego termostatu Velair sprawdza cały proponowany Profil, zanim zmieni szkic; pozostałe dni pozostają bez zmian. Odłącz powiązanie, jeśli dzień ma być niezależny.

Dla stref obsługiwanych przez system zewnętrzny Profile i Tryby wybierają cały tydzień do opublikowania, zamiast bezpośrednio sterować `climate.*`. Harmonogram domyślny oznacza zwykły tydzień, a harmonogram Profilu — tydzień alternatywny; Pauza nie jest dostępna. Edytor uwzględnia także ograniczenia sterownika zewnętrznego. Błąd publikacji nie cofa wybranego Profilu i nie wpływa na lokalne strefy. Zobacz [systemy zewnętrzne](external-systems.pl.md).

Zapisanie dnia Profilu jako szablonu zapisuje tylko szablon w backendzie, bez zmiany szkicu Profilu. Aby skopiować dzień do innych encji, wybierz docelowe termostaty w oknie klonowania dnia i potwierdź operację. Potwierdzenie podsumowuje wybrane cele i wskazuje strefy, które przejdą z harmonogramu domyślnego lub Pauzy na harmonogram Profilu. Klonowanie do innych termostatów obejmuje wybrane dni: jeden dzień, poniedziałek–piątek, sobotę–niedzielę lub cały tydzień. Potwierdzenie wymienia dni i strefy przechodzące na harmonogram Profilu. Zachowuje inne dni oraz układ celu i pozostaje częścią szkicu. Klonowanie między dniami jest dostępne tylko przy **Poszczególne dni**; edytory grup nie mają tego panelu ani skrótu zmiany układu, więc użyj zwykłego selektora. Harmonogramy domyślne i Profile kopiują ten sam zakres grupy do innych termostatów. Przed zmianą Velair sprawdza typ, tryb HVAC, limity temperatury i krok nastawy wszystkich celów oraz usuwa nieobsługiwane opcje. Jeśli blok utraci wszystkie opcje lub cel bądź tryb okaże się niezgodny, żaden szkic nie zostanie zmieniony. Zmiany trafiają do backendu dopiero po zapisaniu całego Profilu.

Oś dnia działa tak samo jak w harmonogramach domyślnych i szablonach: bloki można przeciągać i zmieniać ich rozmiar. Blok ma godzinę rozpoczęcia, ale nie ma osobnej godziny zakończenia. Ostatni blok obowiązuje przez północ i puste dni aż do rozpoczęcia następnego. Odziedziczony fragment jest pokazany oddzielnie, wskazuje dzień źródłowy i nie można go tu edytować. Tymczasowe przełączenie z harmonogramu Profilu na harmonogram domyślny lub Pauzę zachowuje szkic tygodnia; powrót przywraca jego bloki. Zapisanie harmonogramu domyślnego lub Pauzy zachowuje jedynie wybrane zachowanie, bez ukrytego szkicu. Lista termostatów pokazuje przyjazne nazwy, a aktywny edytor także identyfikator encji. Metadane i harmonogramy zapisują się razem, w jednej operacji; przełączenie termostatu nie zapisuje częściowych zmian.

Kilka Profili może tworzyć bazę Trybu, jeśli ich strefy się nie nakładają. Wyjątki mogą zastępować pojedyncze strefy tej bazy: każda strefa ma jedną pełną rutynę, bez łączenia bloków ani stosu wcześniejszych wyjątków.

<a id="worked-example-an-away-mode"></a>
## Przykład: Tryb nieobecności

Strefy dzienne i sypialnie wymagają innego zachowania przy pustym domu:

1. Utwórz Profil **Away · Living areas**. Przypisz salonowi i kuchni alternatywne harmonogramy z temperaturami odpowiednimi dla instalacji, niezależnie od tego, czy ogrzewa, chłodzi, czy obsługuje oba kierunki.
2. Utwórz Profil **Away · Bedrooms**. Dla sypialni wybierz inny alternatywny harmonogram, Pauzę albo Pauzę z wyłączeniem.
3. Pomiń w obu Profilach strefy, które mają zachować harmonogramy domyślne.
4. Otwórz Tryby, utwórz nowy Tryb o nazwie **Away**, wybierz oba Profile i zapisz.
5. W aktywnej konfiguracji wybierz zmianę, a następnie **Away**. Velair stosuje oba Profile jako jeden niepodzielny wybór.

Ta konfiguracja jest prawidłowa, ponieważ oba Profile obejmują różne strefy. Jeśli oba konfigurowałyby tę samą encję, Velair odrzuciłoby Tryb i poprosiło o usunięcie nakładania się stref.

Ten sam Tryb z automatyzacji:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Inna automatyzacja może przywrócić wszystkie zwykłe harmonogramy:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Zastąp osobę i widoczne nazwy własnymi. Po przemianowaniu Trybu popraw odwołujące się automatyzacje.

<a id="activate-a-profile"></a>
## Aktywacja Profilu

Aktywna konfiguracja oddziela **Bazę** i **Wyjątki** oraz wskazuje, czy bazą jest Tryb, Profil, kilka Profili czy ustawienia domyślne. Wybierz **Zmiana**, aby wybrać Tryb lub grupę Profili. Wiersz Profilu ustanawia go jako całą bazę; ikona warstw stosuje tylko jego skonfigurowane strefy jako wyjątki. Manual pozostaje stanem natywnego selektora HA, nie nazwą bazy w panelu.

Przycisk odtwarzania w wierszu harmonogramów Profili pozwala bezpośrednio aktywować Profil. Możesz też skorzystać ze wspólnego podsumowania aktywnej konfiguracji w Przeglądzie lub u góry karty Tryby. Oddziela Bazę i Wyjątki. Wybierz Tryb lub Profil jako bazę albo ikonę warstw dla wyjątku. Bezpośrednia aktywacja zastępuje cały aktywny zestaw i wybiera **Ręczny**; **Domyślny** oznacza brak alternatywnego Profilu. Przycisk w wierszu, podsumowanie aktywnej konfiguracji i `velair.activate_profile` od razu stosują bieżący blok, również blok z wcześniejszego dnia obowiązujący przed pierwszym dzisiejszym blokiem.

Bezpośrednia aktywacja nigdy nie dodaje Profilu do istniejącego zestawu, nawet gdy jego strefy nie nakładają się na pozostałe. Strefy objęte wcześniej aktywnym zestawem, a teraz pominięte, natychmiast wracają do harmonogramów domyślnych. Aby wspólnie aktywować kilka Profili, utwórz Tryb zawierający cały zestaw bez nakładających się stref.

Aktywacja anuluje Wzmocnienia w strefach, których zachowanie się zmieniło. Pauza globalna lub Pauza strefy nadal ma pierwszeństwo; zapisany Profil zostanie zastosowany po wznowieniu.

Przegląd używa efektywnego harmonogramu każdej strefy w dzisiejszej osi czasu i następnych zdarzeniach. Strefy zmienione przez aktywny Profil pokazują kompaktową kolorową etykietę z jego ikoną i nazwą. Tymczasowe Wzmocnienie lub Pauza zachowują pierwszeństwo także wizualnie, dopóki się nie zakończą. Potwierdzenia zapisu, aktywacji i usunięcia Profilu korzystają ze standardowego tymczasowego powiadomienia Velair z przyciskiem zamknięcia i paskiem odliczania.

Podczas zmian Trybów i Profili globalny pasek postępu pozostaje widoczny także po zmianie karty. W Lovelace pojawia się wyłącznie w widoku aktywnej konfiguracji. Licznik oznacza zakończoną obsługę stref, również gdy pauza lub nadpisanie powstrzymuje polecenie; nie oznacza osiągnięcia temperatury. Pasek rozróżnia powodzenie i przejście z błędami. Potwierdzenie sukcesu znika po chwili, a wyniki częściowe i błędy pozostają do zamknięcia.

Automatyzacje/skrypty:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

W wizualnym edytorze HA dodaj działanie i wyszukaj **Velair: Activate climate profile**. Jest to osobna usługa; nie znajdziesz jej wśród przełączników lub selektorów po przefiltrowaniu działań według urządzenia Velair. Podaj identyfikator automatyzacji Profilu spod nazwy.

Jawna dezaktywacja:

```yaml
action: velair.deactivate_profile
```

Pominięcie `profile_id` nadal jest obsługiwane dla zgodności. ID nie zmienia się po zmianie nazwy. Bezpośrednia aktywacja przełącza Tryb na Manual nawet wtedy, gdy ten sam Profil już jest aktywny.

<a id="modes"></a>
## Tryby

Profil nie definiuje dowolnych warunków aktywacji; decyzja należy do Home Assistant. Velair ma `select.velair_mode`, zarządzany kartą Tryby bez dodatkowego pomocnika HA.

Dwa Tryby są wbudowane. Nie można zmienić ich nazw ani ich usunąć:

- **Domyślny** dezaktywuje Profile i przywraca harmonogram domyślny każdej strefy.
- **Ręczny** oznacza brak niestandardowego Trybu sterującego aktywnymi Profilami. Bezpośredni Profil zwykle go wybiera. To stan, nie działanie selektora Velair. Aby zakończyć ten stan, wybierz Default lub Tryb niestandardowy. Natywna encja HA zachowuje opcję Manual dla zgodności; wybór zachowuje Profile, odłączając Tryb niestandardowy.

Utwórz np. Away/Vacation/Home z jednym lub kilkoma Profilami. Nowy Tryb wymaga nazwy opcji Home Assistant i niepokrywającego się zestawu Profili. Po zapisaniu wybór aktywuje cały zestaw w jednej operacji. Nakładające się strefy są odrzucane, a nie rozstrzygane ukrytym priorytetem. Kilka Trybów może korzystać z jednego Profilu. Z nazw usuwa się skrajne spacje. Mają do 255 znaków, są unikatowe bez uwzględniania wielkości liter i nie mogą być nazwami wbudowanymi ani `unknown` lub `unavailable`.

Aktywna konfiguracja oddziela **Bazę** i **Wyjątki** oraz wskazuje, czy bazą jest Tryb, Profil, kilka Profili czy ustawienia domyślne. Wybierz **Zmiana**, aby wybrać Tryb lub grupę Profili. Wiersz Profilu ustanawia go jako całą bazę; ikona warstw stosuje tylko jego skonfigurowane strefy jako wyjątki. Manual pozostaje stanem natywnego selektora HA, nie nazwą bazy w panelu. Wybór Trybu aktywuje przypisane Profile jako bazę. Bezpośredni Profil zastępuje bazę i ustawia natywny selektor na Manual. Wiersze Trybów zachowują ikony i kolory Profili.

Standardowa usługa select:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

ID Trybu nie zmienia się po zmianie nazwy, więc aktywny wybór zostaje zachowany. Widoczna nazwa jest jednak stanem HA: automatyzacje zmienionych/usuniętych opcji wymagają poprawy.

Zmiana przypisań aktywnego Trybu zmienia cały zestaw Profili w jednej operacji. Usunięcie aktywnego Trybu zachowuje aktywne Profile i przełącza wybór na Manual. Usunięcie Profilu usuwa także przypisane do niego Tryby oraz tylko ten Profil z aktywnego zestawu. Jeśli zestaw stanie się pusty, Velair wraca do Default.

<a id="a-base-with-independent-zone-exceptions"></a>
## Baza z niezależnymi wyjątkami stref

Profil może obejmować kilka pomieszczeń. Zastosowanie jako wyjątek zastępuje rutynę tylko jawnie skonfigurowanych stref, nie zmieniając innych ani definicji Profilu. Każde pomieszczenie ma pełny tydzień, nigdy mieszaninę bloków kilku Profili. Przykład:

| Zmiana | Biuro | Salon | Sypialnia | Pokój gościnny |
| --- | --- | --- | --- | --- |
| Wybierz bazę Zima | Zima | Zima | Zima | Domyślny |
| Zastosuj Pracę zdalną | Praca zdalna | Praca zdalna | Zima | Domyślny |
| Następnie Gości | Praca zdalna | Goście | Zima | Goście |
| Przywróć bazę salonu | Praca zdalna | Zima | Zima | Goście |

Przywrócenie bazy salonu nie przywraca Pracy zdalnej: wyjątki nie mają historii. Jawne ustawienia domyślne to inny wybór, wymuszający zwykły harmonogram mimo bazy. Użyj **Zastosuj jako wyjątek** lub automatyzacji. W jednym żądaniu Profile nie mogą się nakładać: `[remote_work, guests]` zostanie w całości odrzucone, bo oba obejmują salon. Późniejsze osobne zastosowanie Gości celowo zastępuje wyjątek salonu, zachowując biuro.


```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Aby zastosować tylko jedną zarządzaną strefę, jawnie objętą Profilem:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

`profile_id: null` wymusza ustawienia domyślne. Aby usunąć wyjątek i odziedziczyć bieżącą bazę:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Aby zastąpić całą bazę i usunąć wszystkie wyjątki bez tworzenia Trybu:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Profile bazowe nie mogą się nakładać. Pusta lista aktywacji wybiera ustawienia domyślne; puste listy zastosowania i usuwania nic nie zmieniają. Nowe akcje wymagają swoich pól: pominięcie nie oznacza wszystkich stref ani ustawień domyślnych.

Aktywna konfiguracja pokazuje Bazę i typ nad nazwą, w dwóch poziomach na telefonie i w wąskich kartach; długie nazwy zawijają się. Zasięg podaje liczbę objętych bazą stref nadal ją dziedziczących. Wyjątki, także jawny Domyślny lub ten sam Profil, nie wchodzą do tej liczby. Strefy poza bazą Profilu używają ustawień domyślnych i nie należą do jej mianownika. Baza domyślna obejmuje wszystkie zarządzane strefy. Pusty zakres jest odróżniony od całkowicie nadpisanej bazy; to opis wyboru, nie pracy urządzeń.

**Podział domu** pod zasięgiem jest początkowo zwinięty. Nagłówek podaje całkowitą liczbę stref domu niezależnie od zasięgu bazy. Naciśnięcie pokazuje pasek 6 px i całą legendę; ponowne naciśnięcie lub Escape zwija. Nagłówek pozostaje na miejscu, treść rośnie w dół, a krótka animacja respektuje ograniczenie ruchu. Pasek używa kolorów Profili dla wszystkich stref. Wyjątki uwzględniają strefy poza bazą, więc ich liczby odpowiadają liście. Nieobjęte strefy bez wyjątków mają neutralny segment domyślny; jawne wyjątki domyślne też są neutralne. Legenda ma ikony 14 px, nazwę, źródło i osobną prawą kolumnę liczby. Baza, wyjątek i ustawienia poza bazą pozostają odrębne nawet przy tym samym kolorze. Pusta baza może mieć pasek domyślnych stref; brak zarządzanych stref oznacza brak paska. Profile bazy są w legendzie bez dodatkowej listy składników Trybu. Na komputerze baza zajmuje mniej miejsca niż wyjątki, a jej ikona wyrównuje się do góry nazwy i typu. Nagłówek wyjątków używa ikony warstw.

Lista **Wyjątki** pokazuje Profile z liczbami stref i osobną grupą Domyślny. Naciśnięcie dowolnego miejsca wiersza rozwija pomieszczenia pod nim; ponowne naciśnięcie lub Escape zwija, a otwarcie innej grupy zamyka poprzednią. Wiersz i licznik pozostają na miejscu, kolejne wiersze przesuwają się w dół. Długie listy przewijają się wewnątrz; animacja respektuje ograniczenie ruchu. Nazwy pomieszczeń nie zajmują zwartego podsumowania. Baza pozostaje widoczna nawet przy nadpisaniu wszystkich stref; bez wyjątków jest **Brak wyjątków**. Podsumowanie nie ma oddzielnego edytora stref: służą do tego opisane akcje. Natywny selektor pokazuje Manual przy wyjątkach, a po usunięciu wszystkich przywraca oryginalny Tryb, jeśli nadal istnieje. Wybór Trybu, Domyślny, jednego Profilu lub pełnej listy zastępuje bazę i usuwa wyjątki. Natywne Manual tylko odłącza powiązanie Trybu, zachowując bazę i wyjątki.

Edycja Trybu bazowego zachowuje wyjątki. Zmiana nazwy lub edycja Profilu zachowuje żywe odwołania; harmonogramy zmieniają działanie używających ich stref. Dodanie strefy do Profilu nie rozszerza wcześniejszego wyjątku. Usuń wyjątek przed usunięciem przywoływanej strefy z Profilu. Usunięcie Profilu lub import usuwający definicję usuwa jego wyjątki, przywracając pozostałą bazę lub ustawienia domyślne.

Home Assistant nadal łączy sezon, obecność i rutynę. Tryb sezonowy to kompletny wybór, nie dodatkowa warstwa: po zmianie sezonu przelicz potrzebne wybory stref. Różne strefy komponują się bezpiecznie; konkurencyjne akcje jednej strefy są przyjmowane kolejno, a pełny wybór bazy może je wszystkie zastąpić.

Każda jawna akcja wyboru, również powtórzona, anuluje oczekujący powrót do domu. Puste listy zastosowania/usuwania nie anulują. Anulowanie może przerwać przygotowanie innych pomieszczeń i jest zapisane oddzielnie przed wyborem: przy błędzie późniejszego zapisu poprzedni wybór może pozostać z już anulowanym powrotem. Nieprawidłowe żądania nie anulują go.

Wybór zapisuje się razem, ale urządzenia reagują w różnych chwilach lub zgłaszają własne błędy. Pauzy i ograniczenia dostarczania nadal obowiązują. Sama zmiana przypisania nie anuluje Wzmocnienia ani nie powiela poleceń przy niezmienionej rutynie. Strefy zewnętrzne publikują obowiązujący tydzień z ograniczeniami dostawcy. Profile nie usuwają ograniczeń wspólnego sprzętu. Cała baza i wyjątki przetrwają restart; eksport zawiera definicje, nie aktywny wybór, a import nie aktywuje nowych Profili.

<a id="seasonal-selection"></a>
## Wybór sezonowy

[Blueprint sezonowego wyboru](blueprints/seasonal-climate-selection.pl.md) może wybrać Tryb na podstawie dziennego maksimum lub innego czujnika temperatury po ustabilizowaniu zmiany. Powiąż zimowe i letnie Profile z godzinami tego samego szablonu i przypisz im różne presety. Jeśli przy łagodnej pogodzie nie potrzebujesz ogrzewania ani chłodzenia, skonfiguruj odpowiedni Profil z Pauzą i wyłączeniem. Skoordynuj tę automatyzację z regułami obecności: kolejny stabilny odczyt może zastąpić ręcznie wybrany Tryb Away.

<a id="interactions"></a>
## Współdziałanie

- Bloki **Tylko temperatura** zachowują politykę w Profilach, presetach, szablonach i powiązaniach. Aktywacja Profilu lub Trybu aktualizuje cel bez żądania zmiany trybu HVAC i nie włącza wyłączonego urządzenia; integracja musi przyjmować temperatury przy wyłączeniu.

- Pauzy globalne i strefowe mają pierwszeństwo.
- Wzmocnienia w objętych zmianą strefach są anulowane przy aktywacji Profilu.
- Adaptacyjne przygotowanie temperatury ponownie przelicza prognozę na podstawie efektywnego harmonogramu Profilu.
- Room Assist podąża za temperaturą docelową efektywnego harmonogramu Profilu.
- Komfort otoczenia nadal wyłącznie monitoruje i pozostaje bez zmian.
- Ogrzewanie, chłodzenie, heat/cool, bloki Off i obsługiwane dodatkowe opcje urządzenia działają tak samo jak w harmonogramach domyślnych.

<a id="restart-and-portability"></a>
## Restart i przenoszenie

Backend zapisuje aktywny zestaw Profili, Tryby niestandardowe i identyfikator wybranego Trybu. Po restarcie odtwarza selektor; samo odtworzenie nie aktywuje ponownie Profilu. Ustawienie stosowania harmonogramu po starcie decyduje wyłącznie o natychmiastowym wysłaniu nastawy do urządzeń. Gdy jest wyłączone, Profil i przyszłe zdarzenia pozostają aktywne bez zmiany urządzenia. Gdy jest włączone, Velair stosuje bieżący blok; Pauza z wyłączeniem wyłącza urządzenie, a zwykła Pauza pozostawia je bez zmian. Wzmocnienia i Pauzy zachowują pierwszeństwo.

Eksport V5 może osobno zawierać definicje Profili i Trybów, ale nigdy nie przenosi aktywnego wyboru. Import nie aktywuje ich automatycznie. Import samych Profili usuwa Tryby z przypisaniami do nieistniejących Profili. Import Trybów sprawdza poprawność przypisań i nakładanie się stref.

W sekcji przenoszenia konfiguracji w Ustawieniach wybierz Profile klimatyczne i Tryby podczas eksportu, a następnie obie sekcje przed importem. Definicje są nadpisywane, lecz aktywny zestaw Profili i wybrany Tryb nigdy nie są importowane.

Każdy Tryb przypisuje co najmniej jeden Profil bez nakładających się stref i aktywuje cały zestaw w jednej operacji. Bezpośrednia aktywacja Profilu wybiera tylko ten Profil i ustawia Tryb Manual.
