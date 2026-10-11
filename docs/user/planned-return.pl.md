<a id="planned-return"></a>
# Planowany powrót
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Planowany powrót przygotowuje dom na regularną lub jednorazową godzinę przyjazdu po potwierdzeniu pustego domu przez wybrane źródła obecności albo po jawnym jednorazowym uruchomieniu bez skonfigurowanych źródeł. Konfigurujesz go w Velair; stabilna cotygodniowa rutyna nie wymaga dodatkowego blueprintu ani codziennego działania. Automatyczna rutyna jest domyślnie wyłączona i działa lokalnie w Home Assistant. Jednorazowe powroty wymagają zapisanych Trybów nieobecności/powrotu i sprawnego automatycznego harmonogramu; źródła obecności są opcjonalne przy jawnym rozpoczęciu. Rutyna cotygodniowa wymaga co najmniej jednego źródła.

<a id="setup"></a>
## Konfiguracja

1. Utwórz zamierzone Tryby nieobecności i obecności albo użyj harmonogramu domyślnego jako celu. Profile nieobecności mogą wyłączać encje lub korzystać z mniej wymagających harmonogramów tygodniowych.
2. Otwórz przygotowanie temperatury, wybierz **Planowany powrót** w podsekcjach i dodaj źródła obecności dla monitorowanych lub cotygodniowych wyjść. Używaj czujników binarnych, pomocników logicznych input boolean, grup lub strefy domu (`zone.home`). Uwzględnij każdego, kto może pozostać w domu, także gości. Home Assistant odpowiada za śledzenie osób i lokalizacji; złożone reguły nadal można połączyć w pomocniku.
3. W sekcji nieobecności wybierz, jak długo dom musi pozostawać pusty, oraz Tryb nieobecności, który ma się włączyć. Domyślnie to dziesięć minut; kompaktowe pole przyjmuje minuty lub godziny. Przyjazd jest rozpoznawany natychmiast.
4. W sekcji przyjazdu wpisz zwykłą godzinę dla właściwych dni tygodnia i wybierz Tryb docelowy. Dni bez godziny nie mają automatycznego powrotu. Velair przygotowuje każdą strefę według harmonogramu docelowego w chwili przyjazdu.
5. Włącz adaptacyjne przygotowanie temperatury dla stref rozpoczynających wcześniej. Wykorzystuje istniejące ustawienia i lokalne uczenie ogrzewania/chłodzenia.
6. Włącz rutynę przełącznikiem paska stanu i zapisz. Przełącznik edytuje szkic; anulowanie przywraca zapisane ustawienie. Zatrzymaj automatyzacje obecności/nieobecności wybierające Tryby dla tego samego domu, aby dwa systemy nie konkurowały.

Dni odpowiadają preferencji **Pierwszy dzień tygodnia** w Ustawieniach. Wpisz godzinę bezpośrednio dla każdego dnia. Wyjście w dzień bez godziny stosuje nieobecność po potwierdzeniu, nie planuje wcześniejszego przygotowania i przywraca cel po wykryciu obecności. Przy rutynie tygodniowej widoczna jest strefa czasowa Home Assistant. Zmiany pozostają w szkicu do zapisania. Przyciski anulowania i zapisu są po prawej w stopce konfiguracji.

Górne podsumowanie grupuje trzy części rutyny w osobnych obramowanych obszarach odpowiadających ustawieniom, bez otaczającej karty lub wspólnej linii bocznej. Rutyna tygodniowa pokazuje prosty przepływ: Tryb nieobecności, opóźnienie potwierdzenia, przygotowanie adaptacyjne i Tryb docelowy; przełącznik edytuje włączenie rutyny. Opóźnienie to czas pustego domu, nie szacunek przygotowania. Sekcja obecności pokazuje wynik zbiorczy i liczby źródeł; rozwiń ją dla poszczególnych sygnałów. Nieznane sygnały blokują nową nieobecność i są odróżnione od potwierdzonej obecności. Szybki powrót łączy jednorazowe wyjście i sterowanie przyjazdem bieżącego epizodu. Działania korzystają z zapisanej konfiguracji: przed nowym wyjściem zapisz lub anuluj jej oczekujące zmiany.

Formularz podąża za wyjściem i przyjazdem: źródła obecności, opóźnienie i Tryb nieobecności, potem cotygodniowe godziny i Tryb docelowy. Źródła używają okrągłego zielonego przycisku dodania edytora bloków po wyborze źródła. Wyłączone przyciski dodania/usunięcia pozostają przezroczyste; aktywne reagują na najechanie i fokus. Lista zaczyna zwinięta; podsumowanie pokazuje sumę i liczby obecnych, pustych i nieznanych sygnałów. Rozwiń, aby sprawdzić lub usunąć źródło. Na telefonie podsumowanie ma szerokość całego wyboru i wiersza dodawania; ikony i liczby trzymają liczniki razem z pełnymi etykietami dostępności. Liczniki są przy końcu podsumowania. Rozwinięta lista telefonu ma tę samą szerokość, usuwanie na końcu wiersza i więcej miejsca na nazwy/identyfikatory. Na komputerze odpowiada szerokości wyboru. Rozwijanie nie zmienia konfiguracji. Opóźnienia wyrażone w godzinach są zaokrąglane do najbliższej minuty; równoważny czas jest przy polu.

