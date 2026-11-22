<a id="adaptive-preconditioning"></a>
# Adaptieve voorconditionering
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.3-dev.20261120233407 |
| Laatst gesynchroniseerd | 2026-11-21 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Met adaptieve voorconditionering kan Velair vóór het begin van een schemablok gaan verwarmen of koelen, zodat de kamer dichter bij de doeltemperatuur is wanneer het blok begint.

Een schemablok om `07:00` met `21 °C` betekent bijvoorbeeld: «zorg dat het om `07:00` ongeveer `21 °C` is», niet «begin om `07:00` met het aanpassen naar `21 °C`».

Adaptieve voorconditionering draait lokaal in Home Assistant. Velair bewaart instellingen en leerwaarnemingen in de Home Assistant-opslag en stuurt geen temperatuurgeschiedenis, waarnemingen of kalibratiegegevens naar een externe regelaar. Zones die externe schema-uitvoering gebruiken, maken geen gebruik van adaptieve voorconditionering; alleen hun effectieve weekschema wordt gepubliceerd.

Een blok met **Alleen temperatuur** staat geen HVAC-moduswijziging toe. Zolang het klimaatapparaat uitstaat, start Velair geen voorbereiding vooraf en verzamelt het geen thermische leermetingen voor dat doel. Na extern inschakelen kan de voorbereiding opnieuw worden berekend met de werkelijke compatibele modus. Deze optie kan geen comfort op de begintijd van het blok beloven zolang het apparaat uitstaat.

<a id="setup"></a>
## Instellen

Het tabblad Voorconditionering bevat adaptieve instellingen en leergegevens per onafhankelijk klimaatapparaat of kamergroep. Groepsleden verschijnen hier als één kamer. Geplande terugkeer heeft een eigen tabblad voor bezetting, wekelijkse aankomsten en huidige afwezigheid. Beide hebben een inleiding en contextuele hulp. De directe paden zijn `/velair/preconditioning` en `/velair/planned-return`. Eerdere onderdeelverwijzingen openen nog steeds het juiste tabblad. Zie [Geplande terugkeer](planned-return.nl.md).

1. Open Voorconditionering.
2. Vouw het gewenste klimaatapparaat of de kamergroep uit.
3. Schakel voorconditionering in.
4. Behoud de modelstandaarden tenzij je een specifieke reden hebt om ze aan te passen.
5. Selecteer eventueel een buitentemperatuursensor.

Voorconditionering wordt per onafhankelijk apparaat of kamergroep ingesteld. Leerdata voor verwarmen en koelen blijft gescheiden; monsters uit de ene richting vervangen de andere niet.

