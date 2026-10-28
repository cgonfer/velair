<a id="room-groups"></a>
# Grupy pomieszczeń
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.6 |
| Ostatnia synchronizacja | 2026-10-28 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Grupa pomieszczenia zapewnia kilku zarządzanym encjom `climate` jeden harmonogram, przypisanie profilu, wzmocnienie, pauzę i model adaptacyjnego przygotowania. Używaj jej dla urządzeń w tym samym fizycznym pomieszczeniu. Oddzielne pokoje powinny pozostać niezależne, nawet jeśli współdzielą szablon dzienny lub zasilanie ogrzewania/chłodzenia.

<a id="what-a-group-shares"></a>
## Co współdzieli grupa

| Wspólne dla grupy pomieszczenia | Niezależne dla każdego fizycznego urządzenia |
| --- | --- |
| Harmonogram, przypisania trybów/profili i ustawienia sterowania | Raportowana temperatura, wilgotność, działanie HVAC i dostępność |
| Wzmocnienia, pauzy strefy i korekta ręczna | Czujniki komfortu, progi i przełącznik monitorowania |
| Jedna decyzja o rozpoczęciu przygotowania i model uczenia cieplnego | Obserwacje urządzenia i dowody wysyłania w diagnostyce |
| Ustawienia i korekta Room Assist | Wewnętrzna regulacja temperatury urządzenia |

Grupa to jednostka sterowania wewnątrz Velair, a nie nowa encja `climate` ani `group` w Home Assistant. Velair generuje stały identyfikator, np. `group.0123456789abcdef0123456789abcdef`; zmiana nazwy go zachowuje. Może pojawić się w diagnostyce, eksportach lub ustawieniach technicznych, ale nie w rejestrze encji ani stanach narzędzi deweloperskich Home Assistant. Nie używaj go jako celu usługi `climate.*` w Home Assistant. Velair rozwija grupę do rzeczywistych odbiorców poleceń.

<a id="create-a-group"></a>
## Tworzenie grupy

1. Otwórz kartę **Grupy pomieszczeń** i użyj przycisku dodawania.
2. Wpisz nazwę i przez **Dodaj urządzenia klimatyczne** wybierz co najmniej dwa zarządzane urządzenia w tym pomieszczeniu. Szukaj według nazwy lub identyfikatora encji i potwierdź. Urządzenia przypisane do innej grupy są niedostępne i wskazują swoją grupę.
3. Wybierz urządzenie, którego raportowana temperatura reprezentuje własną temperaturę grupy. Nie staje się ono właścicielem grupy. Opcjonalny zewnętrzny czujnik temperatury skonfiguruj w **Room Assist**, tak jak dla niezależnego urządzenia.
4. Wybierz wysyłanie do wszystkich urządzeń albo jednego, którego instalacja już przekazuje polecenia pozostałym.
5. W **Użyj konfiguracji z** wybierz istniejącą konfigurację urządzenia. Najpierw wyeksportuj konfigurację, jeśli potrzebujesz kopii odzyskiwania; uwzględnij **Uczenie przygotowania**, aby zachować kalibrację.
6. Przycisk zapisu w nagłówku otwiera **Sprawdź zmiany grupy**. Nic nie zostało jeszcze zastosowane. Przeczytaj różnice i informację o rozpoczęciu uczenia od nowa, a następnie wybierz **Potwierdź i zapisz** lub **Wróć do edycji**. Błędy walidacji i zapisu pozostają w tym procesie, aby można było poprawić wersję roboczą i ponowić próbę.

<a id="configuration-fields"></a>
### Pola konfiguracji