Rozpoznawane stany obecności to `on` i `home`, a nieobecności — `off` i `not_home`. Dla strefy domu zero osób oznacza pusty dom, dodatnia liczba obecność. Dowolny sygnał obecności oznacza zajęty dom; tylko wszystkie sygnały nieobecności dają pusty dom. Bez obecności i z co najmniej jednym nieznanym/niedostępnym źródłem obecność jest nieznana: nowa nieobecność nie rozpocznie się. Przyjęty powrót pozostaje zaplanowany. Panel pokazuje wynik zbiorczy i każde źródło.

Wybieraj źródła rzeczywistej obecności: wyłączony czujnik ruchu nie musi oznaczać pustego domu.

<a id="room-preparation"></a>
## Przygotowanie pomieszczeń

Rozwiń **Room preparation** pod przepływem rutyny, aby zobaczyć każdą zarządzaną encję. Lista zaczyna zwinięta, z liczbami przygotowania adaptacyjnego, działania dopiero przy przyjeździe i bez przygotowania. Rozwijanie nie zmienia ustawień ani nie wysyła poleceń. Ten sam przegląd dotyczy rutyny i powrotów jednorazowych.

Każdy wiersz identyfikuje pomieszczenie, źródło harmonogramu docelowego i stan przygotowania. Encja nieobecna w Profilach Trybu docelowego nadal używa harmonogramu **Domyślny**; jawnie wybrane zachowanie normalne również korzysta z harmonogramu domyślnego. Harmonogram Profilu pokazuje jego nazwę. Pauza Profilu docelowego, wyłączona strefa i wykonywanie zewnętrzne są osobno opisane, nie jako działanie przy przyjeździe. Bez adaptacyjnego przygotowania lokalne włączone pomieszczenie wykonuje efektywny harmonogram przy przyjeździe; nie jest automatycznie wykluczone ze zmian Trybu.

Gdy nie zaplanowano przyszłego powrotu, lista opisuje możliwości zapisanej konfiguracji, a nie prognozę wcześniejszego rozpoczęcia przygotowania. Po przyjęciu powrotu wyznacza cel każdej strefy na przyjazd i pokazuje oczekiwanie, przygotowywanie, osiągnięcie celu, zawieszenie lub niedostępność z powodem. Brak odczytu temperatury lub prawidłowego szacunku uniemożliwia wcześniejsze przygotowanie; Wzmocnienie, regulacja ręczna i jawne pauzy zachowują pierwszeństwo. Wyjście, które nie zostało potwierdzone, nie może być pokazane jako trwające przygotowanie. **Preparing** opisuje aktywny zamiar Velair, nie potwierdzenie odbioru polecenia lub pracy fizycznej. **Target reached** oznacza bieżącą zmierzoną temperaturę w tolerancji przygotowania i może być prawdziwe przed wyjściem; nie rozpoczyna nieobecności ani nie omija potwierdzenia.

**Planned start** to szacunek, nie dowód polecenia lub fizycznej gotowości. Cele obsługują ogrzewanie, chłodzenie i zakresy. Zakończone, anulowane i pominięte powroty wracają do informacji konfiguracji, zamiast pokazywać stare godziny. Do chwili pomyślnego zapisania zmian Diagnostyka nadal korzysta z zapisanych ustawień backendu, bez dodatkowego przypomnienia o przygotowaniu. Pełna lista zastępuje starszą listę stref tylko dla epizodu.

<a id="one-off-return"></a>
## Jednorazowy powrót

W **One-off return** wybierz przyszłą datę i godzinę oraz **Plan return**. Data i godzina są razem. Na telefonie Plan return jest w następnym wierszu, wyrównany do prawej krawędzi czasu; na większych ekranach przycisk pozostaje obok pól. Wyjaśnienie znajduje się pod kontrolkami. Możesz zrobić to przed wyjściem lub już podczas nieobecności. Velair używa zapisanych Trybów i obecności. Przy źródłach obecności żądanie oczekuje i stosuje nieobecność dopiero po zgłoszeniu jej przez wszystkie źródła przez czas potwierdzenia, chroniąc osoby w domu. Bez zapisanych źródeł naciśnięcie **Plan return** jawnie potwierdza wyjście: tryb nieobecności włącza się od razu, bez opóźnienia. Velair nie wnioskuje wtedy o pustym domu ani nie wykrywa fizycznego powrotu; przygotowuje normalnie i aktywuje cel przy zapisanym przyjeździe. Jeśli skonfigurowane źródło ma stan nieznany lub jest niedostępne, Velair nadal czeka na potwierdzenie nieobecności; zniknięcie skonfigurowanej encji nie oznacza pustej listy źródeł.

