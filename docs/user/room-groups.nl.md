<a id="room-groups"></a>
# Kamergroepen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.6 |
| Laatst gesynchroniseerd | 2026-10-28 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Een kamergroep geeft meerdere beheerde `climate`-entiteiten één schema, profieltoewijzing, boost, pauze en adaptief voorconditioneringsmodel. Gebruik een groep voor apparaten in dezelfde fysieke kamer. Afzonderlijke kamers blijven onafhankelijk, ook als ze een dagsjabloon of verwarmings-/koeltoevoer delen.

<a id="what-a-group-shares"></a>
## Wat een groep deelt

| Gedeeld door de kamergroep | Onafhankelijk per fysiek klimaatapparaat |
| --- | --- |
| Schema, modus-/profieltoewijzingen en besturingsinstellingen | Gemelde temperatuur, vochtigheid, HVAC-actie en beschikbaarheid |
| Boosts, zonepauzes en handmatige aanpassing | Comfortsensoren, drempels en bewakingsschakelaar |
| Eén voorbereidingsstart en thermisch leermodel | Apparaatwaarnemingen en verzendbewijs in Diagnostiek |
| Room Assist-instellingen en correctie | De interne temperatuurregeling van het apparaat |

De groep is een besturingseenheid binnen Velair, geen nieuwe Home Assistant-entiteit van het type `climate` of `group`. Velair maakt een stabiele interne identificatie zoals `group.0123456789abcdef0123456789abcdef`; hernoemen behoudt deze. Deze kan in diagnostiek, exports of technische instellingen verschijnen, maar staat niet in het entiteitenregister of de statussen van Ontwikkelaarstools. Gebruik deze niet als doel van een Home Assistant-service `climate.*`. Velair vertaalt de groep naar de echte opdrachtontvangers.

<a id="create-a-group"></a>
## Een groep maken

1. Open **Kamergroepen** en gebruik de toevoegknop.
2. Geef een naam en selecteer via **Klimaatapparaten toevoegen** minstens twee beheerde apparaten in die kamer. Zoek op naam of entiteits-ID en bevestig. Apparaten in een andere groep zijn niet beschikbaar en tonen hun groep.
3. Kies een lid waarvan de gemelde kamertemperatuur de eigen temperatuur van de groep vertegenwoordigt. Dit maakt het apparaat geen eigenaar. Stel een optionele externe temperatuursensor in bij **Room Assist**, zoals bij een onafhankelijk apparaat.
4. Kies verzending naar alle leden of naar één lid waarvan de installatie opdrachten al aan de andere apparaten doorgeeft.
5. Kies de bestaande lidconfiguratie bij **Configuratie overnemen van**. Exporteer eerst je huidige configuratie als herstelkopie; neem ook **Voorconditioneringsleren** op als je kalibratie wilt bewaren.
6. De opslagknop bovenaan opent **Groepswijzigingen controleren**. Er is nog niets toegepast. Lees de verschillen en de melding over opnieuw leren en kies **Bevestigen en opslaan** of **Terug naar bewerken**. Validatie- en opslagfouten blijven in dit proces zichtbaar, zodat je het concept kunt aanpassen en opnieuw proberen.

<a id="configuration-fields"></a>
### Configuratievelden

| Veld | Betekenis |
| --- | --- |
| Groepsnaam | Verplichte weergavenaam, uniek onder groepen. |
| Leden | Beheerde apparaten in deze kamer. Hun volgorde bepaalt de individuele weergave in Overzicht. Een apparaat kan niet in twee groepen zitten. |
| Temperatuurreferentie | De gemelde temperatuur van één lid vertegenwoordigt de kamer in Velair, zonder dat lid voorrang te geven. |
| Opdrachtverzending | Standaard **Alle leden**, of **Geselecteerd lid** als de installatie opdrachten al doorgeeft. |
| Ontvanger van opdrachten | Alleen bij **Geselecteerd lid**: kies wie de opdrachten van Velair ontvangt. |
| Configuratie overnemen van | Alleen bij aanmaken: schema, profielconfiguratie en besturingsinstellingen van dit lid vormen het gedeelde beginpunt. |

Temperatuurreferentie, ontvanger en oorspronkelijke configuratiebron kunnen drie verschillende leden zijn.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Opdrachten naar alle leden of één ontvanger

**Alle leden** is standaard: Velair stuurt naar elk lid. **Geselecteerd lid** stuurt alleen naar de onderliggende **Ontvanger van opdrachten**. Gebruik dit alleen als de installatie de opdrachten al aan de andere apparaten doorgeeft; Velair doet die extra doorgifte niet.

