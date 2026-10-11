<a id="adaptive-preconditioning"></a>
# Adaptieve voorconditionering
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Vertaalstatus](../translation-status.md)

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

Met adaptieve voorconditionering kan Velair vóór het begin van een schemablok gaan verwarmen of koelen, zodat de kamer dichter bij de doeltemperatuur is wanneer het blok begint.

Een schemablok om `07:00` met `21 °C` betekent bijvoorbeeld: «zorg dat het om `07:00` ongeveer `21 °C` is», niet «begin om `07:00` met het aanpassen naar `21 °C`».

Adaptieve voorconditionering draait lokaal in Home Assistant. Velair bewaart instellingen en leerwaarnemingen in de Home Assistant-opslag en stuurt geen temperatuurgeschiedenis, waarnemingen of kalibratiegegevens naar een externe regelaar. Zones die externe schema-uitvoering gebruiken, maken geen gebruik van adaptieve voorconditionering; alleen hun effectieve weekschema wordt gepubliceerd.

<a id="setup"></a>
## Instellen

Het tabblad Voorconditionering biedt twee onderdelen in de onderdeelkiezer. Adaptieve voorconditionering wordt standaard geopend; kies Geplande terugkeer om bezetting en wekelijkse aankomsten in te stellen en de huidige afwezigheid te beheren. De directe paneelpaden zijn `/velair/preconditioning/preconditioning` en `/velair/preconditioning/planned-return`. Zie [Geplande terugkeer](planned-return.nl.md).

1. Open het tabblad Voorconditionering.
2. Vouw het gewenste klimaatapparaat uit.
3. Schakel voorconditionering in.
4. Laat de standaardinstellingen van het model staan, tenzij je een concrete reden hebt om ze aan te passen.
5. Selecteer eventueel een buitentemperatuursensor.

Voorconditionering wordt per klimaatapparaat ingesteld. Verwarmen en koelen hebben afzonderlijke leergegevens: koelwaarnemingen vervangen geen verwarmingswaarnemingen en andersom.

Oorspronkelijke `heat_cool`-bereiken worden ondersteund. Als de kamertemperatuur meer dan het minimale temperatuurverschil onder de ondergrens ligt, berekent Velair de voorspelling vanaf die ondergrens en past het volledige bereik eerder toe om te verwarmen. Als de kamer meer dan dat verschil boven de bovengrens ligt, gebeurt hetzelfde vanaf de bovengrens voor koeling. Bij metingen binnen het bereik of binnen de dode band aan de grenzen blijft de normale schematijd gelden. Velair verstuurt altijd beide grenzen en maakt van een bereik nooit één temperatuur.

Wanneer je een klimaatapparaat uitvouwt, krijgt elke ondersteunde modus een kaart met een actuele voorspelling. Deze gebruikt dezelfde backendgegevens voor de volgende gebeurtenis als het tabblad Overzicht. Pauzes, tijdelijke aanpassingen, niet-ondersteunde modi en blokken zonder mogelijkheid voor voorconditionering worden daardoor op dezelfde manier afgehandeld. Als er een passend toekomstig blok bestaat, toont de kaart de berekende starttijd, de doeltijd, de voorbereidingstijd, de geplande temperatuur en modus en of Velair het beginmodel of vergelijkbare lokale geschiedenis gebruikt.

Open **Berekeningsdetails** op de voorspellingskaart als je een bepaalde berekening wilt controleren. Dit optionele onderdeel toont de backendwaarden voor die voorspelling, zoals aantallen waarnemingen, de schatting uit voltooide waarnemingen, de ondergrens uit gedeeltelijke waarnemingen, de gecombineerde schatting, de afronding en de uiteindelijke voorbereidingstijd. Het is standaard verborgen om de normale weergave overzichtelijk te houden.

<a id="how-it-starts"></a>
## Hoe het startmoment wordt bepaald

Velair berekent het huidige temperatuurverschil voor het volgende geplande temperatuurblok.

Bij een `heat_cool`-bereik betekent «doeltemperatuur» hieronder de ondergrens bij verwarmen en de bovengrens bij koelen.