Data i godzina jednorazowego powrotu zastępują godzinę z rutyny tygodniowej tylko dla tej nieobecności. Działa też przy wyłączonej rutynie. Możesz zmienić lub anulować oczekujące zgłoszenie; bez potwierdzenia wyjścia przed godziną przyjazdu wygasa bez zmiany Trybów. Jeśli wszystkie źródła już wskazują nieobecność i brak aktywnego epizodu, zaplanowanie zaczyna opóźnienie od razu, bez nowej zmiany czujnika. Przy aktywnej nieobecności zmień datę/godzinę w istniejącym edytorze epizodu: staje się jednorazowym wyjątkiem bez ponownego stosowania nieobecności. Przesunięcie przyjazdu na później kończy poprzednie przygotowanie i przywraca bieżące zachowanie nieobecności do nowego startu. Wzmocnienie i ręczne nadpisania są chronione. Cel jest wyznaczany na wybraną lokalną datę przyjazdu, również gdy przygotowanie zaczyna się dzień wcześniej. Ponowne przesłanie tej samej chwili przyjazdu nie resetuje przygotowania. Przyjazdy przeszłe, bieżące i nieistniejące lokalne godziny zmiany czasu są odrzucane; powtórzona godzina używa najwcześniejszego przyszłego wystąpienia.

Zakończone, pominięte i anulowane epizody blokują ponowne automatyczne uruchomienie do wykrycia obecności, więc pusty dom nie zaczyna kolejnego cotygodniowego wyjścia sam. Możesz jawnie wybrać **Plan return** po nieaktywnym epizodzie, bez oczekiwania na obecność. Nowe żądanie używa bieżących źródeł i Trybów. Ze źródłami ponownie potwierdza nieobecność przez ustawiony czas nawet przy już pustym domu, bez natychmiastowej zmiany Trybu. Bez źródeł jawne zgłoszenie od razu stosuje nieobecność. Panel i karta pokazują nowy formularz natychmiast po dezaktywacji epizodu. Przy niedostępnym planowaniu formularz pozostaje z wyłączonym Plan return i wyjaśnieniem wymaganych zapisanych ustawień oraz stanu harmonogramu. Aktywny powrót nadal można anulować.

Po potwierdzonym wyjściu użyj **Anuluj**, aby zatrzymać powrót i przywrócić zapisany poprzedni Tryb/Profile, albo **Zmień godzinę powrotu**, aby zmienić datę/godzinę. Podczas potwierdzania anulowanie zachowuje wybór, bo nieobecność jeszcze nie została zastosowana. Wyłączenie rutyny lub edycja godzin tygodnia nie anuluje ręcznego powrotu. Zmiana jego źródeł lub Trybów unieważnia poprzednie zgłoszenie. Jawne wybory Trybu/Profilu anulują oczekujące i aktywne powroty. Zatrzymany harmonogram nie wykonuje powrotu.

Pierwszy wiersz ma tytuł jednorazowego powrotu po lewej i wskaźniki obecności tylko dla karty po prawej. Faza jest zwartym podtytułem przy tytule, bez osobnego znacznika lub wiersza. Podczas potwierdzania fazę podaje nagłówek procesu timera. Karta grupuje liczniki źródeł na górze po prawej. Bez źródeł pomija liczniki i nieużywaną ikonę opóźnienia; panel zgłasza **Bez monitorowania**, nie nieznaną obecność. Ikona opóźnienia jest tylko przed potwierdzeniem aktywnej nieobecności; znika przy nieobecności/przygotowaniu i błędach po potwierdzonym wyjściu. Panel nie powtarza tych wskaźników. Najechanie daje krótkie wyjaśnienie fazy. Podczas potwierdzania lekki wiersz timera wyjaśnia sprawdzanie pustego domu. **Do** pokazuje termin backendu w lokalnym czasie HA, z datą, jeśli inna niż dziś. Velair stosuje nieobecność po potwierdzeniu tylko przy wszystkich źródłach nadal pustych. To termin, nie odliczanie ani potwierdzone wyjście. Ten sam proces dotyczy rutyny przed powstaniem epizodu; brak terminu nie tworzy wymyślonej godziny.

Przed potwierdzeniem ikona przyjazdu i **Expected arrival** identyfikują zapisany powrót z dostępną etykietą i podpowiedzią. Wiersz wyrównuje się do tytułu i stanu. Zapisana data/godzina to zwarty klikalny znacznik bez ołówka/podkreślenia. Potwierdzona oś używa tej samej ikony; tylko podkreślona data/godzina i ołówek po lewej tworzą przycisk edycji. Wybierz wartość, aby otworzyć edytor w miejscu. Wiersz działań ma niebieskie **Wstecz** ze strzałką po lewej i zielone **Zmień godzinę powrotu** po prawej. Wstecz odrzuca niezapisane zmiany i zamyka edytor bez zmiany powrotu. Na szerokim panelu edytor jest zwarty i wyrównany do końca przyjazdu, a działanie zmiany po prawej pod nim. Wąskie ekrany i karta zachowują responsywność.

