<a id="external-changes-and-manual-adjustment"></a>
# Zmiany zewnętrzne i sterowanie ręczne
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair rozpoznaje zmiany trybu HVAC lub temperatury docelowej zarządzanej encji `climate.*`, które nie odpowiadają wysłanym przez niego poleceniom. Dla każdego urządzenia możesz wybrać, czy automatyka zachowuje pierwszeństwo, czy ustępuje zmianie zewnętrznej przez sterowanie ręczne.

Zmiana może pochodzić ze standardowej karty klimatu Home Assistant, fizycznego termostatu lub pilota IR zgłaszającego stan przez integrację, aplikacji producenta aktualizującej Home Assistant, skryptu lub automatyzacji wywołującej urządzenie bezpośrednio albo dowolnego innego źródła omijającego Velair.

Velair pokazuje stan oddania kontroli pod etykietą **Regulacja ręczna**. „Ręczne” opisuje źródło kontroli nad urządzeniem, nie stanowi dowodu, że zmianę wykonał człowiek.

<a id="the-two-independent-questions"></a>
## Dwa niezależne zagadnienia

Velair rozdziela następujące pojęcia:

| Pojęcie | Zakres | Znaczenie |
| --- | --- | --- |
| Automatyczny harmonogram | Jedno urządzenie | Velair może stosować jego efektywny harmonogram. |
| Sterowanie ręczne | Jedno urządzenie | Zewnętrzna nastawa lub tryb HVAC ma tymczasowo pierwszeństwo. |
| Tryb Velair **Ręczny** | Cały zestaw aktywnych Profili | Profile wybrano bezpośrednio, zamiast przez zapisany Tryb niestandardowy. |
| Wzmocnienie | Jedno urządzenie | Velair celowo stosuje tymczasową temperaturę. |
| Pauza strefy | Jedno urządzenie | Jeden lub więcej niezależnych powodów blokuje harmonogram i może wyłączać urządzenie. |
| Globalna pauza lub zatrzymanie | Wszystkie urządzenia | Harmonogram jest globalnie wstrzymany albo wyłączony. |

Stany mogą współistnieć. Tryb **Ręczny** może wybierać Profil `Sleep`, gdy `climate.living_room` jest sterowane ręcznie. Profil pozostaje obowiązującą konfiguracją harmonogramu, ale to urządzenie zachowuje zewnętrzną nastawę do końca sterowania ręcznego.

<a id="what-velair-observes"></a>
## Co obserwuje Velair

Velair obserwuje pola sterowania zarządzanych urządzeń:

- `hvac_mode`, reprezentowany przez stan encji, w tym `off`, `heat`, `cool`, `auto` i `heat_cool`;
- `temperature` dla pojedynczej temperatury;
- `target_temp_low` i `target_temp_high` dla natywnego zakresu.

Nie włącza sterowania ręcznego wskutek samej zmiany `current_temperature` lub `hvac_action`, wilgotności, dostępności, ustawień wentylatora, presetu, kierunku nawiewu lub zadanej wilgotności ani możliwości urządzenia, takich jak minimum temperatury czy obsługiwane tryby.

Zmiana termostatu z `cool` przy `24 °C` na `cool` przy `23 °C` jest wykrywaną zmianą nastawy. Wzrost temperatury pomieszczenia z `24 °C` do `25 °C` bez zmiany celu nią nie jest.

Monitorowane są wyłącznie urządzenia wybrane przy konfiguracji integracji. Stan początkowy przy uruchomieniu i przejścia do lub ze stanów `unknown` i `unavailable` są pomijane.

<a id="how-velair-recognizes-its-own-commands"></a>
## Rozpoznawanie własnych poleceń

Wszystkie polecenia Velair przechodzą przez wspólny wewnętrzny adapter usług. Przed wywołaniem usługi Home Assistant Velair zapisuje zarządzaną encję, oczekiwane pola i wartości, `Context` wywołania oraz krótki termin ważności istniejący tylko podczas działania.

Przy zmianie stanu każde pole jest osobno porównywane z oczekiwaniami, z uwzględnieniem `target_temp_step`. Jeśli aktualizacja zawiera temperaturę pochodzącą od Velair i niezależny tryb HVAC, tylko temperatura zostaje przypisana do Velair.

