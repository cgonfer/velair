<a id="resilient-climate-delivery"></a>
# Invio affidabile dei comandi climatici
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.1 |
| Ultima sincronizzazione | 2026-10-11 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

Velair preserva l’intento climatico del pianificatore quando un termostato gestito si sta temporaneamente riconnettendo.

Se un’entità diventa `unknown` o `unavailable`, Velair attende che Home Assistant la segnali nuovamente disponibile. Il comportamento dipende dai cambiamenti di stato: Velair non interroga periodicamente il dispositivo. Alla riconnessione, verifica ciò che deve essere attivo *in quel momento*. Non ripete il comando che era in vigore prima dell’interruzione.

Per esempio, supponiamo che un profilo Assenza richiedesse 17 °C mentre un termostato era offline. Se prima della riconnessione viene selezionata la modalità Presenza, Velair risolve e invia l’obiettivo attuale di Presenza, anziché il comando ormai superato a 17 °C. La stessa regola vale per modalità, incremento, pausa, Room Assist e precondizionamento adattivo anticipato.

Quando Home Assistant rifiuta esplicitamente una chiamata climatica, Velair effettua al massimo due ulteriori tentativi: dopo circa 2 secondi e 10 secondi. Un nuovo intento o l’arresto/la rimozione di Velair annulla le operazioni in attesa per quel dispositivo.

Le azioni manuali sulla temperatura vengono eseguite una sola volta. Velair non applica in ritardo un vecchio obiettivo manuale dopo la riconnessione del dispositivo.

Un evento Velair che indica l’applicazione significa che Home Assistant ha accettato l’intera sequenza di chiamate climatiche, comprese la modalità richiesta e le opzioni supportate. Non conferma che l’apparecchiatura fisica abbia raggiunto la temperatura. Per verificarne il funzionamento effettivo, usa lo stato dell’entità climatica e la diagnostica dell’integrazione del dispositivo.

Questo comportamento funziona con riscaldamento, raffrescamento, obiettivi singoli, intervalli nativi `heat_cool`, azioni di spegnimento e opzioni supportate per ventilazione, preset, oscillazione e umidità. I blocchi che contengono solo opzioni seguono gli stessi criteri di invio senza impostare un obiettivo o una modalità HVAC. Le chiamate ai servizi vengono eseguite in sequenza: se una chiamata successiva fallisce, un’opzione precedente potrebbe essere già cambiata, ma Velair non segnala l’intero blocco come applicato.