Voor verwarmen:

```text
delta = target temperature - current temperature
```

Voor koelen:

```text
delta = current temperature - target temperature
```

Als het verschil kleiner is dan het minimale temperatuurverschil, houdt Velair de normale bloktijd aan en begint het niet eerder.

<a id="schedule-boundaries-and-other-climates"></a>

## Schemagrens en andere klimaattoestellen

Een vervroegde start in het weekschema mag het direct voorafgaande effectieve schemablok van hetzelfde klimaattoestel niet bereiken of overschrijden, ook een `Off`-blok niet. Als het berekende venster deze grens bereikt of overschrijdt, behoudt Velair de normale comforttijd. Bij `Off` om `19:00` en `heat` om `20:00` vervalt bijvoorbeeld een berekende start om `18:00`: `Off` wordt om `19:00` toegepast en de verwarming begint om `20:00`. Een `Off`-blok om `22:00` de vorige avond verhindert geen start om `05:35` voor `07:00` als er geen tussenliggend blok is. Dit geldt ook voor koeling en native `heat_cool`-bereiken; aankomstvoorspellingen voor de geplande terugkeer veranderen niet.

Een toestel dat al voorconditioneert, vertraagt geen schemablokken of vervroegde starts van andere toestellen. Als het verwerken van een actie een andere overgang passeert, bepaalt Velair het momenteel toegestane doel voor het betrokken toestel in plaats van verouderde opdrachten opnieuw uit te voeren. Pauzes, boosts, handmatige aanpassing, uitgeschakelde zones en externe schema-uitvoering blijven bepalen of een doel mag worden verzonden. Dit herstel geldt terwijl de planner draait; het ingestelde toepassingsgedrag bij opstarten blijft gelijk.

<a id="initial-model-example"></a>
## Voorbeeld met het beginmodel

Als er nog onvoldoende lokale geschiedenis is, gebruikt Velair het beginmodel:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Situatie:

- Gepland blok: `21 °C`, `heat`, doeltijd `07:00`
- Kamertemperatuur: `18 °C`
- Minimale voorbereidingstijd: `10 min`
- Beginmodel: `25 min/°C` of de equivalente `13.89 min/°F`
- Maximale voorbereidingstijd: `24 h`

Berekening:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair past de geplande doeltemperatuur om `05:35` toe en blijft `07:00` tonen als het tijdstip waarop comfort gewenst is.

<a id="heating-with-learned-history"></a>
## Verwarmen met opgebouwde leergegevens

Na voldoende geslaagde waarnemingen kan Velair vergelijkbare lokale geschiedenis gebruiken in plaats van het beginmodel.

Situatie:

- Gepland blok: `21 °C`, `heat`, doeltijd `07:00`
- Huidige kamertemperatuur: `18.5 °C`
- Huidig verschil: `2.5 °C`
- Vergelijkbare voltooide waarnemingen:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Bij een comfortpercentiel van `80` kiest Velair een conservatieve waarde uit de vergelijkbare voltooide waarnemingen. In dit voorbeeld is dat `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair rondt de uiteindelijke voorbereidingstijd naar boven af op de eerstvolgende ondersteunde plannerminuut, zodat de afgeronde waarde niet onder de berekende tijd ligt.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Voorbeeld voor koelen

Situatie:

- Gepland blok: `23 °C`, `cool`, doeltijd `22:00`
- Kamertemperatuur: `27 °C`
- Minimale voorbereidingstijd: `10 min`
- Beginmodel: `25 min/°C`
- Maximale voorbereidingstijd: `24 h`

Berekening:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Als het klimaatapparaat later voldoende koelwaarnemingen heeft, gebruikt Velair uitsluitend de koelgeschiedenis. Verwarmings- en koelgeschiedenis worden niet gemengd: dezelfde kamer en hetzelfde apparaat kunnen met verschillende snelheden verwarmen en koelen.

<a id="partial-and-invalid-observations"></a>
## Gedeeltelijke en ongeldige waarnemingen

Velair bewaart compacte lokale waarnemingen na pogingen tot voorconditionering.

Voltooide waarnemingen zijn bruikbare voorbeelden waarbij de kamer op tijd de doeldrempel bereikte.

Gedeeltelijke waarnemingen betekenen dat Velair eerder is gestart, maar de kamer de doeldrempel niet vóór het geplande comforttijdstip bereikte. Ze vormen een ondergrens: Velair weet dat meer tijd nodig was, maar verzint geen tijdstip waarop het doel zou zijn bereikt.

Ongeldige waarnemingen worden alleen voor diagnose bewaard en sturen het model niet aan. Voorbeelden zijn zeer kleine temperatuurverschillen, onmogelijke duurwaarden, onderbroken sessies, ontbrekende temperaturen, tijdelijke aanpassingen, pauzes of wijzigingen in de plannerstatus.

Als na oudere gedeeltelijke waarnemingen voldoende voltooide waarnemingen volgen die aantonen dat de kamer het doel nu betrouwbaar bereikt, dwingen die oudere gedeeltelijke waarnemingen de voorspelling niet langer omhoog.

<a id="outdoor-temperature-sensor"></a>
## Buitentemperatuursensor

De buitentemperatuursensor is optioneel.

Als deze is ingesteld, bewaart Velair de waarde als lokale context bij waarnemingen en vergelijkt het later de huidige omstandigheden met vergelijkbare eerdere waarnemingen. Velair raadpleegt geen weerservices, heeft geen internetverbinding nodig en voegt geen vaste correctie aan het beginmodel toe.

Als de buitensensor niet beschikbaar is wanneer een waarneming wordt opgeslagen, bewaart Velair de waarneming zonder die context.

<a id="room-assist-interaction"></a>
## Samenwerking met Room Assist

Standaard gebruikt adaptieve voorconditionering de `current_temperature` van de klimaatentiteit.

Als Ondersteuning via kamersensor voor dat klimaatapparaat is ingeschakeld en een kamersensor is geselecteerd, gebruikt adaptieve voorconditionering die kamersensor als effectieve kamertemperatuur voor beslissingen en het leerproces.

Dit is nuttig voor thermostatische radiatorkranen en thermostaten waarvan de ingebouwde sensor te dicht bij een radiator, luchtuitlaat of andere plaatselijke warmtebron zit. Zie [Room Assist](room-assist.nl.md) voor de werking aan de apparaatkant.

<a id="automation-events"></a>
## Gebeurtenissen voor automatiseringen

Velair gebruikt drie `velair_event`-gebeurtenissen voor deze cyclus:

- `preconditioning_plan_updated` wanneer een berekend plan verschijnt of verandert;
- `preconditioning_plan_cancelled` wanneer een gepubliceerd plan niet meer geldt;
- `preconditioning_observation_recorded` nadat een leerwaarneming is opgeslagen.

Zie [Gebeurtenissen voor automatiseringen](automation-events.nl.md#preconditioning-plan-updated) voor de precieze voorwaarden en volledige voorbeelden van de gegevens.

Voorbeeld van een automatiseringstrigger:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Wanneer Velair niets doet

Adaptieve voorconditionering begint niet eerder wanneer:

- voorconditionering voor dat klimaatapparaat is uitgeschakeld;
- de planner niet in automatische modus staat;
- de zone gepauzeerd is of een tijdelijke aanpassing heeft;
- het volgende blok `Uit` is;
- het apparaat de benodigde verwarmings- of koelrichting niet ondersteunt;
- het temperatuurverschil kleiner is dan het ingestelde minimum;
- de benodigde temperatuur niet beschikbaar of niet numeriek is.

<a id="lovelace"></a>
## Lovelace

De weergave Voorconditionering is beschikbaar als Lovelace-kaart:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

De Lovelace-kaart gebruikt dezelfde backendconfiguratie als het hoofdpaneel van Velair.

<a id="technical-details"></a>
## Technische details

Details voor ontwikkelaars over opslag, het leeralgoritme, gedeeltelijke waarnemingen, de weging van vergelijkbaarheid en API-uitvoer staan in [Interne werking van adaptieve voorconditionering](../developer/adaptive-preconditioning.md).
