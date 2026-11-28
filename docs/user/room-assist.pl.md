<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.3-beta.5 |
| Ostatnia synchronizacja | 2026-11-25 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zmiany oczekujące na uwzględnienie |

</details>

> Oryginał został zmieniony; to tłumaczenie może być nieaktualne. [Oryginał w języku angielskim](room-assist.md)

---
<!-- velair-docs:end -->

Room Assist pozwala korzystać z osobnego czujnika temperatury w pomieszczeniu dla jednej zarządzanej encji klimatu, nadal sterując rzeczywistą encją `climate.*`.

Przydaje się to w przypadku głowic termostatycznych, zaworów grzejnikowych, termostatów ściennych i klimatyzatorów, których wbudowany czujnik nie odzwierciedla temperatury pomieszczenia. Głowica przy grzejniku może na przykład wskazywać `22 °C`, gdy czujnik w pokoju nadal wskazuje `20.5 °C`.

Obliczenia korzystają z natywnej jednostki zarządzanej encji w Home Assistant. Poniższe przykłady podano w stopniach Celsjusza, ale granice histerezy, korekta ze znakiem, ochrona temperatury z harmonogramu, szerokość zakresu, krok temperatury i ograniczenia urządzenia działają tak samo w stopniach Fahrenheita. Różnica `4 °F` oznacza korektę o `4 °F`; nie jest traktowana jako temperatura bezwzględna ani przeliczana z dodaniem przesunięcia między skalami.

Room Assist działa lokalnie i reaguje na zdarzenia. Velair nie odpytuje czujników w sposób ciągły ani nie wysyła ich danych poza Home Assistant.

W bloku **Tylko temperatura** Room Assist jest wstrzymany, gdy termostat jest wyłączony. Nie włącza urządzenia ani nie przywraca wcześniejszego trybu HVAC podczas usuwania poprzedniej korekty. Po zewnętrznym włączeniu może wspomagać pracę w rzeczywistym zgodnym trybie bez żądania jego zmiany. Aktualizacja temperatury docelowej przy wyłączonym urządzeniu nadal zależy od integracji.

<a id="what-it-does"></a>
## Jak działa

Temperatura z harmonogramu pozostaje rzeczywistą temperaturą docelową użytkownika. Velair tymczasowo koryguje wartość wysyłaną do urządzenia na podstawie czujnika pokojowego i odczytu samego urządzenia.

Dla pojedynczej temperatury w stałym trybie `heat` lub `cool` niezerowa strefa nieczułości wyznacza dwie granice przełączania. Przy hamowaniu **Domyślne** Room Assist pamięta, do której granicy zmierza, i zmienia kierunek dopiero po osiągnięciu przeciwnej granicy przez czujnik pokojowy. Tworzy to cykl histerezy oparty na osobnym czujniku, zamiast pozwalać czujnikowi wewnętrznemu rozpoczynać nowy cykl przy środkowej temperaturze docelowej. Maksymalna różnica wspomagania ogranicza korektę ze znakiem obliczoną względem aktywnej granicy. Opcjonalne poziomy hamowania mocniej ograniczają zapotrzebowanie; **Silne** rozpoczyna ograniczanie przy zaplanowanej temperaturze zamiast na dalszej granicy przełączania.

Pojedyncze temperatury w trybach `auto` i `heat_cool` oraz natywne zakresy `heat_cool` zachowują działanie neutralne lub margines wokół zakresu. Velair nie wymusza w tych trybach naprzemiennego ogrzewania i chłodzenia według cyklu histerezy dla pojedynczej temperatury.

Encja klimatu nadal odpowiada za wykonanie polecenia. Velair nie tworzy wirtualnego termostatu ani nie omija oprogramowania urządzenia. Jeśli termostat lub głowica pozwala bezpośrednio powiązać osobny czujnik pokojowy, zwykle warto najpierw skorzystać z tej możliwości.

Dla dwóch wartości w stałym `heat` lub `cool` wybierz najpierw **Wartość zadana odniesienia** dla urządzenia i trybu w **Ustawienia → Urządzenia klimatyczne i grupy**: **Dolna wartość zadana** lub **Górna wartość zadana**, zgodnie z rzeczywistym użyciem przez urządzenie. Velair nie wnioskuje tego z samej obsługi zakresu. Adaptacyjne przygotowanie współdzieli wybór.

Room Assist używa wybranej granicy jako stałego celu ogrzewania lub chłodzenia, wraz z cyklem histerezy pojedynczego celu i ochroną celu harmonogramu. Przesuwa obie granice o tę samą wartość, zachowując odstęp. Obie muszą pasować do kroku i fizycznych limitów urządzenia, więc druga granica może ograniczyć korektę. Informacje o fizycznych limitach pozostają dostępne na wykresie i w sekcji **Dane techniczne**.

Przy **Nie skonfigurowano** pary stałego trybu są wysyłane bez zmian i bez korekty Room Assist. Zakresy `auto` nadal nie są obsługiwane; natywne pasma `heat_cool` zachowują działanie. Zapisane ustawienia pozostają. Zmiana odniesienia lub trybu usuwa nieaktualne wspomaganie bez przywracania starego skorygowanego celu na nowy zamiar.

<a id="setup"></a>
## Konfiguracja

1. Otwórz kartę Room Assist.
2. Rozwiń urządzenie, które chcesz skonfigurować.
3. W sekcji **Asystent czujnika pokojowego** wybierz **Stały czujnik** lub **Według harmonogramu**, skonfiguruj wybraną opcję i zapisz zmianę sposobu działania.
4. Włącz **Asystent czujnika pokojowego**.
5. Ustaw strefę nieczułości Room Assist dla stałego ogrzewania lub chłodzenia wokół pojedynczego celu lub wybranego odniesienia zakresu; dla automatycznych pojedynczych celów i natywnych pasm `heat_cool` określa ona neutralny margines.
6. Zwiększ ustawienie **Maksymalna delta wspomagania**, jeśli domyślna wartość jest za mała dla pomieszczenia lub dla różnicy temperatur, której termostat potrzebuje do zatrzymania ogrzewania albo chłodzenia.
7. Opcjonalnie wybierz **Hamowanie: Umiarkowane** lub **Silne**, aby mocniej ograniczać zapotrzebowanie. Te poziomy wymagają strefy nieczułości Room Assist większej od zera. **Domyślne** zachowuje dotychczasowe działanie.
8. Opcjonalnie ustaw **Minimalny margines sterowania**, jeśli małe korekty nie powodują reakcji termostatu. W razie potrzeby najpierw zwiększ Maksymalną deltę wspomagania; margines nie może jej przekraczać. Pozostaw `0`, aby zachować dotychczasowe działanie.
9. Dostosuj opóźnienie odświeżania, jeśli odczyty są uwzględniane zbyt wolno lub zbyt często.

Samo wybranie czujnika zapisuje jedynie jego przypisanie. Velair zaczyna używać go jako źródła rzeczywistej temperatury pomieszczenia dopiero po włączeniu wspomagania.

Wspomaganie nie wymaga adaptacyjnego przygotowania temperatury. Działa zarówno dla zwykłych bloków harmonogramu, jak i bloków uruchomionych wcześniej przez tę funkcję.

