<a id="temperature-units-and-migration"></a>
# Jednostki temperatury i migracja
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Status tłumaczeń](../translation-status.md)

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

Velair obsługuje stopnie Celsjusza i Fahrenheita zgodnie z jednostką temperatury skonfigurowaną w Home Assistant. Nie ma osobnego wyboru jednostki. Wykryta jednostka jest widoczna jako informacja tylko do odczytu w **Ustawienia > Jednostka temperatury**; zmień ją w ustawieniach systemu jednostek Home Assistant.

<a id="new-installations-and-resets"></a>
## Nowe instalacje i resetowanie

Podczas pierwszej konfiguracji Velair tworzy harmonogramy, wbudowane szablony, progi Komfortu, limity Room Assist i ustawienia adaptacyjnego przygotowania temperatury w jednostce wykrytej w Home Assistant. Resetowanie Velair odtwarza wartości domyślne dla aktualnie wykrytej jednostki.

Temperatury docelowe są sprawdzane względem minimum, maksimum i efektywnego kroku temperatury każdej zarządzanej encji klimatu. Velair bezpośrednio wykorzystuje `target_temp_step`, jeśli Home Assistant udostępnia ten atrybut. W przeciwnym razie w Ustawieniach pokazuje efektywną wartość zastępczą: ostatni prawidłowy krok zgłoszony przez encję, zapisaną ręcznie wartość dla strefy albo `1`, jeśli nie ma żadnej z nich. Możesz ustawić rzeczywisty krok urządzenia. Zapisanie go przy brakującym atrybucie usuwa zapamiętany odczyt, nie zmieniając reguł harmonogramu. Kolejny prawidłowy odczyt ma pierwszeństwo i zostaje ponownie zapamiętany. Dzięki temu niestabilna encja nie unieważni istniejących harmonogramów z wartościami dziesiętnymi przez samo pominięcie atrybutu.

Siatka dozwolonych temperatur docelowych zaczyna się od minimalnej temperatury publikowanej przez encję, a nie od zera. Pozwala to zachować rzeczywiste nastawy urządzenia w obu jednostkach, także gdy minimum nie jest dokładną wielokrotnością kroku.

<a id="existing-stored-data"></a>
## Istniejące zapisane dane

Velair zapisuje konfigurację temperatur wraz z jednostką danych. Po zmianie jednostki w Home Assistant nie interpretuje po cichu zapisanych liczb w inny sposób.

Gdy zapisane dane mają już określoną jednostkę, a Home Assistant zgłosi później drugą jednostkę, Velair:

1. zatrzymuje automatyczne wykonywanie harmonogramów i zapisy ustawień temperatury;
2. zachowuje aktywny stan przywracania Room Assist, zatrzymując jego nasłuchiwanie;
3. tworzy trwałe powiadomienie Home Assistant;
4. pokazuje jednostkę źródłową i docelową w Ustawieniach Velair;
5. udostępnia jawną migrację wszystkich zapisanych danych dotyczących temperatury.

Uruchom migrację tylko wtedy, gdy wszystkie zapisane wartości nadal używają wskazanej jednostki źródłowej. Operacja przelicza harmonogramy, szablony, aktywne i poprzednie temperatury docelowe nadpisań, zastępcze kroki temperatury, progi Komfortu, ustawienia Room Assist, konfigurację adaptacyjnego przygotowania temperatury, ostatnie zgłoszone kroki, tempo zmian i obserwacje wykorzystywane do uczenia. Temperatury powiązane ze znaną encją są dopasowywane do jej efektywnego kroku, jeśli jest dostępny. Pozostałe przeliczone wartości edytowalne zachowują bezpieczną precyzję, bez wymyślania kroku urządzenia.

Harmonogram wznawia działanie dopiero po prawidłowym zapisaniu przeliczonych danych i odtworzeniu stanu działania. Po powodzeniu Room Assist przywraca przeliczoną temperaturę z harmonogramu i usuwa zapisany stan przywracania. Jeśli dane zapisano, ale odtworzenie działania się nie powiedzie, Velair pozostaje zatrzymany i zgłasza konieczność ponownego załadowania integracji lub restartu Home Assistant.

<a id="upgrading-published-celsius-only-data"></a>
## Aktualizacja starszych danych obsługujących tylko stopnie Celsjusza

Opublikowane wersje Velair sprzed dodania metadanych jednostki traktowały zapisane temperatury jako stopnie Celsjusza. Dlatego Velair przyjmuje tę jednostkę dla starszych danych bez jej oznaczenia.

- Gdy Home Assistant używa stopni Celsjusza, Velair może nadal korzystać z tych wartości i zapisuje metadane jednostki.
- Gdy Home Assistant używa stopni Fahrenheita, Velair nie zgaduje, czy poszczególne wartości edytowano ręcznie. Zatrzymuje harmonogram i prosi o użycie działania **Zresetuj Velair**, które zastępuje starsze dane nowymi wartościami domyślnymi w stopniach Fahrenheita.

Eksport pozostaje dostępny podczas oczekiwania na reset. Możesz więc zachować kopię do wglądu przed usunięciem starych harmonogramów i ustawień.

<a id="export-and-import"></a>
## Eksport i import

Aktualne eksporty zawierają pole `temperature_unit`. Jeśli importowany plik używa innej jednostki, Velair przelicza wybrane sekcje dotyczące temperatury na aktualną jednostkę Home Assistant przed ich zapisaniem.

Starsze kopie bez `temperature_unit` są akceptowane i traktowane jako dane w stopniach Celsjusza. Ekran importu pokazuje to założenie przed importem. W instalacji używającej stopni Fahrenheita te starsze wartości są automatycznie przeliczane.

Import nadal zastępuje wybrane sekcje: pasujące harmonogramy, szablony, ustawienia lub dane uczenia zostają nadpisane. Najpierw wyeksportuj bieżącą konfigurację, jeśli możesz potrzebować punktu przywracania.

Ręczny zastępczy krok temperatury dla strefy jest częścią przenośnych danych strefy i przy zmianie jednostek przelicza się jako różnica temperatur. Ostatni krok odczytany z lokalnej encji stanowi wewnętrzny kontekst urządzenia i nie jest eksportowany.

<a id="temporarily-unavailable-climates"></a>
## Chwilowo niedostępne encje klimatu

Niedostępna encja może nie udostępniać zakresu ani kroku temperatury. Velair nadal może przeprowadzić migrację lub import danych, a następnie sprawdza harmonogramy, gdy encja ponownie opublikuje swoje możliwości. Niezgodny harmonogram jest oznaczany w panelu i wymaga poprawienia, zanim można na nim polegać.

<a id="what-velair-converts"></a>
## Co przelicza Velair

Zapisana konfiguracja i importowane kopie są przeliczane tylko podczas jawnej migracji lub importu. Bieżące odczyty i temperatury docelowe encji należą już do Home Assistant i nie są przeliczane ponownie. Odczyty z osobnych czujników pokojowych lub czujników temperatury na zewnątrz są przeliczane wyłącznie przy porównywaniu, jeśli ich zadeklarowana jednostka różni się od jednostki zarządzanej encji.
