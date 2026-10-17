<a id="home-and-away-from-occupancy"></a>
# Thuis en afwezig op basis van bezetting
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [Vertaalstatus](../../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.2 |
| Laatst gesynchroniseerd | 2026-10-17 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Voer gekozen Home Assistant-acties uit wanneer één gecombineerde bezettingsentiteit bezet of leeg wordt. Zo blijven regels voor personen, gasten en huishoudspecifieke aanwezigheid in Home Assistant, terwijl gebruikelijke Velair-modus- en profielwijzigingen eenvoudiger worden ingesteld. Een vertraagde melding legt uit wanneer de entiteit geen veilige thuis-/afwezigheidsbeslissing kan leveren.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Thuis en afwezig op basis van bezetting importeren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-bron van Thuis en afwezig op basis van bezetting bekijken"></a>
</p>

[Wijzigingslog bekijken](../../../blueprints/changelogs/occupancy_home_away.md) · [Terug naar de blueprintindex](../blueprints.nl.md)

<a id="when-to-use-it"></a>
## Wanneer gebruiken

Gebruik deze blueprint als Home Assistant al één entiteit heeft die aangeeft of het huis bezet is. Ze is geschikt voor thuis-, afwezigheids- en vergelijkbare wijzigingen waarbij de uiteindelijke acties eerst moeten worden vertraagd en opnieuw gecontroleerd.

<a id="requirements"></a>
## Vereisten

- Blueprintversie 1.0.0 en Home Assistant 2024.6.0 of nieuwer.
- Eén `binary_sensor` of `input_boolean` met `on`/`off`, of een personengroep met `home`/`not_home`.
- Velair is alleen vereist als de gekozen acties de modi, profielen, entiteiten of services ervan gebruiken. Anders kan de blueprint standaard Home Assistant-acties zonder Velair uitvoeren.

Stel personen-, gasten-, zone- en aanwezigheidsregels eerst in Home Assistant in en kies hier de resulterende entiteit. Een personengroep kan aangeven of een gevolgde persoon `home` is; een sjabloon-binaire sensor kan ook een gastenhelper of andere huishoudelijke uitzonderingen opnemen. De blueprint accepteert `on`/`off` en `home`/`not_home` zonder die beslissing opnieuw op te bouwen.

<a id="configuration"></a>
## Configuratie

- **Consolidated occupancy state:** de ene entiteit die de bezetting van het hele huis al vertegenwoordigt.
- **When occupied:** één of meer standaard Home Assistant-acties.
- **When empty:** één of meer standaard Home Assistant-acties.
- **Occupied delay:** hoe lang de entiteit `on` of `home` moet blijven.
- **Empty delay:** hoe lang de entiteit `off` of `not_home` moet blijven.
- **Availability warning delay:** hoe lang `unknown` of `unavailable` moet aanhouden voordat Home Assistant een diagnosemelding maakt. Standaard 5 minuten.

<a id="example"></a>
## Voorbeeld

Voeg voor de bezet-actie **Select: Select** toe, kies de zichtbare Velair-modusentiteit die Home Assistant aanbiedt en selecteer `Home`. Stel de leeg-actie op dezelfde manier in met `Away`. Kies de entiteit in de interface in plaats van een specifieke ID aan te nemen.

De gegenereerde acties zijn gelijkwaardig aan:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Een profiel rechtstreeks activeren:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Modi zijn doorgaans duidelijker voor thuis-, afwezigheids- en vakantiekeuzes, omdat de actuele status via de Velair-moduskiezer van Home Assistant zichtbaar blijft.

<a id="how-it-works"></a>
## Werking

De statustriggers voor bezet (`on`/`home`) en leeg (`off`/`not_home`) gebruiken de oorspronkelijke `for`-duur van Home Assistant. De status moet dus de hele vertraging ononderbroken blijven gelden. Aparte beschikbaarheidssjabloontriggers detecteren een aanhoudende status `unknown`/`unavailable` en herstel naar een ondersteunde status. Home Assistant maakt na de waarschuwingsvertraging één blijvende melding per automatisering, werkt die bij zonder duplicaten en verwijdert haar na herstel. Thuis- en afwezigheidsacties draaien niet zonder geldige entiteitsstatus.

Bij opstarten lopen bezet-, leeg- en beschikbaarheidscontroles als interne parallelle takken. Elke tak controleert de beginstatus, wacht onderbreekbaar op de tegengestelde status tot de ingestelde termijn, gaat alleen door bij timeout en controleert opnieuw vóór uitvoering. Door de begrensde buitenste parallelle modus kan een beschikbaarheidswachttijd bij opstarten een latere geldige bezettingswijziging niet blokkeren. Er is geen polling.

<a id="safety-and-precedence"></a>
## Veiligheid en voorrang

Modus- en profielacties gebruiken het blokbeleid van het geselecteerde schema. **Alleen temperatuur** werkt de doeltemperatuur bij zonder een HVAC-moduswijziging te vragen. Thuis selecteren schakelt een uitgeschakeld klimaatapparaat dus niet noodzakelijk in. Kies expliciete blokken met **Verwarmen** of **Koelen** wanneer Thuis de klimaatregeling moet starten. Rechtstreekse klimaatacties in deze blauwdruk blijven expliciete Home Assistant-acties; het blokbeleid onderdrukt ze niet.

De blueprint voert uitsluitend de ingestelde acties uit. Bestaande Velair-voorrang voor modi, profielen, tijdelijke aanpassingen en pauzes blijft gelden. Een bezettingsentiteit met `unknown` of `unavailable` activeert noch thuis noch afwezig. De waarschuwing noemt de entiteit en legt uit dat acties onderbroken blijven totdat een ondersteunde bezette of lege status wordt gemeld.

<a id="limitations"></a>
## Beperkingen

- De blueprint accepteert bewust één al gecombineerde bezettingsentiteit; ze combineert zelf geen personen- of gastenregels.
- Home Assistant-timers met `for` overleven geen herstart; de opstartroute begint de ingestelde vertraging opnieuw.
- De meldings-ID gebruikt de automatiseringsentiteits-ID. Na hernoemen kan de vorige melding blijven staan om handmatig te verwijderen.
- Parallelle uitvoering is beperkt tot 20 runs en waarschuwt als een uitzonderlijke gebeurtenispiek alle plaatsen vult.
- Acties die met **Controle overnemen** zijn gemaakt, ontvangen geen automatische blueprintupdates meer.

<a id="troubleshooting"></a>
## Problemen oplossen

- Als geen tak draait, controleer dan of de gekozen entiteit `on`/`home` of `off`/`not_home` meldt.
- Inspecteer bij een waarschuwing de genoemde bezettingsentiteit en de onderliggende groep, het sjabloon, personen of de gastenhelper.
- Verhoog de leegvertraging als Afwezig te snel wordt geactiveerd.
- Voer de gekozen actie handmatig in Home Assistant uit en controleer de optienaam als de verwachte modus niet wordt gekozen.
- Gebruik bij een mislukte profielactie de vaste profiel-ID in plaats van de bewerkbare weergavenaam.

<a id="updating-and-customizing"></a>
## Bijwerken en aanpassen

Importeer de doorlopende `main`-URL opnieuw voor een compatibele update. Versie 1 behoudt bestaande invoernamen en nieuwe invoer heeft altijd een standaardwaarde, zodat geen automatiseringsmigratie nodig is. Een toekomstige niet-compatibele versie krijgt een nieuwe bestandsnaam en hoofdversie in plaats van deze URL te vervangen. Velair bewerkt nooit Home Assistant-automatiseringen of `.storage` om een blueprint te migreren. Gebruik **Controle overnemen** alleen wanneer je logica nodig hebt die niet met de aangeboden invoer kan worden ingesteld; de zelfstandige automatisering ontvangt dan geen blueprintupdates meer.