Een [kamergroep](room-groups.nl.md#learning-and-membership-changes) bewaart één thermisch model en neemt één startbeslissing. Leden leren en bereiden niet onafhankelijk voor. De temperatuurreferentie levert de eigen meting, of een ingeschakelde Room Assist-sensor de effectieve kamermeting. Een lid verwijderen herstart leren voor dat lid en de resterende groep. Opheffen begint voor iedereen een onafhankelijke geschiedenis; oude worden niet gesplitst of hersteld. Hernoemen of herschikken behoudt het groepsleren.

Oorspronkelijke `heat_cool`-bereiken worden ondersteund. Als de kamertemperatuur meer dan het minimale temperatuurverschil onder de ondergrens ligt, berekent Velair de voorspelling vanaf die ondergrens en past het volledige bereik eerder toe om te verwarmen. Als de kamer meer dan dat verschil boven de bovengrens ligt, gebeurt hetzelfde vanaf de bovengrens voor koeling. Bij metingen binnen het bereik of binnen de dode band aan de grenzen blijft de normale schematijd gelden. Velair verstuurt altijd beide grenzen en maakt van een bereik nooit één temperatuur.

Kies voor twee instelpunten in vaste `heat` of `cool` bij **Instellingen → Klimaatapparaten en groepen** het **Referentie-instelpunt** voor apparaat en modus: **Onderste instelpunt** of **Bovenste instelpunt**, afhankelijk van wat het apparaat werkelijk gebruikt. Room Assist deelt deze instelling. Voorbereiding en leren gebruiken alleen die grens als verwarmings- of koeldoel. De modus bepaalt de richting, ook bij bovenste grens voor verwarmen of onderste voor koelen. Velair start het volledige nominale paar vroeg, ook bij Geplande terugkeer, nooit alleen de referentiegrens.

Bij **Niet ingesteld** behouden paren in vaste modi hun geplande tijd en produceren ze geen thermische leermonsters. Geplande terugkeer past ze zonder voorbereiding bij aankomst toe. `auto`-bereiken houden deze beperking: een grens kiezen bepaalt het verwarmings-/koelgedrag niet. Oorspronkelijk `heat_cool` blijft ongewijzigd. Referentiewijzigingen maken leerwaarnemingen met de oude interpretatie ongeldig.

<a id="temporary-setpoint-offset"></a>
## Tijdelijke instelpuntverschuiving

**Verwarmingsverschuiving** en **Koelverschuiving** voegen optioneel extra aansturing toe tijdens vroege voorbereiding. Beide beginnen op `0`, zodat het bestaande gedrag behouden blijft. Kies elke waarde in de effectieve temperatuurstap van het apparaat, tot `5 °C` (`9 °F`). De hoogste keuze is de grootste passende stap binnen die grens. Dit zijn temperatuurverschillen: een verwarmingsverschuiving van `2 °C` telt twee graden op; een koelverschuiving van `2 °C` trekt twee graden af.

Het geplande kamerdoel en leerdoel blijven gelijk. Voorbereiding voor een verwarmingsblok van `21 °C` met verschuiving `2 °C` verstuurt tijdelijk `23 °C`. Voorbereiding voor een koelblok van `24 °C` met verschuiving `1.5 °C` verstuurt tijdelijk `22.5 °C`. Bij minimaal temperatuurverschil `0.1 °C` eindigen deze voorbereidingen bij respectievelijk `20.9 °C` en `24.1 °C`. De verschuiving vervalt ook bij de blokstart. Velair stemt daarna het actuele schema, Room Assist en andere actieve regelingen af via het bestaande gedrag voor opdrachtuitvoering en herstel.

Bij twee instelpunten verschuiven beide grenzen evenveel. Een verwarmingsband `20–24 °C` met gevraagde verschuiving `3 °C` en fysiek maximum `25 °C` wordt `21–25 °C`: de band blijft vier graden breed en de effectieve verschuiving daalt tot `1 °C`. Koelen werkt spiegelbeeldig bij het fysieke minimum. De effectieve extra wordt naar beneden afgerond op een passende verschil-stap en overschrijdt nooit de gevraagde waarde. Zonder resterende ruimte kan een positief ingestelde verschuiving `0 °C` toepassen; de voorbereidingsrichting blijft toch actief tot de oorspronkelijke kamerdrempel.

Een gewijzigde verschuiving wist alleen de leergegevens voor die richting. Voorspeller, steekproefselectie en geldigheidsregels voor waarnemingen blijven gelijk. Sessies waarvan de effectieve verschuiving varieert door apparaatgrenzen of Room Assist blijven volgens die bestaande regels bruikbaar. Herstellen van de standaardinstellingen voor voorconditionering zet beide verschuivingen op nul, wist alleen richtingen waarvan de verschuiving veranderde en behoudt de aparte Room Assist-instellingen, inclusief afremming.

Als het apparaat later een andere stap meldt, bewaart Velair de opgeslagen aanvraag en beperkt alleen de toegepaste extra tot een passende stap. Omrekenen van de temperatuureenheid behoudt het fysieke verschil en wist het leerproces niet. Draagbaar model `28` koppelt geëxporteerde leergegevens aan de ingestelde verschuiving van hun richting; leergegevens importeren vereist een overeenkomende resulterende configuratie. Oudere leergegevens gelden als verschuiving nul. Als een import van alleen configuratie een verschuiving verandert, wist dit de behouden lokale leergegevens voor die richting.

Het paneel houdt **Gepland doel** en de aan Velair toegeschreven waarde op het oorspronkelijke doel. De bestaande markering **Toegepast doel** toont de uiteindelijke opdracht. Een actief verschuivingslabel toont de effectieve extra met teken, inclusief een beperkte nul; de details verklaren oorspronkelijk doel, Room Assist-basis, gevraagde extra, effectieve extra, uiteindelijke opdracht en apparaatbeperkingen.

<a id="after-reaching-the-target"></a>
## Na het bereiken van het doel

Als een geaccepteerde vroege voorbereiding de aankomstdrempel vóór de blokstart bereikt, behoudt Velair het oorspronkelijke blokdoel tot het geplande tijdstip. De tijdelijke verschuiving eindigt bij aankomst. Dit werkt ook met verschuiving nul, zonder Room Assist en wanneer de waarneming te kort is om een leermeting te worden.

Bijvoorbeeld: het huidige blok is `20 °C` en voorbereiding voor een toekomstig blok van `21 °C` eindigt bij `20.9 °C`. Overzicht houdt **Doel** op `21 °C`, in plaats van na de waarneming terug te gaan naar `20 °C`. Met verwarmingsverschuiving `2 °C` keert de tijdelijke opdracht `23 °C` terug naar nominaal `21 °C`. Als **Toegepast** ook `21 °C` is, wordt de dubbele waarde zoals gebruikelijk verborgen. Koelen werkt spiegelbeeldig: een toekomstig doel `24 °C` dat bij `24.1 °C` wordt bereikt, behoudt nominaal `24 °C` na afloop van de tijdelijke opdracht `22 °C`. Room Assist kan de gewone correctie of afremming toepassen op dat nominale doel.

Velair bewaart de voltooide voorbereiding lokaal en controleert na herstart het bijbehorende schema en de regelcontext. **Actief schema toepassen na opstarten** blijft bepalen of er een opdracht wordt verstuurd:

| Opstartoptie | Geldige voltooide voorbereiding vóór het blok |
| --- | --- |
| Ingeschakeld | Het herstelde nominale doel, bijvoorbeeld `21 °C`, normaal toepassen. De voorbereidingsverschuiving niet herstellen. |
| Uitgeschakeld | Nominaal `21 °C` herstellen voor paneel en huidige intentie, zonder door dit herstel een doel, modus of andere blokopties te versturen. Het werkelijke toegepaste doel apart tonen als dit afwijkt. |

Herstel opent het leerproces niet opnieuw en schakelt de extra niet opnieuw in als de kamertemperatuur verandert terwijl Home Assistant offline is. Een succesvol opgeslagen voltooiing is nodig; alleen een gemeld instelpunt bewijst niet dat voorbereiding voltooid is. Mislukt opslaan garandeert geen continuïteit na een volgende herstart. Pauzes, handmatige aanpassing, tijdelijke overrides, uitgeschakelde voorbereiding en vervangen schema's of eigenaarschap houden voorrang. Een gewijzigd referentie-instelpunt, groepslidmaatschap of actieve Modus maakt een opgeslagen voltooiing ook ongeldig als de voorbereide context niet meer overeenkomt. Op het nominale bloktijdstip neemt de gewone planning over.

Zonder bevestigde voltooide vroege voorbereiding blijft het bestaande onderscheid geldig: **Doel** `20 °C` en **Toegepast** `21 °C` kunnen verschillende geplande en apparaatwaarden aangeven. Alleen voorconditionering inschakelen verandert dat niet.

<a id="live-predictions"></a>
## Actuele voorspellingen

Wanneer je een klimaatapparaat uitvouwt, krijgt elke ondersteunde modus een kaart met een actuele voorspelling. Deze gebruikt dezelfde backendgegevens voor de volgende gebeurtenis als het tabblad Overzicht. Pauzes, tijdelijke aanpassingen, niet-ondersteunde modi en blokken zonder mogelijkheid voor voorconditionering worden daardoor op dezelfde manier afgehandeld. Als er een passend toekomstig blok bestaat, toont de kaart de berekende starttijd, de doeltijd, de voorbereidingstijd, de geplande temperatuur en modus en of Velair het beginmodel of vergelijkbare lokale geschiedenis gebruikt.

Open **Berekeningsdetails** op de voorspellingskaart als je een bepaalde berekening wilt controleren. Dit optionele onderdeel toont de backendwaarden voor die voorspelling, zoals aantallen waarnemingen, de schatting uit voltooide waarnemingen, de ondergrens uit gedeeltelijke waarnemingen, de gecombineerde schatting, de afronding en de uiteindelijke voorbereidingstijd. Het is standaard verborgen om de normale weergave overzichtelijk te houden.

Voorbereiding voor Geplande terugkeer wordt apart onderscheiden van vooruitlopen op het weekschema. Voor een geaccepteerde toekomstige terugkeer tonen de gegevens per klimaatapparaat de terugkeerstatus, geschatte start, aankomstdoel en eventuele reden voor onderbreking of onbeschikbaarheid. Overzicht, Geplande terugkeer en klimaatkaarten gebruiken dezelfde terugkeergegevens van de backend; het is geen extra weekgebeurtenis. Een kamer kan nog de afwezigheidsmodus volgen terwijl een toekomstige terugkeerschatting zichtbaar is. **Voorbereiden** beschrijft de aansturingsintentie van Velair, geen bevestiging van ontvangst of fysiek verwarmen of koelen. De tijdlijn toont verstreken tijd richting de opgeslagen aankomst, geen percentage thermische voortgang. Zie [Kamervoorbereiding](planned-return.nl.md#room-preparation).

<a id="preconditioning-master"></a>
## Master voor voorconditionering

Laat **Master voor voorconditionering** op **Onafhankelijk** staan voor het bestaande gedrag. Wil je de vroege voorbereiding van een thermostaat afhankelijk maken van een andere, kies dan die beheerde thermostaat bij de afhankelijke kamer. Kies opnieuw **Onafhankelijk** om de koppeling te verwijderen. Dit geldt voor het effectieve schema van de kamer, inclusief profielen, zone-uitzonderingen en Geplande terugkeer. Temperaturen en blokken worden niet vervangen.

Een master kan meerdere afhankelijke kamers hebben. Een kamer kan niet van zichzelf afhangen. Ketens en cirkels zijn niet toegestaan: een afhankelijke kamer kan niet ook master zijn.

Velair kiest het masterblok waarvan de doeltijd het dichtst bij de doeltijd van het afhankelijke blok ligt. Bij gelijke afstand geldt het eerdere blok. De doeltijden hoeven niet gelijk te zijn. De afhankelijke kamer begint op het laatste van de eigen voorspelde start en de voorbereidingsstart van dat masterblok:

| Eigen start kamer | Start master | Doeltijd kamer | Effectieve start |
| --- | --- | --- | --- |
| 17:40 | 17:55 | 18:45 | 17:55 |
| 18:10 | 17:55 | 18:45 | 18:10 |
| 17:40 | Geen vroege voorbereiding | 18:45 | Normaal blok om 18:45 |
| 17:40 | 19:00 | 18:45 | Normaal blok om 18:45 |

Kan dat gekozen masterblok niet vroeg voorbereiden, dan kiest Velair geen vervangend blok. Voorbereiding voor verwarming kan geen voorbereiding voor koeling vrijgeven, of andersom. Bestaande pauzes, tijdelijke aanpassingen, beschikbaarheidscontroles en maximale voorbereidingstijden blijven gelden. Een onbeschikbare of uitgeschakelde master blijft ingesteld; de afhankelijke kamer wordt niet stilzwijgend onafhankelijk.

**Minimale voorsprong (min)** sluit nog steeds korte onafhankelijke voorspellingen uit. Wachten op de master kan, net als late opdrachtlevering, een korter werkelijk tijdvenster overlaten. Leren gebruikt dat resterende venster zonder een eerdere start te verzinnen of de geplande doeltijd te verschuiven.

De getoonde start is een voorspelling. Bij uitvoering moet de bijbehorende voorbereidingsopdracht van de master zijn geaccepteerd voordat een afhankelijke kamer mag starten. Dit bevestigt geen ketelrelais, waterstroming of werkelijk verwarmen/koelen. Velair verhoogt de temperatuur van de master niet om warmte voor andere kamers aan te vragen. Het normale schemablok blijft op zijn eigen tijd ingaan.

Leren begint wanneer de afhankelijke kamer werkelijk met de begrensde voorbereiding begint, met de temperatuur op dat moment en de resterende tijd tot het eigen blok. De bestaande regels voor vroeg bereiken, gedeeltelijke en ongeldige waarnemingen blijven gelden. Later afronden door de master stopt geen voorbereiding die al loopt in de afhankelijke kamer. Koppelen of ontkoppelen wist geen opgeslagen leerwaarnemingen.

Open **Berekeningsdetails** voor de onafhankelijke schatting, gekozen master en effectieve start. Diagnostiek toont de afhankelijkheidsreden naast de bestaande voorbereidings- en leergegevens. Opgeslagen verwijzingen naar opdrachtstarts bieden continuïteit na een herstart; een onderbroken leerobservatie wordt niet hervat en deze technische verwijzingen worden niet in draagbare exports opgenomen.

<a id="understanding-learning-activity"></a>
## Leeractiviteit begrijpen

Elke ondersteunde richting kan een korte verklaring naast de bestaande leergegevens tonen: Velair observeert een overgang, wacht op een geschikte overgang of kan om een bekende reden niet observeren. Dit beschrijft leren en bevestigt niet dat apparatuur fysiek verwarmt of koelt. Een eerdere overgang krijgt expliciet een datum en tijd en wordt niet als huidige activiteit getoond.

Open met de bijbehorende actie **Diagnostiek** die thermostaat en zijn geschiedenis voor Voorconditionering, zonder een datumfilter dat oudere vermeldingen verbergt. Het bestaande functieonderdeel toont de huidige activiteit en de laatst bewaarde leerovergang. Vouw de details uit om de beschikbare temperaturen, ingestelde drempels en tijdsduren voor de beslissing te bekijken. Zie [Leergegevens](diagnostics.nl.md#learning-evidence).

Een gelijkblijvend aantal waarnemingen bewijst geen storing. Een overgang kan onvoldoende bruikbaar temperatuurverschil bieden, een observatie kan nog lopen of het resultaat kan gedeeltelijk of ongeldig zijn. Verklaringen gebruiken alleen vastgelegde informatie en leiden daaruit geen ketelwerking of gedeelde warmtelevering af. Leerstatus en de voorspelling voor het volgende blok blijven apart: een kamer met weinig leerhistorie kan voor een bepaald doel toch geen vroege start nodig hebben.

<a id="how-it-starts"></a>
## Hoe het startmoment wordt bepaald

Velair berekent het huidige temperatuurverschil voor het volgende geplande temperatuurblok.

Bij een `heat_cool`-bereik betekent «doeltemperatuur» hieronder de ondergrens bij verwarmen en de bovengrens bij koelen. Bij een vast `heat`- of `cool`-bereik is dit de gekozen referentiegrens, met de richting van de vaste modus.

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

Tijdens voorbereiding berekent Room Assist eerst zijn gewone geldige basisdoel; daarna wordt de tijdelijke verschuiving toegevoegd. Een nominaal verwarmingsdoel `21 °C`, Room Assist-basis `22 °C` en verwarmingsverschuiving `2 °C` versturen bijvoorbeeld `24 °C` als het apparaat dat toestaat. Room Assist gebruikt die tijdelijke opdracht nooit als leerdoel voor de kamer. Een positief ingestelde verschuiving houdt de voorbereidingsrichting tijdelijk actief, ook als Room Assist een hysteresefase zonder vraag heeft overgenomen. Zodra de oorspronkelijke voorbereidingsdrempel wordt bereikt, gelden gewone hysterese en het gekozen afremniveau weer. Deze voorrang geldt ook wanneer fysieke grenzen de effectieve extra tot nul beperken; een ingestelde nul behoudt bestaand gedrag.

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
