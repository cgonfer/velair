<a id="shared-climate-supply"></a>
# Wspólne zasilanie klimatyzacji
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.5 |
| Ostatnia synchronizacja | 2026-10-24 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Wspólne zasilanie klimatyzacji szacuje zapotrzebowanie powiązanych termostatów na ogrzewanie lub chłodzenie i steruje jednym wspólnym `switch`, np. przekaźnikiem zapotrzebowania kotła. Funkcja jest opcjonalna i wyłączona, dopóki jawnie nie włączysz zasilania w **Sterowaniu zasilaniem**. Szacunek nie potwierdza otwarcia zaworu, przepływu wody ani fizycznego ogrzewania.

<a id="configure-a-supply"></a>
## Konfiguracja zasilania

Otwórz **Sterowanie zasilaniem** w panelu Velair i wybierz **Dodaj zasilanie**. Wybierz wpis z listy, aby edytować szczegóły obok niej lub pod nią na wąskim ekranie. Pusta lista oferuje tę samą akcję dodawania. **Wspólne zasilania** zawierają sterowane obiegi ogrzewania lub chłodzenia i są oddzielne od ogólnego grupowania termostatów.

Podaj **Nazwę zasilania**, wybierz istniejący **Przełącznik zasilania**, **Przeznaczenie zasilania** (Ogrzewanie lub Chłodzenie) i zarządzane termostaty tego obiegu. Przełącznik może należeć tylko do jednego zasilania. Własne przełączniki sterowania Velair nie mogą być wyjściami zasilania.

Przeznaczenie opisuje, co zapewnia wspólne urządzenie. Nie zmienia trybów HVAC termostatów: źródło ogrzewania reaguje wyłącznie na zapotrzebowanie na ciepło, a źródło chłodzenia wyłącznie na chłód.

Wpis listy pokazuje przeznaczenie, liczbę termostatów, przełącznik i zapisany stan sterowania automatycznego. Nazwę, przełącznik i przeznaczenie edytujesz bezpośrednio w górnym podsumowaniu obok włączenia i ikony zapisu. Każde ustawienie występuje raz; nie ma osobnej sekcji Ustawienia zasilania. **Stan przełącznika** to obserwowany stan encji, a podsumowanie sterowania na liście opisuje zapisaną konfigurację. Przełącznik włączenia edytuje wersję roboczą do czasu zapisu, więc niezapisane włączenie może współistnieć z zapisanym stanem Wyłączone. Przy wyłączonym lub zawieszonym sterowaniu zapotrzebowanie nie jest oceniane. Przyciski informacji objaśniają te różnice, własność przełącznika, przeznaczenie i ustawienia czasowe bez rozbudowy głównego formularza.

**Usuń zasilanie** to przycisk kosza we wpisie listy. Usunięcie również pozostaje robocze do zapisu. Otwórz **Ustawienia czasowe**, **Zapotrzebowanie i histereza** lub **Powiązane termostaty**, aby zmienić daną część. Ikona pomocy obok tytułu funkcji otwiera podsumowanie i ten poradnik. Przełączanie między zasilaniami zachowuje niezapisane zmiany. **Zapisz zasilania**, ikona zapisu w nagłówku szczegółów, stosuje całą edytowaną listę wraz z usunięciami i pozostaje dostępna po usunięciu ostatniego wpisu. Tak jak w Szablonach i Presetach, nie ma osobnego przycisku odrzucenia. Opuszczenie karty z niezapisanymi zmianami wymaga decyzji o ich odrzuceniu; powrót wczytuje wtedy zapisaną listę. Nawigacja czeka podczas zapisu lub wznowienia.

Przywrócenie wszystkich edytowanych wartości do zapisanych usuwa wersję roboczą. Ponownie dostępne są aktualizacje konfiguracji na żywo i **Wznów sterowanie automatyczne**. Zapisane zmiany docierają do innych połączonych paneli także bez zmiany szacowanego zapotrzebowania.

