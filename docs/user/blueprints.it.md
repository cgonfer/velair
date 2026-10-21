<a id="automation-blueprints"></a>
# Blueprint per le automazioni
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.4 |
| Ultima sincronizzazione | 2026-10-21 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

Velair lascia la gestione di presenza, porte, ospiti e condizioni specifiche della casa a Home Assistant, invece di creare un secondo motore di automazione. Questi blueprint facoltativi offrono punti di partenza guidati per i casi comuni, restando completamente locali e basati su eventi.

Importare un blueprint non modifica Velair di per sé. Home Assistant aggiunge prima il blueprint riutilizzabile; poi crei e configuri un’automazione basata su di esso. Le automazioni esistenti possono ricevere aggiornamenti del blueprint tramite una nuova importazione, oppure puoi usare **Prendi il controllo** per trasformarle in automazioni Home Assistant indipendenti.

I pacchetti delle integrazioni HACS non copiano automaticamente i blueprint nella directory dei blueprint di Home Assistant. Usa i collegamenti di importazione qui sotto.

<a id="available-blueprints"></a>
## Blueprint disponibili

I blueprint sono elencati in ordine alfabetico.

- [Presenza e assenza in base all’occupazione](#home-and-away-from-occupancy)
- [Mettere una zona in pausa con le finestre aperte](#pause-a-zone-while-windows-are-open)
- [Selezione climatica stagionale](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Presenza e assenza in base all’occupazione

Esegui le azioni Home Assistant scelte quando un’unica entità consolidata di presenza indica che la casa è occupata o vuota. Le azioni possono selezionare una modalità Velair, attivare un profilo o coordinare Velair con il resto della casa. Una notifica differita segnala quando la presenza non è disponibile.

**Versione:** 1.0.0 · **Richiede:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.it.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta la documentazione di Presenza e assenza in base all’occupazione"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Apri Home Assistant e importa il blueprint Presenza e assenza in base all’occupazione" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Mettere una zona in pausa con le finestre aperte

Metti in pausa uno o più dispositivi climatici gestiti da Velair finché una delle finestre o porte selezionate resta aperta, poi riprendi le programmazioni solo dove l’automazione è ancora responsabile della pausa attiva. Una notifica differita di Home Assistant identifica i contatti non disponibili e i termostati interessati.

**Versione:** 1.0.0 · **Richiede:** Home Assistant 2024.6.0+ e Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.it.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta la documentazione per mettere una zona in pausa con le finestre aperte"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Apri Home Assistant e importa il blueprint per mettere una zona in pausa con le finestre aperte" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Selezione climatica stagionale

Esegui una sola volta le azioni configurabili per inverno, clima mite o estate dopo che la temperatura resta in un nuovo intervallo stagionale per un ritardo positivo, inizialmente 30 minuti. Le variazioni all’interno di quell’intervallo mantengono la scadenza e non ripetono le azioni. Usa l’editor standard delle azioni per scegliere modalità Velair o altre azioni Home Assistant. Le letture non valide generano una notifica immediata; all’avvio viene verificata la diagnostica senza scegliere una stagione.

Le notifiche diagnostiche supportano le stesse lingue di Velair, scelti esplicitamente nel blueprint.

**Versione:** 1.1.0 · **Richiede:** Home Assistant 2024.6.0+ · **Categoria:** Temperatura / automazione stagionale

<p>
  <a href="blueprints/seasonal-climate-selection.it.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta la documentazione della selezione climatica stagionale"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Apri Home Assistant e importa il blueprint della selezione climatica stagionale" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta il sorgente YAML della selezione climatica stagionale"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Comportamento condiviso

- I blueprint reagiscono agli eventi di stato e avvio di Home Assistant; non interrogano periodicamente i dispositivi.
- I ritardi configurabili filtrano i cambiamenti di stato brevi.
- Gli stati `unknown` e `unavailable` vengono gestiti in modo prudente.
- Il blueprint della presenza segnala problemi prolungati di disponibilità della presenza e rimuove l’avviso dopo il recupero.
- Il blueprint delle finestre segnala problemi persistenti di disponibilità dei contatti senza ritardare il controllo di quelli che funzionano ancora.
- Il blueprint stagionale segnala immediatamente letture di temperatura non valide e non seleziona mai una stagione all’avvio.
- La configurazione dei blueprint resta in Home Assistant, non nell’archivio di Velair.
- Importare nuovamente lo stesso URL aggiorna il blueprint usato dalle automazioni esistenti.

La pagina di ciascun blueprint documenta requisiti, configurazione, esempio, comportamento di sicurezza, limiti e passaggi per la risoluzione dei problemi.

<a id="versions-and-updates"></a>
## Versioni e aggiornamenti

I blueprint usano proprie versioni semantiche, indipendenti dall’integrazione Velair. I collegamenti di importazione seguono intenzionalmente la versione in continua evoluzione su `main`. Importa nuovamente lo stesso URL quando vuoi un aggiornamento compatibile per un’automazione esistente. Home Assistant non aggiorna automaticamente i blueprint importati.

Gli aggiornamenti della versione 1 conservano i nomi degli input esistenti e ogni nuovo input ha un valore predefinito. Una modifica incompatibile viene pubblicata con un nuovo nome file e una nuova versione principale, mantenendo disponibile l’URL esistente. Velair non ispeziona né migra le automazioni di Home Assistant o i dati `.storage`. **Prendi il controllo** mantiene indipendente un’automazione, ma interrompe anche la ricezione dei successivi aggiornamenti del blueprint.
