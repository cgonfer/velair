<a id="seasonal-climate-selection"></a>
# Seleção sazonal da climatização
<!-- velair-docs:start -->
Traduções: [Original em inglês](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Estado das traduções](../../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Execute as ações escolhidas após uma mudança no sensor de temperatura que mantenha o novo valor durante um atraso configurável. Selecione Modos de inverno, tempo ameno ou verão sem duplicar programações ou colocar regras meteorológicas dentro do Velair. Leituras inválidas geram uma notificação imediata do Home Assistant.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Seleção sazonal da climatização" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a fonte YAML de Seleção sazonal da climatização"></a>
</p>

[Consultar histórico de alterações](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Voltar ao índice de blueprints](../blueprints.pt-pt.md)

<a id="when-to-use-it"></a>
## Quando utilizar

Utilize este blueprint quando o Home Assistant já disponibilizar a máxima diária prevista, uma medição externa ou uma temperatura média como um sensor numérico de temperatura. Escolhe quais ações executar; o Velair continua responsável por programações, predefinições, Pré-condicionamento e envio aos dispositivos.

Para um sensor atualizado uma vez por dia, uma atualização estável pode escolher a rotina do dia. Para sensores externos ou de média que mudam frequentemente, escolha o atraso com cuidado: cada novo valor reinicia a espera. Um sensor atualizado a cada cinco minutos pode nunca concluir uma espera de 30 minutos.

<a id="requirements"></a>
## Requisitos

- Blueprint versão 1.0.0 e Home Assistant 2024.6.0 ou mais recente.
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
| Stability delay | Por quanto tempo a nova temperatura numérica deve permanecer inalterada; predefinição 30 minutos |
| Language for diagnostic notifications | Qualquer idioma aceite pelo Velair para avisos persistentes de sensores e configuração; inglês por predefinição |

O limite de inverno deve ser menor que o de verão, e o atraso deve ser positivo. Os valores dos limites não mudam automaticamente ao escolher Fahrenheit: introduza os limites desejados em Fahrenheit.

Essas duas escolhas são explícitas porque o Home Assistant não disponibilizàs suas preferências globais de unidade de temperatura ou idioma aos templates de blueprints. O idioma do utilizador do navegador também não é uma configuração da automação. A unidade declarada do sensor é lida automaticamente e convertida para a unidade escolhida dos limites; as notificações de diagnóstico usam o idioma selecionado aqui.

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

Com limites de 20 e 27 °C, uma máxima diária que muda para 18 °C executa ações de inverno após 30 minutos sem alteração. Uma atualização posterior para 23 °C executa ações de tempo ameno; 30 °C executa ações de verão. Exatamente 20 ou 27 °C corresponde a tempo ameno. Cada valor alterado pode executar, inclusive 18 → 19 °C dentro do inverno.

<a id="shared-hours-different-indoor-temperatures"></a>
### Horários partilhados, temperaturas internas diferentes

Ligue as programações dos Perfis Invierno e Verano ao mesmo modelo diário através de **Apenas horários**. Atribua predefinições de inverno, como aquecer a 21 °C, e de verão, como arrefecer a 25 °C. Mover o horário de 07:00 do modelo altera ambas as programações; selecionar um Modo escolhe as temperaturas correspondentes. O blueprint não edita as predefinições nem o modelo. Consulte [Exemplos práticos de programações ligadas](../linked-schedule-examples.pt-pt.md).

<a id="average-temperature-and-fahrenheit"></a>
### Temperatura média e Fahrenheit

Um sensor de média pode mudar várias vezes por hora. Com um atraso de dez minutos, atualizações às 10:00 e 10:07 adiam a decisão até 10:17, desde que não chegue um novo valor. Se continuar a mudar antes de dez minutos, nenhuma ação sazonal executa.

Um sensor em Fahrenheit pode utilizar limites em Celsius porque a leitura é convertida. Outra opção é selecionar °F e introduzir limiares como 68 e 80.6 °F, equivalentes a 20 e 27 °C. Um valor de 77 °F seleciona as ações de tempo ameno.

<a id="alternative-script-or-service"></a>
### Script ou serviço alternativo

Cada ramo aceita ações normais do Home Assistant. Por exemplo, execute um script da casa no ramo de verão:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

Também é possível ativar diretamente um Perfil com `velair.activate_profile` e o seu ID estável. Para modificar definições partilhadas em vez de escolher um Modo, consulte [Automações de predefinições](../preset-automations.pt-pt.md); considere todos as utilizações de uma predefinição partilhada antes de alterá-la.

<a id="how-it-works"></a>
## Como funciona

Um acionador de estado deteta uma temperatura numérica alterada; depois, a espera interrompível nativa do Home Assistant verifica se ela permanece estável durante o atraso configurado. Uma mudança numérica real interrompe a decisão pendente e inicia outra espera, inclusive ao voltar a um valor anterior: `21 → 22 → 21` inicia um novo atraso no último 21. Uma atualização apenas de formato, como `21` para `21.0`, não inicia outra decisão nem interrompe uma já em espera. Atualizações apenas de atributos não iniciam ações sazonais. Antes de executar, o blueprint verifica novamente a leitura numérica atual, a sua unidade, limites, atraso e continuidade da espera.

Uma leitura ou unidade inválida interrompe imediatamente uma decisão pendente, mesmo quando só muda o atributo da unidade. Restaurar apenas a unidade remove o diagnóstico, mas não seleciona uma estação; é necessária outra mudança numérica de estado. Recuperar de um estado numérico inválido, como `unavailable`, para um número válido inicia um novo atraso.

O arranque do Home Assistant verifica apenas o diagnóstico. Não escolhe um Modo sazonal. Temporizadores pendentes não sobrevivem a um reinício ou ao recarregamento da automação; depois disso, é necessária outra mudança no estado do sensor. Não há acionador periódico ou diário, nem auxiliar que armazene a última classificação.

Se a entidade selecionada estiver ausente inicialmente e aparecer depois com uma leitura válida, essa primeira leitura conta como recuperação e inicia toda a espera de estabilidade. O mesmo ocorre ao recriar um sensor removido. Trata-se de uma transição do sensor após o arranque, não de uma ação sazonal causada pelo evento de arranque em si.

A validação do sensor ocorre separadamente da espera sazonal. Uma entidade ausente, `unknown`, `unavailable`, um valor não finito ou não numérico ou uma unidade incompatível cria imediatamente uma notificação persistente por automação no idioma selecionado. Ela identifica a automação e o sensor e explica que as ações sazonais estão suspensas. A recuperação remove o aviso do sensor; recuperar para um estado numérico válido inicia outra espera de estabilidade, enquanto recuperar apenas a unidade atualiza apenas o diagnóstico. Uma configuração inválida usa uma notificação separada.

Por exemplo, um sensor que fica indisponível às 09:00 gera um aviso imediato, não às 09:30. A recuperação para 25 °C às 09:10 permite ações de tempo ameno às 09:40 se o valor permanecer inalterado.

<a id="safety-and-precedence"></a>
## Segurança e prioridades

Enquanto o sensor estiver inválido, o blueprint não faz nova seleção sazonal; não desliga dispositivos automaticamente. O Modo selecionado anteriormente e a sua programação permanecem ativos. Responda à notificação se esse comportamento não for adequado à sua casa.

As ações configuradas usam a semântica e os rastos normais do Home Assistant. Um erro em uma ação não desfaz ações anteriores. O blueprint não consegue verificar genericamente se uma ação arbitrária selecionou a rotina desejada ou chegou a um dispositivo físico.

Uma nova leitura estável pode substituir um Modo Ausente selecionado manualmente. Coordene automações sazonais e de presença para que não escolham Modos concorrentes. Por exemplo, um script da casa pode escolher Ausente quando ninguém está em casa e selecionar o Modo sazonal ocupado apenas quando a presença permitir.

O comportamento existente de Modos/Perfis do Velair continua válido, incluindo prioridade de pausa e cancelamento de Reforços nas zonas afetadas. O Pré-condicionamento recalcula a partir da programação efetiva selecionada pela ação; não pode antecipar uma escolha sazonal antes que ela seja feita.

<a id="limitations"></a>
## Limitações

- A estabilidade refere-se ao valor do sensor, não apenas à classificação inverno/ameno/verão. Sensores que mudam frequentemente podem adiar a execução indefinidamente.
- Não há ação sazonal automática no arranque, programação diária, consultas periódicas, temporizador pendente guardado, autorização adicional de 24 °C nem desligamento atrasado.
- As notificações não detetam um sensor que para silenciosamente de atualizar e mantém um número válido. O monitorização da atualização da fonte deve ser fornecido separadamente, quando necessário.
- Não há histerese; o atraso de estabilidade filtra mudanças. Um novo valor estável na mesma classificação ainda executa o seu ramo.
- A execução paralela é limitada. Sequências longas de ações podem ocupar vagas; mantenha as ações breves ou transfira o trabalho para scripts.
- Uma sequência já iniciada não é cancelada por uma leitura posterior. As verificações protegno seu início, não cada ação definida pelo utilizador.
- Renomear a automação pode deixar a sua antiga notificação para remoção manual. Opções de Modo renomeadas ou eliminadas devem ser atualizadas nas ações configuradas.

<a id="troubleshooting"></a>
## Resolução de problemas

- Se nada executar, verifique se o valor realmente mudou e permaneceu inalterado durante todo o atraso. Iniciar ou recarregar o Home Assistant não inicia uma seleção sazonal.
- Se aparecer um aviso, examine o sensor indicado, o estado numérico e `unit_of_measurement`. Unidades desconhecidas nunca são presumidas.
- Se o temporizador nunca terminar, examine o histórico do sensor e reduza o atraso positivo ou use um sensor de máxima diária.
- Se o ramo errado executar, verifique a unidade selecionada e os dois limites numéricos.
- Se o tempo ameno deixar equipamentos a funcionar, configure um Modo que realmente pause e desligue; uma lista vazia de ações não é um comando de desligamento.
- Se um Modo não for selecionado, teste a sua ação manualmente e examine o rasto. Selecione o nome atual da opção no editor do Home Assistant.
- Se um URL de importação estiver indisponível antes da publicação, utilize o ficheiro YAML da cópia local para testar. As ligações públicos funcionam quando o ficheiro está publicado em `main`.

<a id="updating-and-customizing"></a>
## Atualização e personalização

Importe o blueprint explicitamente; instalar ou atualizar o Velair pelo HACS não o instala. Importe novamente o mesmo URL corrente de `main` para atualizações compatíveis. A versão 1 preserva os nomes dos campos; novos campos compatíveis recebem valores predefinidos. Mudanças incompatíveis usam outro nome de ficheiro e nova versão principal.

O Home Assistant é responsável pela automação resultante. O Velair não migra automações ou `.storage`. Use **Assumir controlo** para uma lógica diferente, sabendo que a automação independente deixa de receber atualizações do blueprint. Consulte o [Catálogo de blueprints](../blueprints.pt-pt.md) para as regras partilhadas de distribuição e atualização.
