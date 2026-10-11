<a id="external-schedule-execution"></a>
# Externe schema-uitvoering
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Vertaalstatus](../translation-status.md)

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

Normaal beheert Velair zowel de opslag van schema's als de uitvoering van klimaatopdrachten. Voor compatibele apparaten kun je onder **Instellingen → Externe systemen** het effectieve weekschema publiceren naar een regelaar die het zelfstandig uitvoert.

Dit onderdeel verschijnt wanneer Velair een ondersteunde Home Assistant-integratie met een compatibel beheerd klimaatapparaat detecteert, of wanneer een zone al extern wordt bestuurd. Maak en bewaar vóór het inschakelen een effectief schema met ten minste één temperatuurblok voor de zone. Als er niets te publiceren is, behoudt Velair de lokale besturing en legt het in de instellingen uit welke voorwaarde ontbreekt. Door een extern systeem voor een zone te kiezen, wordt de externe besturing opgeslagen voordat Velair de volledige week uploadt. Een mislukte upload herstelt de lokale uitvoering niet: de zone blijft extern en toont de publicatiefout, zodat twee planners elkaar nooit tegenwerken. Na een geslaagde Home Assistant-serviceaanroep meldt Velair het schema als gepubliceerd. Dit betekent dat de externe integratie het verzoek heeft geaccepteerd; Velair doet geen uitspraak over de toepassing door de fysieke regelaar.

Externe uitvoering is bewust beperkt tot schema's. Velair stuurt geen klimaatopdrachten naar een externe zone, waaronder het toepassen bij opstarten of van het huidige schema, tijdelijke aanpassingen, pauzeren/hervatten, handmatige aanpassingen, Room Assist en adaptieve voorconditionering. Profielen en modi worden uitsluitend gebruikt om een schema te kiezen: `normal` publiceert de standaardweek van de zone en `schedule` de profielweek. Pauzegedrag is niet beschikbaar voor externe zones. Het kiezen van Standaard, een profiel of een modus en het wijzigen van een actief profiel publiceren de nieuwe effectieve volledige week nadat de keuze is opgeslagen. Een publicatiefout draait de globale profiel- of moduskeuze niet terug en heeft geen invloed op lokale zones.

Als je Standaard, een profiel of een modus opnieuw kiest terwijl de runtime-status `failed` is of er nog geen geslaagde publicatie is, start ook één nieuwe publicatie. Velair probeert dit niet automatisch opnieuw; deze publicatie ontstaat uitsluitend door de expliciete keuze.

<a id="evohome-via-ramses_cc"></a>
## Evohome via ramses_cc

Het eerste ondersteunde systeem gebruikt de Home Assistant-service `ramses_cc.set_zone_schedule`. Velair heeft geen Python-afhankelijkheid van `ramses_cc` en communiceert uitsluitend via Home Assistant-services.

De instellingen en de profiel-editor leiden de voorwaarden af uit de mogelijkheden van de regelaar en tonen ze één keer onder de externe regelaar, ook als meerdere zones deze gebruiken. De regelaardetails zijn standaard ingeklapt en kunnen worden geopend om de grenzen te bekijken.

Huidige beperkingen:

- verwarmingsschema's met één doeltemperatuur per schakelmoment;
- precies zeven weekdagen, met behoud van de doorlopende Velair-weekplanning;
- geen uitschakelblokken, temperatuurbereiken, koelmodi of klimaatopties;
- maximaal zes naar de regelaar omgezette schakelmomenten per dag;
- als het eerste blok na `00:00` begint, voegt Velair een schakelmoment om middernacht toe om de continuïteit te bewaren. Dit impliciete moment telt mee voor het dagmaximum, waardoor er die dag ruimte is voor vijf bewerkbare blokken;
- tijdstippen op het raster van 5 minuten van de regelaar;
- temperaturen worden naar Celsius geconverteerd voor de gegevens die naar de regelaar gaan.

Voor extern uitgevoerde zones tonen de dag-editors van standaard- en profielschema's het huidige gebruik van de regelaar direct boven de blokken. De eerste regel geeft het gebruikte en maximale aantal schakelmomenten aan; de tweede maakt onderscheid tussen bewerkbare schemablokken en een impliciet continuïteitsmoment om middernacht. De aanduiding verandert bij het bereiken van de limiet en wanneer het concept deze overschrijdt. Dit wordt afgeleid uit de gemelde mogelijkheden van de gekozen regelaar; de backendcontrole bij publicatie blijft bepalend.

Het overzicht blijft de normale schema-activiteit en de volgende gebeurtenis voor een externe zone tonen. Een compacte aanduiding **Extern** noemt de regelaar en gebruikt een statuspictogram voor publiceren, geaccepteerd, mislukt of niet beschikbaar. De informatieknop legt uit dat de regelaar de geplande tijdlijn uitvoert en dat Velair geen klimaatopdrachten naar de zone stuurt. De plannerstatus toont ook een informatieve melding wanneer een of meer zichtbare zones externe uitvoering gebruiken.

Detectie vereist de service voor het instellen van schema's, een geladen `ramses_cc`-configuratie-item en een beheerde `climate`-entiteit die ondersteuning meldt voor verwarmen en één doeltemperatuur. De openbare entiteitsmetadata van Home Assistant maakt niet voor elk apparaat onderscheid tussen Evohome-zones en andere `ramses_cc`-klimaatentiteiten. Daarom vormt de serviceaanroep de uiteindelijke compatibiliteitscontrole; een fout blijft zichtbaar als publicatiefout.

Dit integratiepad heeft geautomatiseerde tests voor serviceaanroepen. Praktijktests op een Evohome-installatie met `ramses_cc` hebben ook de publicatie en het bewaren op de regelaar voor de geteste weekschema's bevestigd. Ervaringen met meer installaties en schemacombinaties blijven nuttig.

Publicatie heeft slechts drie runtime-statussen: **publishing**, **published** en **failed**. Vóór de eerste publicatie tijdens de huidige Home Assistant-runtime is er geen publicatiestatus. De status wordt niet opgeslagen en staat los van de huidige beschikbaarheid van de aanbieder.

Velair roept `get_zone_schedule` niet aan, voegt geen vertragingen toe, probeert niet automatisch opnieuw en vraagt de status niet voortdurend op. Deze mechanismen zouden Velair nog steeds niet in staat stellen om onafhankelijk van de aanbieder vast te stellen wat de fysieke hardware uitvoert.
