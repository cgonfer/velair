<a id="external-schedule-execution"></a>
# Zewnętrzne wykonywanie harmonogramów
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Zwykle Velair odpowiada zarówno za zapis harmonogramów, jak i sterowanie encjami klimatu. Dla zgodnych encji **Ustawienia → Systemy zewnętrzne** pozwalają zamiast tego publikować efektywny harmonogram tygodniowy do sterownika, który wykonuje go niezależnie.

Sekcja jest widoczna, gdy Velair wykryje obsługiwaną integrację Home Assistant ze zgodną zarządzaną encją albo gdy strefa ma już zewnętrzny sterownik. Przed włączeniem zewnętrznego wykonywania utwórz i zapisz efektywny harmonogram z co najmniej jednym blokiem temperatury dla strefy. Jeśli nie ma czego publikować, Velair zachowuje lokalne sterowanie i wyjaśnia brakujący warunek w Ustawieniach. Wybranie systemu zewnętrznego dla strefy zapisuje zmianę odpowiedzialności za sterowanie, zanim Velair prześle cały tydzień. Nieudane przesłanie nie przywraca lokalnego wykonywania: strefa pozostaje zewnętrzna i pokazuje błąd publikacji, aby dwa systemy nie konkurowały. Po udanym wywołaniu usługi Home Assistant Velair zgłasza harmonogram jako opublikowany. Oznacza to, że zewnętrzna integracja przyjęła żądanie, nie że fizyczny sterownik je zastosował.

Zewnętrzne wykonywanie celowo obejmuje wyłącznie harmonogram. Velair nie wysyła do zewnętrznej strefy żadnych działań klimatycznych: stosowania bieżącego harmonogramu/przy uruchomieniu, Wzmocnienia, pauzy/wznowienia, regulacji ręcznej, Room Assist ani adaptacyjnego przygotowania temperatury. Profile i Tryby służą wyłącznie wyborowi harmonogramu: `normal` publikuje domyślny tydzień strefy, a `schedule` tydzień Profilu. Zachowanie Pauzy nie jest dostępne dla stref zewnętrznych. Wybranie harmonogramu domyślnego, Profilu lub Trybu oraz edycja aktywnego Profilu publikuje nowy efektywny cały tydzień po zapisaniu wyboru. Niepowodzenie publikacji nie cofa globalnego wyboru Profilu lub Trybu i nie wpływa na strefy lokalne. Ponowny wybór harmonogramu domyślnego, Profilu lub Trybu uruchamia też jedną nową publikację, jeśli bieżący stan działania to `failed` albo nie było udanej publikacji. Velair nie ponawia automatycznie; publikacja wynika wyłącznie z jawnego wyboru.

<a id="evohome-via-ramses_cc"></a>
## Evohome przez ramses_cc

Pierwszy obsługiwany system używa usługi Home Assistant `ramses_cc.set_zone_schedule`. Velair nie ma zależności Python od `ramses_cc` i komunikuje się wyłącznie przez usługi Home Assistant.

Ustawienia i edytor Profilu wyprowadzają te warunki z możliwości sterownika i wymieniają je raz pod sterownikiem zewnętrznym, nawet jeśli korzysta z niego kilka stref. Szczegóły są domyślnie zwinięte; można je rozwinąć, aby sprawdzić ograniczenia. Aktualne ograniczenia:

- harmonogramy ogrzewania z jedną temperaturą docelową w każdym punkcie zmiany;
- dokładnie siedem dni tygodnia, z zachowaniem ciągłości tygodniowej Velair;
- brak bloków wyłączających, zakresów temperatur, trybów chłodzenia i opcji klimatycznych;
- najwyżej sześć przekształconych punktów zmiany dziennie;
- gdy pierwszy blok zaczyna się po `00:00`, Velair dodaje punkt ciągłości o północy; ta niejawna zmiana wlicza się do limitu, pozostawiając miejsce na pięć edytowalnych bloków tego dnia;
- godziny zgodne z 5-minutowym krokiem sterownika;
- temperatury są przeliczane na stopnie Celsjusza w danych przekazywanych sterownikowi.

Dla stref wykonywanych zewnętrznie edytory dnia harmonogramu domyślnego i Profilu pokazują bieżące wykorzystanie sterownika bezpośrednio nad blokami. Pierwszy wiersz podaje wykorzystane i maksymalne punkty zmiany; drugi odróżnia edytowalne bloki od niejawnego punktu ciągłości o północy. Wskaźnik zmienia wygląd po osiągnięciu limitu i gdy szkic go przekracza. Wynika to z możliwości zgłaszanych przez wybrany sterownik; ostateczne sprawdzanie publikacji nadal należy do backendu.

Przegląd zachowuje zwykłe informacje o aktywności harmonogramu i następnym zdarzeniu strefy zewnętrznej. Kompaktowy wskaźnik **Zewnętrzny** wskazuje sterownik i używa ikon dla publikowania, przyjęcia, błędu i niedostępności. Jego przycisk informacji wyjaśnia, że sterownik wykonuje zaplanowaną oś czasu, a Velair nie wysyła do strefy działań klimatycznych. Stan harmonogramu pokazuje również informację, gdy co najmniej jedna widoczna strefa korzysta z zewnętrznego wykonywania.

Wykrywanie wymaga usługi ustawiania harmonogramu, załadowanej konfiguracji `ramses_cc` i zarządzanej encji `climate` zgłaszającej ogrzewanie oraz pojedynczą temperaturę docelową. Publiczne metadane encji Home Assistant nie odróżniają każdej strefy Evohome od wszystkich innych encji `ramses_cc`. Dlatego ostatecznym testem zgodności jest wywołanie usługi, a jego błąd pozostaje widoczny jako niepowodzenie publikacji.

Ta ścieżka integracji ma automatyczne testy usług. Testy rzeczywistej instalacji Evohome z `ramses_cc` potwierdziły również publikację i zachowanie testowanych tygodniowych harmonogramów w sterowniku. Opinie z kolejnych instalacji i kombinacji harmonogramów nadal są przydatne.

Publikacja ma tylko trzy stany działania: **publishing**, **published** i **failed**. Przed pierwszą publikacją w bieżącym uruchomieniu Home Assistant nie ma stanu publikacji. Stan ten nie jest zapisywany i jest niezależny od bieżącej dostępności dostawcy.

Velair nie wywołuje `get_zone_schedule`, nie dodaje opóźnień, nie ponawia automatycznie ani nie odpytuje. Te mechanizmy i tak nie pozwoliłyby Velair niezależnie od dostawcy potwierdzić, co wykonuje fizyczny sprzęt.
