<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Room Assist pozwala korzystać z osobnego czujnika temperatury w pomieszczeniu dla jednej zarządzanej encji klimatu, nadal sterując rzeczywistą encją `climate.*`.

Przydaje się to w przypadku głowic termostatycznych, zaworów grzejnikowych, termostatów ściennych i klimatyzatorów, których wbudowany czujnik nie odzwierciedla temperatury pomieszczenia. Głowica przy grzejniku może na przykład wskazywać `22 °C`, gdy czujnik w pokoju nadal wskazuje `20.5 °C`.

Obliczenia korzystają z natywnej jednostki zarządzanej encji w Home Assistant. Poniższe przykłady podano w stopniach Celsjusza, ale granice histerezy, korekta ze znakiem, ochrona temperatury z harmonogramu, szerokość zakresu, krok temperatury i ograniczenia urządzenia działają tak samo w stopniach Fahrenheita. Różnica `4 °F` oznacza korektę o `4 °F`; nie jest traktowana jako temperatura bezwzględna ani przeliczana z dodaniem przesunięcia między skalami.

Room Assist działa lokalnie i reaguje na zdarzenia. Velair nie odpytuje czujników w sposób ciągły ani nie wysyła ich danych poza Home Assistant.

<a id="what-it-does"></a>
## Jak działa

Temperatura z harmonogramu pozostaje rzeczywistą temperaturą docelową użytkownika. Velair tymczasowo koryguje wartość wysyłaną do urządzenia na podstawie czujnika pokojowego i odczytu samego urządzenia.

Dla pojedynczej temperatury w stałym trybie `heat` lub `cool` niezerowa strefa nieczułości wyznacza dwie granice przełączania. Room Assist pamięta, do której granicy zmierza, i zmienia kierunek dopiero po osiągnięciu przeciwnej granicy przez czujnik pokojowy. Tworzy to cykl histerezy oparty na osobnym czujniku pokojowym, zamiast pozwalać czujnikowi wewnętrznemu rozpoczynać nowy cykl przy środkowej temperaturze docelowej. Maksymalna różnica wspomagania ogranicza korektę ze znakiem obliczoną względem aktywnej granicy.

Pojedyncze temperatury w trybach `auto` i `heat_cool` oraz natywne zakresy `heat_cool` zachowują działanie neutralne lub margines wokół zakresu. Velair nie wymusza w tych trybach naprzemiennego ogrzewania i chłodzenia według cyklu histerezy dla pojedynczej temperatury.

Encja klimatu nadal odpowiada za wykonanie polecenia. Velair nie tworzy wirtualnego termostatu ani nie omija oprogramowania urządzenia. Jeśli termostat lub głowica pozwala bezpośrednio powiązać osobny czujnik pokojowy, zwykle warto najpierw skorzystać z tej możliwości.

<a id="setup"></a>
## Konfiguracja

1. Otwórz kartę Room Assist.
2. Rozwiń urządzenie, które chcesz skonfigurować.
3. Wybierz czujnik temperatury pomieszczenia.
4. Włącz **Asystent czujnika pokojowego**.
5. Ustaw strefę nieczułości Room Assist. Wyznacza ona dolną i górną granicę dla stałego ogrzewania lub chłodzenia, a dla trybów automatycznych i natywnych zakresów — margines neutralny.
6. Zwiększ ustawienie **Maksymalna delta wspomagania**, jeśli domyślna wartość jest za mała dla pomieszczenia lub dla różnicy temperatur, której termostat potrzebuje do zatrzymania ogrzewania albo chłodzenia.
7. Dostosuj opóźnienie odświeżania, jeśli odczyty są uwzględniane zbyt wolno lub zbyt często.

Samo wybranie czujnika zapisuje jedynie jego przypisanie. Velair zaczyna używać go jako źródła rzeczywistej temperatury pomieszczenia dopiero po włączeniu wspomagania.

Wspomaganie nie wymaga adaptacyjnego przygotowania temperatury. Działa zarówno dla zwykłych bloków harmonogramu, jak i bloków uruchomionych wcześniej przez tę funkcję.

