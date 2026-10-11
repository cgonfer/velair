<a id="practical-examples-presets-and-linked-templates"></a>
# Praktische voorbeelden: presets en gekoppelde sjablonen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Vertaalstatus](../translation-status.md)

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

Deze handleiding beschrijft huishoudconfiguraties met **Standaard**, **Profielen**, dagsjablonen en Velair-presets. Namen, entiteiten en temperaturen zijn voorbeelden: gebruik modi en doelen die je eigen thermostaten ondersteunen. Temperaturen staan hier in Celsius; Velair ondersteunt ook Fahrenheit.

Zie [Blokpresets en gekoppelde sjablonen](linked-schedules.nl.md) voor alle regels.

<a id="choose-what-you-want-to-share"></a>
## Kiezen wat je wilt delen

| Doel | Kies | Latere wijzigingen |
|---|---|---|
| Temperatuur en opties op onafhankelijke tijdstippen hergebruiken | Een Velair-preset in elk blok | Presetwijzigingen werken die blokken bij; tijden blijven onafhankelijk. |
| Vanuit een sjabloon beginnen en blokken aanpassen | Blokken kopiëren | Sjabloonwijzigingen werken de kopie niet bij. Gekopieerde presetverwijzingen blijven actief. |
| Een ingestelde schemadag dupliceren | Kopiëren | De kopie behoudt koppeltype, toewijzingen en presets van de bron. |
| Dezelfde tijden met verschillende verwarmings- of koelinstellingen gebruiken | Een sjabloon met **Alleen tijden** | Tijdwijzigingen werken elke gekoppelde dag bij; klimaatinstellingen blijven onafhankelijk. |
| Meerdere dagen identiek houden in tijden en instellingen | Een sjabloon met **Tijden en instellingen** | Tijd en klimaat volgen het sjabloon; bestemmingsbediening is alleen-lezen. |

Een sjabloon is één dag, geen weekrooster. Koppel elke benodigde weekdag en thermostaat expliciet. Eén week kan onafhankelijke dagen en beide koppeltypen bevatten. Standaard is de gewone week van elke thermostaat, geen opgeslagen profiel.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Eén verwarmingsroutine voor twee kamers

**Situatie:** woonkamer en slaapkamer hebben beide comfort om 07:00 en een nachtverlaging om 23:00 nodig. Beide thermostaten ondersteunen verwarmen en deze doelen.

1. Open **Sjablonen → Klimaatpresets**. Maak en bewaar deze presets:

   | Preset | Modus | Doel |
   |---|---|---|
   | Verwarmingscomfort | Verwarmen | 21 °C |
   | Nachtverwarming | Verwarmen | 17 °C |

2. Maak **Thuiswerkdag** in de dagsjabloonbibliotheek. Voeg 07:00 en 23:00 toe. Kies in de **Aanvullende instellingen** van elk blok de passende **Velair-preset** en sla het sjabloon op.
3. Open **Schema's → Standaardplanningen**, kies woonkamer en maandag. Stel **Planningsbron** op **Thuiswerkdag** en kies **Tijden en instellingen** onder **Koppelen**. Sla de dag op.
4. Herhaal voor slaapkamer en elke weekdag die deze routine moet volgen.

Tijd, modus, doel en opties zijn alleen-lezen op die gekoppelde dagen. De doelkolom blijft 21 °C of 17 °C tonen en vervangt het doel niet door de presetnaam. Oorsprongsaanduidingen en blokdetails noemen sjabloon en preset.

Maak nu twee afzonderlijke wijzigingen:

| Opgeslagen wijziging | Gevolg |
|---|---|
| Verplaats het sjabloonblok van 07:00 naar 07:30 | Elke gekoppelde dag begint dat blok om 07:30. De presetverwijzing blijft gelijk. |
| Verander Verwarmingscomfort van 21 °C naar 21.5 °C | Elke verwijzing gebruikt 21.5 °C, ook via het sjabloon. Nachtdoelen blijven 17 °C. |

Sjabloonopslag bewaart geen ander open profielconcept. Presetopslag bewaart geen ander schemaconcept. Elke bron heeft een eigen opslagknop.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Winter en zomer met dezelfde tijden

**Situatie:** een airco verwarmt in winter en koelt in zomer. De huishoudtijden blijven gelijk; doelen en acties verschillen.

Maak **Werkdag** met 07:00 en 23:00. Maak onderstaande presets en gebruik **Alleen tijden** bij het koppelen van woonkamer-maandag in Standaard en beide profielen:

| Gedeelde tijd | Standaardtoewijzing | Winterprofiel | Zomerprofiel |
|---|---|---|---|
| 07:00 | Gewoon comfort: Verwarmen, 20 °C | Wintercomfort: Verwarmen, 21 °C | Zomercomfort: Koelen, 25 °C |
| 23:00 | Handmatig Uit | Winternacht: Verwarmen, 17 °C | Uit-preset |

Kies **Profielplanningen**, maak het profiel en stel woonkamer op **Profielplanning**. Kies de weekdag, **Werkdag → Alleen tijden** en stel de toewijzingen in. Sla het hele profiel op. Sla bij Standaard elke bewerkte dag apart op.

De ochtendtijd naar 07:30 verplaatsen verschuift alle drie schema's. Het eigen sjabloondoel wijzigen verandert deze toewijzingen niet. **Wintercomfort** bewerken raakt de presetverwijzingen, inclusief het winterprofiel, maar verandert het zomerkoeldoel niet in een verwarmingsdoel.

Het geselecteerde profiel bepaalt nog welke week draait. Home Assistant kan Winter of Zomer via bestaande profielacties kiezen; het sjabloon beslist niet over het seizoen. Na aanmaken van een profiel met automatiserings-ID `summer` kies je het bijvoorbeeld zo:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Naar de opgeslagen standaardschema's teruggaan:

```yaml
action: velair.deactivate_profile
```

Gebruik de **Automatiserings-ID** uit je profiel; deze kan afwijken van de naam. Zie [Klimaatprofielen](climate-profiles.nl.md) voor modi en activeringsregels.

Voor zacht weer kan een lokaal bestuurd apparaat een apart profiel met **Pauzeren → Klimaatentiteit uitschakelen** hebben. Een automatisering kan dit kiezen. Dit verschilt van een gepland uitschakelblok: een gepauzeerde zone volgt latere blokken niet opnieuw. Externe zones ondersteunen geen pauzegedrag; daarvoor gelden de ondersteunde schema-acties van de aanbieder.

Weersvoorspellingsdrempels, periodieke buitentemperatuurcontroles, raammeldingen en later uitschakelen in de avond blijven beslissingen van Home Assistant-automatiseringen. Presets en koppelingen voegen die regels niet aan Velair toe.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Een dag kopiëren en daarna een gastenkamer aanpassen

**Situatie:** de gastenkamer begint vanuit Thuiswerkdag, maar gasten willen ontbijtverwarming om 08:00 in plaats van 07:00.

Kies gastenkamer en weekdag in Schema's. Behoud **Schemabron → Eigen schema** en kies **Thuiswerkdag** in de aparte **Sjablonen**-kiezer om blokken te kopiëren. Verander de ochtend naar 08:00 en sla op. De dag is onafhankelijk van het sjabloon; een latere verplaatsing van Thuiswerkdag naar 07:30 verandert de gastenkamer niet.

Een gekopieerd blok met **Verwarmingscomfort** verwijst nog naar die preset. Een wijziging naar 21.5 °C verandert daarom ook het gastenkamerdoel. Onafhankelijk van een sjabloon betekent niet onafhankelijk van een preset.

Om de gastenkamer ongeacht presetwijzigingen op 20 °C te houden, open Aanvullende instellingen, kies **Geen Velair-preset**, wijzig het handmatige doel naar 20 °C en sla op. Presetverwijdering behoudt eerst de effectieve instellingen en maakt het blok niet leeg.

Een schemadag klonen verschilt van sjabloonblokken kopiëren: de bronkoppeling blijft behouden. Kloon bijvoorbeeld maandag met **Thuiswerkdag → Tijden en instellingen** naar dinsdag. Beide volgen nu Thuiswerkdag; 07:00 naar 07:30 verplaatsen werkt beide bij.

Bij **Alleen tijden** behoudt de kloon dezelfde koppeling en kopieert toewijzingen inclusief presets. Daarna kun je dinsdaginstellingen veranderen zonder maandag te wijzigen; beide blijven de sjabloontijden volgen.

Je kunt maandag ook naar maandag op een andere thermostaat klonen. Die behoudt indien geschikt hetzelfde koppeltype; overige dagen behouden hun configuratie. Een gedeelde verwarmingspreset op een alleen-koelapparaat weigert de kloon in plaats van de koppeling stilzwijgend te verwijderen. Standaard controleert alle bestemmingen samen. In profielen wijzigt alleen het gecontroleerde concept totdat je het profiel opslaat.

