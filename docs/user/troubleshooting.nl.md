<a id="troubleshooting"></a>
# Problemen oplossen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Vertaalstatus](../translation-status.md)

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

<a id="a-lovelace-card-shows-configuration-error"></a>
## Een Lovelace-kaart toont een configuratiefout

Controleer of Velair is geïnstalleerd en ingesteld voordat het dashboard de kaart laadt. Bij resources beheerd via de Home Assistant-interface registreert en vernieuwt Velair zijn module automatisch. Normale installatie vereist geen handmatige resourceconfiguratie.

Als de fout blijft bestaan:

1. Controleer de dashboardresource `/velair_frontend/velair-card.js` met type **JavaScript-module**. Een automatisch `?v=...` hoort bij interfacebeheer; verwijder of bewerk dit niet.
2. Controleer oude of dubbele resources zoals `/local/velair-card.js`. Velair migreert en consolideert precies deze lokale paden bij interfacebeheer automatisch. Andere paden en externe URL's vragen handmatige controle.
3. Herstart Home Assistant na een integratie-update.
4. Herlaad browser of Companion-app en open het dashboard direct, zonder eerst de Velair-zijbalk te bezoeken.

Voeg bij YAML-resourcebeheer de module handmatig toe met de stabiele URL zonder parameters en verwijder daar oude of dubbele vermeldingen. Een kaart of dashboard in YAML betekent op zichzelf geen YAML-resourcebeheer. Zie [installatie](installation.nl.md#resources-managed-in-yaml). Controleer Home Assistant-logboeken op registratiefouten of YAML-waarschuwingen; Velair maakt hiervoor geen blijvende meldingen.

Als automatische registratie mislukt, voeg de resource handmatig toe via **Instellingen > Dashboards > Bronnen** als **JavaScript-module**:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

De browserconsole of het netwerkpaneel laat zien of het verzoek voor de module is mislukt. Vermeld de volledige foutmelding wanneer je een reproduceerbaar probleem meldt.

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair verschijnt niet in de zijbalk

Herstart Home Assistant nadat je de integratie hebt geïnstalleerd of bijgewerkt. Het zijbalkpaneel wordt tijdens de configuratie van de integratie geregistreerd.

Als de integratie net is bijgewerkt, vernieuw de browser dan volledig of laad de Home Assistant-companion-app opnieuw.

<a id="the-lovelace-card-shows-old-ui"></a>
## De Lovelace-kaart toont de oude interface

Herstart eerst Home Assistant en herlaad de betreffende browser of Companion-app. Velair vernieuwt interfacebeheerde resources automatisch, inclusief migratie van `/local/velair-card.js` en samenvoegen van herkende duplicaten. Controleer de logboeken bij fouten. Andere paden en externe URL's vragen handmatige controle.

Velair levert deze resource met no-cacheheaders. Bij interfacebeheer onderhoudt het automatisch `?v=...` en gebruikt dezelfde versie-URL voor zijbalk en dashboardkaarten. De stabiele URL `/velair_frontend/velair-card.js` blijft geldig voor handmatige en YAML-configuratie. Voeg geen buildidentificaties toe en wijzig versieparameters niet tussen releases.

Een integratie-update vereist normaal alleen Home Assistant herstarten en browser of app herladen. Meldt het backend de nieuwe versie maar blijft de oude interface zichtbaar, voer dan een harde vernieuwing uit of wis de sitecache voordat je het probleem meldt.

<a id="a-climate-entity-is-missing"></a>
## Een klimaatentiteit ontbreekt

Open de opties van de Velair-integratie en controleer of de entiteit is geselecteerd. Velair beheert alleen `climate.*`-entiteiten die in de integratie zijn ingesteld.

Als de entiteit niet meer in Home Assistant bestaat, toont Velair dit vastgestelde probleem onder **Diagnostics**.

<a id="a-mode-is-not-available"></a>
## Een modus is niet beschikbaar

Velair leest de ondersteunde HVAC-modi uit de klimaatentiteit. Als een modus ontbreekt, meldt de entiteit die modus niet als ondersteund.

Bij het toepassen van sjablonen of het klonen van schema's weigert Velair niet-ondersteunde modi met een duidelijke foutmelding. Kies voor het blok `Huidige modus behouden` of selecteer een modus die het doelapparaat ondersteunt.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## De temperatuur verandert bij het toepassen van sjablonen

Bij het toepassen van een sjabloon controleert Velair de resulterende klimaatinstellingen op compatibiliteit met de doelthermostaat. Velair weigert eerst temperaturen onder de minimumtemperatuur of boven de maximumtemperatuur van de thermostaat. Waarden binnen die grenzen kunnen vervolgens worden afgerond op de ondersteunde temperatuurstap, ook dicht bij een grens van het bereik. Deze controle geldt ook voor gedeelde presets en gekoppelde sjablonen: een onverenigbare gedeelde configuratie verhindert dat de betreffende bewerking wordt opgeslagen. Pas de temperatuur aan of kies een compatibel doelapparaat voordat je het opnieuw probeert.

<a id="export-does-not-download-on-mobile"></a>
## Export downloaden werkt niet op mobiel

Export is voorlopig bewust alleen op desktop beschikbaar, omdat mobiele companion-apps downloads niet altijd op dezelfde manier afhandelen. Import is op desktop en mobiel beschikbaar.

<a id="scheduler-does-not-apply-after-restart"></a>
## De planner past niets toe na een herstart

Standaard herstelt Velair de status zonder klimaatapparaten opdrachten te geven wanneer Home Assistant opstart.

Schakel **Actief schema toepassen na opstarten** in de instellingen in als je wilt dat Velair het actieve schema na een herstart toepast.

<a id="reset-to-defaults"></a>
## Standaardwaarden herstellen

Gebruik **Instellingen > Onderhoud > Velair resetten**. Dit wist alle opgeslagen Velair-gegevens, waaronder schema's, sjablonen, paneelvoorkeuren, actieve tijdelijke aanpassingen en pauzes, comfort- en Room Assist-instellingen, instellingen en leergegevens voor adaptieve voorconditionering en het opstartgedrag. Daarna worden standaardwaarden aangemaakt voor de huidige temperatuureenheid en de beheerde klimaatapparaten.

Exporteer eerst als je bestaande gegevens later mogelijk wilt herstellen.

<a id="temperature-unit-requires-attention"></a>
## De temperatuureenheid vereist aandacht

Velair leest de temperatuureenheid uit Home Assistant. Als de instellingen melden dat de opgeslagen eenheid verschilt van de Home Assistant-eenheid, blijven automatische planning en het versturen van temperatuurinstellingen gestopt. Zo kan een oude doeltemperatuur niet met een verkeerde betekenis worden toegepast.

- Als Velair een migratie van opgeslagen temperaturen aanbiedt, controleer dan of alle opgeslagen waarden nog steeds de getoonde broneenheid gebruiken en voer de migratie één keer uit. Als je niets doet, blijft de planning gestopt; Velair converteert nooit stilzwijgend.
- Als een upgrade vanaf oudere uitgebrachte Celsius-gegevens een reset vereist, exporteer dan zo nodig eerst een kopie ter referentie. Gebruik daarna **Velair resetten** om standaardwaarden in de huidige Home Assistant-eenheid aan te maken.
- Als een reset, migratie of import is opgeslagen maar het runtimeherstel is mislukt, laad dan de Velair-integratie opnieuw of herstart Home Assistant. Velair blijft bewust gestopt totdat het herstel is voltooid.

Als een schema als niet-compatibel wordt aangeduid nadat een klimaatapparaat weer beschikbaar is, controleer dan de doeltemperatuur tegen het gemelde bereik en de effectieve temperatuurstap van die entiteit. Als `target_temp_step` ontbreekt, stel dan de werkelijke apparaatstap in op de instellingenregel van dat klimaatapparaat. Het veld toont de laatst geldige stap die Velair heeft onthouden, vervolgens een opgeslagen handmatige terugvalwaarde of `1` als beide ontbreken. Als je een handmatige waarde opslaat terwijl het attribuut ontbreekt, vervangt deze de onthouden waarneming. De handmatige waarde wordt genegeerd, maar blijft bewaard, zodra Home Assistant een geldige stap meldt.

Oudere back-ups zonder vastgelegde eenheid worden als Celsius geaccepteerd. Het importscherm toont deze aanname en converteert geselecteerde temperatuurwaarden als de huidige Home Assistant-eenheid Fahrenheit is.

Lees [Temperatuureenheden en migratie](temperature-units.nl.md) voor de volledige uitleg en het gedrag van back-ups.
