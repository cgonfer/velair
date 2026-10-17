<a id="pause-a-zone-while-windows-are-open"></a>
# Pausar uma zona enquanto as janelas estão abertas
<!-- velair-docs:start -->
Traduções: [Original em inglês](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [Status das traduções](../../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.2 |
| Última sincronização | 2026-10-17 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Pause um ou mais dispositivos de climatização gerenciados pelo Velair quando qualquer janela ou porta selecionada permanecer aberta. Depois, retome suas programações somente quando todos os sensores de contato confirmarem o fechamento e cada pausa ativa ainda pertencer a esta automação. O Home Assistant avisa quando um sensor indisponível impede uma retomada segura.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Pausar uma zona enquanto as janelas estão abertas" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar o código YAML de Pausar uma zona enquanto as janelas estão abertas"></a>
</p>

[Consultar histórico de alterações](../../../blueprints/changelogs/window_pause.md) · [Voltar ao índice de blueprints](../blueprints.pt-br.md)

Perguntas, relatos de testes e sugestões construtivas são bem-vindos no [tópico oficial do blueprint no fórum da comunidade Home Assistant](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389).

<a id="when-to-use-it"></a>
## Quando usar

Use este blueprint quando abrir uma janela ou porta deve impedir temporariamente o Velair de alterar um ou mais dispositivos que compartilham essas aberturas. Ele é útil para aquecimento e resfriamento e pode manter cada dispositivo em seu estado atual ou desligá-lo durante a pausa.

<a id="requirements"></a>
## Requisitos

- Blueprint versão 1.0.0, Velair 1.6.0 ou mais recente e Home Assistant 2024.6.0 ou mais recente. O Velair 1.6.0 fornece os motivos simultâneos de pausa com responsabilidade identificada usados por este blueprint.
- Uma ou mais entidades de climatização já gerenciadas pelo Velair.
- Uma ou mais entidades `binary_sensor` com classe de dispositivo `window`, `door` ou `opening`.
- `on` deve significar aberto e `off` fechado em todos os sensores selecionados.

<a id="configuration"></a>
## Configuração

- **Managed thermostats:** todos os dispositivos gerenciados pelo Velair que serão pausados e retomados juntos.
- **Windows and doors:** todas as aberturas que afetam esta zona.
- **Climate action while paused:** manter o estado atual ou desligar a climatização.
- **Pause ID:** identificador estável de responsabilidade pela pausa. Mantenha o padrão para uma automação ou use um ID diferente para cada automação separada que controla o mesmo termostato.
- **Open delay:** por quanto tempo pelo menos uma abertura deve permanecer aberta antes da pausa.
- **Close delay:** por quanto tempo todas as aberturas devem permanecer fechadas antes da retomada.
- **Availability warning delay:** por quanto tempo um sensor deve permanecer `unknown` ou `unavailable` antes de mostrar uma notificação do Home Assistant. O padrão é 5 minutos.

<a id="example"></a>
## Exemplo

Para dispositivos da sala com duas janelas:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Se qualquer janela permanecer aberta por dois minutos, o blueprint pausa e desliga os dois dispositivos da sala. Quando a última janela fechar e ambos os sensores permanecerem fechados por 30 segundos, retoma cada programação ativa.

<a id="how-it-works"></a>
## Como funciona

O Home Assistant observa três condições agregadas: pelo menos um sensor aberto, todos fechados e pelo menos um `unknown` ou `unavailable`. Cada condição usa um gatilho nativo por template com a duração `for` configurada. Se a condição agregada deixar de ser verdadeira antes do fim dessa duração, o Home Assistant reinicia o temporizador e nenhuma ação executa. Quando um temporizador termina, a ação breve verifica novamente todo o conjunto de sensores antes de pausar, retomar ou criar um aviso.

O controle de abertura, o controle de fechamento e o diagnóstico de disponibilidade usam gatilhos independentes acionados por eventos. Assim, um sensor aberto pode pausar a zona após o atraso de abertura mesmo se outro sensor selecionado estiver indisponível. Esse sensor indisponível continua impedindo que a condição de todos fechados seja verdadeira e permita a retomada.

Se um sensor permanecer `unknown` ou `unavailable` durante o atraso de aviso configurado, o Home Assistant cria uma notificação persistente para todo o conjunto de termostatos. Ela lista os sensores afetados e termostatos selecionados e explica por que não estão sendo retomados. O estado é verificado novamente após o atraso, então uma execução antiga termina antes de criar a notificação se todos os sensores tiverem se recuperado. Um gatilho agregado de recuperação remove o aviso. O ID determinístico da notificação faz com que execuções posteriores atualizem o mesmo aviso, sem duplicá-lo.

Após a inicialização do Home Assistant, uma execução de reconciliação faz as três verificações em ramos internos paralelos. Cada ramo verifica primeiro sua condição agregada, aguarda a condição oposta até a duração configurada e para imediatamente se ela ocorrer. O ramo de abertura pode, portanto, pausar dispositivos enquanto o de disponibilidade aguarda. Ele atua apenas quando a espera termina e a verificação agregada final ainda é válida. O Home Assistant não consegue reconstruir por quanto tempo uma condição era verdadeira antes de iniciar, então esses temporizadores interrompíveis recomeçam do zero. A operação normal usa os temporizadores contínuos dos gatilhos por template descritos acima. Não há consultas periódicas.

Execuções da automação podem se sobrepor, portanto um evento `opened_due` não fica bloqueado enquanto o ramo inicial de disponibilidade aguarda. Essa espera ocupa apenas uma das vagas limitadas de execução paralela. As ações convergem com segurança porque cada iteração de dispositivo revalida o estado agregado atual dos sensores, o Velair serializa alterações de substituição temporária por dispositivo e um gatilho agregado oposto aplica a decisão posterior de pausa ou retomada quando as condições mudam.

<a id="safety-and-precedence"></a>
## Segurança e prioridades

Quando o bloco ativo usa **Somente temperatura**, retomar após fechar as janelas reaplica a temperatura-alvo sem solicitar mudança de modo HVAC. Se o blueprint desligou o equipamento, ele permanece desligado; use um modo explícito em um bloco posterior ou ligue-o manualmente quando necessário. **Manter modo atual** preserva seu comportamento de retomada. Esta é a política do bloco ativo, não uma nova entrada do blueprint, e não exige importar o blueprint novamente.

O blueprint cria cada pausa com o **Pause ID** configurado. O padrão é `velair_window_guard`; o Velair persiste essa responsabilidade independentemente para cada termostato selecionado.

- Não substitui uma pausa manual nem uma pausa de outra automação.
- Fechar todas as janelas retoma apenas pausas com o mesmo ID.
- Uma pausa ou retomada manual no Velair continua tendo autoridade.
- Scripts e automações existentes sem `pause_id` mantêm o comportamento anterior.
- Sensores `unknown` e `unavailable` nunca são considerados seguramente fechados.
- Avisos de disponibilidade não ignoram nem alteram a responsabilidade pela pausa. Apenas explicam por que não é possível retomar com segurança.

Cada dispositivo recebe uma chamada de serviço individual, e o estado agregado relevante é verificado novamente imediatamente antes de cada chamada. Um erro de serviço do Home Assistant é registrado no rastreamento da automação, mas `continue_on_error` permite continuar com os demais dispositivos. Alterações de reforço, pausa, retomada e expiração continuam sendo serializadas independentemente por zona de climatização.

<a id="limitations"></a>
## Limitações

- Prefira uma automação que contenha todas as aberturas relevantes para o mesmo conjunto de termostatos.
- Se automações separadas de janelas precisarem controlar o mesmo termostato, dê a cada uma um **Pause ID** estável diferente. Elas criam motivos de pausa independentes, e cada automação pode remover apenas seu próprio motivo.
- O blueprint não consegue interpretar com segurança mudanças feitas por controle remoto infravermelho quando a integração de climatização não as informa ao Home Assistant.
- Temporizadores interrompíveis de reconciliação na inicialização recomeçam do zero porque o Home Assistant não recupera o histórico anterior à reinicialização.
- As notificações dependem da integração nativa `persistent_notification` do Home Assistant.
- O ID da notificação usa o ID da entidade de automação do Home Assistant, mantendo-o curto e independente da seleção ou ordem dos termostatos. Renomear a automação pode deixar a notificação anterior disponível para remoção manual.
- Até 50 execuções podem se sobrepor. O Home Assistant avisa se uma sequência anormal de eventos ocupar essas vagas; execuções normais acionadas por condições continuam breves.

<a id="troubleshooting"></a>
## Solução de problemas

- Se a zona nunca pausar, confirme que pelo menos um sensor selecionado informa `on` quando aberto e permanece assim por mais tempo que o atraso de abertura.
- Se a zona não retomar, confirme que todos os sensores selecionados informam `off`. Após o atraso de aviso, a notificação persistente lista os que ainda informam `unknown` ou `unavailable`.
- Se um aviso permanecer após a recuperação, confirme que o sensor produziu um novo evento de estado. Recarregar ou executar a automação também reavalia o conjunto completo e remove um aviso desatualizado.
- Se um serviço indicar uma entidade não gerenciada, adicione o dispositivo ao Velair. Erros de serviço não interrompem os demais dispositivos; examine o rastreamento da automação para identificar falhas individuais.
- Se fechar as janelas deixar a zona pausada, confira se a pausa ativa foi criada manualmente ou por outra automação. O blueprint a preserva intencionalmente.
- Se várias automações controlarem o mesmo dispositivo, consolide suas aberturas ou confirme que cada automação usa um **Pause ID** estável diferente.

<a id="updating-and-customizing"></a>
## Atualização e personalização

Importe novamente a URL contínua de `main` para instalar uma atualização compatível. Atualizações da versão 1 preservam os nomes dos campos existentes, e todo campo novo tem um valor padrão, dispensando a migração da automação. Uma futura versão incompatível usará outro nome de arquivo e nova versão principal, em vez de substituir esta URL. O Velair nunca edita automações do Home Assistant ou `.storage` para migrar um blueprint. Use **Assumir controle** apenas quando a instalação precisar de comportamento personalizado além dos sensores, ações e atrasos fornecidos; a automação independente deixa então de receber atualizações do blueprint.