Een kamer kan bijvoorbeeld drie radiatorkranen en een kamerregelaar hebben die ook als `climate`-entiteit verschijnt. Geeft de installatie opdrachten van die regelaar aan de kranen door, neem dan alle vier op, kies de regelaar als temperatuurreferentie en kies hem bij **Geselecteerd lid** als ontvanger. Alle vier blijven zichtbaar met één schema en één voorbereidingsbeslissing. Heeft elk apparaat een directe opdracht nodig, gebruik **Alle leden**.

Deze opties bepalen ontvangers; ze maken geen onafhankelijke schema's of leermodellen.

<a id="adopt-an-existing-configuration"></a>
### Een bestaande configuratie overnemen

Overnemen maakt één gedeelde Velair-configuratie van schema's, profielen en besturingsinstellingen van het gekozen lid. Dit vervangt de onafhankelijke besturingsconfiguratie; er blijven geen afzonderlijke gesynchroniseerde kopieën bestaan en firmware-instellingen worden niet gekopieerd. Elk fysiek apparaat behoudt zijn eigen Comfortinstellingen, sensoren en drempels. Bestaande leergeschiedenissen worden niet samengevoegd. Referentie, ontvanger en configuratiebron mogen verschillen.

Velair valideert de volledige groep voor opslag. Een apparaat kan maar in één groep zitten. Los ongeschikte combinaties eerst op; groeperen voegt geen HVAC-mogelijkheden toe. Externe schema-uitvoering kan een groepslid niet tegelijk met Velair besturen. Ontvangers moeten ondersteunde modi delen, overlappende temperatuurgrenzen hebben en een compatibel temperatuurstappenraster gebruiken. Verschillen hun actieve HVAC-modi, kies dan een expliciete modus in plaats van een gedeelde modus te behouden.

<a id="shared-control-and-individual-observations"></a>
## Gedeelde besturing en individuele waarnemingen

Schema's, profielen en andere kamerbesturingskeuzes tonen de groep in plaats van haar leden. Bewerk bestaande schema- en functieregelaars zoals gebruikelijk. De groep bewaart één configuratie, geen afzonderlijke gesynchroniseerde kopieën.

Comfort blijft individueel: paneel en kaarten tonen elk fysiek apparaat met eigen metingen, sensoren, drempels en bewakingsschakelaar. Een externe Room Assist-sensor vervangt die waarden alleen als je deze expliciet bij het lid in Comfort kiest. Aanmaken, wijzigen en opheffen behouden de individuele configuraties. Groepen die vóór onafhankelijke Comfortopslag zijn bewaard, initialiseren elk lid met een kopie van de eerder opgeslagen groepsinstellingen. Daarna zijn die afzonderlijk te wijzigen; oudere individuele instellingen worden niet automatisch hersteld.

**Overzicht** blijft elk fysiek apparaat tonen. De groep benoemt het gedeelde schema en de besturingsbevoegdheid; temperatuur, beschikbaarheid en apparaatstatus blijven individueel. Een actie bij een groepslid geldt voor de kamer en maakt geen concurrerend onafhankelijk schema.

**Volgende gebeurtenissen** toont elk apparaat met de groep onder zijn naam, overeenkomstig de individuele rijen in **Tijdlijn van vandaag**. De leden tonen dezelfde gezaghebbende groepsgebeurtenis; Velair maakt geen aparte backend-gebeurtenissen of schema's. Selecteer een apparaatnaam om het groepsschema op de weekdag van de gebeurtenis te openen, inclusief een eigen profielschema als dat de bron is. Geplande terugkeer gebruikt het schema van de bestemmingsmodus. Dit werkt ook vanuit een dashboardkaart voor volgende gebeurtenissen. Een filter op één lid toont alleen dat lid; een groepsfilter toont alle leden.

Selecteer een groep in de lijst om deze in het aangrenzende detailpaneel te bewerken, zoals bij Sjablonen en Toevoerregeling. De samenvatting vermeldt leden, temperatuurbron, ontvangers en gedeelde besturings- en voorbereidingsstatus. De kopactie controleert en bewaart wijzigingen. Verwijderen gebeurt via de groepslijst en vereist bevestiging. Veldhulp verklaart de keuzes; ontbrekende verplichte gegevens worden tijdens controle genoemd. De status beschrijft tijdens bewerken de opgeslagen groep totdat de gecontroleerde wijzigingen zijn bewaard.