Niektóre urządzenia podczas obsługi jednego polecenia chwilowo wracają do starej nastawy, pokazują wartość pośrednią lub zgłaszają tryb i temperaturę w różnej kolejności. Velair stosuje krótki, ograniczony czas stabilizacji tylko dla zmienionych przez siebie pól, aby takie aktualizacje nie tworzyły fałszywego sterowania ręcznego. Odpowiedź urządzenia nie rozpoczyna tego czasu od nowa; jego termin jest ustalany po zakończeniu całej sekwencji usług Home Assistant. Zmiana wyraźnie pochodząca od użytkownika lub rozpoznawalnego innego skryptu czy automatyzacji pozostaje zewnętrzna, a zmiany po stabilizacji są obsługiwane normalnie.

Jeśli anonimowej aktualizacji podczas stabilizacji nie można wiarygodnie odróżnić od dochodzenia urządzenia do oczekiwanego stanu, Velair zachowuje automatykę. Zapobiega to traktowaniu odrzuconego lub opóźnionego polecenia jako zmiany ręcznej. Stan stabilizacji znika przy restarcie. Jeśli po jej zakończeniu urządzenie nadal różni się od żądanej wartości, automatyka pozostaje aktywna, a Velair zapisuje ostrzeżenie o stabilizacji polecenia. Następny świeży raport Diagnostyki pokazuje oczekiwane i zaobserwowane wartości. Velair nie ponawia polecenia w ciemno ani nie zamienia rozbieżności w opóźnione sterowanie ręczne.

Rejestr oczekiwań ma ograniczony rozmiar, wygasa automatycznie, nie jest trwale zapisywany i nie odpytuje urządzeń. Zachowanie `Context` nie jest konieczne, choć pozwala dokładniej dopasować kandydatów.

Pole sterowania, którego nie da się powiązać z poleceniem Velair, jest klasyfikowane jako pochodzące spoza Velair. To przypisanie pochodzenia, nie identyfikacja sprawcy: funkcja nie rozstrzyga, czy źródłem był człowiek, pilot, automatyzacja, usługa producenta czy oprogramowanie urządzenia.

<a id="choose-a-policy"></a>
## Wybór polityki

Otwórz **Ustawienia**, znajdź urządzenie i wybierz politykę w sekcji **Korekty zewnętrzne**. Backend zapisuje ją dla tego urządzenia; jest także częścią przenośnych danych strefy. Obowiązuje od następnej zmiany zewnętrznej. Jej zmiana nie kończy ani nie modyfikuje już aktywnej sesji ręcznej.

<a id="keep-automatic"></a>
### Zachowanie automatyki

Wartość wewnętrzna: `keep_automatic`.

To ustawienie domyślne, również dla konfiguracji starszych niż funkcja zmian zewnętrznych. Velair zgłasza zmianę, pozostawia automatyczny harmonogram i natychmiast ustala aktualne obowiązujące polecenie. Jeśli ma ono kontrolę nad urządzeniem, zostaje zastosowane zwykłą, szeregowaną ścieżką. Może to być harmonogram Default lub Profilu, Wzmocnienie, aktywne przygotowanie, korekta Room Assist, `off`, pojedyncza temperatura lub natywny zakres.

Istniejące pauzy i warunki harmonogramu nadal obowiązują. Pauza z akcją `none`, globalna pauza, wyłączona strefa, zatrzymany harmonogram lub brak aktualnego celu nie wysyła żadnego polecenia. Pauza strefy lub Profilu z `turn_off` ponownie wymusza `off`.

<a id="manual-until-the-next-schedule-block"></a>
### Ręcznie do następnego bloku

Wartość wewnętrzna: `until_next_block`.

Velair zachowuje stan zewnętrzny do początku kolejnego efektywnego bloku urządzenia, następnie wraca do automatyki i stosuje obowiązujące wtedy polecenie.

Termin jest wyliczany na początku sesji ręcznej. Kolejna zmiana aktualizuje zachowany stan, ale nie przesuwa tego terminu. Gdy nie ma przyszłego bloku, sesja nie wygasa automatycznie; w razie potrzeby wznów automatyczny harmonogram.