Voor een onafhankelijke dinsdag kloon je en kies je **Ontkoppelen** vóór opslaan. Actuele instellingen en actieve presetverwijzingen blijven behouden; de dag volgt het sjabloon niet meer. **Blokken kopiëren** in de sjabloonbibliotheek blijft onafhankelijk.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Een koppeling wijzigen met behoud van het juiste concept

**Situatie:** maandag is aan Thuiswerkdag gekoppeld. Je wilt deze maandag aanpassen en andere gekoppelde dagen gelijk laten.

| Keuze | Resultaat in het concept |
|---|---|
| **Tijden en instellingen** naar **Alleen tijden** | Huidige sjablooninstellingen worden eigen dagtoewijzingen met behoud van presets. Tijden blijven gekoppeld. |
| **Alleen tijden** naar **Tijden en instellingen** | Bevestig vervanging van dagtoewijzingen door sjablooninstellingen. Annuleren behoudt keuze en concept. |
| Een ander sjabloon kiezen | Bevestig conceptvervanging. Annuleren behoudt huidige sjabloon en instellingen. |
| **Ontkoppelen** | Actuele concepttijden en instellingen worden onafhankelijk, met behoud van presets. |
| **Eigen schema** | Bevestig verwerpen van dagwijzigingen; herstel de opgeslagen dag als onafhankelijk concept. |

Deze bewerkingen slaan niet automatisch op. Bewaar de standaarddag of het volledige profiel wanneer je klaar bent.

Stel concreet dat opgeslagen maandag een onafhankelijk 09:00-blok op 20 °C heeft. Je kiest een sjabloon vanaf 08:00 en past de alleen-tijdentoewijzing zonder opslaan naar 21 °C aan:

- **Ontkoppelen** behoudt 08:00 en 21 °C in het onafhankelijke concept.
- **Eigen schema** herstelt opgeslagen 09:00 en 20 °C.

Was de opgeslagen maandag zelf gekoppeld, dan gebruikt Eigen schema de huidige waarden van die opgeslagen dag en maakt ze onafhankelijk. Het herstelt geen ouder handmatig schema van vóór de koppeling.

Een dag onafhankelijk maken gebruikt aan de thermostaat aangepaste waarden. Een gedeeld handmatig doel van 18.3 °C kan bijvoorbeeld 18.5 °C zijn bij stappen van 0.5 °C. Na Ontkoppelen blijft het handmatige doel 18.5 °C. Een presetblok behoudt zijn verwijzing. Geen van beide bewerkingen wijzigt de gedeelde bibliotheek.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Een lunchblok aan een gedeeld sjabloon toevoegen

**Situatie:** Werkdag heeft 07:00 en 23:00. Je voegt 12:00 toe met handmatig verwarmen naar 18 °C. Verschillende kamers en profielen gebruiken het sjabloon.

<a id="a-compatible-hours-only-destination"></a>
### Een geschikte bestemming met alleen tijden

Als de bestemming verwarmen naar 18 °C ondersteunt, stelt Velair voor deze configuratie naar de nieuwe 12:00-toewijzing te kopiëren. Bekijk die onder **Gekoppelde dagen** en sla op.

Alleen tijd blijft gedeeld. Het sjabloon later op 19 °C zetten verandert deze toewijzing niet. Verwijst het nieuwe blok naar een passende preset, dan behoudt de toewijzing de verwijzing; latere presetwijzigingen werken nog door.

<a id="an-incompatible-hours-only-destination"></a>
### Een ongeschikte bestemming met alleen tijden

Stel dat een andere thermostaat minimaal 19 °C ondersteunt en de bestaande 07:00-toewijzing de geldige preset **Kantoorcomfort: Verwarmen, 21 °C** gebruikt. Het nieuwe doel 18 °C is ongeschikt; Velair zoekt in dezelfde thermostaatdag naar:

1. een blok precies om 12:00 dat vóór de wijziging bestond;
2. eerdere blokken, het dichtstbijzijnde eerst;
3. latere blokken, het dichtstbijzijnde eerst.

Hier stelt Velair Kantoorcomfort van 07:00 voor. Gekoppelde dagen noemt terugval en bron. Accepteer deze of kies vóór opslaan een andere geldige toewijzing. De preset blijft actief gekoppeld.

Een ongeschikt bronblok wordt overgeslagen. Een in deze wijziging verplaatst of verwijderd blok kan nog de eerder opgeslagen toewijzing leveren; een ander nieuw blok niet. Zonder geldige bron toont Gekoppelde dagen een wachtende toewijzing. Vul deze handmatig in of kies een passende preset; zolang ze wacht, wordt niets opgeslagen.