Diagnostiek scheidt apparaatbewijs van de gezamenlijke kamerintentie. Een geslaagde Home Assistant-serviceaanroep bewijst geen klepbeweging of warmtestroom. Bij één gekozen ontvanger beweert Velair niet dat het de overige leden rechtstreeks heeft aangestuurd.

<a id="temperature-reference-and-room-assist"></a>
## Temperatuurreferentie en Room Assist

Bij normale planning stuurt Velair het gedeelde doel naar de ingestelde ontvangers. Elk apparaat regelt intern met zijn eigen sensor; de groepsreferentie wijzigt de firmware-regeling niet.

**Temperatuurreferentie** levert de eigen groepsmeting voor voorconditionering, thermisch leren, de oorspronkelijke Room Assist-basis, schatting van toevoervraag en groepssamenvatting. Kies deze uit de leden. Stel een optionele externe kamersensor in bij [Room Assist](room-assist.nl.md#room-groups), niet als extra eigen referentie in de groepseditor. Wanneer Room Assist aanstaat, wordt die externe meting de effectieve kamertemperatuur en berekent Velair één gedeelde correctie. Opdrachten blijven **Opdrachtverzending** volgen.

Comfort blijft onafhankelijk: groeps-Room Assist vervangt geen individuele sensoren of drempels.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pauzes, handmatige aanpassing en hervatten

Een groep heeft één planningsbevoegdheid. Een Velair-zonepauze of boost via een lid geldt dus voor de hele groep. Kamergroepen toont de opgeslagen besturingsstatus zonder eigen pauzeknop. Gebruik de bestaande lidregelaars. Dezelfde gedeelde pauze via een ander lid hervatten heeft dezelfde reikwijdte. Andere onafhankelijke pauzeredenen behouden voorrang totdat ze eindigen of worden verwijderd. Globale Pauze of Stop blijft alle kamers raken, ook apparaten zonder groep.

Planning pauzeren schakelt apparaten niet noodzakelijk uit. De gekozen pauzeactie bepaalt of Velair hun huidige statussen bewaart of Uit naar de ingestelde ontvangers stuurt.

Het beleid **Externe aanpassingen** in Instellingen hoort bij de groep. Een gedetecteerde externe doel- of HVAC-moduswijziging bij één lid kan de hele groep in **Handmatige aanpassing** plaatsen, met dezelfde planner- en pauzeregels als voor een onafhankelijk apparaat. Met **Tot het volgende blok**:

1. Drie leden volgen een gedeeld doel van `20 °C`.
2. Een externe wijziging verhoogt één lid naar `22 °C`.
3. Velair geeft de planningsbevoegdheid voor de hele groep af en bewaart de lidstatussen. Het kopieert de wijziging niet: ze kunnen op `22, 20, 20 °C` blijven. De installatie zelf kan wel wijzigingen doorgeven.
4. Bij het volgende blok hervat Velair automatisch en verstuurt het gedeelde doel naar de ingestelde ontvangers. Je kunt Automatisch eerder hervatten.

| Beleid voor externe aanpassingen | Groepsgedrag |
| --- | --- |
| Automatisch behouden | Velair behoudt de bevoegdheid en past de huidige effectieve intentie opnieuw toe als die bestaat. |
| Tot het volgende blok | Handmatige aanpassing eindigt bij het volgende toepasselijke blok. Zonder toekomstig blok moet je Automatisch expliciet hervatten. |
| Voor een duur | De groep geeft de ingestelde duur voorrang. Verdere externe wijzigingen vernieuwen die duur. |
| Tot hervatten | De groep geeft voorrang totdat je Automatisch expliciet hervat. |

Expliciet Handmatig kiezen gebruikt het opgeslagen groepsbeleid en bewaart de lidstatussen. Bij **Automatisch behouden** duurt expliciet Handmatig juist tot je hervat. Room Assist geeft tijdens handmatige aanpassing voorrang.

Deze Handmatig/Automatisch-besturing staat los van de modus **Handmatig** bij directe profielkeuze. Zie [Externe wijzigingen en handmatige aanpassing](manual-control.nl.md) voor prioriteiten en bijzondere blokregels.

<a id="display-order"></a>
## Weergavevolgorde

Verplaats groepen en onafhankelijke apparaten met de bestaande volgorderegelaars in Instellingen. Een nieuwe groep neemt eerst de positie van zijn vroegste lid. Orden leden in het detailpaneel bij Kamergroepen. Overzicht vouwt de groep uit in opeenvolgende individuele items in die volgorde; schemakeuzes tonen één groepsitem. Het backend bewaart beide volgorden.

De ledenlijst toont alleen geselecteerde apparaten. Nieuwe worden achteraan toegevoegd zonder de bestaande volgorde te veranderen. Gebruik pijlen om te ordenen en verwijderen om een lid weg te halen. Lange lijsten kunnen volledig worden uitgeklapt. Lidmaatschapswijzigingen worden pas na controleren en opslaan toegepast.

<a id="learning-and-membership-changes"></a>
## Leren en wijzigingen in lidmaatschap

De groep leert één thermische reactie met afzonderlijke verwarmings- en koelgeschiedenissen. Zonder Room Assist komt de eigen temperatuur van het gekozen lid. Room Assist gebruikt de ingestelde externe sensor alleen wanneer ingeschakeld, met dezelfde besturing, correctiegrenzen en voorbereidingsregels als voor onafhankelijke apparaten. Alleen een sensor kiezen schakelt hulp niet in. Wissen of uitschakelen herstelt de lidreferentie. Opdrachten volgen de groepsverzending; tijdelijke correcties veranderen het echte geplande doel niet. Oude onafhankelijke geschiedenissen worden niet gecombineerd. Velair bewaart leren voor de groep, niet één model per lid. Individuele waarnemingen blijven in Diagnostiek beschikbaar. Een nieuwe groep begint opnieuw zonder eerdere geschiedenissen samen te voegen.

| Wijziging | Leren daarna |
| --- | --- |
| Groep hernoemen of leden herschikken | Het groepsleren blijft behouden. |
| Een lid toevoegen of verwijderen | De resterende groep begint opnieuw omdat de fysieke samenstelling verandert. Een verwijderd lid begint onafhankelijk vanaf nul. |
| Temperatuurreferentie of opdrachtverzending wijzigen | De groep begint opnieuw en beëindigt de vorige actieve waarneming. |
| Groep opheffen | Elk lid begint onafhankelijk vanaf nul. De oude groepsgeschiedenis wordt verwijderd. |

Een verwijderd lid krijgt een onafhankelijke kopie van de gezamenlijke configuratie. Opheffen doet hetzelfde voor alle leden. Actieve boosts, pauzes en thermische geschiedenis worden niet gekopieerd naar deze onafhankelijke kamers. Controleer schema's en profielen na een eigenaarswijziging.

Bijvoorbeeld: één apparaat uit een groep van drie verwijderen laat twee leden met een nieuwe groepsgeschiedenis en één onafhankelijk apparaat met een nieuwe geschiedenis achter. De groep verwijderen maakt alle drie onafhankelijk. Geen van beide herstelt automatisch de oude geschiedenissen van vóór de groep. Bewaar minstens twee leden in een opgeslagen groep; hef deze op als alle apparaten onafhankelijk moeten worden.

<a id="before-testing-the-beta"></a>
## Voor het testen van de bèta

Maak een configuratieback-up, inclusief voorconditioneringsleren indien nodig. Controleer na beoordelen en opslaan:

- Eén groep verschijnt bij planning, profielen, voorconditionering en Room Assist.
- Elk lid blijft individueel zichtbaar in Overzicht, Volgende gebeurtenissen, Tijdlijn van vandaag, Comfort en Diagnostiek.
- Verzending past bij de installatie: iedereen ontvangt direct opdrachten, of de gekozen ontvanger ontvangt ze en de installatie geeft ze door.
- Comfortinstellingen van één lid wijzigen laat de andere ongewijzigd.
- Een pauze of handmatige aanpassing via een lid geldt voor de gedeelde kamer.
- Home Assistant herladen behoudt groep, lidvolgorde en gedeelde instellingen.

Vermeld bij problemen de verzendmodus, het temperatuurreferentielid, of Room Assist aanstaat en relevant diagnostisch bewijs. Een geslaagde serviceaanroep is iets anders dan een apparaat dat de gevraagde status meldt.

Eerdere bètaconfiguraties kunnen een externe groepsreferentie bevatten. Laden of importeren behoudt die zonder automatisch een lid te kiezen of Room Assist in te schakelen. De editor benoemt de oude waarde en vraagt voor opslaan van een bewerkte groep om een lidreferentie. Configureer bij overstappen de externe sensor in Room Assist.

Kamergroepen en gedeelde toevoergroepen hebben verschillende doelen. Een kamergroep bestuurt één kamer; [Toevoerregeling](shared-climate-supply.nl.md) bundelt kamervraag voor een gezamenlijke bron. Gekoppelde sjablonen delen schema-inhoud zonder kamereigenaarschap te veranderen. Voorconditioneringsafhankelijkheden coördineren aparte kamers met onafhankelijk leren.
