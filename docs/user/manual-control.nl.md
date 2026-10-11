<a id="external-changes-and-manual-adjustment"></a>
# Externe wijzigingen en handmatige aanpassing
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Vertaalstatus](../translation-status.md)

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

Velair kan herkennen wanneer HVAC-modus of doeltemperatuur van een beheerde `climate.*`-entiteit verandert zonder overeen te komen met een Velair-opdracht. Per apparaat kies je of Velair de automatische besturing behoudt of voorrang aan die externe wijziging geeft via handmatige aanpassing.

Een externe aanpassing kan komen van:

- de standaard Home Assistant-klimaatkaart;
- een fysieke thermostaat of infraroodafstandsbediening waarvan de integratie de nieuwe status meldt;
- een fabrikantapp waarvan de integratie Home Assistant bijwerkt;
- een script of automatisering die de klimaatentiteit rechtstreeks aanroept;
- elke andere bron die de entiteit buiten Velair om wijzigt.

Velair noemt de status waarin het voorrang geeft **Handmatige aanpassing**. «Handmatig» beschrijft wie één apparaat nu bestuurt; het beweert niet dat een persoon de wijziging heeft gemaakt.

<a id="the-two-independent-questions"></a>
## Twee onafhankelijke vragen

Velair houdt deze begrippen altijd gescheiden:

| Begrip | Reikwijdte | Betekenis |
| --- | --- | --- |
| Automatische planning | Eén beheerd apparaat | Velair mag het effectieve schema versturen. |
| Handmatige aanpassing | Eén beheerd apparaat | Een externe doeltemperatuur of modus heeft tijdelijk voorrang. |
| Velair-modus **Handmatig** | De gehele actieve profielverzameling | Profielen zijn rechtstreeks gekozen, zonder opgeslagen eigen modus. |
| Tijdelijke aanpassing | Eén apparaat | Velair past bewust een tijdelijk doel toe. |
| Zonepauze | Eén apparaat | Eén of meer onafhankelijke redenen blokkeren schema-overdracht, eventueel met uitschakelen. |
| Globale pauze of Stop | Alle apparaten | De planner is globaal gepauzeerd of uitgeschakeld. |

Deze statussen kunnen samen bestaan. Modus **Handmatig** kan bijvoorbeeld profiel `Sleep` kiezen terwijl `climate.living_room` een **Handmatige aanpassing** heeft. Het profiel blijft de leidende schemaconfiguratie, maar dat ene apparaat behoudt de externe instelling tot de handmatige aanpassing eindigt.

<a id="what-velair-observes"></a>
## Wat Velair waarneemt

Velair volgt deze besturingsvelden:

- `hvac_mode`, vertegenwoordigd door entiteitsstatus zoals `off`, `heat`, `cool` en `heat_cool`;
- `temperature` voor één doel;
- `target_temp_low` en `target_temp_high` voor een oorspronkelijk bereik.

Velair start geen handmatige aanpassing als alleen dit verandert:

- `current_temperature` of `hvac_action`;
- luchtvochtigheidsmetingen;
- beschikbaarheid;
- ventilator-, preset-, zwenk- of doelvochtigheidsopties;
- mogelijkheden zoals minimumtemperatuur of ondersteunde modi.

Van `cool` bij `24 °C` naar `cool` bij `23 °C` is bijvoorbeeld een doelwijziging. Een kamer die van `24 °C` naar `25 °C` opwarmt met ongewijzigd doel is dat niet.

Alleen in Velair geselecteerde apparaten worden gevolgd. Beginstatussen bij opstarten en overgangen naar of vanuit `unknown` of `unavailable` worden genegeerd.

<a id="how-velair-recognizes-its-own-commands"></a>
## Hoe Velair eigen opdrachten herkent

Alle Velair-klimaatopdrachten lopen via één interne serviceadapter. Vóór elke Home Assistant-aanroep registreert Velair:

- de beheerde entiteit;
- verwachte besturingsvelden en waarden;
- een Home Assistant-`Context` voor de aanroep;
- een korte vervaltijd, uitsluitend tijdens runtime.