| Pole | Znaczenie |
| --- | --- |
| Nazwa grupy | Wymagana nazwa wyświetlana, unikatowa wśród grup. |
| Urządzenia w grupie | Zarządzane urządzenia tego pomieszczenia. Ich kolejność określa indywidualne wyświetlanie w przeglądzie. Urządzenie nie może należeć do dwóch grup. |
| Odniesienie temperatury | Temperatura raportowana przez jedno urządzenie reprezentuje pomieszczenie w Velair, nie nadając mu pierwszeństwa. |
| Wysyłanie poleceń | Domyślnie **Wszystkie urządzenia** lub **Wybrane urządzenie**, gdy instalacja już przekazuje polecenia. |
| Odbiorca poleceń | Widoczny tylko dla **Wybrane urządzenie**; wybierz odbiorcę poleceń Velair. |
| Użyj konfiguracji z | Tylko przy tworzeniu: harmonogram, konfiguracja profili i ustawienia sterowania tego urządzenia stają się wspólnym punktem wyjścia. |

Odniesienie temperatury, odbiorca poleceń i źródło konfiguracji początkowej mogą być trzema różnymi urządzeniami.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Wysyłanie poleceń do wszystkich lub jednego odbiorcy

**Wszystkie urządzenia** to tryb domyślny: Velair wysyła polecenia do każdego urządzenia. **Wybrane urządzenie** wysyła je tylko do wskazanego poniżej **Odbiorcy poleceń**. Używaj tego wyłącznie, gdy instalacja już przekazuje polecenia pozostałym; Velair nie realizuje dodatkowego przekazywania.

Przykładowo pokój może mieć trzy zawory grzejnikowe oraz regulator pokojowy dostępny także jako encja `climate`. Jeśli instalacja przekazuje polecenia regulatora do zaworów, dodaj wszystkie cztery urządzenia, wybierz regulator jako odniesienie temperatury i odbiorcę w trybie **Wybrane urządzenie**. Wszystkie cztery pozostaną widoczne z jednym harmonogramem i jedną decyzją przygotowania. Jeśli każde potrzebuje bezpośredniego polecenia, użyj **Wszystkie urządzenia**.

Te opcje wybierają odbiorców; nie tworzą niezależnych harmonogramów ani modeli uczenia.

<a id="adopt-an-existing-configuration"></a>
### Przejęcie istniejącej konfiguracji

Przejęcie tworzy jedną wspólną konfigurację Velair z harmonogramów, profili i ustawień sterowania wybranego urządzenia. Zastępuje niezależną konfigurację sterowania pozostałych; nie utrzymuje osobnych synchronizowanych kopii ani nie kopiuje ustawień oprogramowania urządzeń. Każde fizyczne urządzenie zachowuje własne ustawienia komfortu, czujniki i progi. Istniejące historie uczenia nie są scalane. Odniesienie, odbiorca i źródło konfiguracji mogą się różnić.

Velair sprawdza całą grupę przed zapisaniem. Urządzenie może należeć tylko do jednej grupy. Nieobsługiwane kombinacje wymagają rozwiązania; grupowanie nie dodaje możliwości HVAC. Zewnętrzne wykonywanie harmonogramu nie może sterować urządzeniem z grupy jednocześnie z Velair. Odbiorcy muszą mieć wspólne obsługiwane tryby, nakładające się granice temperatur i zgodną siatkę kroków temperatury. Jeśli aktywne tryby HVAC są różne, wybierz tryb jawnie zamiast zachowania wspólnego trybu.

<a id="shared-control-and-individual-observations"></a>
## Wspólne sterowanie i indywidualne obserwacje

Harmonogramy, profile i inne selektory sterowania pomieszczeniem pokazują grupę zamiast jej urządzeń. Edytuj dotychczasowe harmonogramy i ustawienia funkcji jak zwykle. Grupa przechowuje jedną konfigurację, a nie osobne synchronizowane kopie.

Komfort pozostaje indywidualny: panel i karty pokazują każde fizyczne urządzenie z własnymi pomiarami, czujnikami, progami i przełącznikiem monitorowania. Zewnętrzny czujnik Room Assist grupy zastępuje te odczyty tylko wtedy, gdy wybierzesz go jawnie w ustawieniach komfortu danego urządzenia. Tworzenie, edycja i rozwiązywanie grupy zachowują indywidualne konfiguracje. Grupy zapisane przed wprowadzeniem niezależnego przechowywania komfortu inicjują każde urządzenie kopią poprzednich ustawień komfortu grupy; potem kopie można edytować niezależnie. Wcześniejszych indywidualnych ustawień nie można automatycznie odzyskać.

