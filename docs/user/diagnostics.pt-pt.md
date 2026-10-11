<a id="diagnostics"></a>
# Diagnóstico
<!-- velair-docs:start -->
Traduções: [Original em inglês](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Estado das traduções](../translation-status.md)

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

A secção **Diagnóstico** oferece uma vista local, apenas de leitura, do que o Velair consegue verificar, sem exigir o Recorder do Home Assistant nem serviços externos.

Mostra o estado atual do programador e uma faixa horizontal compacta dos equipamentos geridos, pela ordem dos termóstatos configurada. Selecionar um equipamento abre, abaixo da faixa, um único painel de detalhes com toda a largura. O painel apresenta cada informação uma vez, agrupada em estado e envio, configuração ativa, funções e dispositivo e sensores. Inclui:

- disponibilidade e capacidades HVAC/temperatura declaradas;
- problemas de configuração detetados para os quais o Velair tem evidências diretas;
- Modo e Perfis efetivos, intenção de controlo calculada durante a execução, Reforços e pausas;
- último alvo de controlo aceite pelo Home Assistant, erro de envio e estado das tentativas limitadas;
- Room Assist, Pré-condicionamento adaptativo, Conforto e sensores associados explicitamente.

As chamadas bem-sucedidas de `velair.set_hvac_mode` aparecem como envios manuais aceites apenas de modo. Incluem o modo HVAC selecionado, sem inventar uma temperatura. As falhas de validação não substituem as evidências anteriormente aceites, e as falhas de envio não publicam um evento de temperatura-alvo aplicado com sucesso.

O Velair não deduz uma causa quando as evidências disponíveis apenas demonstram um sintoma, como uma entidade indisponível. As informações de bateria são omitidas, a menos que o Velair consiga estabelecer uma associação fiável; a primeira versão não tenta associar dispositivos por heurísticas.

Para o Conforto, o Diagnóstico inclui a fonte guardada de cada leitura derivada ativada, os dados de entrada efetivos ou a entidade externa, a disponibilidade atual e códigos de problema estáveis para dados em falta, desatualizados, inválidos ou de atualidade não verificada. O ponto de orvalho, a humidade absoluta e o Humidex continuam a ser apenas informativos: aparecerem num relatório não significa que tenham influenciado a programação ou o controlo da climatização. Os mesmos dados ativados estão disponíveis no atributo `derived_metrics` do sensor **Condição ambiental** da zona; o Velair não cria entidades separadas para os representar. As leituras atuais incluem `freshness: reported` ou `unverified`; estas últimas permanecem visíveis com uma indicação informativa e podem ser relacionadas com a sua fonte.

Quando a comparação com o exterior está ativada, o mesmo relatório de Conforto também contém a disponibilidade dos sensores explicitamente selecionados, a qualidade independente dos dados exteriores, a comparação normalizada, a humidade absoluta interior e exterior explícita e qualquer código de oportunidade ou compromisso. O bloco `guidance_thresholds` regista a sensibilidade efetiva da zona utilizada para essa conclusão, ajudando a distinguir um problema de sensor de uma orientação intencionalmente mais exigente. Estes valores permanecem informativos e não indicam que o Velair abriu uma janela ou alterou o HVAC. O Diagnóstico também inclui `comfort_zone`: a geometria configurada, simples, guiada ou personalizada conforme a temperatura, e o intervalo de humidade efetivo à temperatura atual. Um intervalo efetivo `null` explica por que motivo uma leitura atual de humidade não foi classificada quando a temperatura estava indisponível; não é substituído por um valor estimado.

A avaliação em tempo real inclui o `range_summary` atual. As entradas conservadas de `comfort_assessment_changed` também mantêm `previous_range_summary` e os indicadores `range_summary_changed` e `range_status_changed`, permitindo que um relatório transferido mostre se o evento correspondeu a uma transição de intervalo configurado ou a outra alteração do Conforto. Estes campos contêm apenas códigos semânticos estáveis, não o contexto bruto dos eventos do Home Assistant.

<a id="runtime-history-and-privacy"></a>
## Histórico de execução e privacidade

O Diagnóstico conserva, no máximo, 100 eventos relevantes numa única linha temporal global. A secção **Definições do histórico** permite conservar independentemente eventos de controlo e programação, Room Assist, Pré-condicionamento, Conforto, envio de comandos de climatização e disponibilidade. Os novos tipos de evento do Velair ainda não classificados são conservados em controlo e programações, em vez de serem descartados silenciosamente. As alterações externas e as transições entre controlo Automático e Manual também permanecem nesta categoria. As entradas mostram apenas o modo HVAC ou a temperatura-alvo única/intervalo alterados, a política efetiva de alterações externas e qualquer motivo de expiração ou retoma; não são conservados atributos arbitrários do equipamento nem identificadores Context do Home Assistant. Todas as categorias estão ativadas por predefinição. Estas escolhas são guardadas localmente pelo backend; desativar uma categoria remove imediatamente os seus eventos já conservados. **Limpar histórico** remove todos os eventos conservados sem alterar as evidências atuais de funcionamento, envio ou configuração.

O registo de execução pode ser filtrado localmente sem alterar o que o Velair conserva. Escolha qualquer combinação da fonte do sistema Velair e dos equipamentos geridos, ou utilize a opção global **Todos**; depois, se necessário, restrinja a lista por categoria e por um intervalo de datas De/Até que inclua ambos os extremos. **Limpar filtros** restaura a linha temporal completa conservada. Um histórico vazio é apresentado de forma distinta de uma combinação de filtros sem resultados. Os filtros são estado temporário da interface e não são guardados.