Blok temperatury z opcją **Zachowaj bieżący tryb** nadal stosuje temperaturę z harmonogramu. Room Assist korzysta z trybu, w którym urządzenie faktycznie pracuje; jeśli jest wyłączone, Velair uruchamia obsługiwany, zgodny tryb. Ta opcja nie oznacza pozostawienia dotychczasowej temperatury termostatu. Blok zawierający wyłącznie opcje nie ma temperatury docelowej, więc Room Assist dla niego nie działa.

Opóźnienie odświeżania grupuje zmiany odczytów czujnika pokojowego lub urządzenia. Domyślnie wynosi `20` sekund. Wartość `0` oznacza natychmiastowe przeliczenie; można ustawić do `300` sekund, aby grupować częste aktualizacje.

Strefa nieczułości jest niezależna od minimalnej różnicy adaptacyjnego przygotowania. Domyślnie wynosi `0.3 °C` lub `1 °F`. Wartość `0` ją wyłącza; regulacja odbywa się co `0.1` stopnia, do `5 °C` lub `9 °F`. Zapisanie ustawienia podczas działania Room Assist natychmiast odświeża korygowaną temperaturę.

Wykres na żywo pokazuje nominalną strefę nieczułości jako cienki kreskowany pasek tuż nad osią temperatury z odpowiednią legendą poniżej. Efektywne progi zatrzymania i wznowienia pochodzą z zatwierdzonego stanu regulacji, więc **Silne** może zatrzymać zapotrzebowanie przy celu, choć cały nominalny pasek pozostaje widoczny. W trybach automatycznych z pojedynczą temperaturą pasek oznacza margines neutralny. Natywne zakresy `heat_cool` kreskują jedynie zewnętrzne marginesy obok nominalnego pasa, z legendą **Margines zewnętrzny**. Zerowa strefa nieczułości nie rysuje kreskowania; legenda pokazuje ustawiony zerowy margines. Te wskaźniki opisują skonfigurowane granice, a nie ruch odczytów. Ukrycie `show_room_assist_deadband` w karcie Lovelace Room Assist ukrywa razem ustawienie, pasek i legendę.

Wyświetlana jest tylko wybrana opcja. Gdy **Stały czujnik** jest już zapisanym sposobem działania, zmiana jego czujnika zapisuje się natychmiast. Przełączanie między **Stały czujnik** a **Według harmonogramu** zmienia wersję roboczą: **Zapisz** stosuje wybór i jego ustawienia, a **Anuluj** przywraca zapisaną konfigurację. Przy przełączaniu zachowywane są stały czujnik i zapisany harmonogram; obie opcje nie są aktywne jednocześnie.


<a id="optional-braking"></a>

### Opcjonalne hamowanie

Hamowanie zmienia nastawę wysyłaną do urządzenia, zachowując zaplanowaną temperaturę jako rzeczywisty cel dla pomieszczenia. Jest dostępne w stałych trybach **Ogrzewanie** i **Chłodzenie**, również dla urządzeń z dwiema nastawami i skonfigurowaną nastawą odniesienia. Nie zmienia automatycznych trybów z jedną nastawą ani natywnych pasm `heat_cool`.

**T** oznacza zaplanowaną temperaturę, **H** strefę nieczułości Room Assist, a **S** efektywny krok nastawy urządzenia:

| Hamowanie | Ogrzewanie: ograniczenie zapotrzebowania | Ogrzewanie: ponowne żądanie ciepła | Chłodzenie: ograniczenie zapotrzebowania | Chłodzenie: ponowne żądanie chłodu |
| --- | --- | --- | --- | --- |
| Domyślne | Dotychczasowe działanie | Dotychczasowe działanie | Dotychczasowe działanie | Dotychczasowe działanie |
| Umiarkowane | Przy T + H | Przy T − H | Przy T − H | Przy T + H |
| Silne | Przy T | Przy T − H | Przy T | Przy T + H |

Podczas ograniczania zapotrzebowania **Umiarkowane** ogranicza nastawę ogrzewania do najwyżej **T − S**, a chłodzenia do co najmniej **T + S**. **Silne** domyślnie wykorzystuje **dwa kroki**. Jeżeli dotychczasowe obliczenie ogranicza zapotrzebowanie jeszcze bardziej, Velair zachowuje ten silniejszy wynik. Są to stałe ograniczenia podczas aktywnego hamowania: każda aktualizacja czujnika nie dodaje ani nie odejmuje kolejnego kroku.

Aby zmienić siłę hamowania Silne dla jednej strefy, otwórz **Ustawienia → Urządzenia klimatyczne i grupy** i ustaw **Kroki silnego hamowania** dla danego urządzenia lub grupy. Ustawienie przyjmuje liczby całkowite od `2` do `10` i pokazuje odpowiadającą im różnicę temperatury, obliczoną z efektywnego kroku nastawy urządzenia w jego bieżącej jednostce. Wartość jest zapisywana niezależnie dla każdej strefy i działa tylko po wybraniu **Silne** w Room Assist. **Domyślne** i **Umiarkowane** nie korzystają z tego ustawienia.

Na przykład `3` kroki po `0.5 °C` odpowiadają różnicy `1.5 °C`. Trzy kroki po `1 °F` odpowiadają różnicy `3 °F`. Liczba kroków nie jest temperaturą i nie zmienia się przy przeliczaniu między Celsjuszem a Fahrenheitem; odpowiednia różnica zależy od efektywnego kroku urządzenia. Room Assist zachowuje dotychczasowy selektor i wyświetla skonfigurowaną liczbę oraz odpowiadającą jej różnicę.

Przykład dla temperatury ogrzewania `20.5 °C`, strefy nieczułości `0.5 °C` i kroku urządzenia `0.5 °C`:

- **Umiarkowane** ogranicza zapotrzebowanie przy `21 °C`, przy nastawie urządzenia nie wyższej niż `20 °C`.
- **Silne** z domyślnymi dwoma krokami ogranicza je przy `20.5 °C`, przy nastawie nie wyższej niż `19.5 °C`.
- Po ustawieniu **Kroki silnego hamowania** na `3` poziom Silne nadal ogranicza zapotrzebowanie przy `20.5 °C`, ale nastawa urządzenia nie przekracza `19 °C`.
- Oba poziomy ponownie żądają ciepła, gdy zewnętrzny czujnik osiągnie `20 °C`.

Zmiana liczby kroków hamowania Silne zmienia limit nastawy, a nie temperaturę ograniczenia lub wznowienia zapotrzebowania. W chłodzeniu odpowiedni limit znajduje się powyżej zaplanowanej temperatury docelowej zamiast poniżej niej. Jest to stała korekta; nie narasta stopniowo, gdy temperatura pomieszczenia pozostaje poza pasmem.

Przed ograniczeniem zapotrzebowania dotychczasowe obliczanie wspomagania nie zmienia się. Hamowanie trwa do osiągnięcia granicy ponownej aktywacji, również po przekroczeniu centralnej temperatury. Jeśli wspomaganie startuje lub uruchamia się ponownie, gdy temperatura jest już w paśmie, zachowuje dotychczasową ostrożną inicjalizację bez celowego rozpoczynania cyklu ogrzewania lub chłodzenia.