<a id="a-completely-linked-destination"></a>
### Een volledig gekoppelde bestemming

Bij **Tijden en instellingen** komt het nieuwe 12:00-blok direct uit het sjabloon, zonder terugval naar oude kamerinstellingen.

Als 18 °C voor één volledige bestemming ongeschikt is, wordt de hele sjabloonopslag geblokkeerd. Kies een doel dat alle bestemmingen ondersteunen, of maak de betrokken dag eerst alleen-tijden of onafhankelijk en sla die wijziging op.

Dit controleert ook inactieve profielen en Standaard verborgen door een ander actief profiel. Tot een geldige opslag behouden alle opgeslagen bestemmingen hun vorige programmering.

<a id="move-or-remove-an-existing-block"></a>
### Een bestaand blok verplaatsen of verwijderen

07:00 naar 07:30 verplaatsen behoudt elke ochtendtoewijzing van alleen-tijdenbestemmingen en vervangt die niet door het sjabloondoel. Volledige bestemmingen volgen het bijgewerkte sjabloon. Verwijderen wist bijpassende alleen-tijdentoewijzingen en volledige gekoppelde blokken in dezelfde opslag.

Een blok heeft een vaste identiteit. Verwijderen en op dezelfde tijd een nieuw blok toevoegen maakt een nieuw blok; dit geldt niet als verplaatsen van het oorspronkelijke blok.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Gebruik begrijpen vóór bewerken of verwijderen

**Situatie:** Verwarmingscomfort is gekozen in:

- één blok van Thuiswerkdag;
- één onafhankelijk standaardblok op vrijdag;
- één alleen-tijdentoewijzing in Winter.

De preset heeft **drie directe verwijzingen**. Twee extra dagen met Thuiswerkdag en Tijden en instellingen nemen de preset via het sjabloon over. Ze verschijnen als extra betrokken bestemmingen zonder de directe teller tot vijf te verhogen.

Bewerken raakt alle verwijzingen en overgenomen bestemmingen. Ze moeten allemaal geschikt zijn vóór opslaan. Een presetverwijzing in een sjabloon verhindert verwijderen, ook zonder gekoppelde dagen: verwijder eerst de sjabloonverwijzing.

**Gekoppelde dagen** van een sjabloon telt iets anders. Maandag en dinsdag koppelen maakt twee gekoppelde dagen. Naar vrijdag kopiëren maakt geen koppeling en verhoogt de teller niet. Kopieën worden niet als sjabloongebruik gevolgd.

Verwijder een sjabloon pas nadat alle opgeslagen standaard- en profieldagen zijn ontkoppeld. Naam-, tijd- of instellingswijzigingen behouden de bibliotheekpositie.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. Wat gebeurt er bij een actief schema?

Stel dat woonkamer automatisch Verwarmingscomfort op 21 °C volgt. Opslaan op 21.5 °C werkt de actieve opdracht bij. Het fysieke apparaat moet die actie nog accepteren; opslaan bewijst niet dat de kamer is opgewarmd.

Een tijdelijke aanpassing naar 23 °C wordt niet door presetbewerking geannuleerd. Na afloop gebruikt Velair de huidige schemaconfiguratie. Pauzes en handmatige aanpassingen behouden ook voorrang. Profielactivering is een afzonderlijke actie: die annuleert tijdelijke aanpassingen in betrokken zones, terwijl globale en zonepauzes voorrang houden. Zie [Profielvoorrangsregels](climate-profiles.nl.md).

Als Winter een eigen week levert, vervangt Standaard bewerken het actieve Winterschema niet. Naar Standaard teruggaan gebruikt de nieuwste opgeslagen instellingen. Een profiel met **Standaardplanning** erft koppelingen en presets in plaats van een extra kopie te bewaren.

Een lege weekdag schakelt niet impliciet uit. Een nachtblok op vrijdag 23:00 loopt een lege zaterdag in totdat een volgend blok begint. Voeg een expliciet uitschakelblok toe als dat de bedoeling is.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Apparaatopties, koelen en temperatuurbereiken

**Situatie:** een slaapkamerairco heeft een oorspronkelijke preset `sleep` en ventilatorstand `quiet`. Je wilt beide om 23:00 met koelen naar 25 °C.

Maak **Zomernacht slaapkamer** met Koelen, 25 °C, Apparaatpreset `sleep` en Ventilatormodus `quiet`. Kies deze via Aanvullende instellingen in het 23:00-blok. **Velair-preset** is de gedeelde configuratie; **Apparaatpreset** is één opdracht daarbinnen. De bloksamenvatting toont doel, modus en beide opties samen.