No computador, é possível redimensionar as colunas do registo arrastando os separadores ou utilizando o teclado quando um separador tem o foco. As setas ajustam em pequenos passos, Shift+seta utiliza passos maiores, Home/End move para os limites permitidos e um duplo clique restaura a largura predefinida. As larguras são temporárias e não são guardadas. Em dispositivos móveis, a hora, o equipamento, o tipo e a mensagem aparecem em quatro linhas separadas. Uma linha pode deslocar-se horizontalmente quando um valor não cabe sem quebra de linha.

Apenas as escolhas de categorias são guardadas. O histórico de eventos existe exclusivamente em memória, é limpo ao reiniciar a integração ou o Home Assistant e não utiliza o Recorder. É preenchido a partir dos eventos existentes do Velair, das alterações de disponibilidade e dos resultados de envio, sem acrescentar consultas periódicas.

**Descarregar relatório…** abre opções de privacidade antes de criar um JSON adequado para comunicar um problema. As IDs das entidades de climatização geridas são substituídas por nomes alternativos estáveis por predefinição; pode manter as IDs originais para análise local. Os identificadores de Perfis, Modos e pausas são sempre removidos. Fechar o painel ou concluir uma transferência restaura a opção mais segura. A transferência normal de diagnóstico da entrada de configuração do Home Assistant utiliza sempre a cópia com os dados ocultados. A secção de exportação do relatório fica oculta em ecrãs do tamanho de um telemóvel, porque as transferências não são fiáveis na vista Web da aplicação Companion do Home Assistant. Abra o Velair no navegador de um tablet ou computador para transferir um relatório. Reveja qualquer relatório antes de o publicar. As IDs das entidades dos sensores associados também são substituídas; a vista local em tempo real mantém-nas visíveis por serem úteis para verificar a configuração.

A vista local de Diagnóstico utiliza os nomes legíveis dos equipamentos do Home Assistant na filtragem, mas o painel de detalhes apresenta intencionalmente as IDs locais das entidades para permitir verificar a configuração. Com a opção de privacidade predefinida ativada, os relatórios transferidos substituem tanto as IDs estruturadas como as incluídas no texto dos erros conservados por nomes alternativos determinísticos, como `climate_unit_1` e `associated_entity_1`. As referências repetidas mantêm o mesmo nome alternativo para preservar as relações sem expor as IDs locais originais. Se optar explicitamente por manter as IDs originais, esses identificadores locais permanecem no relatório; os identificadores de Perfis, Modos e pausas continuam a ser removidos. Reveja todos os relatórios antes de os partilhar.

O Diagnóstico não tem controlos do programador, de novas tentativas, de reversão ou de climatização. As Definições continuam a conter as ações de configuração e manutenção; os detalhes sobre capacidades e funcionamento dos equipamentos pertencem agora ao Diagnóstico.

Cada equipamento gerido também apresenta evidências, apenas durante a execução, da estabilização dos comandos. Enquanto um comando recente do Velair estabiliza, o Diagnóstico lista os campos de controlo afetados na cópia do estado de execução. Se o equipamento não convergir até ao prazo limitado, a próxima cópia atualizada assinala-o com o aviso `command_settling_mismatch`. O bloco `command_settling` do relatório transferido inclui os valores esperados e observados. Trata-se de evidências para resolver problemas: o Diagnóstico não repete o comando, não altera o equipamento nem cria um Ajuste manual. As evidências são limpas por um comando mais recente para esse campo ou por um reinício.

<a id="automating-diagnostic-health"></a>
## Automatizar o estado de diagnóstico

O Velair cria uma entidade **Estado de diagnóstico** com os estados `ok`, `warning` e `error`. É atualizada a partir da mesma cópia do estado do backend que esta vista e não faz consultas periódicas. Os seus atributos compactos incluem o estado do programador, contagens de equipamentos e problemas e códigos de problema estáveis; não incluem erros brutos nem identificadores operacionais.

Utilize um acionador de estado quando uma automação só precisa do estado de funcionamento atual agregado. Utilize o evento `diagnostic_issue_changed` quando precisa de reagir à deteção ou resolução de um problema enquanto outros permanecem ativos. Consulte [Eventos para automações](automation-events.pt-pt.md#diagnostic-issue-changed) para os dados do evento e exemplos.

Cada equipamento gerido também tem um sensor **Diagnóstico de entrega**, desativado por predefinição. Apresenta o mesmo estado de envio, apenas durante a execução, e o último alvo de controlo aceite utilizados pelo Diagnóstico, sem o texto bruto dos erros. Um alvo aceite significa que o Home Assistant aceitou a sequência de serviços relacionada do Velair; não comprova o estado do dispositivo nem do transporte. O Room Assist pode ajustar posteriormente a temperatura-alvo enviada e disponibiliza esse contexto no seu próprio sensor. As evidências de envio nunca são restauradas após um reinício e são limpas por uma reposição bem-sucedida dos dados do Velair. Consulte [Sensores de controlo e envio por zona](zone-sensors.pt-pt.md#zone-delivery-diagnostics) para o contrato completo dos estados e atributos, os passos de ativação e exemplos de automação.
