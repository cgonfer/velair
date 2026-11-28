<a id="adaptive-preconditioning"></a>
# Adaptacyjne przygotowanie temperatury
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.3-dev.20261120233407 |
| Ostatnia synchronizacja | 2026-11-21 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Adaptacyjne przygotowanie temperatury pozwala Velair rozpocząć ogrzewanie lub chłodzenie przed zaplanowanym blokiem, aby pomieszczenie było bliżej temperatury docelowej w chwili rozpoczęcia bloku.

Na przykład blok o `07:00` z temperaturą `21 °C` oznacza „zbliżyć się do `21 °C` na `07:00`”, a nie „zacząć zmieniać temperaturę na `21 °C` o `07:00`”.

Funkcja działa lokalnie w Home Assistant. Velair zapisuje ustawienia i próbki uczenia w jego pamięci i nigdy nie wysyła historii temperatur, obserwacji ani danych kalibracji do zewnętrznego sterownika. Strefy przekazane do zewnętrznego wykonywania harmonogramów nie korzystają z adaptacyjnego przygotowania; publikowany jest tylko ich efektywny harmonogram tygodniowy.

Blok **Tylko temperatura** nie zezwala na zmianę trybu HVAC. Gdy termostat jest wyłączony, Velair nie rozpoczyna wcześniejszego przygotowania ani nie zbiera próbek uczenia dla tego celu. Zewnętrzne włączenie pozwala przeliczyć przygotowanie dla rzeczywistego zgodnego trybu. Ta opcja nie może zapewnić komfortu na godzinę bloku, dopóki urządzenie pozostaje wyłączone.

<a id="setup"></a>
## Konfiguracja

Karta przygotowania zawiera adaptacyjne ustawienia i uczenie dla niezależnego urządzenia lub grupy pomieszczenia. Urządzenia grupy pojawiają się tu jako jeden pokój. Planowany powrót ma osobną kartę dla obecności, tygodniowych przyjazdów i bieżącej nieobecności. Obie zawierają wprowadzenie i pomoc kontekstową. Ścieżki to `/velair/preconditioning` i `/velair/planned-return`. Dawne odnośniki podsekcji nadal otwierają właściwą kartę. Zobacz [Planowany powrót](planned-return.pl.md).

1. Otwórz kartę przygotowania temperatury.
2. Rozwiń urządzenie lub grupę pomieszczenia do konfiguracji.
3. Włącz przygotowanie.
4. Zachowaj domyślne ustawienia modelu, chyba że masz konkretny powód do zmiany.
5. Opcjonalnie wybierz czujnik temperatury zewnętrznej.

Przygotowanie konfiguruje się dla niezależnego urządzenia lub grupy pomieszczenia. Uczenie ogrzewania i chłodzenia pozostaje oddzielne; próbki jednego kierunku nie zastępują drugiego.

