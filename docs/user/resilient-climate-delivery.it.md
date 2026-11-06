<a id="resilient-climate-delivery"></a>
# Invio affidabile dei comandi climatici
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.10 |
| Ultima sincronizzazione | 2026-11-04 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

Velair preserva l’intento climatico del pianificatore quando un termostato gestito si sta temporaneamente riconnettendo.

Se un’entità diventa `unknown` o `unavailable`, Velair attende che Home Assistant la segnali nuovamente disponibile. Il comportamento dipende dai cambiamenti di stato: Velair non interroga periodicamente il dispositivo. Alla riconnessione, verifica ciò che deve essere attivo *in quel momento*. Non ripete il comando che era in vigore prima dell’interruzione.

Per esempio, supponiamo che un profilo Assenza richiedesse 17 °C mentre un termostato era offline. Se prima della riconnessione viene selezionata la modalità Presenza, Velair risolve e invia l’obiettivo attuale di Presenza, anziché il comando ormai superato a 17 °C. La stessa regola vale per modalità, incremento, pausa, Room Assist e precondizionamento adattivo anticipato.

Quando Home Assistant rifiuta una chiamata climatica, oppure la accetta ma il dispositivo continua a riportare un obiettivo diverso, Velair effettua al massimo due ulteriori tentativi in quell’episodio di invio. Il primo attende circa 2 secondi e il secondo altri 10 secondi circa. Dopo l’ultimo tentativo accettato, Velair attende 5 secondi per la segnalazione dell’obiettivo. Una segnalazione corrispondente può completare prima la conferma; i dispositivi che riportano il valore richiesto non richiedono nuovi tentativi.

Il ripristino è indipendente per ogni zona gestita. Se più dispositivi separati cambiano blocco contemporaneamente, solo quello il cui obiettivo rimane diverso riceve un nuovo tentativo. Gli altri dispositivi non vengono ritardati né ricevono di nuovo i comandi. Questi controlli usano gli stati riportati da Home Assistant e i listener esistenti dei cambiamenti di stato, senza letture periodiche del dispositivo.

Prima di riprovare, Velair verifica nuovamente l’intento attuale, compresi eventuali nuovi blocchi, incrementi o pause. Un nuovo intento o l’arresto/la rimozione di Velair annulla le operazioni obsolete in attesa per quel dispositivo. Diagnostica mostra se la conferma è in attesa, ottenuta, ripristinata dopo un nuovo tentativo o ancora assente. Anche un errore silenzioso risolto rimane nella cronologia limitata degli invii.

Una vera transizione da non disponibile a disponibile mantiene il ripristino alla riconnessione. Se una conferma o un ripristino è già in attesa, vengono mantenuti la scadenza originale e il numero di tentativi ancora disponibili; una segnalazione corrispondente può completare la conferma senza un altro comando. Altrimenti, la riconnessione avvia un nuovo episodio di invio per l’obiettivo attuale. Le normali segnalazioni di temperatura, umidità o obiettivo non azzerano un numero di tentativi già esaurito. Una segnalazione tardiva corrispondente all’obiettivo richiesto elimina la discrepanza senza inviare un altro comando.

Le azioni manuali sulla temperatura vengono eseguite una sola volta. Velair non applica in ritardo un vecchio obiettivo manuale dopo la riconnessione del dispositivo.

Un evento Velair che indica l’applicazione significa che Home Assistant ha accettato l’intera sequenza di chiamate climatiche, comprese la modalità richiesta e le opzioni supportate. Non conferma che l’apparecchiatura fisica abbia raggiunto la temperatura. Per verificarne il funzionamento effettivo, usa lo stato dell’entità climatica e la diagnostica dell’integrazione del dispositivo.

Questo comportamento funziona con riscaldamento, raffrescamento, obiettivi singoli, intervalli nativi `heat_cool`, azioni di spegnimento e opzioni supportate per ventilazione, preset, oscillazione e umidità. I blocchi che contengono solo opzioni seguono gli stessi criteri di invio senza impostare un obiettivo o una modalità HVAC. Le chiamate ai servizi vengono eseguite in sequenza: se una chiamata successiva fallisce, un’opzione precedente potrebbe essere già cambiata, ma Velair non segnala l’intero blocco come applicato.