Blok temperatury z opcją **Zachowaj bieżący tryb** nadal stosuje temperaturę z harmonogramu. Room Assist korzysta z trybu, w którym urządzenie faktycznie pracuje; jeśli jest wyłączone, Velair uruchamia obsługiwany, zgodny tryb. Ta opcja nie oznacza pozostawienia dotychczasowej temperatury termostatu. Blok zawierający wyłącznie opcje nie ma temperatury docelowej, więc Room Assist dla niego nie działa.

Opóźnienie odświeżania grupuje zmiany odczytów czujnika pokojowego lub urządzenia. Domyślnie wynosi `20` sekund. Wartość `0` oznacza natychmiastowe przeliczenie; można ustawić do `300` sekund, aby grupować częste aktualizacje.

Strefa nieczułości jest niezależna od minimalnej różnicy adaptacyjnego przygotowania. Domyślnie wynosi `0.3 °C` lub `1 °F`. Wartość `0` ją wyłącza; regulacja odbywa się co `0.1` stopnia, do `5 °C` lub `9 °F`. Zapisanie ustawienia podczas działania Room Assist natychmiast odświeża korygowaną temperaturę.

Skala temperatury pokazuje strefę nieczułości jako neutralny, kreskowany pas. Dla pojedynczej temperatury w stałym trybie jego krawędzie oznaczają granice histerezy, a stan wskazuje, do której granicy zmierza Room Assist. Dla pojedynczych temperatur w trybach automatycznych pas pozostaje marginesem neutralnym. Dla natywnego zakresu `heat_cool` rozciąga się od dolnej granicy pomniejszonej o strefę nieczułości do górnej granicy powiększonej o nią. Skala rozszerza się, aby obie krawędzie były widoczne. Pełna, przetłumaczona legenda pozostaje wyśrodkowana względem rzeczywistego pasa, nawet jeśli tekst jest szerszy, więc znaczenie nie zależy od szerokości wykresu. Pełne objaśnienie jest także dostępne dla technologii wspomagających i po najechaniu kursorem. Przy wartości `0` pas nie jest rysowany, a legenda wyraźnie informuje o braku strefy nieczułości. Wykres i legenda korzystają z wartości zapisanej w backendzie. Ukrycie `show_room_assist_deadband` w karcie Lovelace ukrywa jednocześnie ustawienie, pas i legendę.

Przy aktualizacji z wersji, w której Room Assist współdzieliło minimalną różnicę z adaptacyjnym przygotowaniem, Velair jednorazowo kopiuje dotychczasową wartość do nowej strefy nieczułości. Zachowuje wcześniejszą szerokość pasa, również gdy historyczna wartość nie jest wielokrotnością nowego kroku 0,1 stopnia. Stałe tryby `heat` i `cool` korzystają następnie z tej wartości w opisanym niżej cyklu histerezy. Po migracji oba ustawienia są niezależne. Nowa lub zresetowana strefa otrzymuje wartość domyślną odpowiednią dla jednostki.

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
| **Utrzymywanie** | Room Assist utrzymuje neutralną temperaturę automatyczną, natywny zakres lub temperaturę po bezpiecznej stronie dzięki ochronie harmonogramu. Cykl `heat` lub `cool` może zamiast tego nadal pokazywać **Wspomaganie** podczas przechodzenia przez strefę nieczułości. |
| **Zablokowany** | Pauza, Wzmocnienie, sterowanie ręczne lub inny stan harmonogramu ma pierwszeństwo. |
| **Niedostępny** | Nie można obecnie użyć urządzenia lub wymaganej możliwości ustawiania temperatury. Interfejs pokazuje przyczynę, jeśli jest znana. |

Podczas działania Room Assist przegląd pokazuje skrócony stan: zmierzanie do dolnej lub górnej granicy, aktywność, utrzymywanie albo ochronę harmonogramu, oraz wartości zaplanowane i zastosowane. Fizyczna temperatura minimalna lub maksymalna urządzenia różni się od ochrony harmonogramu: karta Room Assist pokazuje ostrzeżenie z wartością żądaną, zastosowaną i obsługiwanym zakresem, a Home Assistant otrzymuje jedno trwałe powiadomienie do czasu ustąpienia ograniczenia.

