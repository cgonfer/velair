<a id="update-shared-presets-from-automations"></a>
# Aggiornare i preset condivisi dalle automazioni
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Usa `velair.update_block_preset` per modificare un preset Velair salvato da un’automazione o uno script Home Assistant. La definizione condivisa viene modificata in modo permanente: ogni blocco che vi fa riferimento riceve la nuova configurazione, compresi i blocchi dei modelli e dei giorni che seguono la configurazione completa di quei modelli.

Il servizio non seleziona un preset diverso per un blocco e non attiva un profilo. Usa profili o modalità quando l’automazione deve scegliere una routine diversa.

<a id="find-the-identifier"></a>
## Trovare l’identificatore

Apri **Modelli → Preset climatici**, seleziona un preset salvato e copia il suo **Identificatore per automazioni**. Usa quel valore come `preset_key`; rinominare il preset non ne cambia l’identificatore. Gli esempi qui sotto usano identificatori illustrativi. Sostituiscili con i valori che hai copiato.

<a id="update-or-replace"></a>
## Aggiornare o sostituire

L’operazione predefinita `operation: update` modifica solo i campi inviati e conserva l’azione del preset e le altre impostazioni. Non inviare `action` con questa operazione.

`operation: replace` sostituisce l’intera configurazione climatica. Invia `action` e tutte le impostazioni da conservare. È il modo per passare fra un’azione di temperatura, una di sola modalità, una di sole impostazioni aggiuntive e Off. Nome, identificatore e posizione del preset nella libreria restano invariati.

| Campo | Significato |
|---|---|
| `preset_key` | Identificatore obbligatorio di un preset Velair esistente. |
| `operation` | `update` (predefinito) o `replace`. |
| `action` | Obbligatorio per `replace`, vietato per `update`. Usa `set_temperature`, `set_hvac_mode`, `set_climate_options` o `turn_off`. |
| `temperature` | Obiettivo di temperatura singolo, nell’unità dichiarata da Velair. |
| `target_temp_low`, `target_temp_high` | Obiettivo con intervallo nativo; invia sempre entrambi i limiti insieme. |
| `hvac_mode` | Modalità HVAC, soggetta alle regole dell’azione selezionata. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Impostazioni facoltative del dispositivo, soggette alle regole dell’azione selezionata. |
| `clear_fields` | Solo per `update`: elenco dei parametri climatici da rimuovere. |

Inviare un obiettivo singolo rimuove un intervallo precedente; inviare un intervallo completo rimuove un obiettivo singolo precedente. Non inviare mai entrambi nella stessa chiamata. Rimuovere un obiettivo obbligatorio o l’ultima impostazione da un preset di sole opzioni non è valido. Usa `replace` per cambiare l’azione stessa.

Omettere un campo in `update` lo conserva. Stringhe vuote e `null` non sono istruzioni per rimuovere un’impostazione: usa `clear_fields`. Un campo non può essere impostato e cancellato nella stessa chiamata. Rimuovere un’impostazione del dispositivo interrompe l’invio di quel comando; non ripristina l’impostazione sul termostato.

Il modulo standard delle azioni Home Assistant definisce le modifiche da effettuare ogni volta che l’automazione viene eseguita. Non carica nel modulo i valori attuali del preset. I parametri meno usati sono raggruppati in sezioni chiuse.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Esempio: adattare il comfort di riscaldamento alla temperatura esterna

**Situazione:** soggiorno e studio usano entrambi il preset Velair **Comfort riscaldamento**, configurato su Heat a 21 °C con ventilazione silenziosa. Vuoi 21 °C quando fa freddo e 19 °C quando il tempo è più mite, conservando modalità e ventilazione.

Questa automazione effettua la valutazione all’avvio di Home Assistant e ai cambiamenti del sensore esterno. Sotto 10 °C imposta 21 °C; sopra 12 °C imposta 19 °C. Fra queste soglie mantiene l’obiettivo precedente. La fascia intermedia evita commutazioni ripetute intorno a una sola soglia. Se il sensore non è disponibile, non modifica nulla.

```yaml
alias: Velair heating comfort by outdoor temperature
triggers:
  - trigger: homeassistant
    event: start
  - trigger: state
    entity_id: sensor.outdoor_temperature
conditions:
  - condition: template
    value_template: "{{ is_number(states('sensor.outdoor_temperature')) }}"
actions:
  - choose:
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            below: 10
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 21
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            above: 12
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 19
mode: queued
max: 10
```