Bij een entiteitswijziging koppelt Velair elk veranderd veld aan deze verwachtingen, rekening houdend met `target_temp_step`. Dit gebeurt per veld: als één update een Velair-temperatuur en onafhankelijke modus bevat, geldt alleen temperatuur als van Velair.

Sommige apparaten melden tijdens één opdracht meerdere waarden: kort een ouder doel, een tussenwaarde of modus en temperatuur in andere volgorde. Velair gebruikt een korte begrensde stabilisatieperiode voor uitsluitend gewijzigde velden, zodat die updates niet onterecht een handmatige aanpassing maken. De periode begint bij een echo niet opnieuw en wordt definitief vastgesteld nadat de hele servicereeks terugkeert. Een duidelijk door een gebruiker of andere herkenbare automatisering/script veroorzaakte wijziging blijft extern; na stabilisatie geldt normale detectie.

Als een anonieme update tijdens stabilisatie niet betrouwbaar van apparaatverwerking te onderscheiden is, behoudt Velair voorzichtig automatische besturing. Zo wordt een geweigerde of vertraagde eigen opdracht geen valse handmatige aanpassing. De stabilisatiestatus is runtimegebonden en wordt bij herstart gewist. Wijkt het apparaat na afloop nog af, dan blijft besturing automatisch en wordt een stabilisatiewaarschuwing vastgelegd. De volgende nieuwe Diagnose-momentopname toont verwacht en waargenomen resultaat. Velair herhaalt niet blind en maakt geen uitgestelde handmatige aanpassing.

Het verwachtingsregister is begrensd, vervalt automatisch, wordt nooit opgeslagen en gebruikt geen polling. Een bron hoeft `Context` niet te behouden om koppeling mogelijk te maken, maar behouden context maakt herkenning nauwkeuriger.

Elk waargenomen besturingsveld dat niet aan een Velair-opdracht kan worden gekoppeld, geldt als niet-Velair. Dit is toeschrijving, geen identiteit: Velair beweert niet te weten of persoon, afstandsbediening, automatisering, fabrikantservice of firmware de oorzaak was.

<a id="choose-a-policy"></a>
## Een beleid kiezen

Open **Instellingen**, zoek het beheerde apparaat en gebruik **Externe aanpassingen**. De backend bewaart dit per apparaat en neemt het in overdraagbare zonegegevens op. Het geldt vanaf de volgende externe wijziging; veranderen wijzigt of beëindigt geen actieve handmatige aanpassing.

<a id="keep-automatic"></a>
### Automatisch behouden

Interne waarde: `keep_automatic`.

Dit is de standaard, ook voor oudere configuraties. Velair meldt de externe wijziging, behoudt automatische planning en bepaalt meteen opnieuw de actuele leidende opdracht. Als een opdracht de besturing heeft, past Velair die via normale opeenvolgende overdracht opnieuw toe: Standaard, profiel, tijdelijke aanpassing, actieve voorconditionering, Room Assist, `off`, één doel of oorspronkelijk bereik.

Bestaande pauzes en plannervoorwaarden worden niet omzeild. Pauze `none`, globale pauze, uitgeschakelde zone, gestopte planner of ontbrekend actueel doel versturen niets. Een zone- of profielpauze met `turn_off` bevestigt opnieuw `off`.

<a id="manual-until-the-next-schedule-block"></a>
### Handmatig tot het volgende schemablok

Interne waarde: `until_next_block`.

Velair behoudt de externe status tot het volgende effectieve zoneblok begint en hervat dan automatisch met de op dat moment geldige opdracht.

De grens wordt bij het begin van handmatige aanpassing berekend. Nog een externe aanpassing binnen dezelfde periode wijzigt de behouden status maar verschuift de grens niet. Zonder toekomstig effectief blok is er geen automatisch einde; hervat automatisch wanneer gewenst.

De grens van het volgende blok gebruikt de geplande bloktijd, inclusief `Off`, in plaats van een voorspelde start van voorconditionering. Een aanpassing om `18:05` met `Off` om `19:00` en verwarming om `20:00` eindigt bijvoorbeeld om `19:00`, ook als de verwarmingsvoorspelling eerder zou beginnen.

<a id="manual-for-a-duration"></a>
### Handmatig voor een bepaalde duur

Interne waarde: `for_duration`.

