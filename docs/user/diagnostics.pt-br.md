<a id="diagnostics"></a>
# Diagnóstico
<!-- velair-docs:start -->
Traduções: [Original em inglês](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.3 |
| Última sincronização | 2026-10-21 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

A seção **Diagnóstico** oferece uma visão local, apenas para consulta, do que o Velair pode verificar sem exigir o Recorder do Home Assistant ou serviços externos.

Ela mostra o estado atual do agendador e uma faixa horizontal compacta de dispositivos gerenciados, na ordem configurada dos termostatos. Selecionar um dispositivo abre um único painel detalhado abaixo da faixa, ocupando toda a largura. Cada informação aparece uma vez, agrupada em estado e envio, configuração ativa, funções e dispositivo e sensores. O painel inclui:

- disponibilidade e capacidades de HVAC e temperatura informadas;
- problemas de configuração detectados quando o Velair tem evidências diretas;
- Modo e Perfis efetivos, intenção de controle calculada durante a execução, Reforços e pausas;
- último alvo de controle aceito pelo Home Assistant, erro de envio e estado limitado de novas tentativas;
- Room Assist, pré-condicionamento adaptativo, Conforto e sensores explicitamente associados.

Chamadas bem-sucedidas de `velair.set_hvac_mode` aparecem como um envio manual aceito que altera apenas o modo. Incluem o modo HVAC selecionado, sem inventar uma temperatura. Falhas de validação não substituem a evidência anterior de aceitação, e falhas no envio físico não publicam um evento de temperatura-alvo aplicado com sucesso.

O Velair não deduz uma causa quando as evidências disponíveis comprovam apenas um sintoma, como uma entidade indisponível. Informações de bateria são omitidas, a menos que o Velair possa estabelecer uma associação confiável; a primeira versão não tenta associar dispositivos por heurísticas.

Para Conforto, o Diagnóstico inclui a fonte salva de cada leitura derivada habilitada, a entrada efetiva ou entidade externa, sua disponibilidade atual e códigos estáveis para dados ausentes, desatualizados, inválidos ou não verificados. Ponto de orvalho, umidade absoluta e Humidex permanecem apenas informativos: sua presença em um relatório não significa que influenciaram a programação ou o controle da climatização. Os mesmos dados habilitados aparecem no atributo `derived_metrics` do sensor **Condição ambiental** da zona; o Velair não cria entidades intermediárias separadas para eles. As leituras atuais incluem `freshness: reported` ou `unverified`; estas últimas permanecem visíveis com uma indicação informativa e podem ser rastreadas até sua fonte.
Quando a comparação externa está habilitada, o mesmo relatório de Conforto contém a disponibilidade dos sensores explícitos, a qualidade independente dos dados externos, a comparação normalizada, a umidade absoluta interna e externa explícita e códigos de oportunidade ou contrapartida. O bloco `guidance_thresholds` registra a sensibilidade efetiva por zona usada nessa conclusão, ajudando a distinguir um problema de sensor de orientações intencionalmente mais exigentes. Esses valores permanecem apenas informativos e não indicam que o Velair abriu uma janela ou alterou o HVAC.
O Diagnóstico também inclui `comfort_zone`: a geometria configurada simples, guiada ou personalizada em função da temperatura e a faixa de umidade efetiva na temperatura atual. Uma faixa efetiva `null` explica por que a leitura atual de umidade não foi classificada quando a temperatura estava indisponível; ela não é substituída por uma faixa estimada.

A avaliação em tempo real inclui `range_summary` atual. Entradas retidas de `comfort_assessment_changed` também mantêm `previous_range_summary` e os indicadores `range_summary_changed` e `range_status_changed`, permitindo que um relatório baixado mostre se o evento representou uma transição da faixa configurada ou outra mudança no Conforto. Esses campos contêm apenas códigos semânticos estáveis, não o contexto bruto de eventos do Home Assistant.

<a id="learning-evidence"></a>
## Evidências de aprendizado

A seção existente da função Pré-condicionamento separa as atividades de aquecimento e resfriamento. Mostra se há uma observação em andamento ou se o Velair está aguardando uma transição adequada, além da última transição de aprendizado mantida, quando disponível. Os detalhes expansíveis contêm apenas evidências relevantes à decisão, como temperaturas inicial e alvo, delta mínimo de temperatura, duração observada e início máximo configurado.

O histórico de Pré-condicionamento inclui inícios de observação, interrupções, resultados e transições reais que não puderam iniciar uma observação. Os resultados distinguem observações completas, parciais e inválidas. Observações inválidas podem identificar uma diferença de temperatura pequena demais, duração curta demais ou duração acima do máximo configurado. Observações antigas salvas podem manter o motivo genérico de fora dos limites. O Velair não atribui retroativamente uma causa mais precisa a elas.

Cálculos repetidos de previsões futuras não criam registros de aprendizado. A última transição segue as mesmas configurações de retenção e o limite global do histórico da linha do tempo. Desabilitar o histórico de Pré-condicionamento ou limpar o histórico remove essas evidências históricas; não interrompe o aprendizado nem apaga amostras salvas. Após reinício, a atividade operacional e o histórico anteriores não são restaurados. Sem evidências, o Diagnóstico não inventa motivos para contadores inalterados nem deduz se a caldeira estava funcionando.

<a id="preconditioning-dependency-evidence"></a>
### Evidências de dependência do pré-condicionamento

Para um cômodo com **Mestre do pré-condicionamento** configurado, consulte os detalhes da dependência junto às informações existentes de preparação. Eles distinguem a estimativa independente do cômodo, a transição selecionada e o início do mestre, o início efetivo ou o motivo que impede a preparação. Um comando aceito pelo Home Assistant é uma evidência da ação do Velair, não uma medição do relé da caldeira. A observação de aprendizado continua descrevendo a própria temperatura e o tempo decorrido do cômodo dependente.

Quando há evidências, a explicação distingue a disponibilidade no Home Assistant de programação ou Pré-condicionamento desabilitados, Perfil pausado, substituição ativa, mestre inelegível ou transição ausente. A mesma explicação aparece nos cartões e no Diagnóstico. Um equipamento indisponível ainda pode ter uma previsão calculada se outro sensor configurado fornecer sua temperatura ambiente; essa previsão não confirma que o dispositivo possa receber comandos ou fornecer aquecimento ou resfriamento.

<a id="runtime-history-and-privacy"></a>
## Histórico de execução e privacidade

O Diagnóstico mantém no máximo 100 eventos relevantes em uma única linha do tempo global. **Configurações do histórico** permite reter separadamente atividades de controle e programação, Room Assist, Pré-condicionamento, Conforto, envio de comandos e disponibilidade. Novos tipos de eventos do Velair ainda não classificados são mantidos em controle e programações, em vez de descartados silenciosamente. Ajustes externos e transições entre controle Automático e Manual também permanecem nessa categoria. Suas entradas mostram apenas o modo HVAC ou alvo escalar/faixa alterado, a política efetiva de alterações externas e o motivo de expiração ou retomada; atributos arbitrários da climatização e identificadores de Context do Home Assistant não são retidos.
Todas as categorias estão habilitadas por padrão. As escolhas são armazenadas localmente pelo backend; desabilitar uma categoria remove imediatamente os eventos já retidos nela. **Limpar histórico** remove todos os eventos retidos sem alterar as evidências atuais de integridade, envio ou configuração.

O registro de execução pode ser filtrado localmente sem alterar o que o Velair retém. Escolha qualquer combinação da fonte do sistema Velair e dos dispositivos gerenciados, ou use a opção geral **Todos**; depois, se quiser, restrinja por categoria e intervalo inclusivo de datas De/Até. **Limpar filtros** restaura toda a linha do tempo retida. Um histórico vazio é apresentado de forma diferente de filtros sem resultados. Os filtros são um estado temporário da interface e não são salvos.

No computador, as colunas do registro podem ser redimensionadas arrastando os separadores ou usando o teclado com um separador em foco. As setas ajustam em passos pequenos; Shift+seta usa passos maiores; Home/End move até os limites permitidos; um clique duplo restaura a largura padrão. As larguras são temporárias e não são salvas. No celular, horário, dispositivo, tipo e mensagem aparecem em quatro linhas separadas. Uma linha pode ser rolada horizontalmente quando um valor não cabe sem quebra.

Somente as escolhas de categorias são persistidas. O histórico de eventos existe apenas na memória, é apagado quando a integração ou o Home Assistant reinicia e não usa o Recorder. É preenchido a partir de eventos existentes do Velair, mudanças de disponibilidade e resultados de envio, sem acrescentar consultas periódicas.

**Baixar relatório** abre opções de privacidade antes de criar um JSON apropriado para uma issue. Por padrão, IDs das entidades de climatização gerenciadas são substituídos por identificadores alternativos estáveis; você pode manter os IDs originais para inspeção local. Identificadores de Perfil, Modo e pausa sempre são removidos. Fechar o painel ou concluir um download restaura a opção padrão mais segura. O download padrão de diagnóstico da entrada de configuração do Home Assistant sempre usa a versão com dados ocultados.
A seção de exportação fica oculta em layouts de celular porque downloads não são confiáveis na visualização web do aplicativo Companion. Abra o Velair no navegador de um tablet ou computador para baixar um relatório. Revise o relatório antes de publicá-lo. Os IDs dos sensores associados também são substituídos; a visão local em tempo real os mantém visíveis por serem úteis na conferência da configuração.

A visão local do Diagnóstico usa os nomes amigáveis dos dispositivos ao filtrar, mas o painel detalhado mostra intencionalmente os IDs locais para permitir a conferência da configuração. Com a opção padrão de privacidade habilitada, relatórios baixados substituem IDs estruturados e IDs contidos no texto de erros retidos por identificadores alternativos determinísticos, como `climate_unit_1` e `associated_entity_1`. Referências repetidas mantêm o mesmo identificador alternativo, preservando relações úteis sem revelar os IDs locais originais. Se você optar explicitamente por manter os IDs originais, eles permanecerão no relatório; identificadores de Perfil, Modo e pausa continuam sendo removidos. Revise cada relatório antes de compartilhá-lo.

O Diagnóstico não oferece controles do agendador, novas tentativas, reversão ou climatização. As Configurações continuam reunindo ações de configuração e manutenção; detalhes de capacidade e integridade dos dispositivos ficam no Diagnóstico.

Cada equipamento gerenciado também informa evidências de estabilização de comandos que existem apenas durante a execução. Enquanto um comando recente do Velair estabiliza, o Diagnóstico lista os campos de controle afetados no retrato operacional. Se o equipamento não convergir até o prazo limitado, o próximo retrato atualizado sinaliza `command_settling_mismatch`. Expanda esse aviso no painel de Diagnóstico do equipamento selecionado para comparar o valor esperado de cada campo afetado com o informado pelo termostato. As temperaturas incluem a unidade do equipamento, os modos HVAC usam os rótulos habituais e valores ausentes são identificados explicitamente. A comparação usa o registro, não a programação atual nem uma nova leitura. O relatório baixado também mantém o bloco `command_settling`. Isso é uma evidência para investigar problemas: o Diagnóstico não repete o comando, não altera o equipamento nem cria um Ajuste manual. A evidência é apagada por um comando mais recente para o mesmo campo ou por reinício.

<a id="automating-diagnostic-health"></a>
## Automatizar o estado do diagnóstico

O Velair cria uma entidade **Status de diagnóstico** com estados `ok`, `warning` e `error`. Ela é atualizada pela mesma visão do backend usada nesta seção e não faz consultas periódicas. Seus atributos compactos incluem estado do agendador, contagem de unidades e problemas e códigos estáveis; erros brutos e identificadores operacionais não são incluídos.

Use um gatilho de estado quando a automação precisar apenas da integridade atual agregada. Use o evento `diagnostic_issue_changed` para reagir à detecção ou resolução de um problema específico enquanto outros permanecem ativos. Consulte [Eventos de automação](automation-events.pt-br.md#diagnostic-issue-changed) para os dados do evento e exemplos.

Cada dispositivo gerenciado também tem um sensor **Diagnóstico de entrega da zona**, desabilitado por padrão. Ele apresenta o mesmo estado de envio e último alvo de controle aceito usados pelo Diagnóstico, apenas durante a execução e sem texto bruto de erros. Um alvo aceito significa que o Home Assistant aceitou a sequência de serviços correspondente do Velair; não comprova o estado do dispositivo ou do transporte. O Room Assist pode depois ajustar o alvo enviado e expõe esse contexto em seu próprio sensor. As evidências de envio nunca são restauradas após uma reinicialização e são apagadas após uma redefinição bem-sucedida dos dados do Velair. Consulte [Sensores de controle e envio por zona](zone-sensors.pt-br.md#zone-delivery-diagnostics) para o contrato completo de estados e atributos, instruções de habilitação e exemplos de automação.