**Przegląd** nadal pokazuje każde fizyczne urządzenie. Grupa wskazuje wspólny harmonogram i odpowiedzialność za sterowanie, a temperatura, dostępność i stan urządzenia pozostają indywidualne. Działanie sterujące na urządzeniu grupy dotyczy pomieszczenia; nie tworzy konkurencyjnego niezależnego harmonogramu.

**Następne wydarzenia** pokazują każde urządzenie z grupą pod nazwą, zgodnie z indywidualnymi wierszami **Dzisiejszej osi czasu**. Urządzenia pokazują to samo wiążące zdarzenie grupy; Velair nie tworzy osobnych harmonogramów ani zdarzeń backendu. Wybierz nazwę urządzenia, aby otworzyć wspólny harmonogram w dniu tygodnia zdarzenia, także własny harmonogram profilu, jeśli jest jego źródłem. Planowany powrót używa programu trybu docelowego. Działa to również z karty następnych zdarzeń na pulpicie. Filtr jednego urządzenia pokazuje tylko je; filtr grupy pokazuje wszystkie.

Wybierz grupę na liście, aby edytować ją w sąsiednim panelu szczegółów, tak jak w Szablonach i Sterowaniu zasilaniem. Podsumowanie wskazuje urządzenia, źródło temperatury, odbiorców oraz wspólny stan sterowania i przygotowania. Działanie w nagłówku sprawdza i zapisuje zmiany. Usunięcie z listy grup wymaga potwierdzenia. Pomoc pól wyjaśnia wybory, a przegląd wskazuje brakujące wymagane dane. Podczas edycji podsumowanie nadal opisuje zapisaną grupę aż do zapisania sprawdzonych zmian.

Diagnostyka oddziela dowody poszczególnych urządzeń od wspólnego zamiaru sterowania pokojem. Udane wywołanie usługi Home Assistant nie dowodzi ruchu zaworu ani przepływu ciepła. Przy wybranym odbiorcy Velair nie twierdzi, że bezpośrednio sterował pozostałymi.

<a id="temperature-reference-and-room-assist"></a>
## Odniesienie temperatury i Room Assist

Przy zwykłym harmonogramie Velair wysyła wspólny cel do skonfigurowanych odbiorców. Każde urządzenie nadal reguluje wewnętrznie według własnego czujnika; odniesienie grupy nie zmienia regulacji jego oprogramowania.