Granica następnego bloku używa zaplanowanego czasu bloku, także `Off`, zamiast przewidywanego wcześniejszego startu. Na przykład regulacja o `18:05` przy `Off` o `19:00` i ogrzewaniu o `20:00` kończy się o `19:00`, nawet jeśli przewidywany start ogrzewania byłby wcześniejszy.

<a id="manual-for-a-duration"></a>
### Ręcznie przez określony czas

Wartość wewnętrzna: `for_duration`.

Velair zachowuje stan przez ustawioną liczbę minut. Początkowo jest to 120 minut, a dopuszczalny zakres wynosi od 1 do 10 080 minut, czyli siedmiu dni. Dotychczasowe zapisane wartości, w tym 60 minut, pozostają bez zmian. Każda nowa wykryta zmiana sterowania rozpoczyna odliczanie ponownie, według czasu zapisanego dla aktywnej sesji, nawet jeśli w międzyczasie zmieniono Ustawienia. Zdarzenie zmiany zewnętrznej podaje tę politykę sesji, nie nowszą wartość domyślną.

<a id="manual-until-resumed"></a>
### Ręcznie do wznowienia

Wartość wewnętrzna: `until_resumed`.

Stan zewnętrzny jest zachowywany bezterminowo. Użytkownik lub automatyzacja musi jawnie wznowić automatykę.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Rozpoczęcie sterowania ręcznego

Dla każdej kwalifikującej się zmiany objętej jedną z trzech polityk ręcznych Velair wykonuje jedno szeregowane przejście:

1. Przechwytuje pełny tryb HVAC i pojedynczą temperaturę lub zakres ze zdarzenia zmiany stanu.
2. Trwale zapisuje zarezerwowany powód sterowania ręcznego dla strefy.
3. Kończy aktywne Wzmocnienie bez przywracania go ani poprzedniego harmonogramu.
4. Wycofuje Room Assist bez przywracania jego poprzedniej korekty.
5. Zachowuje lub w razie potrzeby ponownie stosuje przechwycony stan.
6. Przegląd wybiera sterowanie ręczne, pozostawiając dostępną opcję automatycznego harmonogramu.

Wejście w stan ręczny jest możliwe, gdy globalna automatyka działa, strefa jest włączona, Profil jej nie wstrzymuje i nie ma niezależnej pauzy strefy innej niż Wzmocnienie. Zdarzenie `external_climate_change_detected` pojawia się także wtedy, gdy warunki blokują wejście. Aktywne Wzmocnienie jest wyjątkiem: zmiana zewnętrzna zastępuje je zgodnie z opisem niżej.

Tabela przedstawia wynik zmiany spoza Velair przy polityce, która w innych warunkach uruchomiłaby stan ręczny:

| Stan przed zmianą | Zdarzenie | Wejście w stan ręczny | Natychmiastowe działanie |
| --- | --- | --- | --- |
| Brak pauzy i Wzmocnienia | Emitowane | Tak | Zachowanie całego zewnętrznego trybu i celu. |
| Niezależna pauza z `none` | Emitowane | Nie | Brak polecenia; dotychczasowa pauza nadal oddaje kontrolę. |
| Niezależna pauza z `turn_off` | Emitowane | Nie | Ponowne `off`; zewnętrzne włączenie nie omija pauzy. |
| Aktywna pauza Profilu, także z `turn_off` | Emitowane | Nie | Ta ścieżka wykrywania nic nie wysyła; sama obserwacja nie ponawia akcji Profilu. |

Globalna pauza i wyłączona strefa działają podobnie: zdarzenie jest emitowane, stan ręczny nie powstaje i ta ścieżka nie wysyła nowej temperatury harmonogramu.

Podczas sterowania ręcznego Velair nadal oblicza efektywny harmonogram Default, Profilu lub Trybu, ale nie stosuje go dla tego urządzenia. Pozostałe urządzenia pracują normalnie.

Velair nie tworzy automatycznie Wzmocnienia, nie zmienia Profilu ani Trybu, nie zgaduje sprawcy, nie kopiuje nastawy do harmonogramu, nie zmienia polityki innych urządzeń, nie usuwa niezależnych pauz ani nie czeka na osiągnięcie temperatury.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Wznowienie automatycznego harmonogramu