Bij een passende bestemming telt de instellingsteller drie: één Velair-koppeling plus twee opties. Temperatuur en HVAC-modus tellen niet mee. Weggelaten opties worden niet gereset: `quiet` verwijderen stopt ventilatoropdrachten in plaats van een andere ventilatorwaarde te kiezen.

Maak voor een andere routine **Alleen stille ventilator** met alleen de ventilatoroptie, zonder doel of HVAC-modus. Een geplande verwijzing stuurt die instelling zonder moduswijziging te vragen of een uitgeschakeld apparaat aan te zetten. Ze heeft geen doel voor Voorconditionering of Room Assist. Kopiëren naar een thermostaat zonder ventilatorbediening zou een lege actie opleveren en wordt geweigerd.

Een apparaat met oorspronkelijke heat/cool-bereiken kan **Thuisbereik** gebruiken met Heat/cool, ondergrens 19 °C en bovengrens 24 °C. Beide staan in de doelkolommen en komen uit dezelfde preset. Bovengrens naar 25 °C wijzigen werkt verwijzingen bij en behoudt de ondergrens. Een enkeldoelthermostaat kan deze preset niet gebruiken; Velair verzint geen enkele waarde of ontbrekende grens. Gebruik daarvoor een aparte passende preset.

Alleen-moduspresets kiezen een HVAC-modus zonder temperatuur of extra opties. Een Uit-preset vraagt uitschakeling en heeft geen doel of opties. Deze acties behouden hun betekenis via een sjabloon; delen voegt geen voortdurende temperatuurregeling toe.

<a id="troubleshooting-shared-configurations"></a>
## Gedeelde configuraties: problemen oplossen

| Wat je ziet | Wat controleren of doen |
|---|---|
| Tijd is vergrendeld | De dag volgt sjabloontijden. Bewerk het sjabloon of ontkoppel. |
| Modus en doel zijn ook vergrendeld | De dag volgt het volledige sjabloon of het blok gebruikt een preset. Bewerk de gedeelde bron. |
| Een gekopieerde dag verandert nog temperatuur | Er is een presetverwijzing. Kies Geen Velair-preset voor handmatige instellingen. |
| Sjabloonbewerking mislukt hoewel de actieve kamer geldig lijkt | Controleer Gekoppelde dagen voor inactieve profielen, verborgen Standaard en andere thermostaten. |
| Een nieuw alleen-tijdentijdvak wacht | Kies geldige handmatige instellingen of een preset onder Gekoppelde dagen. |
| Een aanbiedersfout voor de hele week blijft | Los tijdraster, actieondersteuning of bloklimiet op. Een ander bronblok lost dit niet op. |
| Compatibiliteitscontrole slaagt, opslaan mislukt | De controle test één thermostaat; opslaan controleert alle opgeslagen bestemmingen. |
| Verwijderknop is uitgeschakeld | Verwijder eerst alle opgeslagen verwijzingen; sjablonen kunnen presets zonder gekoppelde dagen gebruiken. |
| Een andere sessie wijzigde de configuratie | Vernieuw en controleer het behouden concept vóór opnieuw proberen. |
| Voorvertoning mislukt of laadt nog | Behoud het concept en probeer opnieuw. Velair raadt geen instellingen en verwijdert geen verwijzingen om op te slaan. |

Niet-ondersteunde optionele instellingen kunnen uit de effectieve bestemming worden gefilterd. Doelen buiten bereik en ongeschikte modi worden geweigerd. Alleen-optiesacties mogen na filtering niet leeg zijn. Externe regelaars voegen beperkingen toe; schemapublicatie valt nooit terug op lokale uitvoering.

<a id="back-up-the-whole-setup"></a>
## De hele configuratie back-uppen

Gebruik Velair-export in plaats van alleen een zichtbare opgeloste dag te kopiëren. Model 16 bewaart beide koppeltypen, presets en blokidentiteiten. Schema's of profielen exporteren neemt benodigde sjablonen en presets mee; het scherm toont de automatisch toegevoegde onderdelen.

Controleer vervangingen vóór importbevestiging. Een gedeelde bron vervangen kan ook bestaande lokale toepassingen raken. De gecombineerde configuratie moet geldig zijn; nieuwe profielen worden niet door import geactiveerd. Oude back-ups blijven importeerbaar, maar oudere Velair-versies kunnen model 16 niet importeren. Zie [Overdraagbaarheid](usage.nl.md#portability).
