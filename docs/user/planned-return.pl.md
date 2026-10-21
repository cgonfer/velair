<a id="planned-return"></a>
# Planowany powrót
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Planowany powrót przygotowuje dom na regularną lub jednorazową godzinę przyjazdu po potwierdzeniu pustego domu przez wybrane źródła obecności albo po jawnym jednorazowym uruchomieniu bez źródeł obecności lub z zaznaczonym **Zastosuj tryb Nieobecność teraz**. Konfigurujesz go w Velair; stabilna cotygodniowa rutyna nie wymaga dodatkowego blueprintu ani codziennego działania. Automatyczna rutyna jest domyślnie wyłączona i działa lokalnie w Home Assistant. Jednorazowe powroty wymagają zapisanych Trybów nieobecności/powrotu i sprawnego automatycznego harmonogramu; źródła obecności są opcjonalne przy jawnym rozpoczęciu. Rutyna cotygodniowa wymaga co najmniej jednego źródła.

Poprzednia konfiguracja zapisywana przez powrót do domu obejmuje bazowy wybór Trybu/Profili i wszystkie wyjątki stref. Potwierdzone wyjście wybiera bazę nieobecności i czyści wyjątki; zakończony przyjazd wybiera bazę docelową. Anulowanie potwierdzonego epizodu jego działaniem Anuluj przywraca cały zapisany wybór wraz z wyjątkami, jeśli odwołania są nadal prawidłowe. Zewnętrzny wybór Profilu/Trybu anuluje powrót i stosuje żądany wybór, bez odtwarzania poprzedniej konfiguracji. Zobacz [bazę i wyjątki stref](climate-profiles.pl.md#a-base-with-independent-zone-exceptions).

<a id="setup"></a>
## Konfiguracja

**Nieobecność i powrót** zawiera wspólne ustawienia jednorazowych powrotów i rutyny tygodniowej. Wykrywanie nieobecności działa po rozpoczęciu jednorazowego powrotu lub przy włączonej zapisanej rutynie. Nie jest to osobna stale działająca automatyka obecności. Czas potwierdzenia mierzy ciągłą wykrytą nieobecność, nie czas od zapisania. Tryb nieobecności jest zwykle stosowany po potwierdzonym wyjściu; kwalifikujące się pomieszczenia mogą przygotować się przed zastosowaniem celu przy przyjeździe. Bez źródeł jednorazowy start stosuje nieobecność natychmiast i pomija opóźnienie; wyjaśnia to tekst przy polu.

Docelowe bloki **Tylko temperatura** zachowują zewnętrzną kontrolę HVAC: powrót nie włącza wyłączonego termostatu dla ich przygotowania, więc nie można obiecać gotowości przy przyjeździe. Użyj jawnego **Ogrzewanie** lub **Chłodzenie**, jeśli przygotowanie ma włączyć urządzenie. Zastosowanie celu przy przyjeździe nadal respektuje politykę bloku.

1. Utwórz zamierzone Tryby nieobecności i obecności albo użyj harmonogramu domyślnego jako celu. Profile nieobecności mogą wyłączać encje lub korzystać z mniej wymagających harmonogramów tygodniowych.
2. Otwórz kartę **Planowany powrót** i dodaj źródła obecności dla monitorowanych lub cotygodniowych wyjść. Używaj czujników binarnych, pomocników logicznych input boolean, grup lub strefy domu (`zone.home`). Uwzględnij każdego, kto może pozostać w domu, także gości. Home Assistant odpowiada za śledzenie osób i lokalizacji; złożone reguły nadal można połączyć w pomocniku.
3. W **Nieobecność i powrót** wybierz czas pustego domu, Tryb nieobecności i Tryb docelowy. Domyślne opóźnienie wynosi dziesięć minut; pole przyjmuje minuty lub godziny. Przybycie jest rozpoznawane natychmiast. Pomoc celu wyjaśnia przygotowanie adaptacyjne i działanie przy przyjeździe bez prawidłowego szacunku.
4. W **Godziny przybycia** wpisz godzinę dla właściwych dni. Tygodniowy przyjazd dotyczy dnia opróżnienia domu. Dzień bez godziny stosuje nieobecność po potwierdzeniu i przywraca cel po wykryciu obecności, bez wcześniejszego przygotowania. Velair przygotowuje strefy według harmonogramu celu w chwili przyjazdu.
5. Włącz adaptacyjne przygotowanie temperatury dla stref rozpoczynających wcześniej. Wykorzystuje istniejące ustawienia i lokalne uczenie ogrzewania/chłodzenia.
6. Włącz **Rutynę tygodniową** na pasku stanu i zapisz, aby aktywować automatyczne potwierdzanie, wybór nieobecności i godziny tygodniowe. Samo wpisanie godzin nie włącza rutyny; jednorazowe powroty działają również przy wyłączonej. Przełącznik edytuje szkic, anulowanie przywraca zapis. Zatrzymaj konkurencyjną automatykę obecności wybierającą Tryby tego domu.

Dni odpowiadają preferencji **Pierwszy dzień tygodnia** w Ustawieniach. Wpisz godzinę bezpośrednio dla każdego dnia. Wyjście w dzień bez godziny stosuje nieobecność po potwierdzeniu, nie planuje wcześniejszego przygotowania i przywraca cel po wykryciu obecności. Przy rutynie tygodniowej widoczna jest strefa czasowa Home Assistant. Zmiany pozostają w szkicu do zapisania. Przyciski anulowania i zapisu są po prawej w stopce konfiguracji.

Górne podsumowanie grupuje trzy części rutyny w osobnych obramowanych obszarach odpowiadających ustawieniom, bez otaczającej karty lub wspólnej linii bocznej. Rutyna tygodniowa pokazuje prosty przepływ: Tryb nieobecności, opóźnienie potwierdzenia, przygotowanie adaptacyjne i Tryb docelowy; przełącznik edytuje włączenie rutyny. Opóźnienie to czas pustego domu, nie szacunek przygotowania. Sekcja obecności pokazuje wynik zbiorczy i liczby źródeł; rozwiń ją dla poszczególnych sygnałów. Nieznane sygnały blokują automatyczne potwierdzenie wyjścia i są odróżnione od potwierdzonej obecności. Szybki powrót łączy jednorazowe wyjście i sterowanie przyjazdem bieżącego epizodu. Działania korzystają z zapisanej konfiguracji: przed nowym wyjściem zapisz lub anuluj jej oczekujące zmiany.

Formularz grupuje źródła, opóźnienie i oba Tryby w **Nieobecność i powrót**. W szerokim kontenerze opóźnienie i oba Tryby są w jednym wierszu; na tablecie opóźnienie nad dwoma Trybami, a na telefonie wszystkie kolejno pod sobą. Każde pole zachowuje pomoc obok siebie. **Godziny przybycia** zawierają tylko dni, wyjaśnienie i strefę czasową HA. Źródła używają okrągłego zielonego przycisku dodania edytora bloków po wyborze źródła. Wyłączone przyciski dodania/usunięcia pozostają przezroczyste; aktywne reagują na najechanie i fokus. Lista zaczyna zwinięta; podsumowanie pokazuje sumę i liczby obecnych, pustych i nieznanych sygnałów. Rozwiń, aby sprawdzić lub usunąć źródło. Na telefonie podsumowanie ma szerokość całego wyboru i wiersza dodawania; ikony i liczby trzymają liczniki razem z pełnymi etykietami dostępności. Liczniki są przy końcu podsumowania. Rozwinięta lista telefonu ma tę samą szerokość, usuwanie na końcu wiersza i więcej miejsca na nazwy/identyfikatory. Na komputerze odpowiada szerokości wyboru. Rozwijanie nie zmienia konfiguracji. Opóźnienia wyrażone w godzinach są zaokrąglane do najbliższej minuty; równoważny czas jest przy polu.

Rozpoznawane stany obecności to `on` i `home`, a nieobecności — `off` i `not_home`. Dla strefy domu zero osób oznacza pusty dom, dodatnia liczba obecność. Dowolny sygnał obecności oznacza zajęty dom; tylko wszystkie sygnały nieobecności dają pusty dom. Bez obecności i z co najmniej jednym nieznanym/niedostępnym źródłem obecność jest nieznana: automatyczna nieobecność nie rozpocznie się. Jawne **Zastosuj tryb Nieobecność teraz** może zastosować Nieobecność, ale nie potwierdzi wyjścia przy nieznanej obecności. Przyjęty powrót pozostaje zaplanowany. Panel pokazuje wynik zbiorczy i każde źródło.

Wybieraj źródła rzeczywistej obecności: wyłączony czujnik ruchu nie musi oznaczać pustego domu.

<a id="room-preparation"></a>
## Przygotowanie pomieszczeń

Bez przyjętego przyszłego powrotu zwinięta lista podaje liczby zapisanych możliwości: wcześniejsze przygotowanie, działanie przy przyjeździe i brak przygotowania. Przy przyjętym powrocie wspólne podsumowanie liczy pomieszczenia oczekujące, przygotowywane, gotowe, wstrzymane, niedostępne i działające tylko przy przyjeździe. Pokazuje zapisany przyjazd i najwcześniejszy kwalifikujący się szacunek; poszczególne pomieszczenia mogą zaczynać osobno. Rozwinięcie nie zmienia ustawień ani nie wysyła poleceń i dotyczy obu typów powrotów.

Rozwiń **Przygotowanie pomieszczeń**, aby zobaczyć każdą zarządzaną encję.

Każdy wiersz identyfikuje pomieszczenie, źródło harmonogramu docelowego i stan przygotowania. Encja nieobecna w Profilach Trybu docelowego nadal używa harmonogramu **Domyślny**; jawnie wybrane zachowanie normalne również korzysta z harmonogramu domyślnego. Harmonogram Profilu pokazuje jego nazwę. Pauza Profilu docelowego, wyłączona strefa i wykonywanie zewnętrzne są osobno opisane, nie jako działanie przy przyjeździe. Bez adaptacyjnego przygotowania lokalne włączone pomieszczenie wykonuje efektywny harmonogram przy przyjeździe; nie jest automatycznie wykluczone ze zmian Trybu.

Gdy nie zaplanowano przyszłego powrotu, lista opisuje możliwości zapisanej konfiguracji, a nie prognozę wcześniejszego rozpoczęcia przygotowania. Po przyjęciu powrotu wyznacza cel każdej strefy na przyjazd i pokazuje oczekiwanie, przygotowywanie, osiągnięcie celu, zawieszenie lub niedostępność z powodem. Brak odczytu temperatury lub prawidłowego szacunku uniemożliwia wcześniejsze przygotowanie; Wzmocnienie, regulacja ręczna i jawne pauzy zachowują pierwszeństwo. Bez **Zastosuj tryb Nieobecność teraz** wyjście, które nie zostało potwierdzone, nie może być pokazane jako trwające przygotowanie. **Przygotowanie** opisuje aktywny zamiar Velair, nie potwierdzenie odbioru polecenia lub pracy fizycznej. **Cel osiągnięty** oznacza bieżącą zmierzoną temperaturę w tolerancji przygotowania i może być prawdziwe przed wyjściem; nie rozpoczyna nieobecności ani nie omija potwierdzenia.

**Planowany początek** to szacunek, nie dowód polecenia lub fizycznej gotowości. Cele obsługują ogrzewanie, chłodzenie i zakresy. Zakończone, anulowane i pominięte powroty wracają do informacji konfiguracji, zamiast pokazywać stare godziny. Do chwili pomyślnego zapisania zmian Diagnostyka nadal korzysta z zapisanych ustawień backendu, bez dodatkowego przypomnienia o przygotowaniu. Pełna lista zastępuje starszą listę stref tylko dla epizodu.

<a id="preconditioning-dependencies"></a>
### Zależności przygotowania

**Nadrzędny termostat przygotowania** strefy dotyczy też Planowanego powrotu. Przygotowanie czeka, aż pozwolą na nie zarówno własny szacowany początek, jak i początek przygotowania wybranego nadrzędnego. Oba plany należą do tego samego epizodu powrotu i używają jego konfiguracji docelowej; niezwiązane przygotowanie tygodniowe nie zwalnia strefy zależnej dla przyjazdu. Bez odpowiedniego przygotowania nadrzędnego strefa zależna czeka na zwykły cel przyjazdu. Zobacz [Nadrzędny termostat przygotowania](adaptive-preconditioning.pl.md#preconditioning-master).

<a id="one-off-return"></a>
## Jednorazowy powrót

W **Jednorazowy powrót** wybierz przyszłą datę i godzinę oraz **Zaplanuj powrót**. Data i godzina są razem. Na telefonie Zaplanuj powrót jest w następnym wierszu, wyrównany do prawej krawędzi czasu; na większych ekranach przycisk pozostaje obok pól. Wyjaśnienie znajduje się pod kontrolkami. Możesz zrobić to przed wyjściem lub już podczas nieobecności. Velair używa zapisanych Trybów i obecności. Domyślnie przy źródłach obecności żądanie oczekuje i stosuje nieobecność dopiero po zgłoszeniu jej przez wszystkie źródła przez czas potwierdzenia, chroniąc osoby w domu. Bez zapisanych źródeł naciśnięcie **Zaplanuj powrót** jawnie potwierdza wyjście: tryb nieobecności włącza się od razu, bez opóźnienia. Velair nie wnioskuje wtedy o pustym domu ani nie wykrywa fizycznego powrotu; przygotowuje normalnie i aktywuje cel przy zapisanym przyjeździe. Jeśli skonfigurowane źródło ma stan nieznany lub jest niedostępne, Velair domyślnie nadal czeka na potwierdzenie nieobecności; zniknięcie skonfigurowanej encji nie oznacza pustej listy źródeł.

Przy zapisanych źródłach obecności **Zastosuj tryb Nieobecność teraz** jest opcjonalnym polem wyboru dla każdego jednorazowego powrotu. Początkowo jest odznaczone i nie jest zapisywanym ustawieniem rutyny. Zaznaczenie natychmiast stosuje skonfigurowany Tryb nieobecności, nawet gdy nadal jesteś w domu. Przygotowanie i zmiana celu o wybranej godzinie są od razu aktywne. Automatyczny powrót na podstawie obecności pozostaje zablokowany, dopóki wszystkie źródła nieprzerwanie wskazują nieobecność przez ustawiony czas potwierdzenia. Obecność lub nieznany odczyt rozpoczynają oczekiwanie od nowa; po potwierdzeniu obecność natychmiast aktywuje cel.

Na przykład przy opóźnieniu dziesięciu minut i powrocie o 18:00:

| Godzina | Obserwacja | Wynik |
| --- | --- | --- |
| 08:00 | Zaplanuj powrót z zaznaczonym Zastosuj tryb Nieobecność teraz, będąc jeszcze w domu. | Nieobecność zostaje zastosowana; czasowy powrót i przygotowanie są aktywne. |
| 08:10 | Wszystkie źródła wskazują nieobecność. | Rozpocznij dziesięciominutowe potwierdzanie. |
| 08:15 | Obecność po krótkim wyjściu. | Wyzeruj potwierdzanie; zachowaj Nieobecność. |
| 08:30 | Wszystkie źródła ponownie wskazują nieobecność. | Rozpocznij nowe dziesięć minut. |
| 08:40 | Wszystkie źródła nadal wskazywały nieobecność. | Włącz powrót na podstawie obecności bez ponownego stosowania Nieobecności. |
| 17:00 | Wykryto obecność. | Natychmiast wybierz cel. |

Karta powrotu w panelu bocznym, karta Lovelace i podsumowanie Przeglądu zachowują Nieobecność lub Przygotowanie jako główny stan. Osobny krótki wiersz pokazuje **Oczekiwanie na potwierdzenie wyjścia** albo **Potwierdzanie wyjścia** z terminem. Obecność lub nieznany odczyt przywracają komunikat oczekiwania. Rzeczywista obecność pozostaje widoczna niezależnie, także podczas aktywnej Nieobecności. Trzy widoki umieszczają reguły potwierdzania w pomocy kontekstowej, bez powtarzania głównego stanu i jego ikony. Otwarcie pomocy w Przeglądzie nie przenosi do innej strony. Po potwierdzeniu wiersz znika, a pomoc wyjaśnia możliwość powrotu na podstawie obecności: w pomocy głównej fazy karty lub początku osi czasu w Przeglądzie. Pomoc punktów końcowych wyjaśnia ich znaczenie, nie powtarza widocznej godziny.

Oś czasu zaczyna się po zastosowaniu Nieobecności; pomoc odróżnia to od monitorowanego fizycznego wyjścia. Etykiety końców, znaczniki przygotowania i zapisany przyjazd pozostają bez zmian. Jeśli nieobecność nigdy nie zostanie potwierdzona, zaplanowane przygotowanie i zmiana celu o 18:00 nadal się odbędą. **Anuluj** i jawne polecenie przyjazdu API pozostają dostępne przed potwierdzeniem. Opóźnienie zerowe nadal wymaga zaobserwowania pustego domu. Bez źródeł pole wyboru jest pomijane, a dotychczasowy natychmiastowy start pozostaje bez zmian.

Data i godzina jednorazowego powrotu zastępują godzinę z rutyny tygodniowej tylko dla tej nieobecności. Działa też przy wyłączonej rutynie. Możesz zmienić lub anulować oczekujące zgłoszenie; bez potwierdzenia zwykłego oczekującego wyjścia przed godziną przyjazdu wygasa bez zmiany Trybów. Jeśli wszystkie źródła już wskazują nieobecność i brak aktywnego epizodu, zaplanowanie zaczyna opóźnienie od razu, bez nowej zmiany czujnika. Przy aktywnej nieobecności zmień datę/godzinę w istniejącym edytorze epizodu: staje się jednorazowym wyjątkiem bez ponownego stosowania nieobecności. Przesunięcie przyjazdu na później kończy poprzednie przygotowanie i przywraca bieżące zachowanie nieobecności do nowego startu. Wzmocnienie i ręczne nadpisania są chronione. Cel jest wyznaczany na wybraną lokalną datę przyjazdu, również gdy przygotowanie zaczyna się dzień wcześniej. Ponowne przesłanie tej samej chwili przyjazdu nie resetuje przygotowania. Przyjazdy przeszłe, bieżące i nieistniejące lokalne godziny zmiany czasu są odrzucane; powtórzona godzina używa najwcześniejszego przyszłego wystąpienia.

Zakończone, pominięte i anulowane epizody blokują ponowne automatyczne uruchomienie do wykrycia obecności, więc pusty dom nie zaczyna kolejnego cotygodniowego wyjścia sam. Możesz jawnie wybrać **Zaplanuj powrót** po nieaktywnym epizodzie, bez oczekiwania na obecność. Nowe żądanie używa bieżących źródeł i Trybów. Ze źródłami ponownie potwierdza nieobecność przez ustawiony czas nawet przy już pustym domu, bez natychmiastowej zmiany Trybu. Bez źródeł jawne zgłoszenie od razu stosuje nieobecność. Panel i karta pokazują nowy formularz natychmiast po dezaktywacji epizodu. Przy niedostępnym planowaniu formularz pozostaje z wyłączonym Zaplanuj powrót i wyjaśnieniem wymaganych zapisanych ustawień oraz stanu harmonogramu. Aktywny powrót nadal można anulować.

Po potwierdzonym wyjściu użyj **Anuluj**, aby zatrzymać powrót i przywrócić zapisany poprzedni Tryb/Profile, albo **Zmień godzinę powrotu**, aby zmienić datę/godzinę. Podczas potwierdzania anulowanie zachowuje wybór, bo nieobecność jeszcze nie została zastosowana. Przy natychmiastowej ręcznej Nieobecności Anuluj przywraca poprzedni wybór nawet podczas potwierdzania monitorowanego wyjścia. Wyłączenie rutyny lub edycja godzin tygodnia nie anuluje ręcznego powrotu. Zmiana jego źródeł lub Trybów unieważnia poprzednie zgłoszenie. Jawne wybory Trybu/Profilu anulują oczekujące i aktywne powroty. Zatrzymany harmonogram nie wykonuje powrotu.

Pierwszy wiersz ma tytuł jednorazowego powrotu po lewej i wskaźniki obecności tylko dla karty po prawej. Faza jest zwartym podtytułem przy tytule, bez osobnego znacznika lub wiersza. Podczas potwierdzania fazę podaje nagłówek procesu timera. Karta grupuje liczniki źródeł na górze po prawej. Bez źródeł pomija liczniki i nieużywaną ikonę opóźnienia; panel zgłasza **Bez monitorowania**, nie nieznaną obecność. Ikona opóźnienia jest tylko przed potwierdzeniem aktywnej nieobecności; znika przy nieobecności/przygotowaniu i błędach po potwierdzonym wyjściu. Panel nie powtarza tych wskaźników. Najechanie daje krótkie wyjaśnienie fazy. Podczas potwierdzania lekki wiersz timera wyjaśnia sprawdzanie pustego domu. **Do** pokazuje termin backendu w lokalnym czasie HA, z datą, jeśli inna niż dziś. Velair stosuje nieobecność po potwierdzeniu tylko przy wszystkich źródłach nadal pustych. To termin, nie odliczanie ani potwierdzone wyjście. Ten sam proces dotyczy rutyny przed powstaniem epizodu; brak terminu nie tworzy wymyślonej godziny.

Przed potwierdzeniem ikona przyjazdu i **Oczekiwane przybycie** identyfikują zapisany powrót z dostępną etykietą i podpowiedzią. Wiersz wyrównuje się do tytułu i stanu. Zapisana data/godzina to zwarty klikalny znacznik bez ołówka/podkreślenia. Potwierdzona oś używa tej samej ikony; zapisana data/godzina jest ciemniejszym polem edycji z taką samą typografią jak wyjście, bez ołówka i podkreślenia. Wybierz wartość, aby otworzyć edytor w miejscu. Wiersz działań ma niebieskie **Wstecz** ze strzałką po lewej i zielone **Zmień godzinę powrotu** po prawej. Wstecz odrzuca niezapisane zmiany i zamyka edytor bez zmiany powrotu. Na szerokim panelu edytor jest zwarty i wyrównany do końca przyjazdu, a działanie zmiany po prawej pod nim. Wąskie ekrany i karta zachowują responsywność.

Pola edycji pozostają ukryte, dopóki nie otworzysz edytora. **Wstecz** odtwarza ostatni zapisany przyjazd i ukrywa pola, usuwa ostrzeżenie edycji oraz ochronę nawigacji; niezależne niezapisane ustawienia rutyny pozostają chronione. Ponowne otwarcie zaczyna od zapisanego przyjazdu. Przy potwierdzonej nieobecności punkt przyjazdu jest tym samym przyciskiem, więc nie ma duplikatu. Anulowanie jest po lewej pod wykresem i opisem przygotowania tylko przy zamkniętym edytorze. Podczas edycji znika; zmiana jest po prawej, Wstecz po lewej. Edycja pól nie zmienia zaplanowanego powrotu, dopóki działanie **Zmień godzinę powrotu** nie zakończy się powodzeniem. Powodzenie zamyka edytor i przywraca fokus zapisanej wartości. Błędy i aktualizacje czujnika zachowują szkic. Ostrzeżenie niezapisanej zmiany wskazuje edycję, a nawigacja/odświeżenie ostrzegają przed jej utratą. Zapis rutyny nie stosuje edycji przyjazdu.

Przyciski Wstecz i zmiany przyjazdu mają kompaktowe wypełnione tło, odpowiednio niebieskie i zielone. Widoczne powierzchnie mają 32 piksele wewnątrz 44-pikselowych celów dotyku. Anulowanie ma czerwone wypełnienie z białym tekstem/ikoną pod danymi epizodu, również 32 w 44 pikselach, z wyraźnym najechaniem i fokusem. Kolory pierwszego planu dostosowują się do motywu. Niedostępne działania mają neutralne tło, przygaszone tekst/ikony i kursor zakazu. Zmiana zyskuje zieleń po edycji przyjazdu. Faza pozostaje przy tytule; anulowanie po lewej pod danymi bez edycji, zmiana po prawej pod otwartym edytorem. Panel i karta zachowują układ na telefonie. Zaplanuj powrót jest po prawej w nowym formularzu. Udane działania aktualizują epizod bez dodatkowego komunikatu zapisu.

<a id="home-assistant-actions"></a>
### Działania Home Assistant

Automatyzacje, skrypty i pulpity mogą zgłaszać wyjście przez `velair.start_planned_return`. Wymagane są `return_date` (`YYYY-MM-DD`) i `return_time` (24-godzinne `HH:MM`), razem określające przyszły przyjazd w strefie HA. Natywny wybór czasu może wysłać `HH:MM:00`; zerowe sekundy są akceptowane i normalizowane do minut. W poniższym przykładzie wybierz przyszłą datę:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Używa zapisanych źródeł i Trybów oraz tego samego potwierdzania, przygotowania i pierwszeństwa co **Zaplanuj powrót**. Działa przy wyłączonej rutynie i aktualizuje przyjazd przy aktywnej nieobecności bez ponownego stosowania nieobecności. Zapisane Tryby i harmonogram automatyczny muszą działać. Źródła są opcjonalne: pusta zapisana lista od razu stosuje nieobecność; skonfigurowane źródła zachowują reguły potwierdzania, chyba że podano `apply_away_now: true`. Przyjazd przeszły lub bieżący jest odrzucany bez zastępowania poprzedniego powrotu. Nieistniejący lub miniony czas zmiany czasu jest odrzucany; przy powtórzonej godzinie wybiera najwcześniejsze nadal przyszłe wystąpienie.

Anuluj oczekujący lub aktywny powrót:

```yaml
action: velair.cancel_planned_return
data: {}
```

To działanie zamyka też nieaktywny komunikat epizodu. Kończy przygotowanie i terminowy powrót, zachowując blokadę ponownego automatycznego startu. Po potwierdzonym wyjściu przywraca dokładny Tryb i wybór Profili sprzed epizodu. Podczas zwykłego oczekującego wyjścia pozostawia wybór. Przy natychmiastowej ręcznej Nieobecności przywraca zapisany wybór także przed potwierdzeniem monitorowanego wyjścia. Nowe jawne **Zaplanuj powrót** może zastąpić nieaktywny epizod. Panel i karta używają tego samego anulowania.

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

Bez źródeł **Zaplanuj powrót** od razu stosuje Away. Nie ma pięciominutowego potwierdzania. Anulowanie aktywnego powrotu przywraca Comfort i dwa Profile zapisane bezpośrednio przed startem. Nieznany lub niedostępny skonfigurowany czujnik nie oznacza braku źródeł: nadal blokuje nowe potwierdzenie nieobecności.

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

O oczekiwanej godzinie Velair wybiera cel i kontynuuje zwykły harmonogram. Wcześniejsza obecność wybiera cel od razu, gdy monitorowane wyjście zostało już potwierdzone. Spóźnienie nie przełącza domu z powrotem w nieobecność. Pauzy, Wzmocnienie, regulacja ręczna, wyłączone strefy i zatrzymany harmonogram zachowują ograniczenia przekazywania. Przygotowanie obsługuje ogrzewanie, chłodzenie i natywne zakresy. Zbliża pomieszczenie do celu, ale nie gwarantuje dokładnej temperatury.

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

Karta **Planowany powrót** pokazuje przyjęty powrót, przygotowanie każdej strefy i zapisaną rutynę, z własnym wprowadzeniem i pomocą kontekstową. Otwórz ją przez `/velair/planned-return`; `/velair/preconditioning` otwiera osobną kartę Przygotowanie wstępne. Dawne adresy podsekcji nadal otwierają odpowiednie karty. Edycja godziny dotyczy tylko tej nieobecności, nie zapisanego tygodnia. **Anuluj** usuwa przygotowanie i automatyczną zmianę celu. Przed zwykłym potwierdzeniem nieobecności zachowuje wybór; po potwierdzeniu lub natychmiastowej ręcznej Nieobecności przywraca Tryb i Profile zapisane przed epizodem.

Jawny wybór Trybu lub Profilu anuluje automatyczny powrót. Późniejsza obecność lub restart nie mogą nadpisać wyboru. Velair pamięta zakończone/anulowane nieobecności do ponownej obecności.

Jawny wybór anuluje też trwające przygotowanie, nawet przy już aktywnej wybranej konfiguracji. Różni się od zaplanowanej zmiany temperatury w nieobecności, która nie anuluje przygotowania. Panel i karta nie mają przycisków pominięcia, „jestem w domu” ani zamknięcia; wspólne kontrolki powrotu służą anulowaniu i zmianie przyjazdu. Backend zachowuje osobne operacje pominięcia i przyjazdu dla API, opisane w [API deweloperskim](../developer/api.md). `velair.cancel_planned_return` anuluje oczekujący lub aktywny potwierdzony powrót albo zamyka nieaktywny komunikat. Kończy przygotowanie i terminowy powrót, blokując automatyczny restart tej nieobecności. Po wyjściu przywraca poprzedni Tryb/Profile; przy zwykłym oczekującym wyjściu lub komunikacie końcowym nie zmienia wyboru. Natychmiastowa ręczna Nieobecność również przywraca poprzedni wybór przed potwierdzeniem monitorowanego wyjścia. Nowe jawne Zaplanuj powrót nadal może zacząć epizod.

<a id="restoration-limits"></a>
### Ograniczenia przywracania

Dla jednorazowego powrotu wybór jest zapisywany przy **Zaplanuj powrót**. Dla rutyny tygodniowej przy potwierdzeniu nieobecności, tuż przed zastosowaniem jej Trybu.

Poprzedni wybór przetrwa edycję przyjazdu i restarty HA. Przywraca wybór Profili, nie dawne temperatury/stany urządzeń; Profile używają aktualnych harmonogramów i pierwszeństwa nadpisań. Jeśli dawny Tryb usunięto lub zmieniono, pierwotne Profile mogą wrócić jako wybór ręczny. Jeśli zapisany Profil jest brakujący, nieprawidłowy lub konfliktowy z innym, anulowanie działa, ale zachowuje bieżący wybór i zgłasza brak przywrócenia. Starsze epizody bez tych metadanych zachowują wybór, bo nie można odgadnąć poprzedniego.

Po restarcie oczekujące zgłoszenia i potwierdzone nieobecności są odzyskiwane, nie zaczynają od nowa. Niepotwierdzona nieobecność zaczyna opóźnienie ponownie. Jeśli czujnik zgłasza obecność, Velair uwzględnia ją przy odtwarzaniu stanu poprzedniej nieobecności, nawet gdy domownicy wrócili w czasie, gdy Home Assistant nie działał. Natychmiastowa ręczna Nieobecność zachowuje po restarcie blokadę powrotu na podstawie obecności: niedokończone potwierdzanie zaczyna cały czas oczekiwania od nowa, a początkowa obecność nie liczy się jako powrót. Ukończone potwierdzenie pozostaje ukończone. Zaplanowany przyjazd pozostaje wiążący w obu przypadkach.

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

Przegląd dodaje liczniki przygotowania z pomocą po najechaniu, fokusie lub dotknięciu. Przy potwierdzonym wyjściu pokazuje tylko do odczytu wspólną oś obok podsumowania, a przy mniejszej szerokości pod nim. Wybór podsumowania poza podpowiedziami otwiera pełne szczegóły; podpowiedzi nie nawigują ani nie zmieniają powrotu.

Zapisane godziny wyjścia i edytowalnego przybycia są nad osią, a etykiety Trybów nieobecności i celu pod nią. Obie daty mają tę samą typografię; przybycie jest ciemniejszym polem otwierającym edytor, bez ołówka ani podkreślenia. Osobne podpowiedzi wyjścia, ikony przybycia i Trybów otwierają się po najechaniu, fokusie lub dotknięciu. Neutralna pionowa kreska **Teraz** odpowiada końcowi odcinka upływu czasu UTC. Daty pojawiają się, gdy końce przypadają na różne dni w strefie Home Assistant. Szkic przybycia nie przesuwa zapisanej osi przed akceptacją. Zwykłe oczekujące wyjścia, stany końcowe i brak czasu zastosowania Nieobecności nie mają ruchomej osi; aktywny błąd z poprawnym czasem zastosowania Nieobecności zachowuje oś i anulowanie. Zegar lokalny odświeża się co minutę tylko przy widocznej aktywnej karcie lub panelu, także po ponownym pokazaniu; nie odpytuje backendu.

Każdy kwalifikujący się termostat adaptacyjny ma kolorowy punkt przygotowania wielkości 8 px, dopasowany do koła legendy i odpowiadającą legendę z nazwą oraz szacowanym początkiem obok nazwy, w tym samym wierszu. Czas używa strefy i formatu 12/24 godzin Home Assistant, z datą przy późniejszym dniu. Podpowiedzi zachowują pełną nazwę i rzeczywisty szacunek. Nakładające się punkty tworzą koło z równymi kolorowymi sektorami. Legenda domowa zaczyna w jednym wierszu ze skróconymi długimi nazwami; przycisk dodatkowych termostatów rozwija ją w panelu, a **Pokaż mniej** zwija. Zwykłe aktualizacje zachowują rozwinięcie; zmiana zapisanego przybycia, celu lub epizodu resetuje je i usuwa stare szacunki. Samo rozwijanie nie zmienia powrotu i nie nawiguje.

Wstrzymane, gotowe, niedostępne i działające tylko przy przybyciu pomieszczenia nie otrzymują punktów. Punkt spoza granicy wyjścia pozostaje na krawędzi, ale podpowiedź zachowuje rzeczywistą godzinę. Oś mierzy upływ czasu, a nie postęp temperaturowy lub fizyczną pracę HVAC. Brak szacunku nie oznacza wyłączonego przygotowania: podpowiedzi wyjaśniają znany stan bez wymyślania czasu. Edycja przybycia zachowuje zaakceptowaną projekcję; Wstecz przywraca zapisany przyjazd. Anulowanie i zmiana przybycia pozostają dostępne.

**Następne zdarzenia przy aktywnym powrocie**

Przegląd i karty zdarzeń pokazują następną prognozowaną zmianę sterowania każdego termostatu ze źródłem: harmonogram tygodniowy lub Planowany powrót. Akcja tygodniowa przed startem przygotowania pozostaje możliwa. Gdy przygotowanie przejmuje strefę, następnym przejściem jest przyjazd, nie niezwiązany blok nieobecności, nawet po osiągnięciu celu. Strefy bez interwencji zachowują zdarzenia tygodniowe. Szacunki zależą od bieżących pomiarów. Przyjazd może zmienić temperaturę, opcje, wyłączyć urządzenie lub aktywować Pauzę Profilu. Wzmocnienie, ręczne sterowanie i pauzy zachowują priorytet. Wstrzymanie wyjaśnia blokadę; termin jest pokazany tylko, jeśli wszystkie aktywne blokady mają znany termin, i nie gwarantuje rozpoczęcia przygotowania.

Wiersze używają wspólnego zwartego układu: nazwa, krótkie źródło, godziny, akcja i HVAC. Końcowa ikona informacji podaje pełną fazę, Tryb przyjazdu, powód/termin wstrzymania i tygodniowy punkt odniesienia, gdy powrót ma pierwszeństwo. Otwiera się przez najechanie, fokus lub dotknięcie. Nie ma podtytułu pod nazwą. Szerokości kolumn są wspólne i dopasowane do najszerszych wartości. Wąskie listy przewijają się poziomo ze stałą nazwą; dane nie przechodzą do drugiego wiersza. Prognoza nie potwierdza dostarczenia i nie zmienia wykonania. Czujniki następnego zdarzenia i widoki wyprzedzenia tygodniowego zachowują znaczenie tygodniowe. Wymagane są zgodne wersje integracji i frontendu; starszy backend udostępnia zdarzenia tygodniowe.

Strefy Przeglądu mają jeden zwarty wskaźnik powrotu obok Profilu i komfortu: stan przygotowania oraz cel lub zakres przyjazdu, jeśli dostępne. Cały wskaźnik ma pomoc po najechaniu, fokusie lub dotknięciu ze stanem, szacunkiem, przyjazdem, powodem i przypisaniem sterowania, bez wielowierszowego panelu. Strefa nadal realizująca nieobecność może pokazywać przyszłe przygotowanie bez twierdzenia, że już nią steruje. Brak szacunku nie jest zastępowany wymyślonym czasem; zakończony, anulowany lub pominięty powrót nie zachowuje aktywnego podglądu. Karty termostatów zachowują szczegółowe przygotowanie.

Przegląd pokazuje zwarte podsumowanie domu podczas epizodu tygodniowego/jednorazowego lub problemu wymagającego uwagi. Wskazuje pochodzenie i stan oraz termin potwierdzenia lub przyjazd. Wybierz je, aby otworzyć szczegóły na karcie Planowany powrót.

Fioletowy sygnał encji wskazuje bieżące sterowanie Planowanego powrotu. Istniejący stan pozostaje widoczny: sygnał wyjaśnia pochodzenie, nie zastępuje ogrzewania, chłodzenia, pauzy, harmonogramu lub przygotowania. Przyszłe szacunki startu są osobno oznaczone. Sterowanie ręczne, Wzmocnienie i niezależne pauzy zachowują pierwszeństwo. Oznaczenie nieobecności obejmuje efektywne Profile epizodu lub Default jawnie wybrane jako Tryb nieobecności, nie nieprzypisaną encję zachowującą po prostu harmonogram domyślny. Przygotowanie może prawidłowo używać domyślnego harmonogramu celu, gdy backend wybiera temperaturę przyjazdu.

Diagnostyka pokazuje stan domu, pochodzenie sterowania każdej encji i przygotowanie wraz z powodami zawieszenia/niedostępności. Kategoria historii Planowanego powrotu zapisuje istotne przyjęte przejścia bez duplikatów po odświeżaniu. Wpisy współdzielą limit 100 zdarzeń i znikają po restarcie; preferencje kategorii pozostają. Pobrane raporty mają te informacje i usuwają operacyjne identyfikatory Trybów/Profili. Zamiar i powodzenie przekazania pozostają osobne.

<a id="dashboard-card"></a>
## Karta pulpitu

Przyjęty powrót dodaje kompaktowe znaczniki stanów przygotowania z pomocą zawierającą liczby, przyjazd i najwcześniejszy szacunek. Pomoc liczników obecności wymienia nazwy właściwych źródeł; faza i opóźnienie też mają pomoc klawiatury i dotyku. Karta domowa zachowuje te znaczniki, bo nie ma pełnej listy przygotowania panelu. Etykiety Trybów pozostają pod osią. Pole przyjazdu jest przyciskiem edycji; jego pomoc jest na sąsiedniej ikonie. Konfiguracja tygodnia, lista źródeł i pełne przygotowanie pozostają w panelu.

Aktywny powrót w szybkiej akcji karty termostatu pokazuje ten sam wykres, ale tylko punkt wybranego termostatu, z jego nazwą i szacowanym początkiem w legendzie, bez znaczników stanów. Jeśli brak prawidłowego bieżącego szacunku, wykres zastępuje krótkie wyjaśnienie: działanie przy przyjeździe, cel osiągnięty, wstrzymanie z powodem, niedostępność lub brak szacunku. Nie pożycza oszacowania innej strefy. Zapisany przyjazd pozostaje edytowalny, a anulowanie dostępne także bez wykresu. Obecność zostaje w nagłówku. Akcja dotyczy całego domu, także innych termostatów; nie jest ograniczona do pokazanej strefy. Pomija powtórzone odliczanie i rozwijanie pierwszego startu. Oddzielna karta domowa pokazuje wszystkie kwalifikujące się punkty i zachowuje znaczniki oraz legendę.

Opcjonalna karta Lovelace pokazuje zwarte sterowanie jednorazowym powrotem. Nagłówek zawiera liczby źródeł obecnych, pustych i nieznanych oraz opóźnienie; podsumowanie tygodnia, lista źródeł i szczegóły pomieszczeń pozostają w panelu. Najpierw skonfiguruj dom w panelu.

```yaml
type: custom:velair-card
view: planned-return
```

W edytorze wizualnym wybierz **Planowany powrót**. Karta używa tego samego zapisanego epizodu co panel i inne karty. Obsługuje przyszłe daty/godziny. Aktywne epizody dają anulowanie i zmianę przyjazdu: anulowanie po potwierdzonym wyjściu lub natychmiastowej ręcznej Nieobecności przywraca poprzedni Tryb/Profile nawet przed potwierdzeniem monitorowanego wyjścia; zwykłe oczekujące potwierdzenie zachowuje wybór. Po zakończeniu, anulowaniu lub innym nieaktywnym epizodzie karta pokazuje nowy formularz bez czekania na zmianę obecności. Błędna zapisana konfiguracja lub zatrzymany harmonogram blokują planowanie i zmiany, ale aktywny powrót nadal można anulować. Panel ma te same przyciski i cykl; konfiguracja tygodnia i przełącznik pozostają tam. Tylko wskaźniki źródeł obecności i opóźnienia po prawej stronie nagłówka występują wyłącznie na karcie; panel i karta mają wspólny podtytuł fazy przy tytule, edytor przyjazdu i oś czasu. Podczas potwierdzania blok opisujący odliczanie do terminu zastępuje podtytuł. Widok domu nie filtruje termostatów.

Karta **Termostat: stan i sterowanie** może też udostępniać jednorazowy powrót jako szybkie działanie obok Wzmocnienia i Pauzy. Włącz je w edytorze działań, wybierz nazwę lub umieść w menu **Więcej**. Edytor grupuje te trzy najpierw, nawet wyłączone. Otwiera te same zwarte pola w dolnym panelu z prostym nagłówkiem jak Wzmocnienie/Pauza. Wszystkie używają wysokości pól 38 pikseli. Aktywne wyjście pokazuje istniejącą oś i edytor. X zamyka panel bez anulowania wyjścia. Zamknięcie z niezapisanym przyjazdem pyta o odrzucenie; trwające działanie blokuje zamknięcie. Działanie zawsze steruje całym domem, niezależnie od encji. Stare konfiguracje je ukrywają. Nowe karty z wyboru HA je włączają; YAML wymaga `type: planned-return` w `climate_actions`.

Podczas **Nieobecności** i **Przygotowania na przybycie** karta pokazuje czas zastosowania Nieobecności i zapisany przyjazd z nazwami Trybów nieobecności i powrotu epizodu. Przy natychmiastowej ręcznej Nieobecności zastosowanie może poprzedzać potwierdzone fizyczne wyjście. Wskaźnik bieżącego czasu z pomocą **Teraz** postępuje według upływu UTC, także przy zmianach czasu, i pozostaje w pasku. Punkty końcowe zawierają daty, gdy dni kalendarza Home Assistant się różnią. Niezapisane zmiany przyjazdu nie zmieniają paska. Zwykłe oczekujące wyjścia, stany końcowe i epizody bez czasu zastosowania Nieobecności pozostają statyczne bez osi czasu. Panel i karta odświeżają lokalne zegary raz na minutę tylko przy widocznym i aktywnym widoku oraz natychmiast po przywróceniu widoczności; nie żąda to danych backendu.

W karcie Planowany powrót panelu oś nie powtarza liczników przygotowania ani wielowierszowego odliczania: stany są opisane wyżej w szczegółach pomieszczeń. Nie ma też osobnego panelu pierwszego szacowanego początku. Karta domowa zachowuje znaczniki, a szczegółowe sterowanie karty termostatu tylko wybrany punkt z nazwą i szacunkiem. Pola daty i godziny zachowują kompaktowy rozmiar oraz Wstecz/Zmień.

Zapisane godziny wyjścia i edytowalnego przybycia są nad osią, a etykiety Trybów nieobecności i celu pod nią. Obie daty mają tę samą typografię; przybycie jest ciemniejszym polem otwierającym edytor, bez ołówka ani podkreślenia. Osobne podpowiedzi wyjścia, ikony przybycia i Trybów otwierają się po najechaniu, fokusie lub dotknięciu. Neutralna pionowa kreska **Teraz** odpowiada końcowi odcinka upływu czasu UTC. Daty pojawiają się, gdy końce przypadają na różne dni w strefie Home Assistant. Szkic przybycia nie przesuwa zapisanej osi przed akceptacją. Zwykłe oczekujące wyjścia, stany końcowe i brak czasu zastosowania Nieobecności nie mają ruchomej osi; aktywny błąd z poprawnym czasem zastosowania Nieobecności zachowuje oś i anulowanie. Zegar lokalny odświeża się co minutę tylko przy widocznej aktywnej karcie lub panelu, także po ponownym pokazaniu; nie odpytuje backendu.

Każdy kwalifikujący się termostat adaptacyjny ma kolorowy punkt przygotowania i odpowiadającą legendę z nazwą oraz szacowanym początkiem obok nazwy, w tym samym wierszu. Czas używa strefy i formatu 12/24 godzin Home Assistant, z datą przy późniejszym dniu. Podpowiedzi zachowują pełną nazwę i rzeczywisty szacunek. Nakładające się punkty tworzą koło z równymi kolorowymi sektorami. Legenda domowa zaczyna w jednym wierszu ze skróconymi długimi nazwami; przycisk dodatkowych termostatów rozwija ją w panelu, a **Pokaż mniej** zwija. Zwykłe aktualizacje zachowują rozwinięcie; zmiana zapisanego przybycia, celu lub epizodu resetuje je i usuwa stare szacunki. Samo rozwijanie nie zmienia powrotu i nie nawiguje.

Wstrzymane, gotowe, niedostępne i działające tylko przy przybyciu pomieszczenia nie otrzymują punktów. Punkt spoza granicy wyjścia pozostaje na krawędzi, ale podpowiedź zachowuje rzeczywistą godzinę. Oś mierzy upływ czasu, a nie postęp temperaturowy lub fizyczną pracę HVAC. Brak szacunku nie oznacza wyłączonego przygotowania: podpowiedzi wyjaśniają znany stan bez wymyślania czasu. Edycja przybycia zachowuje zaakceptowaną projekcję; Wstecz przywraca zapisany przyjazd. Anulowanie i zmiana przybycia pozostają dostępne.