Sterowanie ręczne kończy się po upływie czasu, nadejściu kolejnego bloku, użyciu przycisku w przeglądzie lub wywołaniu `velair.resume_automatic_control`.

Velair usuwa tylko zarezerwowany powód ręczny i ustala aktualne obowiązujące polecenie: harmonogram aktywnego Profilu, Default gdy Profil nie obejmuje strefy lub deleguje ją do Default, pauzę Profilu wraz z `turn_off`, inną niezależną pauzę albo stan globalnego harmonogramu.

Nie przywraca bloku obowiązującego na początku sesji. To ważne, jeśli w międzyczasie zmienił się Profil, Tryb, harmonogram, pauza lub godzina.

Jeśli pozostaje niezależna pauza strefy, strefa nadal jest wstrzymana. Przy efektywnej akcji `turn_off` wyłączenie ma pierwszeństwo. Zakończenie sterowania ręcznego nie oznacza usunięcia wszystkich powodów pauzy.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Wznowienie z `off` przy zachowaniu bieżącego trybu

**Tylko temperatura** jest oddzielnym wyborem bloku. Podczas takiego bloku zewnętrzna zmiana trybu HVAC pozostaje pod kontrolą zewnętrzną i sama nie rozpoczyna sterowania ręcznego. Zmiana temperatury docelowej nadal podlega skonfigurowanej polityce. Pauza i sterowanie ręczne nadal zatrzymują wysyłanie harmonogramu; wznowienie stosuje bieżący blok bez włączania wyłączonego urządzenia. Dotyczy to również wznowienia przez automatykę okien. Jawne Wzmocnienie lub późniejszy blok z określonym trybem HVAC nadal mogą je włączyć.

**Zachowaj bieżący tryb** oznacza, że blok nie określa trybu HVAC. Dla bloku temperatury obowiązują zwykłe zasady:

- Włączone urządzenie zachowuje tryb i otrzymuje temperaturę, jeśli ją obsługuje; w przeciwnym razie wykonanie kończy się błędem bez zmiany trybu.
- Przy `off` wybierany jest pierwszy zgodny obsługiwany tryb inny niż `off`, według kolejności podanej przez urządzenie, i stosowana jest temperatura bloku.

Urządzenie tylko grzewcze z `[off, heat]` wznawia blok `21 °C` jako `heat`, `21 °C`. Urządzenie tylko chłodzące z `[off, cool]` wznawia go jako `cool`, `21 °C`. Urządzenie dwukierunkowe może podawać kilka zgodnych trybów. Velair korzysta z ich kolejności, nie zgaduje ogrzewania lub chłodzenia według pory roku, miejsca ani liczbowej temperatury. Ustaw jawny tryb HVAC, jeśli wybór ma być jednoznaczny.

Blok zawierający tylko opcje stosuje wyłącznie wybrane ustawienia. Nie wysyła temperatury ani nie włącza wyłączonego urządzenia.