Velair behoudt de externe status gedurende het ingestelde aantal minuten. De beginduur is 120 minuten; toegestaan is 1 tot 10 080 minuten (zeven dagen). Bestaande waarden, ook 60 minuten, blijven behouden. Elke nieuwe gedetecteerde externe besturingswijziging begint de duur opnieuw met de opgeslagen duur van de actieve periode, ook als Instellingen inmiddels veranderd is. De gebeurtenis over de externe wijziging vermeldt dat effectieve periodebeleid, niet de nieuwere standaardinstelling.

<a id="manual-until-resumed"></a>
### Handmatig tot hervatten

Interne waarde: `until_resumed`.

Velair behoudt de externe status onbeperkt. Gebruiker of automatisering moet automatische planning expliciet hervatten.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Wat gebeurt er bij het begin van handmatige aanpassing?

Voor elke geschikte externe wijziging met handmatig beleid voert Velair één opeenvolgende overgang uit:

1. Volledige HVAC-modus en enkel doel of bereik uit de statuswijzigingsgebeurtenis vastleggen.
2. Een gereserveerde handmatige pauzereden opslaan.
3. Actieve tijdelijke aanpassing stoppen zonder deze of het eerdere schema te herstellen.
4. Room Assist laten wijken zonder de eerdere schemacorrectie te herstellen.
5. De externe status behouden of zo nodig opnieuw toepassen.
6. In Overzicht **Handmatige aanpassing** selecteren en **Automatische planning** beschikbaar houden.

Dit kan alleen bij globaal actieve automatische planning, ingeschakelde zone, geen al pauzerend actief profiel en geen onafhankelijke niet-tijdelijke-aanpassingspauze. `external_climate_change_detected` wordt ook verstuurd als deze voorwaarden toegang verhinderen. Een actieve tijdelijke aanpassing is de uitzondering: de externe wijziging vervangt haar zoals hieronder.

Deze matrix geeft het exacte resultaat bij een externe besturingswijziging onder handmatig beleid:

| Voorafgaande status | Gebeurtenis | Handmatig starten | Onmiddellijke actie |
| --- | --- | --- | --- |
| Geen pauze of tijdelijke aanpassing | Verstuurd | Ja | Volledige externe modus en doel behouden. |
| Onafhankelijke zonepauze `none` | Verstuurd | Nee | Niets versturen; de bestaande pauze geeft besturing nog vrij. |
| Onafhankelijke zonepauze `turn_off` | Verstuurd | Nee | `off` opnieuw toepassen; extern aanzetten omzeilt de pauze niet. |
| Actieve profielpauze, ook `turn_off` | Verstuurd | Nee | In deze detectieroute niets versturen; de waarneming alleen herhaalt geen profielactie. |

Globale pauze of uitgeschakelde zone volgt hetzelfde informatieve patroon: gebeurtenis versturen, geen handmatige aanpassing maken, geen nieuw schemadoel via deze detectieroute sturen.

Tijdens handmatige aanpassing berekent Velair het effectieve standaard-, profiel- of modusschema verder, maar verstuurt het niet naar die zone. Andere apparaten gaan normaal door.

Velair doet niet automatisch het volgende:

- een tijdelijke aanpassing maken;
- profiel of modus wisselen;
- afleiden wie wijzigde;
- de wijziging naar een schema kopiëren;
- zonebeleid elders veranderen;
- onafhankelijke pauzes verwijderen;
- wachten tot de kamer de gevraagde temperatuur bereikt.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Wat gebeurt er bij automatisch hervatten?

Handmatige aanpassing eindigt bij afloop van de duur, bereiken van de blokgrens, de overzichtsknop of `velair.resume_automatic_control`.

Velair verwijdert alleen de gereserveerde handmatige reden en bepaalt de huidige leidende opdracht:

- een profielschema dat de zone bestuurt;
- Standaard zonder besturend profiel of bij doorverwijzing naar Standaard;
- profielpauze, inclusief `turn_off`;
- overige onafhankelijke pauzes of globale plannerstatus.

Het oude blok van bij het begin wordt niet hersteld. Dit is belangrijk als profiel, modus, schema, pauze of kloktijd ondertussen veranderde.