Stan na żywo pokazuje efektywne temperatury ograniczenia i ponownej aktywacji. Wykres zachowuje nominalną strefę nieczułości i odróżnia efektywne progi hamowania. Zapotrzebowanie wspólnego źródła podąża za tą samą zatwierdzoną fazą.

Wybierz **Domyślne** przed ustawieniem strefy nieczułości na zero. Zapisany poziom pozostaje zachowany, jeśli aktualny tryb lub źródło temperatury nie pozwala go użyć; stan wyjaśnia brak dodatkowego hamowania. Nieprawidłowe zapisane kombinacje wstrzymują dodatkowe hamowanie zamiast po cichu zmieniać strefę nieczułości.

Fizyczna minimalna i maksymalna nastawa mogą ograniczyć dostępne hamowanie. Przy dwóch nastawach przesuwana jest cała para, a każda granica może ograniczyć przesunięcie. Sekcja **Dane techniczne** rozróżnia wynik żądany i zastosowany, a wykres oznacza osiągnięty limit.

Hamowanie zmniejsza żądanie ogrzewania lub chłodzenia; nie potwierdza zatrzymania zaworu, sprężarki ani termostatu. Sterowanie urządzeniem, minimalne czasy pracy i bezwładność cieplna nadal mogą powodować przekroczenie temperatury. Ta opcja nie uczy się cykli ani nie ogranicza zapotrzebowania przed zaplanowaną temperaturą. Sprawdź ją w rzeczywistych cyklach, zanim zaczniesz polegać na danym poziomie w konkretnym pomieszczeniu.

Przenośne eksporty używają modelu **30**, aby zachować liczbę kroków silnego hamowania, poziom hamowania, przesunięcia przygotowania i minimalny margines sterowania. Starsze obsługiwane importy bez liczby kroków silnego hamowania używają wartości `2`. Zachowaj kopię z poprzedniej wersji, jeśli potrzebujesz możliwości powrotu; starsze wersje Velair nie importują modelu 30.

<a id="minimum-control-margin"></a>
### Minimalny margines sterowania

Niektóre termostaty reagują dopiero przy znacznej różnicy między odczytem
wewnętrznym a żądaną nastawą. Czujnik zamontowany przy grzejniku może wskazywać
temperaturę o kilka stopni wyższą niż w pomieszczeniu, gdy zewnętrzny czujnik
pokojowy nadal zgłasza zapotrzebowanie na ciepło. **Minimalny margines sterowania**
żąda co najmniej takiej różnicy podczas odpowiedniej korekty Room Assist.
Jest opcjonalny, a wartość domyślna wynosi `0`.

Te ustawienia mają różne zadania:

| Ustawienie | Zadanie |
| --- | --- |
| Strefa nieczułości Room Assist | Określa granice przełączania lub strefę neutralną dla zewnętrznego czujnika pokojowego. |
| Minimalny margines sterowania | Wzmacnia odpowiednią korektę względem wewnętrznego odczytu termostatu. |
| Maksymalna delta wspomagania | Ogranicza tę korektę; samo zwiększenie maksimum nie żąda większej korekty. |
| Hamowanie | Zmienia progi wycofania zapotrzebowania i dodaje ochronę zaplanowanej temperatury docelowej. |

Margines przyjmuje wartości `0–10 °C` (`0–18 °F`) i nie może przekraczać
Maksymalnej delty wspomagania. Przy sprzecznych ustawieniach Velair prosi
o zwiększenie najpierw maksimum albo zmniejszenie marginesu. Nie zmienia żadnej
z wartości automatycznie. Przyrosty pola odpowiadają efektywnemu krokowi
nastawy urządzenia.

Przykład: ustaw ogrzewanie na `19.5 °C`, strefę nieczułości `±0.3 °C`,
hamowanie **Domyślne**, a margines i maksimum na `10 °C`. Przy odczycie
wewnętrznym `21.5 °C` i zgodnym kroku nastawy `0.5 °C`:

| Zewnętrzny czujnik pokojowy | Faza Room Assist | Żądana nastawa urządzenia |
| --- | --- | --- |
| `19.2 °C` lub mniej | Żądanie ciepła w kierunku `19.8 °C` | `31.5 °C`: odczyt wewnętrzny + 10 |
| Wzrost wewnątrz strefy | Dalsze żądanie ciepła | Bieżący odczyt wewnętrzny + 10 |
| Osiąga `19.8 °C` | Wycofanie ciepła do `19.2 °C` | `11.5 °C`: odczyt wewnętrzny − 10 |

Odczyt wewnętrzny może się zmieniać, więc kolejne żądania używają jego bieżącej
wartości. Cel dla pomieszczenia pozostaje równy `19.5 °C`; duże różnice nastaw
urządzenia nie poszerzają strefy komfortu. Hamowanie Umiarkowane lub Silne
zachowuje własne progi zatrzymania i wznowienia oraz istniejący wynik, który
silniej wycofuje zapotrzebowanie.

Stałe chłodzenie działa odwrotnie. Dla celu `24 °C`, strefy nieczułości
`±0.3 °C`, odczytu wewnętrznego `26 °C` i marginesu/maksimum `10 °C`
Room Assist żąda `16 °C`, gdy potrzebne jest chłodzenie, i `36 °C`, gdy
pomieszczenie osiąga `23.7 °C`, przed zastosowaniem granic urządzenia.
Chłodzenie wznawia się przy `24.3 °C`. Przy zerowej strefie nieczułości i bez
zachowanej fazy wzmacniane są tylko niezerowe korekty; równość pozostaje neutralna.

Automatyczne tryby z jedną nastawą i natywne zakresy **Ogrzewanie/Chłodzenie**
wzmacniają tylko aktywne żądania ogrzewania lub chłodzenia. W neutralnej strefie
pomieszczenia zachowują dotychczasowe utrzymywanie temperatury. Mocne obniżenie nastawy,
aby zatrzymać ogrzewanie, mogłoby uruchomić chłodzenie w urządzeniu
dwukierunkowym. W natywnych zakresach obie granice przesuwają się razem,
zachowując pierwotną odległość. Pary w stałym trybie używają skonfigurowanej
nastawy odniesienia; nieobsługiwane konfiguracje zakresów pozostają nieobsługiwane.

Krok i fizyczne granice urządzenia mogą uniemożliwić uzyskanie żądanego marginesu.
Na przykład przy odczycie wewnętrznym `21.7 °C`, marginesie/maksimum `10 °C`
i siatce `0.5 °C` nie istnieje punkt oddalony dokładnie o `10 °C`. Velair
wybiera prawidłową korektę w granicach maksimum, gdy jest to możliwe,
i informuje, że krok ogranicza margines. Przy dwóch nastawach zachowanie
szerokości zakresu może dodatkowo ograniczyć przesunięcie. Objaśnienie na żywo
i **Dane techniczne** wskazują margines aktywny lub ograniczony.