Pola edycji pozostają ukryte, dopóki nie otworzysz edytora. **Wstecz** odtwarza ostatni zapisany przyjazd i ukrywa pola, usuwa ostrzeżenie edycji oraz ochronę nawigacji; niezależne niezapisane ustawienia rutyny pozostają chronione. Ponowne otwarcie zaczyna od zapisanego przyjazdu. Przy potwierdzonej nieobecności punkt przyjazdu jest tym samym przyciskiem, więc nie ma duplikatu. Anulowanie jest po lewej pod grafiką i przygotowaniem tylko przy zamkniętym edytorze. Podczas edycji znika; zmiana jest po prawej, Wstecz po lewej. Edycja pól nie zmienia zaplanowanego powrotu, dopóki działanie **Zmień godzinę powrotu** nie zakończy się powodzeniem. Powodzenie zamyka edytor i przywraca fokus zapisanej wartości. Błędy i aktualizacje czujnika zachowują szkic. Ostrzeżenie niezapisanej zmiany wskazuje edycję, a nawigacja/odświeżenie ostrzegają przed jej utratą. Zapis rutyny nie stosuje edycji przyjazdu.

Przyciski Wstecz i zmiany przyjazdu mają kompaktowe wypełnione tło, odpowiednio niebieskie i zielone. Widoczne powierzchnie mają 32 piksele wewnątrz 44-pikselowych celów dotyku. Anulowanie ma czerwone wypełnienie z białym tekstem/ikoną pod danymi epizodu, również 32 w 44 pikselach, z wyraźnym najechaniem i fokusem. Kolory pierwszego planu dostosowują się do motywu. Niedostępne działania mają neutralne tło, przygaszone tekst/ikony i kursor zakazu. Zmiana zyskuje zieleń po edycji przyjazdu. Faza pozostaje przy tytule; anulowanie po lewej pod danymi bez edycji, zmiana po prawej pod otwartym edytorem. Panel i karta zachowują układ na telefonie. Plan return jest po prawej w nowym formularzu. Udane działania aktualizują epizod bez dodatkowego komunikatu zapisu.

<a id="home-assistant-actions"></a>
### Działania Home Assistant

Automatyzacje, skrypty i pulpity mogą zgłaszać wyjście przez `velair.start_planned_return`. Wymagane są `return_date` (`YYYY-MM-DD`) i `return_time` (24-godzinne `HH:MM`), razem określające przyszły przyjazd w strefie HA. Natywny wybór czasu może wysłać `HH:MM:00`; zerowe sekundy są akceptowane i normalizowane do minut. W poniższym przykładzie wybierz przyszłą datę:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Używa zapisanych źródeł i Trybów oraz tego samego potwierdzania, przygotowania i pierwszeństwa co **Plan return**. Działa przy wyłączonej rutynie i aktualizuje przyjazd przy aktywnej nieobecności bez ponownego stosowania nieobecności. Zapisane Tryby i harmonogram automatyczny muszą działać. Źródła są opcjonalne: pusta zapisana lista od razu stosuje nieobecność; skonfigurowane źródła zachowują reguły potwierdzania. Przyjazd przeszły lub bieżący jest odrzucany bez zastępowania poprzedniego powrotu. Nieistniejący lub miniony czas zmiany czasu jest odrzucany; przy powtórzonej godzinie wybiera najwcześniejsze nadal przyszłe wystąpienie.

Anuluj oczekujący lub aktywny powrót:

```yaml
action: velair.cancel_planned_return
data: {}
```

To działanie zamyka też nieaktywny komunikat epizodu. Kończy przygotowanie i terminowy powrót, zachowując blokadę ponownego automatycznego startu. Po potwierdzonym wyjściu przywraca dokładny Tryb i wybór Profili sprzed epizodu. Podczas potwierdzania pozostawia wybór. Nowe jawne **Plan return** może zastąpić nieaktywny epizod. Panel i karta używają tego samego anulowania.

<a id="cancelling-a-return-examples"></a>
## Anulowanie powrotu: przykłady

Potwierdzanie nieobecności odbywa się **przed** zastosowaniem Trybu nieobecności. Anulowanie wtedy niczego nie przywraca: poprzedni Tryb/Profile są nadal aktywne. Po potwierdzonym wyjściu przywraca wybór zapisany na początku epizodu, zamiast od razu aktywować skonfigurowany Tryb powrotu.

Założenia przykładów:

- aktywny jest **Comfort** z Profilami **Living room comfort** i **Bedroom comfort**;
- Tryb nieobecności to **Away**, powrotu **Evening**, przyjazd zaplanowano na 18:00;
- źródła zgłaszają pusty dom o 13:00, a opóźnienie potwierdzenia to pięć minut.

<a id="cancel-before-confirmation-finishes"></a>
### Anulowanie przed końcem potwierdzania

| Czas | Działanie | Wybrany Tryb i Profile |
| --- | --- | --- |
| 13:00 | Rozpoczęcie powrotu. Velair sprawdza pusty dom do 13:05. | Comfort i oba Profile pozostają aktywne. |
| 13:02 | **Anuluj** podczas potwierdzania. | Comfort i oba Profile pozostają; Away nigdy nie zastosowano. |

Przyjazd o 18:00 zostaje wycofany. Ten anulowany epizod nie aktywuje później Away ani Evening.

<a id="cancel-after-departure-is-confirmed"></a>
### Anulowanie po potwierdzonym wyjściu

To osobny epizod z tą samą konfiguracją początkową:

| Czas | Działanie | Wybrany Tryb i Profile |
| --- | --- | --- |
| 13:00 | Rozpoczęcie powrotu i potwierdzania. | Comfort i oba Profile pozostają. |
| 13:05 | Wszystkie źródła nadal nieobecne. | Velair stosuje Away i jego Profile. |
| 13:10 | **Anuluj**. | Przywraca Comfort i oba pierwotne Profile, wycofuje przyjazd. |

Po anulowaniu aktywny jest Comfort, **nie** skonfigurowany Tryb powrotu Evening. Jeśli przygotowanie dla Evening już się rozpoczęło, anulowanie usuwa je i przywraca oryginalny wybór. Aktywne Wzmocnienia, regulacje ręczne i niezależne pauzy zachowują pierwszeństwo.

<a id="start-without-occupancy-sensors"></a>
### Rozpoczęcie bez czujników obecności

Bez źródeł **Plan return** od razu stosuje Away. Nie ma pięciominutowego potwierdzania. Anulowanie aktywnego powrotu przywraca Comfort i dwa Profile zapisane bezpośrednio przed startem. Nieznany lub niedostępny skonfigurowany czujnik nie oznacza braku źródeł: nadal blokuje nowe potwierdzenie nieobecności.

<a id="default-arrival-edits-and-restart"></a>
### Harmonogram domyślny, edycja przyjazdu i restart

Jeśli epizod zaczyna się z **Domyślny** bez aktywnych Profili, anulowanie po wyjściu przywraca Default bez Profili. Ręczna kombinacja Profili jest przywracana w pierwotnej kolejności.

Zmiana 18:00 na 19:00 lub restart HA nie zastępuje zapisanego poprzedniego wyboru. Anulowanie nadal przywraca wybór sprzed epizodu. Nie odtwarza historycznych temperatur urządzeń ani stanów HVAC: przywrócony wybór używa bieżących harmonogramów i istniejących nadpisań.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Wybór innego Trybu zamiast anulowania

Jawny wybór **Eco** przy aktywnym powrocie wycofuje powrót i zachowuje Eco. Velair nie przywróci później Comfort po zmianie obecności lub zamknięciu komunikatu końcowego. Chroni to jawny wybór; to inne działanie niż przycisk **Anuluj** epizodu.

<a id="distinguish-the-controls"></a>
### Rozróżnienie przycisków

- **Anuluj** sterowania powrotem wycofuje epizod jak opisano.
- **Wstecz** edytora odrzuca niezastosowane zmiany przyjazdu; zapisany powrót trwa.
- **X** ogólnego panelu działań karty encji zamyka panel bez anulowania powrotu.
- Anulowanie obok zapisu konfiguracji rutyny odrzuca niezapisane ustawienia, nie epizod.