Een onafhankelijke pauze houdt de zone gepauzeerd; effectief `turn_off` blijft leidend. Handmatig hervatten is dus niet hetzelfde als alle zonepauzeredenen hervatten.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Vanuit `off` hervatten bij Huidige modus behouden

**Huidige modus behouden** geeft geen HVAC-modus op. Bij een temperatuurblok geldt de normale regel:

- als het apparaat aanstaat, modus behouden en doel toepassen indien ondersteund; anders mislukt overdracht zonder moduswissel;
- bij `off` de eerste geschikte ondersteunde niet-`off`-modus uit de apparaatvolgorde kiezen en het doel toepassen.

Een alleen-verwarmapparaat met `[off, heat]` en Keep-doel `21 °C` hervat als `heat`, `21 °C`; een alleen-koelapparaat met `[off, cool]` als `cool`, `21 °C`. Een omkeerbaar apparaat kan meerdere geschikte modi melden. Velair gebruikt die volgorde en leidt geen seizoen, geografie of richting uit het getal af. Geef een expliciete blokmodus op als de keuze vast moet staan.

Bij een blok met alleen opties worden alleen gekozen bedieningsopties toegepast: geen temperatuur en geen inschakeling vanuit uit.

<a id="complete-real-world-examples"></a>
## Volledige praktijkvoorbeelden

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>
### Automatisch behouden: een kaartdoelwijziging weigeren

Configuratie:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Tijd | Actie | Resultaat |
| --- | --- | --- |
| 18:00 | Velair past `heat`, `21 °C` toe. | Automatische planning |
| 18:20 | Gebruiker kiest `23 °C` op de HA-kaart. | `external_climate_change_detected` met `policy: keep_automatic`. |
| 18:20 | Velair bepaalt het nog geldende blok. | `heat`, `21 °C` opnieuw toegepast; geen handmatige aanpassing of `zone_control_changed`. |

Dezelfde regel geldt voor koelen, `off`, oorspronkelijke bereiken, tijdelijke aanpassingen, voorconditionering en Room Assist: de bij detectie leidende opdracht wordt opnieuw toegepast. Voorbeelden gebruiken Celsius; Fahrenheit werkt gelijk.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Home Assistant-kaart: behouden tot bedtijd

Configuratie:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Tijdlijn:

| Tijd | Actie | Apparaatresultaat | Velair-besturing |
| --- | --- | --- | --- |
| 18:00 | Blok toepassen. | `cool`, `24 °C` | Automatisch |
| 19:15 | Gebruiker kiest `22 °C`. | `cool`, `22 °C` | Handmatig tot 22:00 |
| 20:00 | Room Assist krijgt nieuwe meting. | Nog `22 °C`; geen correctie verstuurd. | Handmatig |
| 22:00 | Volgende blok begint. | `cool`, `25 °C` toegepast. | Automatisch |

`22 °C` geldt als tijdelijke instructie en komt niet in een schemablok.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### Infraroodafstandsbediening: een door het schema uitgezette airco aanzetten

Configuratie:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Tijdlijn:

| Tijd | Actie | Apparaatresultaat | Velair-besturing |
| --- | --- | --- | --- |
| 13:00 | Blok houdt het apparaat uit. | `off` | Automatisch |
| 14:10 | Bewoner kiest via afstandsbediening `cool`, `23 °C`. | Integratie meldt `cool`, `23 °C`. | Handmatig |
| 16:00 | Schema blijft Uit. | Nog `cool`, `23 °C`. | Handmatig |
| 17:30 | **Automatisch hervatten** gekozen. | Velair bepaalt Uit en schakelt uit. | Automatisch |

Dit werkt alleen als de integratie de afstandsbedieningswijziging aan Home Assistant meldt. Onzichtbare infraroodopdrachten zijn niet te detecteren.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Een comfortaanpassing van 60 minuten opnieuw wijzigen

Configuratie: `for_duration`, 60 minuten.

| Tijd | Actie | Resultaat |
| --- | --- | --- |
| 09:00 | Schema past `heat`, `20 °C` toe. | Automatisch |
| 09:20 | Gebruiker kiest `22 °C`. | Handmatig vervalt om 10:20. |
| 09:50 | Gebruiker kiest `21 °C`. | Blijft `21 °C`; verval verschuift naar 10:50. |
| 10:50 | Geen verdere wijziging. | Huidige leidende opdracht toegepast. |