Wybierz sposób działania i wartości histerezy zasilania. Każdy termostat dziedziczy sposób działania, a nadpisać można tylko wartości liczbowe. **Histereza termostatu** w zaznaczonym wierszu oferuje **Użyj histerezy zasilania** lub **Własne wartości histerezy**. Wybór jest wyrównany z polem zaznaczenia i nazwą; wyjątki liczbowe i rzeczywiste granice są poniżej. W trybie własnym obie wartości mogą niezależnie dziedziczyć ustawienie. Są to różnice temperatur w bieżącej jednostce panelu. Zmiana jednostki przelicza je jako różnice, nie temperatury bezwzględne.

Pola liczbowe zgłaszają błędy podczas edycji. Histereza musi być skończona i nieujemna; pusty wyjątek termostatu dziedziczy wartość zasilania. Zapis jest niedostępny, dopóki którekolwiek zasilanie ma nieprawidłowe liczby, a lista oznacza wpis wymagający uwagi.

Zapisz jawnie, aby zastosować konfigurację. Włączenie zasilania daje Velair wyłączne automatyczne sterowanie wybranym przełącznikiem. Unikaj innej automatyzacji stale sterującej tym samym wyjściem.

Błędy zapisu pojawiają się w nagłówku szczegółów obok akcji zapisu. Błąd konfiguracji wskazuje zasilanie, pole i poprawkę. Velair wybiera zasilanie, otwiera odpowiednią sekcję, oznacza pole i przenosi do niego fokus. Błędy Home Assistant lub połączenia zachowują oryginalne wyjaśnienie bez przypisywania do przypadkowego pola. Wersje robocze pozostają do poprawy i ponowienia, także po usunięciu ostatniego zasilania.

<a id="how-estimated-demand-works"></a>
## Działanie szacowanego zapotrzebowania

Nowe zasilania używają **Zatrzymania przy celu**, odległości startu **0,3 °C** lub **0,54 °F** i zerowej odległości zatrzymania. Są to równoważne różnice temperatur. Termostaty dziedziczą wartości zasilania, dopóki nie wybierzesz własnych. Poniższe przykłady mają inne odległości dla wyraźnego pokazania trybów.

Dla zwykłych termostatów histereza określa próg startu i zatrzymania. Między nimi pozostaje poprzednie zapotrzebowanie. Wszystkie porównania uwzględniają sam próg. Przykłady dla celu 22 °C:

| Sposób działania | Wartości | Ogrzewanie: start / zatrzymanie | Chłodzenie: start / zatrzymanie |
| --- | --- | --- | --- |
| Zatrzymanie przy celu (domyślne) | Start 0,5 °C | ≤21,5 / ≥22 °C | ≥22,5 / ≤22 °C |
| Symetryczne | Odległość 0,5 °C | ≤21,5 / ≥22,5 °C | ≥22,5 / ≤21,5 °C |
| Własne | Start 0,5 °C; zatrzymanie 0,2 °C | ≤21,5 / ≥22,2 °C | ≥22,5 / ≤21,8 °C |

Wykres w **Zapotrzebowaniu i histerezie** zmienia się wraz z przeznaczeniem, sposobem działania i odległościami. Używa opisanego przykładowego celu zamiast bieżącego celu termostatu. Temperatury stoją przy znacznikach startu i zatrzymania, a nawiasy łączą odległości histerezy z celem. Podpisana oś temperatury pomieszczenia rośnie w prawo. Opis poniżej wyjaśnia, że między startem i zatrzymaniem trwa tylko istniejące zapotrzebowanie. Ogrzewanie wymaga zasilania po zimniejszej stronie, chłodzenie po cieplejszej. Wykres objaśnia szacunek i nie symuluje pracy urządzeń ani opóźnień. Przykładowy cel to 22 °C lub 72 °F. Przy pustej, niepełnej lub nieprawidłowej liczbie szary wykres bez temperatur zachowuje wysokość podglądu, dopóki wpis nie będzie prawidłowy.

