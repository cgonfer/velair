<a id="installation"></a>
# Installatie
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Vertaalstatus](../translation-status.md)

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

Velair is beschikbaar in de standaard HACS-winkel. Handmatige installatie blijft mogelijk als je geen HACS gebruikt of een specifieke build wilt testen.

<a id="hacs"></a>
## HACS

1. Open HACS.
2. Zoek **Velair** tussen de beschikbare integraties.
3. Open Velair en kies **Downloaden**.
4. Herstart Home Assistant.
5. Ga naar **Instellingen > Apparaten & diensten**.
6. Voeg de Velair-integratie toe.
7. Selecteer de `climate.*`-entiteiten die Velair mag beheren.

Velair gebruikt de temperatuureenheid die in Home Assistant is ingesteld. Een nieuwe installatie maakt schema's, sjablonen, comfortdrempels, Room Assist-instellingen en standaardwaarden voor adaptieve voorconditionering aan voor die eenheid. De eenheid wordt in de Velair-instellingen alleen weergegeven; je wijzigt deze in Home Assistant.

Bij een upgrade vanaf een uitgebrachte Velair-versie die alleen Celsius ondersteunt, kan een reset nodig zijn als Home Assistant Fahrenheit gebruikt. Lees eerst [Temperatuureenheden en migratie](temperature-units.nl.md), zodat je zo nodig vooraf een kopie ter referentie kunt exporteren.

<a id="manual-installation"></a>
## Handmatige installatie

Handmatige installatie is doorgaans alleen nodig als je geen HACS gebruikt of een build van GitHub Actions of GitHub Release wilt testen.

Releasebestanden bevatten `velair-custom-component-<version>.zip`. Pak het bestand zo uit dat deze map bestaat:

```text
<home_assistant_config>/custom_components/velair
```

Bij een lokale kopie van de repository kopieer je:

```text
custom_components/velair
```

naar:

```text
<home_assistant_config>/custom_components/velair
```

Herstart Home Assistant en voeg Velair toe via **Instellingen > Apparaten & diensten**.

<a id="github-actions-artifacts"></a>
## GitHub Actions-artifacts

Elke geslaagde CI-uitvoering uploadt tijdelijke artifacts:

- `velair-custom-component`: de volledige map `custom_components/velair`, met de frontendbundel die tijdens die uitvoering is gegenereerd.
- `velair-lovelace-resource`: de gecompileerde `velair-card.js`-bestanden voor geavanceerde handmatige tests van de Lovelace-resource.

Bij releases met een tag worden ook zipbestanden aan de GitHub Release toegevoegd. Gebruik voor normaal gebruik bij voorkeur HACS; deze artifacts zijn bedoeld om een specifieke workflowuitvoering te testen of handmatig te installeren.

<a id="optional-lovelace-card"></a>
## Optionele Lovelace-kaart

Het zijbalkpaneel wordt automatisch geregistreerd. De Lovelace-kaart is optioneel. Bij dashboardresources beheerd via de Home Assistant-interface registreert Velair zijn JavaScript-module automatisch bij het instellen van de integratie, ook na updates van bestaande installaties. Controleer dit bij **Instellingen > Dashboards > Bronnen** via het driepuntenmenu. Handmatig instellen is in deze modus niet nodig; voeg kaarten direct toe.

De URL is `/velair_frontend/velair-card.js?v=...`. Velair werkt de versieparameter bij wanneer de bundel verandert; bewerk deze niet zelf. Herstart na installatie of update Home Assistant en herlaad browser of Companion-app. Kaarten moeten direct in het dashboard werken, zonder eerst de Velair-zijbalk te bezoeken.

Voeg daarna een of meer Velair-kaarten toe. Elke kaart gebruikt dezelfde backendgegevens en visuele onderdelen als het zijbalkpaneel.

```yaml
type: custom:velair-card
view: overview-status
```

Ondersteunde waarden voor `view`:

- `climate`: status en bediening voor één beheerd klimaatapparaat, met optioneel een actie voor een eenmalige terugkeer van het huishouden naast tijdelijke aanpassingen en pauzes. Bij bestaande kaarten blijft deze actie verborgen; nieuwe configuraties via de kaartkiezer schakelen deze in.
- `overview-status`: plannerstatus en bediening voor pauzeren, stoppen en hervatten.
- `overview-boosts`: actieve tijdelijke aanpassingen.
- `overview-events`: komende gebeurtenissen.
- `overview-timeline`: tijdlijn van vandaag.
- `overview-zones`: zoneoverzicht.
- `active-setup`: huidige modus en profielen, met optionele bediening.
- `schedules`: volledige schema-editor.
- `sensors`: Room Assist-configuratie en actuele status.
- `comfort`: instellingen en status van omgevingscomfort.
- `preconditioning`: instellingen voor adaptieve voorconditionering en status van het lokale leerproces.
- `planned-return`: compacte bediening voor een eenmalige terugkeer, aantallen ingestelde bezettingsbronnen en een tijdlijn van het bevestigde vertrek. Zonder opgeslagen bezettingsbronnen activeert **Plan return** de afwezigheidsmodus onmiddellijk; de automatische wekelijkse routine vereist wel bronnen.
- `diagnostics`: runtimegezondheid, begrensde geschiedenis, filters en export van probleemrapporten.

<a id="resources-managed-in-yaml"></a>
### Resources beheerd in YAML

Bij `lovelace.resource_mode: yaml` blijft de resourcelijst onder jouw beheer. Voeg dit toe aan de bestaande `lovelace`-configuratie:

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /velair_frontend/velair-card.js
      type: module
```

De stabiele URL zonder versieparameter blijft ondersteund; je hoeft geen versiewaarde in YAML bij te houden. Behoud alle overige resources. Alleen een kaart of dashboard in YAML schrijven schakelt YAML-resourcebeheer niet in.

<a id="card-discovery-and-resource-troubleshooting"></a>
### Kaartdetectie en problemen met bronnen oplossen

Gebruik alleen de integratiemodule `/velair_frontend/velair-card.js`, met automatische versieparameter bij interfacebeheer. Velair migreert exact de oude `/local/velair-card.js` en voegt dubbele vermeldingen voor deze twee lokale paden automatisch samen. Andere paden en externe URL's blijven ongewijzigd. Verwijder bij YAML-beheer oude of dubbele vermeldingen zelf, herstart Home Assistant en herlaad de browser. Aangepaste browserelementen zijn na registratie niet vervangbaar; een eerst geladen oude resource kan een verouderde kaart vasthouden.

Controleer bij YAML-waarschuwingen of mislukte automatische registratie de instructies in Home Assistant-logboeken. Deze resourcecontroles maken geen blijvende meldingen.

De kaartkiezer van het dashboard ontdekt Velair via frontendmetadata. Handmatig <code>type: custom:velair-card</code> toevoegen in YAML gebruikt het geregistreerde aangepaste element; dit zijn afzonderlijke controles. Vermeld bij een probleemmelding of de kaart via YAML werkt maar niet in de kiezer verschijnt.

Bij verschillen tussen desktop en mobiel controleer je de ontwikkelaarsconsole van de getroffen browser op JavaScript-fouten en het tabblad Netwerk op de bronaanvraag. Vermeld Home Assistant- en Velair-versies, de browser, exacte bron-URL en relevante fouttekst. Verwijder privégegevens voordat je logboeken deelt. Succesvol laden in een andere browser bewijst niet wat de storing in de getroffen browser veroorzaakt.

<a id="updating"></a>
## Bijwerken

Na het bijwerken van Velair:

1. Herstart Home Assistant.
2. Vernieuw de browser volledig of laad de Home Assistant-companion-app opnieuw.
3. Controleer of het onderhoudsgedeelte van de instellingen de verwachte integratieversie toont.