Dla starszych epizodów bez poprzedniego wyboru lub nieprawidłowych zapisanych Profili zobacz [ograniczenia przywracania](#restoration-limits).

<a id="daily-behavior"></a>
## Codzienne działanie

Przykładowo ustaw poniedziałek–piątek 18:15. Gdy dom pozostanie pusty przez wymagany czas potwierdzenia, Velair włącza Tryb nieobecności i ustala blok harmonogramu obecności obowiązujący o 18:15. Każda strefa ma własny szacunek: wymagająca godziny może zacząć o 17:15, szybsza później.

Celem jest blok obowiązujący **w chwili przyjazdu**, z ciągłością tygodniową. Jeśli harmonogram obecności określa 17 stopni przed 18:00 i 21 stopni później, przyjazd 18:15 przygotowuje 21 nawet przy rozpoczęciu przed 18:00. Harmonogram tygodniowy nie jest edytowany ani uzupełniany tymczasowymi blokami.

O oczekiwanej godzinie Velair wybiera cel i kontynuuje zwykły harmonogram. Wcześniejsza obecność wybiera cel od razu. Spóźnienie nie przełącza domu z powrotem w nieobecność. Pauzy, Wzmocnienie, regulacja ręczna, wyłączone strefy i zatrzymany harmonogram zachowują ograniczenia przekazywania. Przygotowanie obsługuje ogrzewanie, chłodzenie i natywne zakresy. Zbliża pomieszczenie do celu, ale nie gwarantuje dokładnej temperatury.

<a id="preparation-and-room-assist"></a>
### Przygotowanie i Room Assist

Tryb docelowy określa konfigurację przy przyjeździe. Każda strefa zaczyna we własnym czasie; cały Tryb wybierany jest przy przyjeździe, nie przy pierwszym starcie. Strefy jeszcze nieprzygotowywane nadal wykonują harmonogram nieobecności.

Po rozpoczęciu tymczasowy cel przyjazdu ma pierwszeństwo nad późniejszymi blokami nieobecności. Przykład dziesięciogodzinnej nieobecności i powrotu 19:25:

| Czas | Cel pomieszczenia |
|---|---|
| 09:25, potwierdzone wyjście | Away żąda 16 stopni |
| 16:25, start przygotowania strefy | Harmonogram przyjazdu żąda 21 stopni |
| 17:00, blok Away żąda 18 stopni | Przygotowanie nadal dąży do 21 stopni |
| 19:25, planowany przyjazd | Tryb docelowy rozpoczyna zwykły harmonogram |

Blok nieobecności nie anuluje przygotowania powrotu. Pierwszeństwo dotyczy też chłodzenia i zakresów.

Włączony Room Assist podąża za tym samym celem tymczasowym: pomaga osiągnąć 21 stopni, zamiast korygować temperaturę z powrotem w stronę 16 stopni określonych dla nieobecności. Nastawa urządzenia może różnić się od 21, ponieważ kompensuje różnicę czujnika pokojowego i odczytu encji. Korekty w kolejce są ponownie sprawdzane względem bieżącego celu przed wysłaniem.

Bezpośrednia zmiana użytkownika podlega polityce zmian zewnętrznych strefy. **Zachowaj sterowanie automatyczne** ponownie stosuje obowiązujący cel, podczas przygotowania cel przyjazdu. **Regulacja ręczna** zawiesza automatyczne przekazywanie i Room Assist dla strefy podczas sterowania ręcznego. Wzmocnienie i jawne pauzy zachowują pierwszeństwo, nie anulując powrotu całego domu. Zobacz [Room Assist](room-assist.pl.md) i [Regulację ręczną](manual-control.pl.md).

<a id="exceptions-and-restarts"></a>
## Wyjątki i restarty

Podsekcja pokazuje razem przyjęty powrót, przygotowanie każdej strefy i zapisaną rutynę. Otwórz `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` otwiera domyślną podsekcję adaptacyjną. Edycja godziny dotyczy tylko tej nieobecności, nie tygodnia. **Anuluj** usuwa przygotowanie i automatyczny wybór celu. Przed potwierdzeniem zachowuje wybór, po nim przywraca Tryb/Profile sprzed epizodu.

Jawny wybór Trybu lub Profilu anuluje automatyczny powrót. Późniejsza obecność lub restart nie mogą nadpisać wyboru. Velair pamięta zakończone/anulowane nieobecności do ponownej obecności.

Jawny wybór anuluje też trwające przygotowanie, nawet przy już aktywnej wybranej konfiguracji. Różni się od zaplanowanej zmiany temperatury w nieobecności, która nie anuluje przygotowania. Panel i karta nie mają przycisków pominięcia, „jestem w domu” ani zamknięcia; wspólne kontrolki powrotu służą anulowaniu i zmianie przyjazdu. Backend zachowuje osobne operacje pominięcia i przyjazdu dla API, opisane w [API deweloperskim](../developer/api.md). `velair.cancel_planned_return` anuluje oczekujący lub aktywny potwierdzony powrót albo zamyka nieaktywny komunikat. Kończy przygotowanie i terminowy powrót, blokując automatyczny restart tej nieobecności. Po wyjściu przywraca poprzedni Tryb/Profile; przy oczekiwaniu lub komunikacie końcowym nie zmienia wyboru. Nowe jawne Plan return nadal może zacząć epizod.

<a id="restoration-limits"></a>
### Ograniczenia przywracania

Dla jednorazowego powrotu wybór jest zapisywany przy **Plan return**. Dla rutyny tygodniowej przy potwierdzeniu nieobecności, tuż przed zastosowaniem jej Trybu.

Poprzedni wybór przetrwa edycję przyjazdu i restarty HA. Przywraca wybór Profili, nie dawne temperatury/stany urządzeń; Profile używają aktualnych harmonogramów i pierwszeństwa nadpisań. Jeśli dawny Tryb usunięto lub zmieniono, pierwotne Profile mogą wrócić jako wybór ręczny. Jeśli zapisany Profil jest brakujący, nieprawidłowy lub konfliktowy z innym, anulowanie działa, ale zachowuje bieżący wybór i zgłasza brak przywrócenia. Starsze epizody bez tych metadanych zachowują wybór, bo nie można odgadnąć poprzedniego.

Po restarcie oczekujące zgłoszenia i potwierdzone nieobecności są odzyskiwane, nie zaczynają od nowa. Niepotwierdzona nieobecność zaczyna opóźnienie ponownie. Jeśli czujnik zgłasza obecność, Velair uwzględnia ją przy odtwarzaniu stanu poprzedniej nieobecności, nawet gdy domownicy wrócili w czasie, gdy Home Assistant nie działał.

<a id="limits-and-backups"></a>
## Ograniczenia i kopie

- Obsługiwana jest jedna rutyna całego domu. Powroty tygodniowe są tego samego dnia: wyjście po dzisiejszej godzinie lub bez godziny włącza nieobecność bez planowania jutrzejszego powrotu. Jednorazowy powrót może mieć dowolną przyszłą datę.
- Kalendarze, rotacyjne zmiany i automatyczne rutyny nocne nie są interpretowane.
- Jeśli adaptacyjne przygotowanie temperatury nie jest włączone, brakuje odczytu temperatury lub celu cieplnego, konfiguracja docelowa nadal jest wybierana w chwili przyjazdu, ale dana strefa nie rozpoczyna przygotowania wcześniej.
- Zmiany dotyczące stref sterowanych przez system zewnętrzny są odrzucane przed zmianą Trybu; Velair nie przejmuje lokalnego sterowania od ich kontrolera.
- Istniejący ogólny blueprint obecności/nieobecności pozostaje niezmieniony i przydatny do innych instalacji/działań.
- Przenośne kopie zawierają konfigurację rutyny, nie epizody lub timery. Importowana rutyna pozostaje wyłączona do jawnego włączenia.

Podstawy sterowania opisują [Profile klimatyczne](climate-profiles.pl.md), [Adaptacyjne przygotowanie temperatury](adaptive-preconditioning.pl.md) i [Regulacja ręczna](manual-control.pl.md).

<a id="overview-and-diagnostics"></a>
## Przegląd i Diagnostyka

Przegląd pokazuje zwarte podsumowanie domu podczas epizodu tygodniowego/jednorazowego lub problemu wymagającego uwagi. Wskazuje pochodzenie i stan oraz termin potwierdzenia lub przyjazd. Wybierz je, aby otworzyć szczegóły w przygotowaniu temperatury.

Fioletowy sygnał encji wskazuje bieżące sterowanie Planowanego powrotu. Istniejący stan pozostaje widoczny: sygnał wyjaśnia pochodzenie, nie zastępuje ogrzewania, chłodzenia, pauzy, harmonogramu lub przygotowania. Przyszłe szacunki startu są osobno oznaczone. Sterowanie ręczne, Wzmocnienie i niezależne pauzy zachowują pierwszeństwo. Oznaczenie nieobecności obejmuje efektywne Profile epizodu lub Default jawnie wybrane jako Tryb nieobecności, nie nieprzypisaną encję zachowującą po prostu harmonogram domyślny. Przygotowanie może prawidłowo używać domyślnego harmonogramu celu, gdy backend wybiera temperaturę przyjazdu.

Diagnostyka pokazuje stan domu, pochodzenie sterowania każdej encji i przygotowanie wraz z powodami zawieszenia/niedostępności. Kategoria historii Planowanego powrotu zapisuje istotne przyjęte przejścia bez duplikatów po odświeżaniu. Wpisy współdzielą limit 100 zdarzeń i znikają po restarcie; preferencje kategorii pozostają. Pobrane raporty mają te informacje i usuwają operacyjne identyfikatory Trybów/Profili. Zamiar i powodzenie przekazania pozostają osobne.

<a id="dashboard-card"></a>
## Karta pulpitu

Opcjonalna karta Lovelace pokazuje zwarte sterowanie jednorazowym powrotem. Nagłówek zawiera liczby źródeł obecnych, pustych i nieznanych oraz opóźnienie; podsumowanie tygodnia, lista źródeł i szczegóły pomieszczeń pozostają w panelu. Najpierw skonfiguruj dom w panelu.

```yaml
type: custom:velair-card
view: planned-return
```

W edytorze wizualnym wybierz **Planowany powrót**. Karta używa tego samego zapisanego epizodu co panel i inne karty. Obsługuje przyszłe daty/godziny. Aktywne epizody dają anulowanie i zmianę przyjazdu: anulowanie po wyjściu przywraca poprzedni Tryb/Profile, podczas potwierdzania zachowuje wybór. Po zakończeniu, anulowaniu lub innym nieaktywnym epizodzie karta pokazuje nowy formularz bez czekania na zmianę obecności. Błędna zapisana konfiguracja lub zatrzymany harmonogram blokują planowanie i zmiany, ale aktywny powrót nadal można anulować. Panel ma te same przyciski i cykl; konfiguracja tygodnia i przełącznik pozostają tam. Tylko wskaźniki źródeł obecności i opóźnienia po prawej stronie nagłówka występują wyłącznie na karcie; panel i karta mają wspólny podtytuł fazy przy tytule, edytor przyjazdu i oś czasu. Podczas potwierdzania blok opisujący odliczanie do terminu zastępuje podtytuł. Widok domu nie filtruje termostatów.

Karta **Climate: status and control** może też udostępniać jednorazowy powrót jako szybkie działanie obok Wzmocnienia i Pauzy. Włącz je w edytorze działań, wybierz nazwę lub umieść w menu **Więcej**. Edytor grupuje te trzy najpierw, nawet wyłączone. Otwiera te same zwarte pola w dolnym panelu z prostym nagłówkiem jak Wzmocnienie/Pauza. Wszystkie używają wysokości pól 38 pikseli. Aktywne wyjście pokazuje istniejącą oś i edytor. X zamyka panel bez anulowania wyjścia. Zamknięcie z niezapisanym przyjazdem pyta o odrzucenie; trwające działanie blokuje zamknięcie. Działanie zawsze steruje całym domem, niezależnie od encji. Stare konfiguracje je ukrywają. Nowe karty z wyboru HA je włączają; YAML wymaga `type: planned-return` w `climate_actions`.

Podczas nieobecności i przygotowania karta pokazuje potwierdzone wyjście i zapisany przyjazd z nazwami Trybów. Punkt bieżącego czasu z podpowiedzią **Teraz** przesuwa się według czasu UTC, także przy zmianach zegara, pozostając w pasku. Końce zawierają daty przy różnych dniach HA. Niezapisana edycja nie zmienia paska. Stany oczekujące/końcowe lub brak potwierdzonego wyjścia mają statyczny status bez osi. Panel i karta aktualizują lokalny zegar co minutę tylko przy widoczności i aktywności oraz od razu po pokazaniu; nie żądają danych backendu.

Ikony wyjścia i przyjazdu znajdują się na obu końcach linii z podpowiedziami i dostępnymi etykietami. Zapisane czasy są blisko pod ikonami; edytowalny jest tylko przyjazd. Proste etykiety Trybów poniżej czasów identyfikują konfiguracje nieobecności/powrotu z ogólną ikoną Trybu. Długie nazwy i daty wielodniowe zawijają się. Każdy koniec grupuje własny czas i bliską etykietę Trybu. Pola daty/czasu mają zwarty rozmiar innych działań; obok zapisanego czasu nie ma zamknięcia. Przygotowanie to mały znacznik linii z zegarem i objaśnieniem pod czasami. Upływ, końce i Teraz pokazują czas, nie postęp cieplny. Bez prawidłowego szacunku pierwszego pomieszczenia mały przycisk informacji przy tytule wyjaśnia podgląd: wszystkie pomieszczenia mogą być zawieszone, już przy celu, wykluczone lub ustawione tylko na przyjazd. Najechanie/fokus na komputerze albo dotknięcie na telefonie otwiera pomoc. Brakujące lub mieszane dane nie rozstrzygają i nie oznaczają wyłączonego przygotowania. Escape lub interakcja poza pomocą ją zamyka.

Przy prawidłowym szacunku adaptacyjnym oś dodaje zegar i czas **Szacowane przygotowanie** dla najwcześniejszego kwalifikującego się pomieszczenia; inne mogą zacząć później. Delikatnie zabarwione objaśnienie jest domyślnie zwinięte. Wybierz je dla listy kwalifikujących się pomieszczeń i szacunków w kolejności czasu. Lista używa nazw pomieszczeń HA, ikon i lokalnego czasu z datą w razie potrzeby. Lista pomija pomieszczenia, których przygotowanie jest wstrzymane, które osiągnęły już cel lub które mają rozpocząć pracę dopiero w chwili przyjazdu. Otwarcie listy nie wysyła dodatkowego żądania do backendu. Zwykłe aktualizacje zachowują jej stan. Zmiana zapisanego przyjazdu lub epizodu zamyka listę. Podczas edycji objaśnienie i zastępcza informacja są ukryte; linia zachowuje zapisany szacunek. Wstecz przywraca rozwinięcie tego samego epizodu. Najechanie na nagłówek pokazuje wyjaśnienie. To szacunek planowania, nie dowód uruchomienia urządzenia lub postęp temperatury. Zawieszone, osiągnięte, niedostępne i działające tylko przy przyjeździe pomieszczenia nie dają znacznika. Pozycja pozostaje w pasku wyjścia/przyjazdu, a etykieta zachowuje rzeczywisty szacunek, także wcześniejszą datę.