<a id="repeated-change-with-next-block-policy"></a>
### Herhaalde wijziging met volgend-blokbeleid

Configuratie: `until_next_block`; volgend blok om 22:00.

| Tijd | Actie | Resultaat |
| --- | --- | --- |
| 19:15 | `24 °C` naar `22 °C`. | Handmatig eindigt om 22:00. |
| 20:30 | `22 °C` naar `23 °C`. | Waarde wordt `23 °C`; einde blijft 22:00. |
| 22:00 | Volgend blok. | Automatisch hervatten en dat blok toepassen. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>
### Een profiel activeren tijdens handmatige zonebesturing

Configuratie:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Tijd | Actie | Woonkamer | Overige profielzones |
| --- | --- | --- | --- |
| 20:00 | Woonkamer naar `22 °C`. | Handmatig `22 °C` | Normaal doorgaan |
| 21:00 | `Sleep` activeren. | Blijft `22 °C`; `Sleep` wordt leidende configuratie. | `Sleep` direct waar niet anders overschreven. |
| 21:30 | Woonkamer hervatten. | `Sleep`: `cool`, `25 °C`. | Ongewijzigd |

Een eigen modus kiezen werkt hetzelfde: de profielverzameling verandert, maar handmatige zonebesturing eindigt niet. Bij rechtstreeks gekozen profielen kan modus **Handmatig** tegelijk met zone **Handmatige aanpassing** zichtbaar zijn; de labels beschrijven iets anders.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Meerdere profielen of modi kiezen tijdens handmatige besturing

Stel extern `heat`, `22 °C`. Kies handmatig achtereenvolgens Home (`21 °C`), Away (`17 °C`) en Sleep (`18 °C`). Velair behoudt steeds `22 °C`. Hervatten past alleen het huidige Sleep-doel `18 °C` toe; geen Home/Away-herhaling of herstel van oud Standaard.

<a id="profile-pause-and-turn_off"></a>
### Profielpauze en `turn_off`

Een pauzerend profiel dat tijdens actieve handmatige aanpassing wordt geactiveerd, laat de externe status tot het einde behouden. Bij hervatten:

- zonder uitschakelen volgt geen nieuw doel; de zone is weer automatisch maar onder profielpauze;
- met `turn_off` schakelt het apparaat uit.

Was profielpauze al actief vóór de externe wijziging, dan wordt `external_climate_change_detected` wel verstuurd maar geen handmatige aanpassing gestart. De detectieroute herhaalt pauze of uitschakelen niet en meldt alleen de waarneming. Een latere profielwijziging, expliciete schematoepassing of andere plannerovergang bepaalt het profielgedrag opnieuw.

<a id="external-adjustment-during-a-boost"></a>
### Externe wijziging tijdens een tijdelijke aanpassing

| Tijd | Actie | Resultaat |
| --- | --- | --- |
| 12:00 | Tijdelijke aanpassing `cool`, `20 °C` tot 13:00. | Tijdelijke aanpassing |
| 12:20 | Gebruiker kiest `cool`, `23 °C`. | Tijdelijke aanpassing stopt zonder herstel; handmatig behoudt `23 °C`. |
| 12:45 | Automatisch hervatten. | Het nu geldige schema wordt toegepast. |

De oude tijdelijke aanpassing hervat niet en het oorspronkelijke einde om 13:00 bestuurt niet meer.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist zonder tegenwerkende besturing

Neem schema `24 °C` voor koeling, Room Assist tijdelijk `26 °C` en gebruiker extern `23 °C`.

Velair legt de gebeurtenisstatus vast voordat wachtende correcties deze kunnen vervangen, stopt Room Assist zonder `24 °C` te herstellen en behoudt `23 °C`. Bij automatisch hervatten bepaalt het het huidige schema en kan Room Assist een nieuwe correctie uit actuele metingen berekenen.

<a id="native-heat_cool-range"></a>
### Oorspronkelijk `heat_cool`-bereik

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair herkent `target_temp_low` en `target_temp_high`, legt de volledige `heat_cool`-status vast en behoudt `19–24 °C` tijdens handmatige aanpassing. Hervatten past het volledige actuele bereik toe. Het wordt nooit één doeltemperatuur.

