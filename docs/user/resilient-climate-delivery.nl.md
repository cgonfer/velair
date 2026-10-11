<a id="resilient-climate-delivery"></a>
# Betrouwbare overdracht van klimaatopdrachten
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.1 |
| Laatst gesynchroniseerd | 2026-10-11 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Velair bewaart de actuele opdrachten van de planner wanneer een beheerde thermostaat tijdelijk opnieuw verbinding maakt.

Als een entiteit `unknown` of `unavailable` wordt, wacht Velair totdat Home Assistant meldt dat deze weer beschikbaar is. Dit werkt via statuswijzigingen; Velair vraagt de apparaatstatus niet voortdurend op. Bij het herstellen van de verbinding controleert Velair wat er *nu* actief moet zijn. De opdracht die vóór de onderbreking gold, wordt niet opnieuw afgespeeld.

Stel bijvoorbeeld dat een afwezigheidsprofiel 17 °C vroeg terwijl een thermostaat offline was. Als je de thuismodus kiest voordat de verbinding wordt hersteld, bepaalt en verstuurt Velair de actuele doeltemperatuur van die modus, niet de achterhaalde opdracht voor 17 °C. Dezelfde regel geldt voor modi, tijdelijke aanpassingen, pauzes, Room Assist en vervroegde adaptieve voorconditionering.

Wanneer Home Assistant een klimaataanroep expliciet weigert, probeert Velair deze hooguit twee keer opnieuw: na ongeveer 2 seconden en 10 seconden. Een nieuwere opdracht, het stoppen van Velair of het ontladen van de integratie annuleert het lopende werk voor dat apparaat.

Handmatige temperatuuracties worden eenmalig uitgevoerd. Velair past een oude handmatige doeltemperatuur niet alsnog toe nadat het apparaat opnieuw verbinding heeft gemaakt.

Een Velair-gebeurtenis die aangeeft dat een opdracht is toegepast, betekent dat Home Assistant de volledige reeks klimaataanroepen heeft geaccepteerd, inclusief de gevraagde modus en ondersteunde opties. Dit bevestigt niet dat het fysieke apparaat de temperatuur heeft bereikt. Bekijk de status van de klimaatentiteit en de diagnosegegevens van de apparaatintegratie om de fysieke werking te volgen.

Dit gedrag geldt voor verwarmen, koelen, afzonderlijke doeltemperaturen, oorspronkelijke `heat_cool`-bereiken, uitschakelen en ondersteunde ventilator-, preset-, zwenk- en vochtigheidsopties. Blokken met alleen opties gebruiken dezelfde controle op de overdracht, zonder een doeltemperatuur of HVAC-modus in te stellen. Hun serviceaanroepen worden achtereenvolgens uitgevoerd: als een latere aanroep mislukt, kan een eerdere optie al zijn gewijzigd, maar Velair meldt het volledige blok dan niet als toegepast.
