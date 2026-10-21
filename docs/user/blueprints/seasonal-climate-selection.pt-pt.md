<a id="seasonal-climate-selection"></a>
# Seleção sazonal da climatização
<!-- velair-docs:start -->
Traduções: [Original em inglês](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Estado das traduções](../../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.4 |
| Última sincronização | 2026-10-21 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Execute uma única vez as ações escolhidas após um sensor de temperatura entrar num novo intervalo de inverno, tempo ameno ou verão e permanecer nele durante um atraso configurável. Selecione Modos de inverno, tempo ameno ou verão sem duplicar programações ou colocar regras meteorológicas dentro do Velair. Leituras inválidas geram uma notificação imediata do Home Assistant.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Seleção sazonal da climatização" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a fonte YAML de Seleção sazonal da climatização"></a>
</p>

[Consultar histórico de alterações](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Voltar ao índice de blueprints](../blueprints.pt-pt.md)

<a id="when-to-use-it"></a>
## Quando utilizar

Utilize este blueprint quando o Home Assistant já disponibilizar a máxima diária prevista, uma medição externa ou uma temperatura média como um sensor numérico de temperatura. Escolhe quais ações executar; o Velair continua responsável por programações, predefinições, Pré-condicionamento e envio aos dispositivos.

Tanto um sensor de previsão diária como um sensor exterior que muda frequentemente podem confirmar um intervalo sazonal. As mudanças dentro desse intervalo mantêm o prazo original. As ações são executadas uma vez por entrada, pelo que atualizações posteriores no mesmo intervalo não selecionam um Modo repetidamente.

<a id="requirements"></a>
## Requisitos

- Blueprint versão 1.1.0 e Home Assistant 2024.6.0 ou mais recente.
- Um sensor numérico com classe de dispositivo de temperatura e unidade declarada de °C ou °F.
- O Velair só é necessário para ações que usam as suas entidades ou serviços. Scripts normais e outras ações do Home Assistant funcionam sem o Velair.
- Prepare o sensor de previsão separadamente se o fornecedor de meteorologia disponibilizar previsões em vez de um sensor numérico. Este blueprint não obtém previsões.

Modos e o seletor nativo de Modo do Velair estão disponíveis no Velair 1.6.0 ou mais recente. Predefinições partilhadas e modelos ligados são opcionais: o seletor sazonal também pode escolher Modos construídos com programações independentes.

<a id="configuration"></a>
## Configuração

| Campo | Finalidade |
|---|---|
| Temperature sensor | Sensor existente a acompanhar |
| Temperature unit for thresholds | °C ou °F; as leituras são convertidas para comparação |
| Winter threshold | Valores abaixo deste limite executam as ações de inverno; predefinição 20 |
| Summer threshold | Valores acima deste limite executam as ações de verão; predefinição 27 |
| Winter / Mild-weather / Summer actions | Sequências normais de ações do Home Assistant; inicialmente vazias |
| Range confirmation delay | Durante quanto tempo a temperatura deve permanecer no novo intervalo sazonal; predefinição 30 minutos |
| Language for diagnostic notifications | Qualquer idioma aceite pelo Velair para avisos persistentes de sensores e configuração; inglês por predefinição |

O limite de inverno deve ser menor que o de verão, e o atraso deve ser positivo. Os valores dos limites não mudam automaticamente ao escolher Fahrenheit: introduza os limites desejados em Fahrenheit.

Essas duas escolhas são explícitas porque o Home Assistant não disponibiliza as suas preferências globais de unidade de temperatura ou idioma aos templates de blueprints. O idioma do utilizador do navegador também não é uma configuração da automação. A unidade declarada do sensor é lida automaticamente e convertida para a unidade escolhida dos limites; as notificações de diagnóstico usam o idioma selecionado aqui.

O seletor de idioma altera apenas o texto das notificações de diagnóstico. Os rótulos e descrições do formulário do blueprint permanecem em inglês; ele não traduz o formulário de configuração do Home Assistant.

Uma sequência vazia de ações não faz nada. Não desliga a climatização, suspende o Velair nem seleciona Predefinição.

<a id="example"></a>
## Exemplo

<a id="daily-maximum-and-three-modes"></a>
### Máxima diária e três Modos

Crie Modos chamados Invierno, Entretiempo e Verano no Velair. Ligue Invierno e Verano aos respetivos Perfis. Configure Entretiempo com um Perfil cujas zonas relevantes usem **Pausa → Desligar a climatização** se o tempo ameno deve desativar a climatização.

Em cada sequência de ações do blueprint, adicione a ação **Seleção: Selecionar** do Home Assistant, escolha a entidade de Modo do Velair apresentada e selecione a opção no editor. Não presuma que a sua entidade tem o ID do exemplo abaixo.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Com limites de 20 e 27 °C, uma máxima diária que entra no intervalo de inverno a 18 °C executa ações de inverno após 30 minutos continuamente abaixo de 20 °C. Uma mudança para 19 °C durante a espera mantém o mesmo prazo. Uma atualização posterior para 23 °C executa ações de tempo ameno; 30 °C executa ações de verão. Exatamente 20 ou 27 °C corresponde a tempo ameno. As atualizações num intervalo já confirmado não repetem as suas ações. Sair de um intervalo e regressar inicia uma nova espera completa, mesmo que o intervalo intermédio tenha durado demasiado pouco para executar as suas ações.

<a id="shared-hours-different-indoor-temperatures"></a>
### Horários partilhados, temperaturas internas diferentes

Ligue as programações dos Perfis Invierno e Verano ao mesmo modelo diário através de **Apenas horários**. Atribua predefinições de inverno, como aquecer a 21 °C, e de verão, como arrefecer a 25 °C. Mover o horário de 07:00 do modelo altera ambas as programações; selecionar um Modo escolhe as temperaturas correspondentes. O blueprint não edita as predefinições nem o modelo. Consulte [Exemplos práticos de programações ligadas](../linked-schedule-examples.pt-pt.md).

<a id="average-temperature-and-fahrenheit"></a>
### Temperatura média e Fahrenheit

Um sensor de média pode mudar várias vezes por hora. Com um atraso de dez minutos, entrar no intervalo de verão a 28 °C às 10:00 e mudar para 29 °C às 10:07 continua a executar as ações de verão às 10:10. Se a leitura baixar para 27 °C às 10:07, a confirmação de verão é cancelada e a de tempo ameno começa em seu lugar.

Um sensor em Fahrenheit pode utilizar limites em Celsius porque a leitura é convertida. Outra opção é selecionar °F e introduzir limiares como 68 e 80.6 °F, equivalentes a 20 e 27 °C. Um valor de 77 °F seleciona as ações de tempo ameno.

<a id="alternative-script-or-service"></a>
### Script ou serviço alternativo

Cada ramo aceita ações normais do Home Assistant. Por exemplo, execute um script da casa no ramo de verão:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

Também é possível ativar diretamente um Perfil com `velair.activate_profile` e o seu ID estável. Para modificar definições partilhadas em vez de escolher um Modo, consulte [Automações de predefinições](../preset-automations.pt-pt.md); considere todas as utilizações de uma predefinição partilhada antes de alterá-la.

<a id="how-it-works"></a>
## Como funciona

Os acionadores nativos do Home Assistant classificam cada leitura de temperatura após a conversão para a unidade dos limites. Entrar no intervalo de inverno, tempo ameno ou verão inicia o atraso de confirmação desse intervalo. As leituras no mesmo intervalo mantêm o prazo original; as atualizações apenas de atributos ou de formato não reiniciam a espera nem repetem ações.

Sair de um intervalo cancela imediatamente a sua confirmação pendente. Uma saída breve seguida de regresso inicia uma nova espera completa, mesmo que o outro intervalo nunca tenha tido tempo de executar as suas ações. Os valores exatos dos limites correspondem a tempo ameno. Leituras equivalentes em Celsius/Fahrenheit permanecem no mesmo intervalo.

O arranque do Home Assistant verifica apenas o diagnóstico. Não escolhe um Modo sazonal. Os temporizadores pendentes não sobrevivem a um reinício, ao recarregamento da automação nem à desativação e reativação. O intervalo presente quando os acionadores são ligados é a referência inicial: mudanças posteriores dentro dele não o selecionam. Uma transição de intervalo ou a recuperação de leituras inválidas inicia a confirmação. Não há acionador periódico ou diário, nem auxiliar persistente que armazene a última seleção. Se a entidade estava ausente quando os acionadores foram ligados, a sua primeira aparição estabelece o intervalo inicial sem o selecionar.

A validação do sensor ocorre separadamente da confirmação sazonal. Uma entidade ausente, `unknown`, `unavailable`, um valor não finito ou não numérico ou uma unidade incompatível cria imediatamente uma notificação persistente por automação no idioma selecionado. Ela identifica a automação e o sensor e explica que as ações sazonais estão suspensas. Uma configuração inválida usa uma notificação separada.

As leituras inválidas cancelam uma espera pendente. A recuperação de um estado não numérico ou de uma unidade incompatível inicia um novo atraso de confirmação completo. É um novo período contínuo de leituras válidas, pelo que a recuperação pode executar novamente as mesmas ações sazonais. A recuperação também remove o aviso do sensor.

Por exemplo, um sensor que fica indisponível às 09:00 gera um aviso imediato. A recuperação para 25 °C às 09:10 permite ações de tempo ameno às 09:40 se a temperatura permanecer entre os limites durante todo esse período, mesmo que o valor exato mude.

<a id="safety-and-precedence"></a>
## Segurança e prioridades

Selecionar um Modo ou Perfil do Velair usa as políticas dos seus blocos. **Apenas temperatura** atualiza a temperatura-alvo sem solicitar mudança de modo HVAC; use blocos explícitos **Aquecimento** ou **Arrefecimento** quando selecionar uma estação deve ligar o equipamento. A política não suprime ações HVAC diretas configuradas no blueprint.

Enquanto o sensor estiver inválido, o blueprint não faz nova seleção sazonal; não desliga dispositivos automaticamente. O Modo selecionado anteriormente e a sua programação permanecem ativos. Responda à notificação se esse comportamento não for adequado à sua casa.

As ações configuradas usam a semântica e os rastos normais do Home Assistant. Um erro em uma ação não desfaz ações anteriores. O blueprint não consegue verificar genericamente se uma ação arbitrária selecionou a rotina desejada ou chegou a um dispositivo físico.

Um intervalo sazonal recém-confirmado pode substituir um Modo Ausente selecionado manualmente. Coordene automações sazonais e de presença para que não escolham Modos concorrentes. Por exemplo, um script da casa pode escolher Ausente quando ninguém está em casa e selecionar o Modo sazonal ocupado apenas quando a presença permitir.

O comportamento existente de Modos/Perfis do Velair continua válido, incluindo prioridade de pausa e cancelamento de Reforços nas zonas afetadas. O Pré-condicionamento recalcula a partir da programação efetiva selecionada pela ação; não pode antecipar uma escolha sazonal antes que ela seja feita.

<a id="limitations"></a>
## Limitações

- A confirmação exige permanência contínua num intervalo sazonal; cruzar repetidamente os limites pode adiar as ações indefinidamente.
- Não há ação sazonal automática no arranque, programação diária, consultas periódicas, temporizador pendente guardado, autorização adicional de 24 °C nem desligamento atrasado.
- Eliminar e recriar o sensor cancela a confirmação. O reaparecimento estabelece uma referência inicial sem selecionar uma estação; é necessária uma transição de intervalo posterior. Isto evita um rearme nativo inconsistente do Home Assistant após a remoção da entidade. Também se aplica a uma entidade ausente quando a automação é carregada. A recuperação normal de `unknown`/`unavailable` ou de uma unidade inválida inicia uma nova confirmação.
- As notificações não detetam um sensor que para silenciosamente de atualizar e mantém um número válido. A monitorização da atualização da fonte deve ser fornecida separadamente, quando necessário.
- Não há histerese; o atraso de confirmação filtra mudanças breves de intervalo. As ações são executadas uma vez por entrada no intervalo, em vez de uma vez por nova leitura.
- A execução paralela é limitada. Sequências longas de ações podem ocupar vagas; mantenha as ações breves ou transfira o trabalho para scripts.
- Uma sequência já iniciada não é cancelada por uma leitura posterior. As verificações protegem o seu início, não cada ação definida pelo utilizador.
- Renomear a automação pode deixar a sua antiga notificação para remoção manual. Opções de Modo renomeadas ou eliminadas devem ser atualizadas nas ações configuradas.

<a id="troubleshooting"></a>
## Resolução de problemas

- Se nada for executado, verifique se o sensor entrou noutro intervalo sazonal ou recuperou de um valor ou unidade inválidos e depois permaneceu nesse intervalo durante todo o atraso. O arranque e o recarregamento não iniciam a seleção; as atualizações no mesmo intervalo não a repetem.
- Se aparecer um aviso, examine o sensor indicado, o estado numérico e `unit_of_measurement`. Unidades desconhecidas nunca são presumidas.
- Se o temporizador nunca terminar, procure cruzamentos dos limites ou leituras inválidas no histórico do sensor. Ajuste os limites ou o atraso positivo à sua fonte.
- Se o ramo errado executar, verifique a unidade selecionada e os dois limites numéricos.
- Se o tempo ameno deixar equipamentos a funcionar, configure um Modo que realmente pause e desligue; uma lista vazia de ações não é um comando de desligamento.
- Se um Modo não for selecionado, teste a sua ação manualmente e examine o rasto. Selecione o nome atual da opção no editor do Home Assistant.
- Se um URL de importação estiver indisponível antes da publicação, utilize o ficheiro YAML da cópia local para testar. As ligações públicas funcionam quando o ficheiro está publicado em `main`.

<a id="updating-and-customizing"></a>
## Atualização e personalização

Importe o blueprint explicitamente; instalar ou atualizar o Velair pelo HACS não o instala. Importe novamente o mesmo URL corrente de `main` para atualizações compatíveis. A versão 1.1.0 substitui o comportamento de temporização da beta inicial no mesmo URL, com os mesmos nomes dos campos e sem opção para manter a temporização antiga. Importe novamente e recarregue as automações afetadas para utilizar a confirmação por intervalo. Os restantes blueprints mantêm os seus contratos de compatibilidade publicados.

O Home Assistant é responsável pela automação resultante. O Velair não migra automações ou `.storage`. Use **Assumir controlo** para uma lógica diferente, sabendo que a automação independente deixa de receber atualizações do blueprint. Consulte o [Catálogo de blueprints](../blueprints.pt-pt.md) para as regras partilhadas de distribuição e atualização.