Odległość startu określa oddalenie od celu, po którym potrzebne jest ogrzewanie lub chłodzenie. Odległość zatrzymania wykracza poza cel zgodnie z kierunkiem ogrzewania lub chłodzenia. Obie mogą wynosić zero; przy obu zerowych dokładnie w celu nie ma zapotrzebowania. Wewnątrz pasma po restarcie, zmianie celu lub histerezy nie zakłada się nowego zapotrzebowania. Zmiana sposobu działania zachowuje wcześniej wpisane własne wartości zatrzymania i przywraca ich użycie po powrocie do trybu własnego.

**Zatrzymanie przy celu** to zalecany punkt wyjścia dla zwykłych termostatów. Symetryczna i Własna histereza są opcjami zaawansowanymi: termostat może zamknąć zawór lub zatrzymać sprężarkę przy celu, zanim pomieszczenie osiągnie próg zatrzymania za celem. Wspólne źródło mogłoby pozostać wymagane. Te ustawienia szacują zapotrzebowanie, nie zmieniają progów samego termostatu ani nie wymuszają przepływu ciepła.

Rozdziel progi osobnych zasilań ogrzewania i chłodzenia współdzielących termostat zakresowy. Duże odległości zatrzymania mogą utrzymywać zapotrzebowanie na ciepło, gdy zaczyna się chłodzenie, lub odwrotnie. Zasilania agregują zapotrzebowanie niezależnie i nie blokują wzajemnie przeciwstawnych wyjść. W razie potrzeby zastosuj odpowiednie blokady urządzeń.

Źródło jest wymagane, gdy choć jeden powiązany termostat ma prawidłowe zapotrzebowanie. Wyłączony termostat lub niezgodny kierunek HVAC nie zgłasza zapotrzebowania. Brakujące lub niedostępne dane temperatury oznaczają nieznane zapotrzebowanie i nie zachowują wcześniejszego bez końca. Inne poprawne pomieszczenia nadal mogą zgłaszać potrzebę. Bez pomieszczenia z prawidłowym zapotrzebowaniem zasilanie wyłącza się po ustawionym opóźnieniu.

Używane są bieżące cele termostatów, także ręczne i stosowane przez adaptacyjne przygotowanie temperatury lub Planowany powrót. Pauza harmonogramu nie wyłącza automatycznego sterowania zasilaniem. Prawidłowy zakres używa dolnej granicy dla ogrzewania i górnej dla chłodzenia; niejednoznaczny cel nie może zgłaszać zapotrzebowania.

<a id="room-assist"></a>
## Room Assist

Niebieski panel informacji na początku **Zapotrzebowania i histerezy**, przed wyborem sposobu działania, wyjaśnia pierwszeństwo Room Assist i to, kiedy obowiązuje histereza zasilania.

Gdy Room Assist steruje aktywnym celem pomieszczenia, wspólne zasilanie podąża za jego zatwierdzonym zamiarem sterowania. Przy stałym ogrzewaniu faza `towards_upper` wymaga ciepła; przy stałym chłodzeniu `towards_lower` wymaga chłodzenia. Jego dotychczasowe progi pozostają nadrzędne, więc histereza zasilania i wyjątek termostatu nie są stosowane ponownie. Natywne sterowanie zakresem podąża za zatwierdzonym kierunkiem. Nieprawidłowy lub oczekujący cel wspomagania jest nieznany do zatwierdzenia poprawnego zamiaru sterowania.

Skorygowany cel termostatu nie jest porównywany z osobnym czujnikiem pokojowym. Room Assist może zakończyć zapotrzebowanie, gdy termostat nadal zgłasza ten sam zmieniony cel.

<a id="timing-and-manual-control"></a>
## Czas i sterowanie ręczne

**Minimalny czas wyłączenia** opóźnia nowy start po wyłączeniu przełącznika. **Opóźnienie wyłączenia** wymaga ciągłego okresu bez zapotrzebowania przed wyłączeniem; powrót zapotrzebowania je anuluje. Obie opcje przyjmują całkowite sekundy od 0 do 86 400 i domyślnie wynoszą zero. Nie ma wymuszonego minimalnego czasu włączenia utrzymującego źródło po możliwym zamknięciu zaworów.