Ochrona zaplanowanej temperatury, hamowanie i tymczasowe przesunięcia
przygotowania mogą dać końcowe przesunięcie większe niż Maksymalna delta
wspomagania. To ustawienie ogranicza korektę Room Assist, a nie każdą późniejszą
ochronę lub tymczasowy dodatek. Podczas przygotowania margines podąża za jego
bieżącym kierunkiem, zanim zostanie dodany tymczasowy dodatek.

Ta funkcja żąda różnicy nastawy. Nie potwierdza fizycznego otwarcia zaworu,
pracy sprężarki ani natychmiastowego zatrzymania. Użyj najmniejszego marginesu,
który działa z Twoim urządzeniem, i sprawdź pełne rzeczywiste cykle ogrzewania
lub chłodzenia.

<a id="optional-sensor-schedule-beta"></a>

### Opcjonalny harmonogram czujników (beta)

Room Assist może używać różnych źródeł temperatury w ciągu tygodnia bez zmiany harmonogramów temperatury, profili ani trybów. Aby je skonfigurować, wybierz **Według harmonogramu** w sekcji **Asystent czujnika pokojowego**. Wybierz **Stały czujnik**, aby wrócić do stałego czujnika pokojowego.

Wybierz domyślne źródło odniesienia i dodaj przedziały z dniami tygodnia, godzinami początku i końca oraz źródłem odniesienia. Zapisz cały szkic, aby go zastosować; Anuluj odrzuca zmiany. Źródłami mogą być czujniki temperatury dostępne w Home Assistant albo własna temperatura urządzenia klimatyzacyjnego. Poza przedziałami obowiązuje domyślne źródło. Przedziały mogą przechodzić przez północ i są przypisane do wybranych dni rozpoczęcia; nakładające się przedziały są odrzucane. Godzina początku jest włączona, a końca wyłączona. Obowiązuje strefa czasowa skonfigurowana w Home Assistant.

Na przykład wybierz **Bez korekty Room Assist** jako źródło domyślne i czujnik w gabinecie od 08:00 do 17:00 od poniedziałku do piątku. Istniejące letnie/zimowe harmonogramy temperatury nadal określają żądaną temperaturę. W godzinach pracy Room Assist oblicza korekcje na podstawie czujnika w gabinecie. Poza nimi Velair wysyła zwykłą zaplanowaną nastawę, a termostat reguluje na podstawie własnego źródła odniesienia. Nie zmienia to fizycznego czujnika używanego wewnętrznie przez oprogramowanie urządzenia.

Jedyny przełącznik Room Assist decyduje o włączeniu wspomagania. Wyłączenie go zachowuje obie zapisane konfiguracje. Wybranie **Stały czujnik** i zapisanie przywraca zachowany stały czujnik pokojowy. Jeżeli źródło zewnętrzne jest niedostępne, Velair wstrzymuje korekcję i używa zwykłej zaplanowanej nastawy, gdy sprawuje automatyczne sterowanie; nie wybiera po cichu innego pomieszczenia ani nie używa ponownie starego odczytu. Wspomaganie jest wznawiane, gdy to źródło znów nadaje się do użycia.

Zmiany źródła odniesienia nie odbierają sterowania regulacji ręcznej, funkcji Boost ani pauzom. Po wznowieniu sterowania automatycznego Velair używa źródła obowiązującego w danej chwili. W grupach pomieszczeń własna temperatura urządzenia oznacza skonfigurowane źródło temperatury odniesienia grupy.

**Ograniczenie wersji beta:** źródło odniesienia zmienia się dokładnie o zaplanowanej godzinie. Adaptacyjne przygotowanie wstępne nie uruchamia wcześniejszego celu obejmującego zmianę źródła odniesienia; po tej zmianie wykonuje obliczenia ponownie. Przełączenie pomieszczenia nie jest żądaniem wcześniejszego przygotowania następnego pokoju. Obserwacje uczenia są dopasowywane do źródła temperatury, aby skok odczytu między pomieszczeniami nie był interpretowany jako ogrzewanie lub chłodzenie.

Wszystkie wybrane odczyty zewnętrzne muszą być dostępne niezależnie w Home Assistant. W przypadku Nest konfiguracja wykorzystująca oficjalną integrację termostatu i inną integrację zdalnego czujnika wymaga sprawdzenia w instalacji. Utrzymuj stałe własne źródło odniesienia Nest, jeśli odczyt termostatu ma być stabilnym odniesieniem dla pomieszczenia. Velair nie wybiera wewnętrznego aktywnego czujnika Nest. Wspólny system HVAC nadal oddziałuje na wszystkie obsługiwane pomieszczenia; wybór źródła odniesienia nie tworzy niezależnych stref fizycznych.

<a id="room-groups"></a>
### Grupy pomieszczeń

Wybierz grupę w Room Assist i używaj tego samego wyboru czujnika, włącznika, strefy nieczułości, maksymalnej korekty i odświeżania. Własna temperatura grupy pochodzi z urządzenia wybranego w **Grupy pomieszczeń → Odniesienie temperatury**; opcjonalny zewnętrzny czujnik ustawia się tutaj. Wyłączenie lub usunięcie Room Assist przywraca efektywny pomiar tego urządzenia.

Grupa ma jedną wspólną konfigurację i korektę Room Assist, a nie niezależny regulator każdego urządzenia. Velair zachowuje zaplanowany cel pokoju i wysyła skorygowane polecenie według trybu grupy: domyślnie do wszystkich albo wybranego odbiorcy, gdy instalacja już przekazuje polecenia. Kontrole możliwości, kroków i granic nadal dotyczą rzeczywistych odbiorców. Urządzenia pozostają indywidualnie widoczne w przeglądzie.

<a id="understanding-the-live-status"></a>
## Znaczenie bieżącego stanu

Karta Room Assist informuje, co Velair może obecnie zrobić dla każdego urządzenia, bez potrzeby wyciągania wniosków z temperatury termostatu:

| Stan | Znaczenie |
| --- | --- |
| **Nie skonfigurowano** | Nie wybrano osobnego czujnika temperatury w pomieszczeniu. |
| **Wyłączony** | Czujnik zapisano, ale Room Assist jest wyłączone. |
| **Bezczynny** | Funkcja jest włączona, ale nie ma zgodnego aktywnego bloku temperatury lub danych do obliczeń. |
| **Gotowy** | Są wymagane odczyty i temperatura docelowa, ale korekta nie została jeszcze zastosowana. |
| **Wspomaganie** | Zastosowano tymczasową korektę temperatury lub przesunięcie zakresu. |
| **Utrzymywanie** | Room Assist utrzymuje neutralną temperaturę automatyczną, natywny zakres `heat_cool` lub temperaturę po bezpiecznej stronie dzięki ochronie harmonogramu. Cykl `heat` lub `cool` może zamiast tego nadal pokazywać **Wspomaganie** podczas przechodzenia przez strefę nieczułości. |
| **Zablokowany** | Pauza, Wzmocnienie, sterowanie ręczne lub inny stan harmonogramu ma pierwszeństwo. |
| **Niedostępny** | Nie można obecnie użyć urządzenia lub wymaganej możliwości ustawiania temperatury. Interfejs pokazuje przyczynę, jeśli jest znana. |