Dla encji przyjmującej wyłącznie zakresy zgodnymi trybami pracy są zgłaszane `heat`, `cool`, `auto` i `heat_cool`. Zachowanie trybu z Off używa pierwszego z nich w zgłoszonej kolejności. Encje obsługujące oba formaty używają zapisanej [polityki formatu celu według trybu](usage.pl.md#target-format-by-climate-and-mode); przy wznawianiu zgodnego zakresu z Off zachowana jest preferencja `heat_cool`. Tylko temperatura może zapisać obie granice przy wyłączeniu, jeśli zgłoszono obsługę zakresu i zgodny tryb; nigdy nie włącza w tym celu urządzenia.

<a id="complete-real-world-examples"></a>
## Pełne przykłady z codziennego użycia

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>
### Zachowanie automatyki: odrzucenie zmiany z karty klimatu

Konfiguracja:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Godzina | Działanie | Wynik |
| --- | --- | --- |
| 18:00 | Velair stosuje `heat`, `21 °C`. | Automatyczny harmonogram |
| 18:20 | Użytkownik wybiera `23 °C` na karcie klimatu. | Zdarzenie `external_climate_change_detected` z `policy: keep_automatic`. |
| 18:20 | Velair ustala nadal aktywny blok. | Ponowne `heat`, `21 °C`; bez stanu ręcznego i zdarzenia `zone_control_changed`. |

Ta sama zasada dotyczy chłodzenia, `off`, zakresów `heat_cool`, Wzmocnienia, przygotowania i Room Assist: ponownie stosowane jest polecenie mające pierwszeństwo w chwili wykrycia. Przykłady używają Celsjusza, ale działanie w Fahrenheitach jest identyczne.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Karta Home Assistant: zachowanie zmiany do pory snu

Konfiguracja:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Przebieg:

| Godzina | Działanie | Stan urządzenia | Sterowanie Velair |
| --- | --- | --- | --- |
| 18:00 | Velair stosuje blok. | `cool`, `24 °C` | Automatyczne |
| 19:15 | Użytkownik wybiera `22 °C` na karcie. | `cool`, `22 °C` | Ręczne do 22:00 |
| 20:00 | Room Assist otrzymuje nowy odczyt. | Nadal `22 °C`, bez korekty. | Ręczne |
| 22:00 | Rozpoczyna się kolejny efektywny blok. | Velair stosuje `cool`, `25 °C`. | Automatyczne |

`22 °C` jest respektowane jako tymczasowe polecenie, bez zapisywania w którymkolwiek bloku.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### Pilot IR: włączenie klimatyzatora wyłączonego harmonogramem

Konfiguracja:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Przebieg:

| Godzina | Działanie | Stan urządzenia | Sterowanie Velair |
| --- | --- | --- | --- |
| 13:00 | Blok Velair wyłącza urządzenie. | `off` | Automatyczne |
| 14:10 | Domownik wybiera pilotem `cool`, `23 °C`. | Integracja zgłasza `cool`, `23 °C`. | Ręczne |
| 16:00 | Harmonogram nadal przewiduje Off. | Nadal `cool`, `23 °C`. | Ręczne |
| 17:30 | Użytkownik wznawia automatyczny harmonogram. | Velair ustala bieżący blok Off i wyłącza urządzenie. | Automatyczne |

Wymaga to zgłaszania zmiany pilota przez integrację. Polecenia IR niewidocznego w Home Assistant nie można wykryć.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Zmiana komfortu na 60 minut, zmieniona ponownie

Konfiguracja: `for_duration`, 60 minut.

| Godzina | Działanie | Wynik |
| --- | --- | --- |
| 09:00 | Harmonogram stosuje `heat`, `20 °C`. | Automatyczny harmonogram |
| 09:20 | Użytkownik wybiera `22 °C`. | Stan ręczny wygasa o 10:20. |
| 09:50 | Użytkownik wybiera `21 °C`. | Zachowane `21 °C`; termin przesuwa się na 10:50. |
| 10:50 | Brak kolejnych zmian zewnętrznych. | Velair stosuje polecenie obowiązujące o 10:50. |

<a id="repeated-change-with-next-block-policy"></a>
### Powtórna zmiana przy polityce następnego bloku

Konfiguracja: `until_next_block`; następny blok o 22:00.

| Godzina | Działanie | Wynik |
| --- | --- | --- |
| 19:15 | Zmiana z `24 °C` na `22 °C`. | Stan ręczny kończy się o 22:00. |
| 20:30 | Zmiana z `22 °C` na `23 °C`. | Zachowana wartość to `23 °C`; termin nadal 22:00. |
| 22:00 | Kolejny blok. | Powrót do automatyki i zastosowanie bloku. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>
### Włączenie Profilu przy jednym urządzeniu sterowanym ręcznie

Konfiguracja:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Godzina | Działanie | Salon | Pozostałe strefy Profilu |
| --- | --- | --- | --- |
| 20:00 | Użytkownik ustawia w salonie `22 °C`. | Ręcznie `22 °C` | Działają normalnie |
| 21:00 | Włączenie `Sleep`. | Nadal `22 °C`; konfiguracja `Sleep` ma pierwszeństwo dla harmonogramu. | `Sleep` stosowany od razu, o ile inne stany nie mają pierwszeństwa. |
| 21:30 | Wznowienie automatyki w salonie. | Zastosowanie `Sleep`: `cool`, `25 °C`. | Bez zmian |

Wybór niestandardowego Trybu działa tak samo: może zmienić zestaw Profili, lecz nie anuluje sterowania ręcznego strefy. Bezpośredni wybór Profili może jednocześnie pokazywać Tryb **Ręczny** i stan ręczny urządzenia; etykiety opisują różne rzeczy.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Wybór kilku Profili lub Trybów podczas sterowania ręcznego

Załóżmy stan zewnętrzny `heat`, `22 °C`. Użytkownik kolejno wybiera Home (`21 °C`), Away (`17 °C`) i Sleep (`18 °C`). Velair przez cały czas zachowuje `22 °C`. Po wznowieniu stosuje tylko bieżące `18 °C` z Sleep. Nie odtwarza Home ani Away i nie przywraca dawnej temperatury Default.

<a id="profile-pause-and-turn_off"></a>
### Pauza Profilu i `turn_off`

Profil wstrzymujący strefę, włączony podczas aktywnego sterowania ręcznego, pozostawia stan zewnętrzny do końca sesji. Po wznowieniu:

- Pauza bez wyłączania nie wysyła nowego celu; strefa wraca do automatyki, ale nadal podlega pauzie Profilu.
- Pauza z `turn_off` wyłącza urządzenie.

Jeśli pauza Profilu istniała już przed zmianą zewnętrzną, zdarzenie `external_climate_change_detected` nadal jest emitowane, ale stan ręczny nie powstaje. Samo wykrycie nie ponawia pauzy ani `turn_off`; jedynie zgłasza obserwację. Późniejsza zmiana Profilu, jawne zastosowanie harmonogramu lub inne przejście harmonogramu ponownie ustala działanie Profilu.

<a id="external-adjustment-during-a-boost"></a>
### Zmiana zewnętrzna podczas Wzmocnienia

| Godzina | Działanie | Wynik |
| --- | --- | --- |
| 12:00 | Wzmocnienie `cool`, `20 °C` do 13:00. | Wzmocnienie |
| 12:20 | Zewnętrzne `cool`, `23 °C`. | Wzmocnienie kończy się bez przywracania; stan ręczny zachowuje `23 °C`. |
| 12:45 | Wznowienie automatyki. | Zastosowanie harmonogramu obowiązującego o 12:45. |

Stare Wzmocnienie nie wraca, a jego pierwotny termin 13:00 nie steruje już urządzeniem.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist bez konfliktu sterowania

Przy zaplanowanych `24 °C` chłodzenia, tymczasowych `26 °C` Room Assist i zewnętrznym wyborze `23 °C` Velair przechwytuje stan zdarzenia, zanim oczekujące zadanie Room Assist zdoła go zastąpić. Zatrzymuje wspomaganie bez przywracania `24 °C` i zachowuje `23 °C`. Po wznowieniu ustala bieżący harmonogram, a Room Assist może wyliczyć nową korektę z aktualnych odczytów.

<a id="native-heat_cool-range"></a>
### Natywny zakres `heat_cool`

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair wykrywa `target_temp_low` i `target_temp_high`, przechwytuje pełny stan `heat_cool` i zachowuje `19–24 °C` podczas sesji ręcznej. Po wznowieniu stosuje cały zakres aktualnego bloku. Nigdy nie sprowadza go do pojedynczej temperatury.

To samo przechwytywanie i przywracanie pełnej pary dotyczy encji obsługujących tylko zakres w Ogrzewaniu, Chłodzeniu i Auto. Pozostały atrybut `temperature` nie zastępuje dwóch granic. Jeśli obserwowana para jest niepełna lub nieprawidłowa, Velair nie tworzy celu przywracania z tego pojedynczego atrybutu.

<a id="independent-window-pause-while-manual"></a>
### Niezależna pauza okna podczas sterowania ręcznego

Przy ręcznych `23 °C` automatyzacja okna wywołuje `velair.pause_zone` z `pause_id: window` i `action: turn_off`. Łączna akcja pauz to wyłączenie, więc urządzenie zostaje wyłączone. `velair.resume_automatic_control` usuwa tylko stan ręczny; powód `window` pozostaje i urządzenie nadal jest wyłączone. Automatyzacja okna musi usunąć własny powód przez `velair.resume_zone`.

<a id="changing-the-policy-with-a-service"></a>
## Zmiana polityki usługą

Przykłady korzystają z aktualnej składni akcji Home Assistant.

Zachowanie automatyki i ponowne zastosowanie bieżącego polecenia:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Zachowanie stanu zewnętrznego do kolejnego bloku:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Zachowanie przez 90 minut:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Zachowanie do jawnego wznowienia:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` jest używane przez `for_duration`; po wyborze innej polityki pozostaje zapisanym czasem strefy. Usługi odrzucają niezarządzane encje, nieznane polityki i czas spoza zakresu 1–10 080 minut.

Zmiana podczas sesji ręcznej wpływa dopiero na następną zmianę zewnętrzną po jej zakończeniu. Aktywna sesja zachowuje politykę, czas, źródło i termin. Zakończ ją z przeglądu lub przez `velair.resume_automatic_control`.

<a id="enter-manual-adjustment-explicitly"></a>
## Jawne rozpoczęcie sterowania ręcznego

Przegląd zawsze pokazuje sterowanie Velair jako automatyczny harmonogram albo sterowanie ręczne. Obie opcje pozostają widoczne w przełączniku segmentowym. Wybór ręcznej przechwytuje bieżący tryb HVAC i pełną temperaturę lub zakres. Zwykle korzysta z polityki i czasu zapisanych w Ustawieniach zmian zewnętrznych. Jeśli zapisana jest polityka zachowania automatyki, jawne działanie używa ręcznego sterowania do wznowienia, nie zmieniając zapisanej polityki. Wybór automatyki wznawia aktualne polecenie Velair. Wybranie już aktywnej opcji nic nie robi.

Podczas sesji przegląd pokazuje dokładną politykę zakończenia i termin pod przełącznikiem oraz utrzymywaną fizyczną nastawę lub zakres, zamiast niewysyłanego celu harmonogramu. Jeśli sesja nie może się rozpocząć, segment pozostaje widoczny z dostępnym objaśnieniem: urządzenie jest niedostępne lub wyłączone w Velair, automatyka zatrzymana, Profil wstrzymuje strefę albo inna pauza ma kontrolę. Opcja jest także zablokowana podczas nierozstrzygniętej migracji temperatur, ponieważ konfiguracja i sesje ręczne pozostają wtedy niezmienne. Wzmocnienie nie blokuje działania, bo sesja je zastępuje.

Równoważna akcja także korzysta z zapisanej polityki i przyjmuje tylko `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Aby uzyskać 90 minut, najpierw zapisz `for_duration` i `duration_minutes: 90` przez `velair.set_external_change_policy`, potem wywołaj tę akcję. Odrzuca ona urządzenia niezarządzane, wyłączone, `unknown` i `unavailable` oraz zablokowane globalnym zatrzymaniem, pauzą Profilu lub niezależną pauzą strefy. Wzmocnienie zostaje zastąpione. Ogrzewanie, chłodzenie, `off`, pojedyncze temperatury i zakresy `heat_cool` są przechwytywane tą samą szeregowaną ścieżką.

<a id="resume-with-a-service"></a>
## Wznowienie usługą

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Akcja jest idempotentna: wywołana dla już automatycznego zarządzanego urządzenia nic nie robi. Odrzuca niezarządzane encje.

Nie używaj zarezerwowanego ID `velair.manual_adjustment` w `velair.pause_zone` ani `velair.resume_zone`. Velair je odrzuca, aby jeden mechanizm odpowiadał za stan ręczny. Zwykłe `velair.resume_zone` nie usuwa sterowania ręcznego.

<a id="automations-and-events"></a>
## Automatyzacje i zdarzenia

Wszystkie zdarzenia działania Velair używają `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Obserwowanie każdej zewnętrznej zmiany sterowania

Zdarzenie pojawia się, gdy co najmniej jednego zmienionego pola trybu lub temperatury nie można przypisać do Velair:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

Dla zakresu `changed_fields`, `previous` i `current` korzystają odpowiednio z `target_temp_low` i `target_temp_high`, zamiast `temperature`. Zawierają wyłącznie pola zewnętrzne. Pole powiązane z Velair zostaje pominięte nawet w tej samej aktualizacji Home Assistant.

Przykładowa automatyzacja powiadomienia:

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

<a id="observe-entry-into-or-exit-from-manual-adjustment"></a>
### Obserwowanie początku i końca sesji ręcznej

Dane wejścia:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

Dla `until_resumed` nie ma `until`. Dane wyjścia:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

Automatyczne wygaśnięcie używa `reason: expired`. Zdarzenie oznacza zmianę powodu ręcznego; inna pauza nadal może blokować zastosowanie harmonogramu.

Pełny kontrakt opisują [Zdarzenia automatyzacji](automation-events.pl.md).

<a id="restart-and-availability-behavior"></a>
## Restart i dostępność

Polityka strefy i aktywny powód ręczny są trwale zapisywane. Po restarcie Home Assistant:

- niewygasła lub bezterminowa sesja pozostaje ręczna;
- stosowanie aktywnego harmonogramu po uruchomieniu nie omija sesji;
- po zapisanym terminie sesja zostaje usunięta i ustalane jest bieżące polecenie;
- eksport przenośny zawiera politykę, ale celowo pomija stan aktywnej sesji.

Przechwycony zewnętrzny tryb i nastawa istnieją tylko podczas działania; nie są zapisywane ani odtwarzane po restarcie. Zwykle urządzenie zachowuje i zgłasza swój stan, a zapisany powód ręczny nadal blokuje harmonogram. Jeśli urządzenie zresetuje się lub zgłosi inną temperaturę, Velair nie odtwarza starego obrazu stanu. Czeka na wygaśnięcie lub wznowienie, a następnie stosuje aktualne polecenie.

Przejścia do lub ze stanów `unknown` i `unavailable` są ignorowane. Zmiana pilotem, której integracja nie mogła zgłosić, a po której następuje tylko powrót z `unavailable`, nie jest traktowana jako nowa zmiana zewnętrzna. Późniejsze zmiany trybu lub temperatury są już wykrywane normalnie.

<a id="attribution-limits"></a>
## Ograniczenia przypisywania pochodzenia

Rozpoznawanie jest celowo przybliżone, ponieważ integracje i urządzenia różnie zgłaszają stan:

- Działania fizycznego lub po stronie producenta niewidocznego w Home Assistant nie można wykryć.
- Urządzenie może raportować tryb i temperaturę w kilku aktualizacjach, powodując kilka zdarzeń obserwacyjnych. Automatyzacje powinny być idempotentne.
- Działanie spoza Velair z dokładnie taką samą wartością jak nadal ważne oczekiwanie może zostać przypisane do Velair.
- Jeśli urządzenie nigdy nie potwierdza przyjętej nastawy, oczekiwanie może pozostać aktywne do krótkiego terminu wygaśnięcia.
- Sam powrót dostępności jest pomijany.
- Zmiany wyłącznie wentylatora, presetu, kierunku nawiewu, wilgotności lub odczytów środowiskowych nie należą do pierwszego zakresu tej funkcji.

Bezpieczne znaczenie `external_climate_change_detected` brzmi: „Velair zaobserwował zmianę sterowania, której nie mógł przypisać własnemu poleceniu”, a nie „udowodnił, że konkretna osoba zmieniła termostat”.

<a id="troubleshooting-checklist"></a>
## Lista kontroli przy problemach

Jeśli oczekiwana sesja ręczna nie pojawia się:

1. Sprawdź, czy urządzenie jest zarządzane przez Velair.
2. Sprawdź globalną automatykę i włączenie strefy.
3. Sprawdź, czy aktywny Profil nie wstrzymuje już strefy.
4. Sprawdź, czy źródło zmienia w Home Assistant `hvac_mode`, `temperature` lub zakres, a nie tylko wyświetlacz producenta czy opcję wentylatora lub presetu.
5. Sprawdź, czy podczas przejścia encja nie była `unknown` lub `unavailable`.
6. Nasłuchuj `velair_event` z filtrem `event: external_climate_change_detected`.
7. Przejrzyj Diagnostykę i logi Home Assistant pod kątem błędu zachowania stanu lub wywołania usługi.

Jeśli wznowiona strefa nie stosuje oczekiwanej temperatury, sprawdź bieżący Profil i Tryb, harmonogram Default, niezależne powody pauzy, globalny stan oraz to, czy blok jest Off albo zachowuje tryb. Wznowienie zawsze korzysta z aktualnego polecenia, nigdy historycznej kopii harmonogramu.