Zmiana nazwy lub aktualnie nieużywanej odległości zatrzymania nie uruchamia ponownie cyklu zapotrzebowania ani opóźnienia wyłączenia. Ponowne włączenie korzysta z ostatniego zgłoszonego przejścia do wyłączenia do wyznaczenia minimalnego czasu wyłączenia.

Wyłączenie przełącznika aktywnego zasilania poza Velair zawiesza sterowanie automatyczne. Użyj **Wznów sterowanie automatyczne**, aby je wznowić. Zawieszenie przetrwa restart i nie znika po zapisaniu innych zmian. Wyłączenie lub usunięcie zasilania żąda wyłączenia poprzednio sterowanego wyjścia.

Zewnętrzne włączenie nie nadpisuje automatyki. Gdy wszystkie powiązane termostaty nie zgłaszają zapotrzebowania, Velair wyłącza przełącznik po ustawionym opóźnieniu. Jeśli Home Assistant potwierdzi, że to przejście należy do korekty Velair, powstaje trwałe powiadomienie i wpis Aktywności powiązany z przełącznikiem. Wiadomość nazywa zasilanie, wyjaśnia cofnięcie zewnętrznej aktywacji z powodu braku szacowanego zapotrzebowania na ogrzewanie lub chłodzenie i odsyła do **Sterowania zasilaniem**, aby sprawdzić lub wyłączyć automatykę. Nie zakłada, że zmiany dokonał człowiek.

Powtarzane korekty tego samego zasilania i przełącznika są zgłaszane najwyżej raz na 15 minut w bieżącym uruchomieniu integracji. Zmiana przełącznika rozpoczyna nowy okres zgłaszania. Każde zasilanie używa jednego powiadomienia; późniejszy dozwolony komunikat zastępuje poprzedni. Błędy wysyłania lub samo przyjęcie usługi bez pasującego zgłoszonego wyłączenia nie tworzą komunikatu sukcesu. Nieznane zapotrzebowanie termostatu nie jest potwierdzonym zerowym zapotrzebowaniem. Integracja przełącznika, która nie zachowuje kontekstu polecenia, nie dostarcza powiązania wymaganego dla takiego komunikatu. Te reguły nie zmieniają sterowania i nie wymagają odpytywania. Błędy powiadomień i Aktywności nie przerywają sterowania; Aktywność wymaga integracji aktywności/logbook Home Assistant.

Nowsze ręczne wyłączenie ma pierwszeństwo przed trwającym zapisem lub wznowieniem. Jeśli chcesz dalej używać automatyki, wznów ją ponownie jawnie. Ręczne zawieszenie pozostaje zapisane również podczas migracji jednostek i restartu.

Niedostępny przełącznik lub nieudane polecenie są pokazane przy zasilaniu. Próby dostarczenia są ograniczone i nie powtarzają się po każdej aktualizacji czujnika. Przyjęcie polecenia przez Home Assistant nie dowodzi fizycznej pracy urządzenia.

Importowane zasilania są wyłączone i zawieszone. Sprawdź wyjście i pomieszczenia, włącz zasilanie, zapisz i jawnie wznów sterowanie automatyczne, gdy będzie to właściwe.

<a id="preconditioning-master-and-performance"></a>
## Nadrzędny termostat przygotowania i wydajność

[Nadrzędny termostat przygotowania](adaptive-preconditioning.pl.md#preconditioning-master) ogranicza początek przygotowania zależnych pomieszczeń. Wspólne zasilanie podąża natomiast za ich zapotrzebowaniem. Instalacja kotła z zaworami grzejnikowymi nie wymaga automatycznie nadrzędnego termostatu; Velair nie tworzy zależności między tymi ustawieniami.

Sterownik nasłuchuje skonfigurowanych encji i używa jednego zadania łączącego aktualizacje oraz najwyżej jednego timera na zasilanie. Nie odpytuje, nie zapisuje próbek temperatur i nie wymaga otwartej przeglądarki. Zwykłe zmiany temperatury bez istotnej zmiany sterowania nie wysyłają nowego pełnego obrazu panelu.