Podczas działania Room Assist przegląd pokazuje skrócony stan: zmierzanie do dolnej lub górnej granicy, aktywność, utrzymywanie albo ochronę harmonogramu, oraz wartości zaplanowane i zastosowane. Fizyczna temperatura minimalna lub maksymalna urządzenia różni się od ochrony harmonogramu: wykres oznacza osiągnięty limit fizyczny, **Dane techniczne** oddzielają wartość żądaną i zastosowaną, a Home Assistant otrzymuje jedno trwałe powiadomienie do czasu ustąpienia ograniczenia.

<a id="fixed-heating-hysteresis-example"></a>
## Przykład histerezy przy stałym ogrzewaniu

Przykład z hamowaniem **Domyślne**:

- Blok harmonogramu: `21 °C`, `heat`
- Strefa nieczułości: `±0.3 °C`
- Dolna granica: `20.7 °C`
- Górna granica: `21.3 °C`
- Maksymalna różnica wspomagania: `2 °C`
- Krok temperatury urządzenia: `0.1 °C`

Cykl przebiega następująco:

1. Oba czujniki wskazują `21.0 °C`. Nowy cykl ogrzewania wewnątrz pasa rozpoczyna się bezpiecznie **w kierunku dolnej granicy**.
2. Aktywna granica wynosi `20.7 °C`. Korektę oblicza się względem tej krawędzi, a nie środkowych `21 °C`:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Taka nastawa celowo ogranicza żądanie ogrzewania, z uwzględnieniem jego kroku i ograniczeń.
3. Przy `20.9 °C` faza pozostaje bez zmian. Samo przekroczenie środkowych `21 °C` nie powoduje żądania ogrzewania.
4. Gdy czujnik pokojowy osiągnie `20.7 °C`, Velair zmienia kierunek **ku górnej granicy** `21.3 °C`.
5. Jeśli pokój ma `20.7 °C`, a czujnik urządzenia `20.5 °C`, nowa korekta żąda ogrzewania:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Górna granica pozostaje celem także przy przechodzeniu przez `21.0 °C`. Przy `21.3 °C` Velair znów kieruje się ku `20.7 °C`, stosuje ujemną korektę i powtarza cykl.

Widoczna temperatura harmonogramu nadal wynosi `21 °C`. Tymczasowa temperatura jest jedynie wartością wysyłaną do termostatu. Korekta przekraczająca maksymalną różnicę wspomagania zostaje ograniczona przed dodaniem do bieżącego odczytu urządzenia.

Faza stałego trybu istnieje tylko podczas działania programu. Nowy blok, temperatura lub tryb HVAC, wyczyszczenie Room Assist albo przeładowanie Velair rozpoczyna nowy cykl. Cykl `heat` rozpoczęty wewnątrz pasa zmierza ku dolnej granicy, aby nie żądać od razu ogrzewania.

Gdy ochrona zmienia wynik, bieżący stan wyjaśnia obie wartości: obliczoną temperaturę i temperaturę faktycznie utrzymywaną. Przegląd pokazuje skrócony stan ochrony harmonogramu. Jest to normalne działanie ochronne, nie błąd termostatu, więc nie tworzy trwałego powiadomienia. Fizyczne ograniczenia termostatu pozostają oznaczone na wykresie i w sekcji **Dane techniczne**, z osobnym powiadomieniem.

Za ochronę sprężarki, minimalny czas pracy i reakcję urządzenia nadal odpowiada jego oprogramowanie. Cykl histerezy poprawia sposób wyznaczania nastaw, lecz nie gwarantuje dokładnej chwili przełączenia przekaźnika, zaworu lub sprężarki.

<a id="heating-with-a-capped-delta"></a>
## Ogrzewanie z ograniczoną korektą

Założenia:

- Blok harmonogramu: `25 °C`, `heat`
- Czujnik pokojowy: `18 °C`
- Bieżąca temperatura urządzenia: `17.1 °C`
- Strefa nieczułości: `0 °C` (dotychczasowa korekta ze znakiem)
- Maksymalna różnica wspomagania: `5 °C`

Różnica temperatury w pokoju jest duża:

```text
25 - 18 = 7 °C
```

Velair ogranicza korektę do skonfigurowanej wartości:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Przy kroku `0.5 °C` temperatura ogrzewania zostaje zaokrąglona w dół do `22 °C`.

Zapobiega to wysyłaniu nierealistycznych nastaw, nadal pozwalając urządzeniu dostatecznie ogrzewać pomieszczenie.

<a id="fixed-cooling-hysteresis-example"></a>
## Przykład histerezy przy stałym chłodzeniu

Przykład z hamowaniem **Domyślne**:

- Blok harmonogramu: `24 °C`, `cool`
- Strefa nieczułości: `±0.5 °C`
- Dolna granica: `23.5 °C`
- Górna granica: `24.5 °C`
- Maksymalna różnica wspomagania: `2 °C`
- Krok temperatury urządzenia: `0.5 °C`

Chłodzenie działa symetrycznie, ale nowy cykl wewnątrz pasa rozpoczyna się bezpiecznie **ku górnej granicy**, aby nie żądać od razu chłodzenia:

1. Przy obu odczytach `24.0 °C` aktywną krawędzią jest `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Podniesienie nastawy chłodzenia ogranicza żądanie chłodzenia.
2. Faza pozostaje bez zmian wewnątrz pasa. Przy odczycie pokojowym `24.5 °C` Velair zmienia kierunek ku `23.5 °C`.
3. Jeśli pokój ma wtedy `24.5 °C`, a urządzenie wskazuje `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Korekta żąda chłodzenia.
4. Dolna krawędź pozostaje celem przy `24.0 °C`. Przy `23.5 °C` Velair znów kieruje się ku `24.5 °C` i powtarza cykl.

Każda tymczasowa temperatura uwzględnia krok i ograniczenia urządzenia. Faktyczny cykl chłodzenia nadal zależy od jego oprogramowania.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Odwrócona korekta a ochrona harmonogramu

Odwrócenie znaku korekty i ochrona temperatury harmonogramu rozwiązują różne części tego samego problemu. Odwrócenie zmienia kierunek korekty po przekroczeniu celu przez temperaturę pokoju. Ochrona stanowi końcową granicę bezpieczeństwa, gdy odwrócona korekta nadal pozostawia nastawę stałego trybu po stronie żądającej pracy.

Poniższe przykłady chłodzenia zakładają harmonogram `22 °C`, strefę nieczułości `0 °C`, krok `0.5 °C` i limit wspomagania dostatecznie duży, aby nie ograniczał obliczeń. Kolumny „bez odwrócenia” i „przed ochroną” przedstawiają wartości pośrednie, a nie tryby do wyboru.

| Temperatura pokoju | Odczyt urządzenia | Bez odwrócenia po przekroczeniu celu | Wynik ze znakiem przed ochroną | Końcowa nastawa | Powód |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Nie dotyczy | `23.5 °C` | `23.5 °C` | Pokój nadal wymaga chłodzenia. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | Odwrócenie podnosi nastawę, ale nadal żądałaby ona chłodzenia, więc obowiązuje dolna granica z harmonogramu. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | Silniejsza odwrócona korekta leży już bezpiecznie powyżej harmonogramu, więc pozostaje bez zmian. |