<a id="independent-window-pause-while-manual"></a>
### Onafhankelijke raampauze tijdens handmatige besturing

Bij handmatig `23 °C` roept een raamautomatisering `velair.pause_zone` met `pause_id: window` en `action: turn_off` aan. De gecombineerde actie is uit. `velair.resume_automatic_control` verwijdert alleen handmatige aanpassing; `window` blijft en het apparaat blijft uit. De raamautomatisering moet haar reden met `velair.resume_zone` verwijderen.

<a id="changing-the-policy-with-a-service"></a>
## Beleid wijzigen via een service

Alle voorbeelden gebruiken de huidige Home Assistant-actienotatie.

Automatisch behouden en de huidige opdracht opnieuw toepassen:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Externe status tot het volgende blok behouden:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

90 minuten behouden:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Tot expliciet hervatten behouden:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` wordt door `for_duration` gebruikt en blijft de opgeslagen duur bij ander beleid. Services weigeren onbeheerde apparaten, onbekend beleid en duur buiten 1–10 080 minuten.

Beleid wijzigen tijdens handmatige besturing geldt pas voor de volgende externe aanpassing ná deze periode. De actieve periode behoudt beleid, duur, bron en vervalmoment. Beëindig via Overzicht of `velair.resume_automatic_control`.

<a id="enter-manual-adjustment-explicitly"></a>
## Handmatige aanpassing expliciet starten

Overzicht toont altijd **Velair-bediening** met **Automatische planning** en **Handmatige aanpassing** in een gedeelde keuzebalk. Kies handmatig om actuele HVAC-modus en volledig enkel doel/bereik vast te leggen. Normaal geldt het opgeslagen handmatige beleid onder **Instellingen > Externe aanpassingen**. Bij **Automatisch behouden** gebruikt de expliciete actie handmatig tot hervatten zonder dat beleid te wijzigen. Automatisch kiezen hervat de huidige leidende opdracht. De al actieve keuze opnieuw kiezen doet niets.

Bij handmatige besturing toont Overzicht precies het eindbeleid en vervalmoment en het behouden fysieke doel/bereik in plaats van het verborgen schemadoel. Als handmatig niet kan starten, blijft de keuze zichtbaar met toegankelijke reden: onbeschikbaar/uitgeschakeld apparaat, gestopte automatische planning, actief pauzerend profiel of andere zonepauze. Ook onopgeloste temperatuurmigratie schakelt dit uit, omdat handmatige configuratie en perioden tot voltooiing onveranderlijk blijven. Een tijdelijke aanpassing blokkeert niet, want deze wordt vervangen.

De equivalente actie gebruikt opgeslagen beleid en accepteert alleen `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Bewaar eerst `for_duration` en `duration_minutes: 90` via `velair.set_external_change_policy` voor een aanpassing van 90 minuten. De expliciete actie weigert onbeheerde, uitgeschakelde, `unknown`/`unavailable`-apparaten en apparaten met globale stop, profielpauze of onafhankelijke zonepauze. Een actieve tijdelijke aanpassing wordt vervangen. Verwarmen, koelen, `off`, enkele doelen en oorspronkelijke bereiken worden via dezelfde opeenvolgende overdracht vastgelegd.

<a id="resume-with-a-service"></a>
## Hervatten via een service

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Dit is idempotent: bij een al automatisch beheerd apparaat gebeurt niets. Onbeheerde entiteiten worden geweigerd.

Gebruik de gereserveerde interne pauze-ID `velair.manual_adjustment` niet met `velair.pause_zone` of `velair.resume_zone`. Velair weigert dit zodat één mechanisme handmatige aanpassing beheert. Een algemene `velair.resume_zone` wist handmatige aanpassing niet.

<a id="automations-and-events"></a>
## Automatiseringen en gebeurtenissen