**Odniesienie temperatury** dostarcza własny odczyt grupy do przygotowania, uczenia cieplnego, bazowego odczytu Room Assist, szacowania zapotrzebowania i podsumowania. Wybierz je spośród urządzeń grupy. Opcjonalny zewnętrzny czujnik pokojowy skonfiguruj w [Room Assist](room-assist.pl.md#room-groups), a nie jako dodatkowe własne odniesienie w edytorze grupy. Po włączeniu Room Assist zewnętrzny odczyt staje się efektywnym pomiarem pokoju i Velair oblicza jedną wspólną korektę. Polecenia nadal podlegają ustawieniu **Wysyłanie poleceń**.

Komfort pozostaje niezależny: Room Assist grupy nie zastępuje czujników ani progów urządzeń.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pauzy, korekta ręczna i wznawianie

Grupa ma jedną jednostkę odpowiedzialną za harmonogram. Pauza strefy Velair lub wzmocnienie wywołane przez dowolne urządzenie dotyczą całej grupy. Karta Grupy pomieszczeń pokazuje zapisany stan sterowania bez osobnego przycisku pauzy. Używaj istniejących kontrolek urządzeń. Wznowienie tej samej wspólnej pauzy przez inne urządzenie ma ten sam zakres. Inne niezależne przyczyny pauzy nadal mają pierwszeństwo do ich zakończenia lub usunięcia. Globalna Pauza lub Stop nadal dotyczą wszystkich pomieszczeń, również urządzeń bez grupy.

Wstrzymanie harmonogramu nie musi wyłączać urządzeń. Wybrane działanie pauzy określa, czy Velair zachowa aktualne stany, czy wyśle Wyłącz do skonfigurowanych odbiorców.

Polityka **Korekty zewnętrzne** w ustawieniach należy do grupy. Wykryta zewnętrzna zmiana celu lub trybu HVAC jednego urządzenia może wprowadzić całą grupę w **Regulację ręczną**, zgodnie z tymi samymi zasadami harmonogramu i pauz co dla niezależnego urządzenia. Przy **Do następnego bloku**:

1. Trzy urządzenia realizują wspólny cel `20 °C`.
2. Zewnętrzna zmiana podnosi jedno do `22 °C`.
3. Velair oddaje sterowanie harmonogramem całej grupy, zachowując stany urządzeń. Nie kopiuje zmiany na pozostałe: mogą pozostać przy `22, 20, 20 °C`. Sama instalacja nadal może przekazywać zmiany.
4. Przy następnym bloku Velair wraca do automatyki i wysyła wspólny cel do skonfigurowanych odbiorców. Możesz wznowić automatykę wcześniej.

| Polityka korekt zewnętrznych | Zachowanie grupy |
| --- | --- |
| Zachowaj sterowanie automatyczne | Velair zachowuje sterowanie i ponownie stosuje aktualny efektywny zamiar, jeśli istnieje. |
| Do następnego bloku | Korekta ręczna kończy się przy następnym właściwym bloku. Bez przyszłego bloku wznów automatykę jawnie. |
| Przez określony czas | Grupa oddaje sterowanie na ustawiony czas. Kolejne zmiany zewnętrzne odnawiają ten czas. |
| Do czasu wznowienia | Grupa oddaje sterowanie do jawnego wznowienia automatyki. |

Jawne wybranie sterowania ręcznego używa zapisanej polityki grupy i zachowuje stany urządzeń. Jeśli polityką jest **Zachowaj sterowanie automatyczne**, jawne sterowanie ręczne trwa jednak do wznowienia. Room Assist ustępuje podczas korekty ręcznej.

To sterowanie Ręczne/Automatyczne jest oddzielne od trybu **Ręczny** przy bezpośrednim wyborze profili. Priorytety i szczególne reguły bloków opisano w [Zmianach zewnętrznych i korekcie ręcznej](manual-control.pl.md).

<a id="display-order"></a>
## Kolejność wyświetlania

Przesuwaj grupy i niezależne urządzenia istniejącymi kontrolkami kolejności w ustawieniach. Nowa grupa początkowo zajmuje pozycję najwcześniejszego urządzenia. Uporządkuj urządzenia w panelu szczegółów na karcie Grupy pomieszczeń. Przegląd rozwija grupę do kolejnych indywidualnych pozycji w tej kolejności; selektory harmonogramów pokazują jedną pozycję grupy. Obie kolejności zapisuje backend.

Lista zawiera tylko wybrane urządzenia. Nowe są dopisywane na końcu bez zmiany dotychczasowej kolejności. Strzałki służą do przesuwania, a usuwanie do odłączenia urządzenia. Długie listy można rozwinąć w całości. Zmiany składu stosowane są dopiero po sprawdzeniu i zapisaniu.

<a id="learning-and-membership-changes"></a>
## Uczenie i zmiany składu grupy

Grupa uczy się jednej odpowiedzi cieplnej, z oddzielnymi historiami ogrzewania i chłodzenia. Przy wyłączonym Room Assist własna temperatura pochodzi z wybranego urządzenia. Room Assist używa zewnętrznego czujnika tylko po włączeniu, z takimi samymi zasadami sterowania, limitami korekty i regułami przygotowania jak dla niezależnego urządzenia. Sam wybór czujnika nie włącza wspomagania. Usunięcie lub wyłączenie przywraca odniesienie urządzenia. Polecenia nadal podlegają trybowi wysyłania, a tymczasowe korekty nie zmieniają rzeczywistego zaplanowanego celu. Wcześniejsze niezależne historie nie są łączone. Velair przechowuje uczenie dla grupy, a nie osobny model dla każdego urządzenia. Indywidualne obserwacje pozostają w diagnostyce. Utworzenie grupy rozpoczyna uczenie od nowa, bez scalania dawnych historii.

| Zmiana | Uczenie później |
| --- | --- |
| Zmiana nazwy grupy lub kolejności urządzeń | Uczenie grupy zostaje zachowane. |
| Dodanie lub usunięcie urządzenia | Pozostała grupa zaczyna od nowa, ponieważ zmienił się skład fizyczny. Usunięte urządzenie uczy się niezależnie od zera. |
| Zmiana odniesienia temperatury lub wysyłania poleceń | Grupa zaczyna od nowa i anuluje poprzednią aktywną obserwację. |
| Rozwiązanie grupy | Każde urządzenie zaczyna niezależnie od zera. Dawna historia grupy jest usuwana. |

Usunięte urządzenie otrzymuje niezależną kopię wspólnej konfiguracji. Rozwiązanie robi to samo dla wszystkich. Aktywne wzmocnienia, pauzy i historia cieplna nie są kopiowane do niezależnych pomieszczeń. Po zmianie właściciela sprawdź harmonogramy i profile.

Przykładowo usunięcie jednego urządzenia z trzech pozostawia dwa z nową historią grupy oraz jedno niezależne z nową historią. Usunięcie grupy uniezależnia wszystkie trzy. Żadna operacja nie przywraca automatycznie historii sprzed grupowania. Zapisana grupa wymaga co najmniej dwóch urządzeń; rozwiąż ją, jeśli wszystkie mają stać się niezależne.

<a id="before-testing-the-beta"></a>
## Przed testowaniem bety

Zrób kopię konfiguracji, w razie potrzeby z uczeniem przygotowania. Po sprawdzeniu i zapisaniu grupy sprawdź:

- Jedna grupa pojawia się w harmonogramach, profilach, przygotowaniu i Room Assist.
- Każde urządzenie pozostaje indywidualnie widoczne w przeglądzie, następnych zdarzeniach, dzisiejszej osi czasu, komforcie i diagnostyce.
- Wysyłanie pasuje do instalacji: wszystkie otrzymują bezpośrednie polecenia albo wybrany odbiorca otrzymuje je i instalacja przekazuje pozostałym.
- Zmiana ustawień komfortu jednego urządzenia nie zmienia pozostałych.
- Pauza lub korekta ręczna z urządzenia ma wspólny zakres pomieszczenia.
- Przeładowanie Home Assistant zachowuje grupę, kolejność i wspólne ustawienia.

Zgłaszając problem, podaj tryb wysyłania, urządzenie odniesienia temperatury, stan Room Assist i odpowiednie dowody diagnostyczne. Udane wywołanie usługi różni się od potwierdzenia żądanego stanu przez urządzenie.

Wcześniejsze konfiguracje bety mogą zawierać zewnętrzne odniesienie grupy. Wczytanie lub import zachowuje je bez automatycznego wyboru urządzenia i bez włączenia Room Assist. Edytor wskazuje starszą wartość i wymaga odniesienia do urządzenia przed zapisaniem edytowanej grupy. Przy przejściu na nowe rozwiązanie skonfiguruj zewnętrzny czujnik w Room Assist.

Grupy pomieszczeń i grupy wspólnego zasilania mają różne cele. Grupa pomieszczenia odpowiada za jeden pokój; [Sterowanie zasilaniem](shared-climate-supply.pl.md) agreguje zapotrzebowanie pokojów do wspólnego źródła. Powiązane szablony współdzielą treść harmonogramu bez zmiany właściciela pokoju. Zależności przygotowania koordynują oddzielne pomieszczenia z niezależnym uczeniem.