<a id="fixed-heating-hysteresis-example"></a>
## Przykład histerezy przy stałym ogrzewaniu

Założenia:

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

Gdy ochrona zmienia wynik, bieżący stan wyjaśnia obie wartości: obliczoną temperaturę i temperaturę faktycznie utrzymywaną. Przegląd pokazuje skrócony stan ochrony harmonogramu. Jest to normalne działanie ochronne, nie błąd termostatu, więc nie tworzy trwałego powiadomienia. Fizyczne ograniczenia termostatu mają osobne ostrzeżenie i powiadomienie.

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

Założenia:

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

Ustawienie `3 °C` nie powoduje natychmiastowej korekty o `3 °C`. Jedynie pozwala osiągnąć tę wartość, gdy wymaga tego różnica temperatury w pokoju.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Dlaczego nastawa urządzenia może różnić się od obliczeń

**Cel encji klimatu** oznacza aktualnie zgłaszaną nastawę, gdy Room Assist jest gotowe lub zablokowane. Podczas wspomagania lub utrzymywania zastosowanej pojedynczej temperatury pokazuje zamiast tego tymczasową nastawę wysłaną przez Velair. Żadna z tych wartości nie jest temperaturą pokojową z harmonogramu ani aktywną granicą histerezy. Urządzenie przyjmuje temperatury w określonych odstępach, więc końcową nastawę trzeba czasem dopasować do bieżącego, ostatnio zgłoszonego, ręcznego lub domyślnego kroku.

Na przykład dla stałego chłodzenia obliczenie może dać `23.9 °C`, a urządzenie przyjmować krok `0.5 °C`. Velair stosuje `24.0 °C`: zaokrągla w górę, aby nie chłodzić mocniej, niż wynika z obliczeń. Ogrzewanie zaokrągla w dół, a pojedyncze temperatury automatyczne do najbliższego kroku. Przycisk informacji obok nastawy dostosowuje objaśnienie do pokazywanej wartości; gdy dopasowanie faktycznie zmieniło wysłaną nastawę, przedstawia obliczenie, efektywny krok i zastosowaną wartość. Fizyczne ograniczenia i ochrona harmonogramu są opisywane osobno, nie jako zaokrąglenie do kroku.

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

Jeśli obliczona temperatura lub zakres przekracza minimum albo maksimum termostatu, stosowany jest najbliższy prawidłowy wynik. Stan nad wykresem pokazuje nastawę żądaną, zastosowaną i osiągnięte ograniczenie. Home Assistant tworzy jedno trwałe powiadomienie dla aktywnego ograniczenia. Kolejne odczyty nie tworzą duplikatów, a Velair usuwa powiadomienie po ustąpieniu problemu.

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

<a id="automation-events"></a>
## Zdarzenia automatyzacji

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

Cztery pola histerezy są opcjonalne. Pojawiają się przy pojedynczej temperaturze w stałym trybie `heat` lub `cool` z niezerową strefą nieczułości. Nie występują przy dotychczasowej korekcie z zerową strefą, pojedynczych temperaturach automatycznych ani natywnych zakresach.

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

Skala temperatury rozdziela dwie zależności. Przy pojedynczej temperaturze górna linia porównuje odczyt pokojowy z celem harmonogramu, a dolna — odczyt urządzenia z jego nastawą. W stałych trybach `heat` lub `cool` kreskowany pas oznacza obie granice histerezy, a stan wskazuje aktywną granicę. W trybach automatycznych pozostaje marginesem neutralnym. Dla natywnego zakresu czerwone i niebieskie nawiasy pokazują pełne pasy zaplanowane i zastosowane, z obiema granicami. Jeden łącznik przesunięcia zakresu ze znakiem biegnie między środkami pasów, wskazując przesunięcie całości, a nie pojedynczej granicy. Oznaczenia opisują tylko nastawę wysłaną przez Velair; nie potwierdzają aktywnego ogrzewania lub chłodzenia przez termostat, zawór czy sprężarkę.

W wąskich kolumnach pulpitów skala przewija się poziomo, aby oznaczenia pozostały czytelne.

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