Alle runtimegebeurtenissen gebruiken `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Elke externe besturingswijziging volgen

Deze gebeurtenis verschijnt wanneer minimaal één gevolgd modus- of doelveld niet aan Velair kan worden toegeschreven:

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

Bij een bereik gebruiken `changed_fields`, `previous` en `current` zo nodig `target_temp_low` en `target_temp_high` in plaats van `temperature`. Alleen externe velden verschijnen; gekoppelde Velair-velden ontbreken ook wanneer ze in dezelfde statusupdate aankomen.

Voorbeeldmeldingsautomatisering:

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
### Begin en einde van handmatige aanpassing volgen

Begingegevens:

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

Bij `until_resumed` ontbreekt `until`. Eindgegevens:

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

Automatisch vervallen gebruikt `reason: expired`. De gebeurtenis betekent dat de handmatige reden veranderde; een andere pauze kan fysieke schema-overdracht nog blokkeren.

Zie [Gebeurtenissen voor automatiseringen](automation-events.nl.md) voor de volledige afspraken.

<a id="restart-and-availability-behavior"></a>
## Herstarten en beschikbaarheid

Zonebeleid en actieve handmatige reden worden opgeslagen. Na Home Assistant-herstart:

- niet-verlopen of onbeperkte aanpassing blijft handmatig;
- **Actief schema toepassen na opstarten** omzeilt deze niet;
- het opgeslagen vervalmoment verwijdert de reden en bepaalt de actuele opdracht;
- export bevat beleid maar bewust geen actuele handmatige runtime-status.

De vastgelegde externe modus-/doelmomentopname is runtimegebonden en wordt niet opgeslagen of na herstart opnieuw toegepast. Normaal behoudt en meldt het fysieke apparaat zijn eigen handmatige status; de opgeslagen reden blijft schematoepassing blokkeren. Reset het apparaat of meldt het bij herstart een ander doel, dan reconstrueert Velair de oude momentopname niet. Het wacht op einde of hervatten en bepaalt dan de actuele opdracht.

Overgangen naar en vanuit `unknown`/`unavailable` worden genegeerd. Een afstandsbedieningswijziging tijdens onbeschikbaarheid waarvan alleen herstel van `unavailable` wordt gemeld, geldt niet als nieuwe externe aanpassing. Latere doel- of moduswijzigingen bij beschikbaarheid worden normaal gedetecteerd.

<a id="attribution-limits"></a>
## Grenzen aan toeschrijving

Toeschrijving blijft bewust een zo goed mogelijke poging, omdat apparaten en integraties anders rapporteren.

- Fysieke of fabrikantacties die Home Assistant niet bereiken zijn onzichtbaar.
- Modus en doel in meerdere updates kunnen meerdere waarnemingsgebeurtenissen geven; maak automatiseringen idempotent.
- Een niet-Velair-actie met exact een nog geldig verwacht veld kan als Velair worden gekoppeld.
- Een apparaat dat een geaccepteerd doel nooit terugmeldt, kan de verwachting tot korte afloop actief laten.
- Beschikbaarheidsherstel wordt zoals beschreven genegeerd.
- Alleen ventilator-, preset-, zwenk-, luchtvochtigheids- en omgevingswijzigingen vallen buiten deze eerste functieafspraken.

Lees `external_climate_change_detected` dus als: «Velair zag een besturingswijziging die niet aan een eigen opdracht kon worden gekoppeld», niet als bewijs dat een genoemde persoon de thermostaat veranderde.

<a id="troubleshooting-checklist"></a>
## Checklist voor probleemoplossing

Als een verwachte handmatige aanpassing ontbreekt:

1. Controleer of Velair het apparaat beheert.
2. Controleer globale automatische planning en ingeschakelde zone.
3. Controleer dat het actieve profiel de zone niet al pauzeert.
4. Controleer dat de bron `hvac_mode`, `temperature` of bereik in Home Assistant wijzigt, niet alleen fabrikantdisplay of ventilator/preset.
5. Controleer dat de entiteit tijdens de overgang niet `unknown` of `unavailable` was.
6. Luister naar `velair_event` met `event: external_climate_change_detected`.
7. Bekijk Diagnose en Home Assistant-logs voor mislukt statusbehoud of serviceaanroepen.

Als hervatten niet de verwachte temperatuur toepast, controleer actuele modus/profiel, Standaard, onafhankelijke pauzeredenen, globale plannerstatus en of het blok Uit of Keep is. Hervatten gebruikt altijd de huidige leidende opdracht, nooit een historische momentopname van het oude schema.