Ogrzewanie działa symetrycznie. Przy harmonogramie `20 °C`, pokoju `21 °C` i odczycie wewnętrznym `24 °C` wynik wynosi `23 °C`; ochrona stosuje zamiast niego górną granicę `20 °C`. Gdy pokój ma `24 °C`, a odczyt wewnętrzny `21.5 °C`, silniejszy wynik `17.5 °C` jest już bezpieczny i pozostaje bez zmian.

Dlatego odwrócenie nadal jest przydatne: może bardziej odsunąć nastawę od żądania pracy, jeśli pozwala na to odczyt urządzenia. Ochrona obejmuje przypadki, w których odczyt wewnętrzny przesunął się na niewłaściwą stronę.

Przy niezerowej strefie nieczułości stałe tryby `heat` i `cool` korzystają z opisanego cyklu z pamięcią fazy, zamiast zmieniać kierunek przy środkowej temperaturze. Wartość `0` zachowuje dotychczasowe obliczenia: korekta zmienia znak przy przekroczeniu celu, a faza histerezy nie jest przechowywana.

Zgodne pojedyncze temperatury `auto` i `heat_cool` także zachowują dotychczasowe obliczenia. Wewnątrz strefy nieczułości Velair wybiera obsługiwaną nastawę najbliższą odczytowi urządzenia, zamiast wymuszać naprzemienne ogrzewanie i chłodzenie. Natywne `heat_cool` zachowuje obie granice użytkownika i otrzymuje cały skorygowany zakres opisany niżej.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Histereza urządzenia i minimalny czas pracy

Room Assist steruje nastawą wysyłaną przez Home Assistant. Nie zastępuje histerezy oprogramowania termostatu, ochrony sprężarki, minimalnego czasu pracy ani decyzji urządzenia, kiedy równa temperatura oznacza bezczynność.

Cykl ogrzewania zmierzający ku dolnej granicy wysyła nastawę ograniczającą żądanie ogrzewania aż do osiągnięcia tej granicy przez pokój. Urządzenie z szeroką histerezą wewnętrzną lub minimalnym czasem pracy może jednak chwilowo rozpocząć albo kontynuować ogrzewanie. Velair nie zgaduje nieudokumentowanego marginesu zatrzymania ani nie zmienia fazy na podstawie `hvac_action`.

Ochrona harmonogramu zapobiega przesuwaniu nastawy na drugą stronę celu użytkownika wskutek zmian czujnika wewnętrznego; nie obiecuje natychmiastowego zatrzymania HVAC. Bezpośrednie powiązanie czujnika lub kalibracja urządzenia pozostają najlepszym rozwiązaniem, jeśli są dostępne. Użyj bloku `Wyłączony`, jeśli potrzebujesz jawnego zatrzymania, a nie utrzymywania temperatury przez termostat.

Maksymalna różnica wspomagania musi pozwalać na odwróconą korektę potrzebną urządzeniu. Edytor pokazuje tę wskazówkę pod nazwą ustawienia. Przykład:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Przy Minimalnym marginesie sterowania równym `0` ustawienie `3 °C` nie powoduje natychmiastowej korekty o `3 °C`. Jedynie pozwala osiągnąć tę wartość, gdy wymaga tego różnica temperatury w pokoju.

