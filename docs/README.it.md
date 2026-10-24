<a id="documentation"></a>
# Documentazione
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Stato delle traduzioni](translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.5 |
| Ultima sincronizzazione | 2026-10-24 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

La documentazione di Velair è organizzata per destinatari e argomento.

<a id="user-documentation"></a>
## Documentazione per gli utenti

- [Installazione](user/installation.it.md): installare Velair tramite HACS o manualmente.
- [Uso](user/usage.it.md): configurare dispositivi climatici, programmazioni, modelli, profili, incrementi, pause, importazione/esportazione e servizi.
- [Navigazione del pannello e collegamenti diretti](user/usage.it.md#panel-navigation-and-direct-links): aprire schede e sottosezioni tramite collegamenti, ripristinare la sezione dopo un aggiornamento della pagina e usare la cronologia del browser.
- [Modifiche esterne e regolazione manuale](user/manual-control.it.md): scegliere se Velair mantiene il controllo automatico o lascia spazio alle modifiche effettuate tramite schede HA, telecomandi, dispositivi e automazioni.
- [Esecuzione esterna della programmazione](user/external-systems.it.md): pubblicare programmazioni settimanali effettive compatibili, comprese le selezioni di profili e modalità, su controller supportati senza integrare la logica dei fornitori nel pianificatore di Velair.
- [Profili climatici](user/climate-profiles.it.md): coordinare programmazioni alternative ed esporre modalità configurabili alle automazioni di Home Assistant.
- [Preset dei blocchi e modelli collegati](user/linked-schedules.it.md): riutilizzare impostazioni climatiche e condividere orari giornalieri o programmazioni giornaliere complete fra la programmazione predefinita e quelle dei profili.
- [Esempi di preset e modelli](user/linked-schedule-examples.it.md): configurazioni domestiche passo passo, programmazioni stagionali, copie, modifiche condivise e risoluzione dei problemi.
- [Automazioni con preset](user/preset-automations.it.md): aggiornare obiettivi condivisi e impostazioni dei dispositivi tramite script, con esempi basati sulla temperatura esterna e sostituzione esplicita.
- [Eventi per le automazioni](user/automation-events.it.md): usare i dati completi degli eventi di esecuzione nelle automazioni di Home Assistant.
- [Blueprint per le automazioni](user/blueprints.it.md): importare strumenti facoltativi per presenza, finestre aperte e temperature stagionali, senza interrogazioni periodiche.
- [Selezione climatica stagionale](user/blueprints/seasonal-climate-selection.it.md): scegliere modalità o altre azioni in base a variazioni stabili della temperatura, con notifiche diagnostiche immediate.
- [Precondizionamento adattivo](user/adaptive-preconditioning.it.md): anticipare gli obiettivi di comfort programmati grazie all’apprendimento locale.
- [Rientro pianificato](user/planned-return.it.md): configurare l’assenza in base alla presenza e rientri settimanali o occasionali, con esempi di annullamento prima e dopo la partenza confermata.
- [Room Assist](user/room-assist.it.md): usare un sensore di temperatura ambiente separato per valvole termostatiche, termostati e climatizzatori.
- [Controllo alimentazione](user/shared-climate-supply.it.md): controllare un interruttore condiviso di riscaldamento o raffrescamento secondo la richiesta stimata delle stanze, con isteresi dell’alimentazione ed eccezioni per termostato.
- [Invio affidabile dei comandi climatici](user/resilient-climate-delivery.it.md): comprendere i tentativi differiti e il comportamento alla riconnessione quando un dispositivo climatico non è temporaneamente disponibile.
- [Comfort ambientale](user/comfort.it.md): comprendere temperatura, umidità, qualità dell’aria legata alla CO2 e aggiornamento delle letture attraverso valutazioni locali delle stanze.
- [Unità di temperatura e migrazione](user/temperature-units.it.md): comprendere valori predefiniti Celsius/Fahrenheit, aggiornamenti, migrazione, importazione/esportazione e ripristino.
- [Risoluzione dei problemi](user/troubleshooting.it.md): problemi comuni di configurazione, risorse frontend e funzionamento.
- [Diagnostica](user/diagnostics.it.md): stato locale del funzionamento, cronologia limitata e segnalazioni con dati sensibili rimossi.
- [Riferimento dei sensori](user/sensors.it.md): consultare tutti i sensori Velair, i loro attributi principali ed esempi pratici di automazione.
- [Sensori di controllo della zona e invio dei comandi](user/zone-sensors.it.md): usare il contesto di controllo di ogni dispositivo e le informazioni sull’invio dei comandi in dashboard e automazioni.

<a id="developer-documentation"></a>
## Documentazione per gli sviluppatori

- [Architettura](developer/architecture.md): confini dei moduli backend e frontend, modello di persistenza e flusso del pianificatore.
- [Dettagli dei collegamenti delle programmazioni](developer/linked-schedules.md): preset dei blocchi aggiornati in tempo reale, collegamenti dei soli orari o completi, transazioni condivise e programmazioni risolte.
- [Manutenzione dei blueprint](developer/blueprints.md): aggiungere YAML dei blueprint, voci di catalogo, pagine dettagliate coerenti, traduzioni e test.
- [API WebSocket](developer/api.md): contratto API fra frontend e backend.
- [Dettagli del precondizionamento adattivo](developer/adaptive-preconditioning.md): stati di apprendimento locale, ponderazione per somiglianza, archiviazione e dati API.
- [Dettagli di Room Assist](developer/room-assist.md): scelta del sensore ambiente, calcolo dell’obiettivo assistito, stato di esecuzione, ripristino ed eventi.
- [Dettagli dell’invio dei comandi climatici](developer/climate-delivery.md): nuovi tentativi basati su eventi, recupero della disponibilità, serializzazione, generazioni e criteri di successo.
- [Dettagli del comfort ambientale](developer/comfort.md): scelta delle fonti, valutazione delle condizioni, qualità dei dati, listener, dati API ed eventi.
- [Dettagli delle unità di temperatura](developer/temperature-units.md): metadati di archiviazione, limiti della migrazione, conversione dei dati portabili, validazione e sicurezza in esecuzione.
- [Frontend](developer/frontend.md): elementi frontend, comandi di build, risorsa Lovelace, traduzioni, principi dell’interfaccia e flusso di lavoro frontend.
- [Sviluppo](developer/development.md): verifiche locali, file generati, linee guida di programmazione e modalità di contribuzione.
- [Test manuali](developer/manual-testing.md): lista di verifica per le versioni e il comportamento.

<a id="project-documentation"></a>
## Documentazione del progetto

- [Schermate](project/screenshots.md): schermate reali.

Le idee future e le richieste di funzionalità vanno seguite tramite issue o discussioni su GitHub, così da poter evolvere con il contributo della comunità senza creare promesse su una roadmap.