L’esempio presuppone che Velair e il sensore esterno usino °C. Per Fahrenheit, scegli soglie e obiettivi equivalenti nelle unità appropriate. Il servizio non converte mai il valore del sensore esterno per questa automazione.

Entrambe le stanze mantengono le proprie programmazioni. Se Comfort riscaldamento è attivo e Velair ha il controllo automatico, il suo obiettivo cambia dopo il salvataggio. Se il prossimo blocco è futuro, Velair ricalcola gli eventi programmati e il piano di precondizionamento. Chiamate ripetute con una configurazione invariata non scrivono nell’archivio e non inviano comandi.

<a id="example-update-a-native-range"></a>
## Esempio: aggiornare un intervallo nativo

**Situazione:** un termostato che supporta intervalli Heat/cool usa **Intervallo casa**. Cambia il suo obiettivo a 19–25 °C, conservando modalità e opzioni del dispositivo:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Invia entrambi i limiti anche se ne cambia solo uno. Un termostato che supporta solo temperature singole non può usare questo preset. Velair non deduce una temperatura singola compatibile né un limite mancante dell’intervallo.

<a id="example-change-or-remove-a-device-setting"></a>
## Esempio: cambiare o rimuovere un’impostazione del dispositivo

Per cambiare solo la ventilazione conservando temperatura e modalità HVAC:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Per smettere di includere un comando di ventilazione in quel preset:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` indica un **preset del dispositivo**, come `eco` o `sleep`. È un parametro all’interno del preset Velair, non l’identificatore di un altro preset Velair.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Esempio: sostituire con Off e ripristinare esplicitamente

Sostituisci con Off la configurazione di un preset salvato:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Per ripristinare Heat a 21 °C con ventilazione silenziosa, sostituiscilo di nuovo esplicitamente:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: set_temperature
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Non esistono una scadenza temporizzata o un ripristino automatico. Off influisce su ogni riferimento salvato a questo preset. Per una finestra aperta o una sospensione temporanea di una stanza, preferisci una [pausa di zona con identificatore](usage.it.md#services), che lascia invariato il preset condiviso.

<a id="validation-and-runtime-behavior"></a>
## Validazione e comportamento in esecuzione

- Velair verifica ogni utilizzo salvato, compresi i profili inattivi e le programmazioni predefinite nascoste da un profilo. Un utilizzo incompatibile rifiuta l’intero aggiornamento; nulla viene salvato parzialmente.
- Le impostazioni facoltative supportate possono essere filtrate per termostato usando le regole di adattamento esistenti. Restano validi i limiti di temperatura, la compatibilità dell’azione e i vincoli del controller esterno.
- Incremento, pausa, regolazione manuale e arresto mantengono la loro priorità. Aggiornare un preset non li annulla. Alla ripresa del controllo automatico, Velair usa le ultime impostazioni salvate.
- Una modifica automatica attiva viene applicata dopo il salvataggio; una modifica che riguarda solo il futuro non invia inutilmente un comando ora. Precondizionamento e Room Assist vengono riallineati quando cambia il loro obiettivo o la loro fonte. Le azioni di sola modalità, sole opzioni e Off non acquisiscono l’anticipazione della temperatura.
- I controller esterni ricevono programmazioni settimanali complete aggiornate quando cambiano le loro programmazioni effettive. Un errore di pubblicazione non abilita l’esecuzione locale.
- Identificatori sconosciuti, combinazioni non valide, utilizzi incompatibili e una migrazione dell’unità di temperatura in attesa producono errori. Gli errori di invio al dispositivo dopo la persistenza non annullano il preset salvato.

Soglie ambientali, isteresi, interpretazione delle previsioni e momento del ripristino di un’impostazione appartengono alle automazioni Home Assistant. Il servizio non crea regole meteorologiche o interrogazioni periodiche dentro Velair. Il [blueprint di selezione climatica stagionale](blueprints/seasonal-climate-selection.it.md) può selezionare modalità o eseguire questi servizi una sola volta dopo che la temperatura resta in un nuovo intervallo stagionale per il ritardo configurato. Scegli le modalità quando inverno ed estate devono mantenere definizioni separate dei preset; aggiornare un preset cambia tutti i suoi utilizzi.

Consulta [Preset dei blocchi e modelli collegati](linked-schedules.it.md) per l’ambito delle risorse condivise ed [Esempi pratici](linked-schedule-examples.it.md) per configurazioni domestiche complete.