Ta opcja ogranicza korektę proporcjonalną, a nie końcową nastawę po ochronie zaplanowanej temperatury. Opcjonalne hamowanie wzmacnia tę ochronę ograniczeniem jednego lub dwóch kroków; nie zmienia maksymalnej różnicy wspomagania ani nie stosuje całej maksymalnej wartości przy każdej aktualizacji. Niezerowy [Minimalny margines sterowania](#minimum-control-margin) może żądać większej korekty nawet przy małej różnicy temperatury zewnętrznej.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Dlaczego nastawa urządzenia może różnić się od obliczeń

**Nastawa** oznacza wartość aktualnie zgłaszaną przez encję klimatu, gdy Room Assist jest gotowe lub zablokowane. Podczas wspomagania lub utrzymywania zastosowanej pojedynczej temperatury pokazuje zamiast tego tymczasową nastawę wysłaną przez Velair. Żadna z tych wartości nie jest temperaturą pokojową z harmonogramu ani aktywną granicą histerezy. Urządzenie przyjmuje temperatury w określonych odstępach, więc końcową nastawę trzeba czasem dopasować do efektywnego publikowanego, ostatnio zgłoszonego, ręcznego lub domyślnego kroku.

Na przykład dla stałego chłodzenia obliczenie może dać `23.9 °C`, a urządzenie przyjmować krok `0.5 °C`. Velair stosuje `24.0 °C`: zaokrągla w górę, aby nie chłodzić mocniej, niż wynika z obliczeń. Ogrzewanie zaokrągla w dół, a pojedyncze temperatury automatyczne do najbliższego kroku. Rozwiń etykietę **Nastawa** lub otwórz **Dane techniczne**, aby sprawdzić wyświetlaną wartość oraz dostępne obliczenia, efektywny krok i zastosowaną wartość. Gdy dopasowanie zmieniło zatwierdzoną nastawę, **Dane techniczne** pokazują też wartość sprzed dopasowania do kroku. Fizyczne minimum i maksimum oraz ochrona celu harmonogramu są opisywane osobno, a nie jako dopasowanie do kroku.

<a id="heatcool-range-example"></a>
## Przykład zakresu ogrzewania i chłodzenia

Room Assist obsługuje natywne zakresy `heat_cool`. Traktuje obie granice jako jeden pas komfortu i zawsze przesuwa je razem, zachowując jego szerokość.

Założenia:

- Zakres harmonogramu: `19–24 °C`
- Czujnik pokojowy: `18 °C`
- Bieżąca temperatura urządzenia: `22 °C`
- Maksymalna różnica wspomagania: `2 °C`
- Krok temperatury: `0.5 °C`

Pokój znajduje się `1 °C` poniżej granicy ogrzewania. Velair ustawia dolną granicę `1 °C` ponad odczytem urządzenia i przesuwa górną o tyle samo:

```text
applied range = 23–28 °C
```

Odczyt urządzenia `22 °C` jest poniżej zastosowanej dolnej granicy, więc urządzenie może żądać ogrzewania. Gdy pokój przekroczy `24 °C`, Velair analogicznie wykorzysta górną granicę do chłodzenia. Przy pierwszym wejściu pokoju do zaplanowanego pasa, z uwzględnieniem strefy nieczułości wokół granic, Velair ustawia zastosowany pas tak, aby odczyt urządzenia znajdował się w jego wnętrzu. Następnie utrzymuje pas bez zmian, dopóki pokój pozostaje w tym zakresie. Nie podąża za późniejszymi zmianami czujnika wewnętrznego, które mogą wynikać z pracy sprężarki, wentylatora, zaworu lub grzejnika.

Zastosowany zakres zawsze uwzględnia krok urządzenia i przy osiągnięciu ograniczeń jest przesuwany w całości. Velair nigdy nie reguluje Min i Max niezależnie.

Jeśli obliczona temperatura lub zakres przekracza minimum albo maksimum termostatu, stosowany jest najbliższy prawidłowy wynik. Wykres oznacza osiągnięty limit; **Dane techniczne** pokazują żądaną i zastosowaną pojedynczą nastawę lub zakres. Home Assistant tworzy jedno trwałe powiadomienie dla aktywnego ograniczenia. Kolejne odczyty nie tworzą duplikatów, a Velair usuwa powiadomienie po ustąpieniu problemu.

<a id="when-velair-does-nothing"></a>
## Kiedy Velair nie koryguje temperatury

Room Assist wymaga prawidłowego, dodatniego kroku temperatury. Najpierw używa publikowanego `target_temp_step`. Gdy go brakuje, ostatni prawidłowy krok zgłoszony przez to urządzenie chroni tę samą siatkę nastaw. Następny jest ręczny krok awaryjny strefy z Ustawień, domyślnie `1`, jeśli obu poprzednich wartości brakuje. Zapisanie pola przy nieobecnym atrybucie usuwa zapamiętany odczyt i nadaje pierwszeństwo jawnej wartości; kolejny prawidłowy raport znów zostaje zapamiętany. Velair nie zgaduje powiązania z inną encją.

Korekta nie jest stosowana, gdy:

- nie wybrano czujnika pokojowego;
- wspomaganie jest wyłączone;
- harmonogram nie działa automatycznie;
- urządzenie jest w stanie pauzy lub Wzmocnienia;
- nie ma aktywnego bloku temperatury;
- aktywny blok to `Wyłączony`;
- odczyt pokojowy lub urządzenia jest niedostępny albo nieliczbowy;
- obliczona zmiana jest mniejsza od kroku urządzenia;
- trybu HVAC nie można zinterpretować jako ogrzewania lub chłodzenia.

Velair pozostawia albo przywraca wtedy zwykłą temperaturę z harmonogramu, jeśli jest to bezpieczne.

<a id="external-adjustments-and-manual-adjustment"></a>
## Zmiany zewnętrzne i sterowanie ręczne

Przy domyślnej polityce zachowania automatyki Room Assist zachowuje kontrolę i po wykryciu zewnętrznej zmiany temperatury lub trybu HVAC ponownie oblicza i stosuje korektę. Przy polityce ręcznej świadomie ustępuje, gdy zmiana wprowadza urządzenie w stan sterowania ręcznego. Velair zapisuje pełny stan zewnętrzny ze zdarzenia Home Assistant, usuwa korektę bez przywracania temperatury harmonogramu i zachowuje zewnętrzną pojedynczą temperaturę lub zakres `heat_cool`. Zapobiega to natychmiastowemu przeciwstawianiu się zmianom z karty klimatu, pilota lub innego źródła spoza Velair.

Przykład:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Po wznowieniu automatycznego harmonogramu Velair ustala aktualny harmonogram lub Profil. Room Assist może wyliczyć nową korektę z bieżących odczytów; nie wznawia starej korekty `26 °C` ani poprzedniej fazy histerezy. Przeładowanie Velair lub Home Assistant także resetuje ten stan: aktualny blok jest ustalany ponownie, a bezpieczna nowa faza zależy od obecnego trybu i odczytu pokojowego.

Zewnętrzna zmiana objęta polityką zachowuje kontrolę automatyki albo włącza lub aktualizuje stan ręczny zgodnie z ustawieniem danego urządzenia. Polityki, przykłady usług, zależności ze Wzmocnieniem i Profilami oraz ograniczenia rozpoznawania źródła opisuje poradnik [Zmiany zewnętrzne i sterowanie ręczne](manual-control.pl.md).

<a id="planned-return"></a>
## Planowany powrót

Podczas [Planowanego powrotu](planned-return.pl.md) Room Assist podąża za tymczasową temperaturą na przyjazd, gdy dana strefa rozpocznie przygotowanie. Nie korzysta już z temperatury Trybu nieobecności i nie wraca do niej przy zmianie jego bloku. Inne strefy pozostają w Trybie nieobecności do rozpoczęcia własnego przygotowania.

Na przykład temperatura nieobecności 16 stopni zostaje zastąpiona celem 21 stopni przy rozpoczęciu przygotowania pokoju. Room Assist może zmienić fizyczną nastawę, aby czujnik pokojowy osiągnął 21 stopni. Sterowanie ręczne i jawna pauza wstrzymują interwencję w danej strefie. Jawny wybór Trybu lub Profilu anuluje przygotowanie z wyprzedzeniem i zachowuje ten wybór. Przycisk anulowania powrotu także usuwa przygotowanie; po potwierdzonym wyjściu przywraca zapisany poprzedni Tryb i Profile. Zobacz [przykłady anulowania](planned-return.pl.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Adaptacyjne przygotowanie temperatury

Jeśli adaptacyjne przygotowanie uruchamia przyszły blok wcześniej, Room Assist podąża za jego temperaturą do zaplanowanej godziny komfortu.

To ważne, ponieważ bieżąca godzina może jeszcze należeć do poprzedniego bloku. Velair traktuje wcześniej rozpoczęty blok jako aktywny cel, więc Room Assist nie przelicza korekty względem starego bloku.

Przy włączonym wspomaganiu adaptacyjne przygotowanie także korzysta z wybranego czujnika pokojowego jako źródła temperatury do decyzji i uczenia.

Opcjonalne, osobne przesunięcia ogrzewania i chłodzenia ustawia się w Przygotowaniu wstępnym. Room Assist oblicza cel bazowy z pierwotnego celu pokoju, a następnie Velair stosuje dodatek przygotowania. Limity urządzenia zmniejszają dodatek; pasy z dwiema nastawami zachowują szerokość. Dodatnio ustawione przesunięcie tymczasowo utrzymuje kierunek przygotowania do pierwotnego progu pokoju, nawet przy efektywnym dodatku zero lub odziedziczonej fazie bez zapotrzebowania. Po tym progu albo zaplanowanym rozpoczęciu dodatek kończy się i wracają zwykła histereza oraz hamowanie. Natywne zakresy `heat_cool` zachowują dotychczasowe ograniczenia obsługi hamowania.

Room Assist potwierdza efektywne zapotrzebowanie na ogrzewanie lub chłodzenie wraz z zastosowaną nastawą. Podczas przygotowania obejmuje ono tymczasowe żądanie, przy osobnym zachowaniu zwykłej fazy histerezy. Wspólne zasilanie klimatyzacji podąża za tym efektywnym zapotrzebowaniem przez istniejącą integrację Room Assist; nie dodaje kolejnego przesunięcia, histerezy ani reguły przygotowania. Po zakończeniu dodatku wraca zwykłe zapotrzebowanie Room Assist. Nieudane lub zastąpione polecenie nie potwierdza nowego żądania, a nieudane przywrócenie nie może pozostawić zakończonego przygotowania żądającego zasilania bez końca. Zobacz [Wspólne zasilanie klimatyzacji](shared-climate-supply.pl.md#room-assist).

Wykres oddziela nominalny cel od końcowej nastawy Room Assist z dodatkiem przygotowania. Etykieta dodatku obejmuje ograniczone `0`; **Dane techniczne** oddzielają bazę, żądany dodatek, efektywny dodatek i końcowe polecenie. Podczas przygotowania próg **Koniec przygotowania** ma przycisk informacji objaśniający ustawiony margines osiągnięcia celu. Cel `21 °C` z marginesem `0.1 °C` kończy przygotowanie ogrzewania przy `20.9 °C`; to wartość odrębna od pasa regulacji Room Assist. Przykłady ogrzewania, chłodzenia i fizycznych limitów zawiera [Tymczasowe przesunięcie nastawy](adaptive-preconditioning.pl.md#temporary-setpoint-offset).

<a id="automation-events"></a>
## Zdarzenia automatyzacji

Zdarzenia aktualizacji mogą również zawierać obiekt `braking` z poziomem skonfigurowanym i efektywnym, aktywną fazą, efektywnymi temperaturami zatrzymania i wznowienia, ograniczeniem nastawy oraz ewentualną przyczyną nieaktywności. Te dodatkowe pola opisują zatwierdzoną politykę zapotrzebowania, a nie fizyczną aktywność urządzenia. Przykład: [Aktualizacja Room Sensor Assist](automation-events.pl.md#room-sensor-assist-updated).

Velair emituje standardowe zdarzenie Home Assistant `velair_event`.

Room Assist emituje:

- `room_sensor_assist_state_changed`: wspomaganie włączono lub wyłączono.
- `room_sensor_assist_updated`: zastosowano tymczasową korygowaną nastawę.
- `room_sensor_assist_restored`: zakończono sterowanie tymczasową nastawą i przywrócono zwykły cel harmonogramu, jeśli było to możliwe.

Pełne dane zdarzeń i wszystkie przyczyny przywracania opisano w [Zdarzeniach automatyzacji](automation-events.pl.md#room-sensor-assist-state-changed).

Przykładowe dane zdarzenia:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

Cztery pola histerezy są opcjonalne. W zdarzeniach automatyzacji występują dla pojedynczego celu w stałym `heat` lub `cool` z niezerową strefą nieczułości; nie występują przy starszej korekcie bez strefy, automatycznych pojedynczych celach i wszystkich zakresach. Stałe zakresy z odniesieniem pokazują fazę histerezy w stanie działania na żywo; ich zdarzenia zachowują pełne pary granic i `range_shift`.

Aktualizacja zakresu korzysta z pełnych pasów zaplanowanych i zastosowanych zamiast pól pojedynczej temperatury:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Przykładowy wyzwalacz automatyzacji:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist można też kontrolować usługami:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>
## Lovelace

Widok Room Assist jest dostępny jako karta Lovelace:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

Panel boczny i karty używają tego samego wykresu na żywo. Zwarte etykiety **Pokój**, **Cel**, **Urządzenie** i **Nastawa** łączą się prostopadle ze swoimi pozycjami temperatury. Najedź na etykietę, ustaw na niej fokus lub ją naciśnij, aby zobaczyć szczegóły. Widok **Normalny** pokazuje bieżące żądanie i następny próg; **Szczegółowy** dodaje różnicę między pokojem a celem, łączną korektę oraz dodatek przygotowania już uwzględniony w tej sumie. Etykiety pomiarów leżą na swoich liniach, jeśli wystarcza miejsca, lub poniżej nich.

Ciągła strzałka oznacza żądanie ogrzewania lub chłodzenia. Przerywana strzałka oznacza oczekiwanie i wskazuje próg wznowienia. Strzałki opisują zapotrzebowanie Room Assist, a nie zmierzony trend temperatury ani dowód pracy zaworu lub sprężarki. Gdy zatwierdzone zapotrzebowanie jest niedostępne, wykres informuje o tej niepewności, zamiast wymyślać żądanie lub stan oczekiwania.

Kreskowany pasek tuż nad osią zachowuje nominalny pas regulacji i legendę. Efektywny próg hamowania jest oznaczony osobno; pasek nie oznacza utrzymania zapotrzebowania za tym progiem. Etykieta nastawy wskazuje hamowanie tylko wtedy, gdy jego ograniczenie rzeczywiście zmieniło zastosowane polecenie. Dla natywnego zakresu `heat_cool` osobne nawiasy pokazują pełne pasy docelowe i zastosowane, z kreskowaniem na zewnętrznych marginesach Room Assist. Fizyczne limity są opisane.

Wykres pokazuje zapotrzebowanie na plakietce stanu, odczyty na etykietach temperatur oraz próg zatrzymania lub wznowienia obok strzałki. Jeśli brak odczytu z pomieszczenia uniemożliwia narysowanie tej relacji, próg pozostaje na plakietce stanu. **Wyjaśnienie** otwiera pod wykresem krótki opis kontekstu: różnic między czujnikami, powodu kontynuowania cyklu po osiągnięciu celu komfortu albo wpływu przygotowania, hamowania czy limitu urządzenia na korektę. Uzupełnia to informacje bez powtarzania wyświetlanych temperatur, zapotrzebowania lub pomocy o paśmie regulacji. Pod wykresem nie ma osobnego, powtórzonego podsumowania.

**Dane techniczne** grupują etapy nastawy urządzenia, granice regulacji oraz źródło i czas we wspólnym obszarze szczegółów. Odczyty pozostają na wykresie, zamiast pojawiać się ponownie w drugiej tabeli. Kolejne wartości obliczone, żądane, sprzed dopasowania do kroku i zastosowane zajmują wspólny wiersz, jeśli są jednakowe; nazwa każdego etapu pozostaje widoczna. Różne wartości są rozdzielone. Polecenia zakresu i dowody dotyczące pojedynczej nastawy odniesienia pozostają osobne. Progi zatrzymania i wznowienia nie są powtarzane jako następny próg lub identyczna granica nominalna, a kierunek cyklu jest pokazywany bez ponownego podawania temperatury. Krok urządzenia i istotne zabezpieczenia lub limity fizyczne pozostają dostępne. Dodatek przygotowania ma własną grupę, w tym wartości żądaną i zastosowaną, gdy się różnią, oraz ograniczone zero. Źródło i czas pokazują encję czujnika i początek bloku z datą; sama godzina jest używana zastępczo. W wąskich panelach i kartach grupy są ustawione jedna pod drugą. Jednocześnie otwarty jest tylko jeden widok szczegółów; ponowne wybranie przycisku lub naciśnięcie Escape zamyka go. Przyciski obsługują klawiaturę i dotyk, a szczegóły pozostają pod wykresem i nie zasłaniają innych elementów sterowania. Otwieranie i zamykanie szczegółów nie zmienia zapotrzebowania regulacji. Wykres dostosowuje się do wąskich kolumn bez zmiany skali temperatury ani odsuwania odczytu od jego rzeczywistej pozycji.

Poszczególne części karty można ukryć, aby uzyskać zwarty widok:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Pominięte opcje `show_room_assist_*` mają domyślną wartość `true`.

<a id="technical-details"></a>
## Szczegóły techniczne

Pola przechowywania, stan podczas działania, obliczenia nastaw, przywracanie i zdarzenia opisuje angielska dokumentacja [mechanizmu Room Assist](../developer/room-assist.md).