[Grupa pomieszczenia](room-groups.pl.md#learning-and-membership-changes) przechowuje jeden model cieplny i podejmuje jedną decyzję startu. Urządzenia nie uczą się ani nie przygotowują niezależnie. Odniesienie temperatury dostarcza własny pomiar, a włączony czujnik Room Assist efektywny pomiar pokoju. Usunięcie urządzenia rozpoczyna uczenie od nowa dla niego i pozostałej grupy. Rozwiązanie tworzy niezależne historie dla wszystkich; dawnych nie dzieli się ani nie przywraca. Zmiana nazwy lub kolejności zachowuje uczenie grupy.

Obsługiwane są natywne zakresy `heat_cool`. Jeśli temperatura pomieszczenia jest niższa od dolnej granicy o więcej niż minimalna różnica temperatury, Velair prognozuje względem dolnej granicy i wcześniej uruchamia cały zakres dla ogrzewania. Jeśli jest wyższa od górnej granicy o więcej niż tę różnicę, prognozuje względem górnej i wcześniej uruchamia cały zakres dla chłodzenia. Odczyty wewnątrz zakresu lub martwych stref przy jego granicach zachowują zwykły czas bloku. Velair zawsze wysyła obie granice; nigdy nie sprowadza zakresu do jednej temperatury.

Dla dwóch wartości w stałym `heat` lub `cool` wybierz **Wartość zadana odniesienia** dla urządzenia i trybu w **Ustawienia → Urządzenia klimatyczne i grupy**: **Dolna wartość zadana** lub **Górna wartość zadana**, zależnie od rzeczywiście używanej przez urządzenie. Room Assist współdzieli to ustawienie. Przygotowanie i uczenie ogrzewania używają tylko wybranej granicy jako celu ogrzewania, a chłodzenie jako celu chłodzenia. Kierunek określa tryb, także przy górnej granicy ogrzewania lub dolnej chłodzenia. Velair wysyła wcześniej całą nominalną parę, także dla Planowanego powrotu, nigdy samą wybraną granicę.

Przy **Nie skonfigurowano** pary stałego trybu zachowują zaplanowaną godzinę i nie tworzą próbek uczenia cieplnego. Planowany powrót stosuje je przy przybyciu, bez wyprzedzenia. Zakresy `auto` zachowują ograniczenie, ponieważ wybór granicy nie określa sposobu ogrzewania/chłodzenia urządzenia. Natywne `heat_cool` nie zmienia się. Zmiana odniesienia unieważnia obserwacje rozpoczęte z poprzednią interpretacją.

<a id="temporary-setpoint-offset"></a>
## Tymczasowe przesunięcie nastawy

**Przesunięcie ogrzewania** i **Przesunięcie chłodzenia** opcjonalnie zwiększają oddziaływanie urządzenia podczas przygotowania z wyprzedzeniem. Oba domyślnie wynoszą `0`, zachowując dotychczasowe działanie. Wybieraj wartości zgodne z efektywnym krokiem temperatury urządzenia, do `5 °C` (`9 °F`). Największą dostępną wartością jest najwyższy zgodny krok w tym limicie. Są to różnice temperatur: przesunięcie ogrzewania `2 °C` dodaje dwa stopnie, a przesunięcie chłodzenia `2 °C` odejmuje dwa stopnie.

Cel temperatury w pokoju z harmonogramu i cel uczenia pozostają bez zmian. Przygotowanie bloku ogrzewania `21 °C` z przesunięciem `2 °C` wysyła tymczasowo `23 °C`. Przygotowanie bloku chłodzenia `24 °C` z przesunięciem `1.5 °C` wysyła tymczasowo `22.5 °C`. Przy minimalnej różnicy temperatur `0.1 °C` przygotowania kończą się odpowiednio przy `20.9 °C` i `24.1 °C`. Przesunięcie jest też usuwane przy rozpoczęciu bloku. Velair uzgadnia wtedy bieżący harmonogram, Room Assist i pozostałe aktywne funkcje według dotychczasowych zasad wysyłania poleceń i przywracania.

Dla celu z dwiema nastawami obie granice przesuwają się o tę samą wartość. Pas ogrzewania `20–24 °C` z żądanym przesunięciem `3 °C` i fizycznym maksimum `25 °C` staje się `21–25 °C`: zachowuje szerokość czterech stopni, a efektywne przesunięcie maleje do `1 °C`. Chłodzenie działa symetrycznie przy fizycznym minimum. Efektywny dodatek jest zaokrąglany w dół do zgodnego kroku różnicy i nigdy nie przekracza żądania. Bez wolnego zakresu dodatnio ustawione przesunięcie może dać `0 °C`; kierunek przygotowania pozostaje jednak aktywny do pierwotnego progu temperatury pokoju.

Zmiana przesunięcia jednego kierunku resetuje uczenie tylko dla tego kierunku. Predyktor, wybór próbek i reguły ważności obserwacji pozostają bez zmian. Sesje, w których efektywne przesunięcie zmienia się wskutek limitów urządzenia lub Room Assist, nadal kwalifikują się zgodnie z tymi regułami. Przywrócenie domyślnych ustawień przygotowania zeruje oba przesunięcia, resetuje tylko kierunki ze zmienionym przesunięciem i zachowuje osobne ustawienia Room Assist, w tym hamowanie.

Jeśli urządzenie później zgłosi inny krok, Velair zachowuje zapisane żądanie i zmniejsza jedynie zastosowany dodatek do zgodnego kroku. Zmiana jednostki temperatury zachowuje fizyczną różnicę i nie resetuje uczenia. Przenośny model `28` oznacza eksportowane uczenie skonfigurowanym przesunięciem danego kierunku; import uczenia wymaga zgodnej wynikowej konfiguracji. Starsze uczenie jest traktowane jako przesunięcie zerowe. Import samej konfiguracji zmieniający przesunięcie resetuje zachowane lokalne uczenie tego kierunku.

Panel pozostawia **Cel harmonogramu** i wartość przypisaną Velair przy pierwotnym celu. Istniejący znacznik **Zastosowany cel** pokazuje końcowe polecenie. Etykieta aktywnego przesunięcia pokazuje efektywny dodatek ze znakiem, także ograniczone zero; jej szczegóły objaśniają pierwotny cel, bazę Room Assist, żądany i efektywny dodatek, końcowe polecenie oraz ograniczenia urządzenia.

<a id="after-reaching-the-target"></a>
## Po osiągnięciu celu

Gdy zaakceptowane przygotowanie z wyprzedzeniem osiągnie próg docelowy przed rozpoczęciem bloku, Velair zachowuje pierwotny cel tego bloku do zaplanowanej godziny. Tymczasowe przesunięcie kończy się przy osiągnięciu progu. Działa to również przy zerowym przesunięciu, bez Room Assist i przy obserwacji zbyt krótkiej, aby stała się próbką uczenia.

Przykład: bieżący blok ma `20 °C`, a przygotowanie przyszłego bloku `21 °C` kończy się przy `20.9 °C`. Przegląd zachowuje **Cel** `21 °C`, zamiast wracać do `20 °C` po zakończeniu obserwacji. Przy przesunięciu ogrzewania `2 °C` tymczasowe polecenie `23 °C` wraca do nominalnych `21 °C`. Jeśli wartość **Zastosowana** też wynosi `21 °C`, duplikat jest jak zwykle ukryty. Chłodzenie działa symetrycznie: przyszły cel `24 °C`, osiągnięty przy `24.1 °C`, zachowuje nominalne `24 °C` po zakończeniu tymczasowego polecenia `22 °C`. Room Assist może zastosować zwykłą korektę lub hamowanie względem tego nominalnego celu.

Velair zapisuje ukończone przygotowanie lokalnie i po restarcie sprawdza zgodność harmonogramu oraz kontekstu regulacji. **Zastosuj aktywny harmonogram po uruchomieniu** nadal decyduje o wysłaniu polecenia:

| Opcja uruchomienia | Prawidłowo ukończone przygotowanie przed blokiem |
| --- | --- |
| Włączona | Zastosuj odzyskany nominalny cel, np. `21 °C`, zwykłą ścieżką wysyłania. Nie przywracaj przesunięcia przygotowania. |
| Wyłączona | Odzyskaj nominalne `21 °C` dla panelu i bieżącego zamiaru sterowania bez wysyłania z powodu tego odzyskania celu, trybu ani innych opcji bloku. Jeśli rzeczywista zastosowana nastawa jest inna, pokaż ją osobno. |

Odzyskanie nie otwiera ponownie uczenia ani nie włącza dodatku, gdy temperatura pokoju zmieni się podczas niedostępności Home Assistant. Wymaga pomyślnie zapisanego zakończenia; sama zgłoszona nastawa nie dowodzi ukończenia przygotowania. Nieudany zapis nie gwarantuje ciągłości po kolejnym restarcie. Pauzy, sterowanie ręczne, nadpisania, wyłączone przygotowanie oraz zastąpione harmonogramy lub własność nadal mają pierwszeństwo. Zmiana nastawy odniesienia, członkostwa w grupie pokoju lub aktywnego Trybu także unieważnia zapisane zakończenie, jeśli kontekst przygotowania przestał pasować. O nominalnej godzinie bloku przejmuje sterowanie zwykły harmonogram.

Bez potwierdzonego zakończenia przygotowania z wyprzedzeniem dotychczasowe rozróżnienie pozostaje poprawne: **Cel** `20 °C` i wartość **Zastosowana** `21 °C` mogą oznaczać różne wartości harmonogramu i urządzenia. Samo włączenie przygotowania tego nie zmienia.

<a id="live-predictions"></a>
## Bieżące prognozy

Po rozwinięciu encji każdy obsługiwany tryb pokazuje kartę bieżącej prognozy. Korzysta ona z tych samych danych backendu o następnym zdarzeniu co Przegląd, dzięki czemu pauzy, wzmocnienia, nieobsługiwane tryby i bloki nienadające się do przygotowania są traktowane spójnie. Jeśli istnieje pasujący przyszły blok, karta pokazuje obliczony czas rozpoczęcia, czas docelowy, wyprzedzenie, zaplanowaną temperaturę i tryb oraz informację, czy Velair używa modelu początkowego, czy podobnej lokalnej historii.

Aby sprawdzić konkretną kalkulację, otwórz **Szczegóły obliczeń** w karcie prognozy. Opcjonalna sekcja pokazuje wartości backendu użyte do prognozy: liczby próbek, oszacowanie z zakończonych obserwacji, dolne ograniczenie z częściowych obserwacji, łączny szacunek, zaokrąglenie i końcowe wyprzedzenie. Jest domyślnie ukryta, aby zwykły widok pozostał prosty.

Przygotowanie na zaplanowany powrót jest oddzielone od wyprzedzenia harmonogramu tygodniowego. Dla przyjętego przyszłego powrotu informacje termostatu pokazują stan powrotu, szacowany początek, cel na przybycie i powód wstrzymania lub niedostępności. Przegląd, Planowany powrót i karty termostatów korzystają z tych samych danych backendu; nie jest to kolejne zdarzenie harmonogramu tygodniowego. Pomieszczenie może nadal realizować tryb nieobecności, pokazując oszacowanie przyszłego powrotu. **Przygotowanie** opisuje zamiar sterowania Velair, a nie potwierdzenie odbioru polecenia przez urządzenie ani fizycznego grzania lub chłodzenia. Oś powrotu pokazuje upływ czasu do zapisanego przybycia, a nie procent postępu temperaturowego. Znaczenie stanów opisuje [przygotowanie pomieszczeń](planned-return.pl.md#room-preparation).

<a id="preconditioning-master"></a>
## Nadrzędny termostat przygotowania

Pozostaw **Nadrzędny termostat przygotowania** na **Niezależnie**, aby zachować dotychczasowe działanie. Aby wcześniejsze przygotowanie urządzenia zależało od innego, wybierz to zarządzane urządzenie w ustawieniach zależnej strefy. Wybierz ponownie **Niezależnie**, aby usunąć powiązanie. Ustawienie dotyczy efektywnego harmonogramu strefy, także Profili, wyjątków stref i Planowanego powrotu; nie zastępuje temperatur ani bloków.

Jeden termostat nadrzędny może obsługiwać wiele zależnych stref. Strefa nie może zależeć od siebie. Łańcuchy i cykle nie są obsługiwane: strefa zależna nie może jednocześnie być nadrzędna.

Velair wybiera blok termostatu nadrzędnego, którego godzina docelowa jest najbliższa godzinie docelowej bloku zależnego. Przy równej odległości wybiera wcześniejszy blok. Godziny docelowe nie muszą być takie same. Strefa zależna rozpoczyna w późniejszym z terminów: własnym przewidywanym początku lub początku przygotowania tego bloku termostatu nadrzędnego:

| Własny początek strefy | Początek nadrzędnego | Cel strefy | Efektywny początek |
| --- | --- | --- | --- |
| 17:40 | 17:55 | 18:45 | 17:55 |
| 18:10 | 17:55 | 18:45 | 18:10 |
| 17:40 | Bez wcześniejszego przygotowania | 18:45 | Zwykły blok o 18:45 |
| 17:40 | 19:00 | 18:45 | Zwykły blok o 18:45 |

Jeśli wybrany blok nadrzędny nie może przygotować się wcześniej, Velair nie zastępuje go innym. Przygotowanie ogrzewania nie może zwolnić przygotowania chłodzenia i odwrotnie. Nadal obowiązują pauzy, nadpisania, kontrole dostępności i limity maksymalnego wyprzedzenia. Niedostępny lub wyłączony termostat nadrzędny pozostaje skonfigurowany; zależna strefa nie staje się automatycznie niezależna.

**Minimalny start (min)** nadal wyklucza zbyt krótkie niezależne prognozy. Czekanie na nadrzędny, podobnie jak późne dostarczenie polecenia, może pozostawić krótsze rzeczywiste okno. Uczenie wykorzystuje pozostały czas, nie wymyśla wcześniejszego początku ani nie przesuwa zaplanowanego celu.

Wyświetlany początek jest prognozą. Przy wykonaniu odpowiadające polecenie przygotowania nadrzędnego musi zostać przyjęte, zanim zależna strefa będzie mogła rozpocząć. Nie potwierdza to stanu przekaźnika kotła, przepływu wody ani rzeczywistego ogrzewania/chłodzenia. Velair nie podnosi temperatury nadrzędnego, aby zgłaszać zapotrzebowanie na ciepło dla innych stref. Zwykły blok nadal rozpoczyna się o własnej godzinie.

Uczenie rozpoczyna się, gdy zależna strefa rzeczywiście zaczyna ograniczone przygotowanie, z użyciem temperatury w tej chwili i czasu pozostałego do jej bloku. Wcześniejsze osiągnięcie celu oraz częściowe i nieprawidłowe obserwacje zachowują dotychczasowe reguły. Późniejsze zakończenie przygotowania nadrzędnego nie zatrzymuje przygotowania już trwającego w zależnej strefie. Łączenie i rozłączanie nie usuwa zapisanych próbek.

Otwórz **Szczegóły obliczeń**, aby sprawdzić niezależny szacunek, wybrany termostat nadrzędny i efektywny początek. Diagnostyka podaje powód zależności obok informacji o przygotowaniu i uczeniu. Zapisane odwołania do rozpoczętych poleceń zapewniają ciągłość działania po restarcie; przerwana obserwacja uczenia nie jest wznawiana, a te techniczne odwołania nie trafiają do przenośnych eksportów.

<a id="understanding-learning-activity"></a>
## Jak rozumieć aktywność uczenia

Każdy obsługiwany kierunek może pokazać krótkie wyjaśnienie przy dotychczasowych informacjach o uczeniu: Velair obserwuje zmianę, czeka na odpowiednią zmianę albo nie może obserwować z określonego powodu. Opisuje to uczenie, a nie potwierdzenie fizycznego ogrzewania lub chłodzenia. Poprzednia zmiana ma wyraźną datę i godzinę i nie jest przedstawiana jako bieżąca aktywność.

Działanie **Diagnostyka** obok wyjaśnienia otwiera to urządzenie i jego historię Przygotowania wstępnego bez filtra dat ukrywającego wcześniejsze wpisy. Dotychczasowa sekcja funkcji pokazuje bieżącą aktywność i ostatnią zachowaną zmianę uczenia. Rozwiń szczegóły, aby sprawdzić dostępne temperatury, ustawione progi i czasy użyte w decyzji. Zobacz [Dane uczenia](diagnostics.pl.md#learning-evidence).

Niezmienna liczba próbek nie dowodzi awarii. Zmiana może nie dawać użytecznej różnicy temperatur, obserwacja może nadal trwać, a wynik może być częściowy lub nieprawidłowy. Wyjaśnienia korzystają tylko z zapisanych danych; nie wnioskują o pracy kotła ani wspólnym zasilaniu ciepłem. Stan uczenia i prognoza następnego bloku pozostają oddzielne: strefa z niewielką historią może mimo to nie potrzebować wcześniejszego startu dla danego celu.

<a id="how-it-starts"></a>
## Jak rozpoczyna się przygotowanie

Velair oblicza bieżącą różnicę temperatury dla następnego zaplanowanego bloku z temperaturą.

Dla zakresu `heat_cool` „temperatura docelowa” poniżej oznacza dolną granicę podczas ogrzewania i górną podczas chłodzenia. Dla stałego zakresu `heat` lub `cool` oznacza wybraną granicę odniesienia, z kierunkiem określonym przez stały tryb.

Dla ogrzewania:

```text
delta = target temperature - current temperature
```

Dla chłodzenia:

```text
delta = current temperature - target temperature
```

Jeśli różnica jest mniejsza od minimalnej różnicy temperatury, Velair zachowuje zwykły czas bloku i nie rozpoczyna wcześniej.

<a id="schedule-boundaries-and-other-climates"></a>

## Granice harmonogramu i inne urządzenia

Wcześniejszy start w harmonogramie tygodniowym nie może sięgać ani przekraczać bezpośrednio poprzedzającego efektywnego bloku harmonogramu tego samego urządzenia, także bloku `Off`. Jeśli obliczone okno sięga tej granicy lub ją przekracza, Velair zachowuje zwykły czas komfortu. Na przykład przy `Off` o `19:00` i `heat` o `20:00` obliczony start o `18:00` zostaje pominięty: `Off` jest stosowane o `19:00`, a ogrzewanie rozpoczyna się o `20:00`. Blok `Off` o `22:00` poprzedniego wieczoru nie uniemożliwia startu o `05:35` dla `07:00`, jeśli pomiędzy nimi nie ma innego bloku. Reguła dotyczy też chłodzenia i natywnych zakresów `heat_cool`; nie zmienia przewidywań przyjazdu dla planowanego powrotu.

Urządzenie, które już wstępnie ogrzewa lub chłodzi pomieszczenie, nie opóźnia bloków ani wcześniejszych startów innych urządzeń. Jeśli podczas przetwarzania działania zostanie przekroczony czas innego przejścia, Velair ustala aktualnie dozwolony cel dla danego urządzenia zamiast odtwarzać nieaktualne polecenia. Pauzy, podbicia, regulacja ręczna, wyłączone strefy i zewnętrzne wykonywanie harmonogramu nadal określają, czy cel można wysłać. To odzyskiwanie działa podczas pracy harmonogramu; skonfigurowane stosowanie ustawień przy uruchomieniu pozostaje bez zmian.

<a id="initial-model-example"></a>
## Przykład modelu początkowego

Gdy lokalna historia jest niewystarczająca, Velair używa modelu początkowego:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Przykład:

- zaplanowany blok: `21 °C`, `heat`, czas docelowy `07:00`;
- temperatura pomieszczenia: `18 °C`;
- minimalne wyprzedzenie: `10 min`;
- model początkowy: `25 min/°C` lub równoważne `13.89 min/°F`;
- maksymalne wyprzedzenie: `24 h`.

Obliczenie:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair stosuje zaplanowaną temperaturę o `05:35` i zachowuje `07:00` jako widoczny czas docelowego komfortu.

<a id="heating-with-learned-history"></a>
## Ogrzewanie z wykorzystaniem historii uczenia

Po zebraniu dostatecznej liczby udanych obserwacji Velair może używać podobnej lokalnej historii zamiast modelu początkowego.

Przykład:

- zaplanowany blok: `21 °C`, `heat`, czas docelowy `07:00`;
- bieżąca temperatura pomieszczenia: `18.5 °C`;
- bieżąca różnica: `2.5 °C`;
- podobne zakończone obserwacje:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Przy percentylu komfortu ustawionym na `80` Velair wybiera ostrożną wartość z podobnych zakończonych próbek. W tym przykładzie jest to `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair zaokrągla końcowe wyprzedzenie w górę do następnej obsługiwanej minuty harmonogramu, zamiast poniżej obliczonej wartości.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Przykład chłodzenia

Przykład:

- zaplanowany blok: `23 °C`, `cool`, czas docelowy `22:00`;
- temperatura pomieszczenia: `27 °C`;
- minimalne wyprzedzenie: `10 min`;
- model początkowy: `25 min/°C`;
- maksymalne wyprzedzenie: `24 h`.

Obliczenie:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Gdy encja zbierze później dostatecznie dużo obserwacji chłodzenia, Velair użyje wyłącznie historii chłodzenia. Nie miesza jej z ogrzewaniem, ponieważ to samo pomieszczenie i urządzenie mogą ogrzewać i chłodzić z różną szybkością.

<a id="partial-and-invalid-observations"></a>
## Obserwacje częściowe i nieprawidłowe

Po próbach przygotowania Velair zapisuje zwięzłe lokalne obserwacje.

Zakończone obserwacje są użytecznymi przykładami osiągnięcia progu temperatury docelowej na czas.

Częściowe obserwacje oznaczają, że Velair rozpoczął wcześniej, ale pomieszczenie nie osiągnęło progu do zaplanowanej chwili komfortu. Stanowią dolne ograniczenia: Velair wie, że potrzebne było więcej czasu, ale nie wymyśla fikcyjnego czasu zakończenia.

Nieprawidłowe obserwacje służą wyłącznie diagnostyce i nie wpływają na model. Przykłady to znikome różnice, niemożliwe czasy, przerwane sesje, brakujące temperatury, wzmocnienia, pauzy i zmiany stanu harmonogramu.

Jeśli po starszych częściowych obserwacjach pojawi się dostatecznie wiele zakończonych obserwacji potwierdzających niezawodne osiąganie celu, starsze częściowe obserwacje przestają zwiększać prognozę.

<a id="outdoor-temperature-sensor"></a>
## Czujnik temperatury zewnętrznej

Czujnik temperatury zewnętrznej jest opcjonalny.

Jeśli go skonfigurujesz, Velair zapisuje jego wartość jako lokalny kontekst obserwacji, a następnie porównuje bieżące warunki z podobnymi wcześniejszymi obserwacjami. Nie wywołuje usług pogodowych, nie wymaga internetu i nie dodaje stałej poprawki do modelu początkowego.

Jeśli czujnik jest niedostępny podczas zapisu próbki, Velair po prostu zapisuje obserwację bez tego kontekstu.

<a id="room-assist-interaction"></a>
## Współpraca z Room Assist

Domyślnie adaptacyjne przygotowanie korzysta z `current_temperature` encji klimatu.

Jeśli dla encji włączono wspomaganie czujnikiem pokojowym i wybrano czujnik, funkcja używa go jako efektywnej temperatury pomieszczenia przy podejmowaniu decyzji i uczeniu.

Podczas przygotowania Room Assist najpierw oblicza zwykły prawidłowy cel bazowy, a następnie dodawane jest tymczasowe przesunięcie. Przykładowo nominalny cel ogrzewania `21 °C`, baza Room Assist `22 °C` i przesunięcie ogrzewania `2 °C` wysyłają `24 °C`, jeśli urządzenie na to pozwala. Room Assist nigdy nie używa tego tymczasowego polecenia jako celu uczenia pokoju. Dodatnio ustawione przesunięcie tymczasowo utrzymuje kierunek przygotowania, nawet gdy Room Assist odziedziczył fazę histerezy bez zapotrzebowania. Po osiągnięciu pierwotnego progu przygotowania znów obowiązują zwykła histereza i wybrany poziom hamowania. To pierwszeństwo działa również przy ograniczeniu efektywnego dodatku do zera przez fizyczne limity; ustawienie zera zachowuje dotychczasowe działanie.

To przydatne przy głowicach TRV lub termostatach, których wbudowany czujnik jest zbyt blisko grzejnika, nawiewu lub innego lokalnego źródła ciepła. Zachowanie po stronie urządzenia opisuje [Room Assist](room-assist.pl.md).

<a id="automation-events"></a>
## Zdarzenia automatyzacji

Velair używa trzech zdarzeń `velair_event` w tym cyklu:

- `preconditioning_plan_updated`, gdy obliczony plan pojawia się lub zmienia;
- `preconditioning_plan_cancelled`, gdy opublikowany plan przestaje obowiązywać;
- `preconditioning_observation_recorded` po zapisaniu próbki uczenia.

Dokładne reguły emisji i pełne przykłady danych opisano w [Zdarzeniach automatyzacji](automation-events.pl.md#preconditioning-plan-updated).

Przykładowy wyzwalacz automatyzacji:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Kiedy Velair nie podejmuje działania

Adaptacyjne przygotowanie nie rozpoczyna wcześniej, gdy:

- jest wyłączone dla danej encji;
- harmonogram nie działa w trybie automatycznym;
- strefa jest wstrzymana lub ma aktywne wzmocnienie;
- następny blok to `Wyłączony`;
- encja nie obsługuje wymaganego kierunku ogrzewania lub chłodzenia;
- różnica temperatur jest mniejsza od minimalnej;
- wymagana temperatura jest niedostępna lub nieliczbowa.

<a id="lovelace"></a>
## Lovelace

Widok przygotowania temperatury jest dostępny jako karta Lovelace:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

Karta korzysta z tej samej konfiguracji backendu co główny panel Velair.

<a id="technical-details"></a>
## Szczegóły techniczne

Szczegóły dla deweloperów dotyczące zapisu, algorytmu uczenia, obsługi częściowych obserwacji, wag podobieństwa i wyników API opisano w [Mechanizmie adaptacyjnego przygotowania temperatury](../developer/adaptive-preconditioning.md).
