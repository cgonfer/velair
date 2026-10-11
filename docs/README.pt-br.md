<a id="documentation"></a>
# Documentação
<!-- velair-docs:start -->
Traduções: [Original em inglês](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Status das traduções](translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

A documentação do Velair está organizada por público e assunto.

<a id="user-documentation"></a>
## Documentação do usuário

- [Instalação](user/installation.pt-br.md): instale o Velair pelo HACS ou manualmente.
- [Uso](user/usage.pt-br.md): configure dispositivos de climatização, programações, modelos, perfis, reforços, pausas, importação/exportação e serviços.
- [Navegação do painel e links diretos](user/usage.pt-br.md#panel-navigation-and-direct-links): acesse abas e subseções por links, restaure a seção ao atualizar a página e use o histórico do navegador.
- [Alterações externas e ajuste manual](user/manual-control.pt-br.md): escolha se o Velair mantém o controle automático ou cede a alterações feitas por cartões do HA, controles remotos, dispositivos e automações.
- [Execução externa da programação](user/external-systems.pt-br.md): publique programações semanais efetivas compatíveis, incluindo a seleção de Perfis e Modos, em controladores compatíveis, sem misturar a lógica dos provedores com o agendador do Velair.
- [Perfis climáticos](user/climate-profiles.pt-br.md): coordene programações alternativas e disponibilize Modos configuráveis para automações do Home Assistant.
- [Predefinições de blocos e modelos vinculados](user/linked-schedules.pt-br.md): reutilize configurações de climatização e compartilhe horários diários ou programações diárias completas entre as programações Padrão e de Perfis.
- [Exemplos de predefinições e modelos](user/linked-schedule-examples.pt-br.md): configure situações domésticas passo a passo, programações sazonais, cópias, edições compartilhadas e solução de problemas.
- [Automações de predefinições](user/preset-automations.pt-br.md): atualize temperaturas-alvo e configurações dos dispositivos por scripts, com exemplos baseados na temperatura externa e substituição explícita.
- [Eventos de automação](user/automation-events.pt-br.md): use os dados completos dos eventos de execução nas automações do Home Assistant.
- [Blueprints de automação](user/blueprints.pt-br.md): importe recursos opcionais para ocupação, janelas abertas e temperatura sazonal, sem consultas periódicas.
- [Seleção sazonal da climatização](user/blueprints/seasonal-climate-selection.pt-br.md): selecione Modos ou outras ações a partir de mudanças estáveis de temperatura, com notificações imediatas de diagnóstico.
- [Pré-condicionamento adaptativo](user/adaptive-preconditioning.pt-br.md): antecipe as temperaturas-alvo de conforto programadas com aprendizado local.
- [Retorno planejado](user/planned-return.pt-br.md): configure a ausência a partir da ocupação e chegadas semanais ou pontuais, com exemplos de cancelamento antes e depois da saída confirmada.
- [Room Assist](user/room-assist.pt-br.md): use um sensor separado de temperatura ambiente para válvulas termostáticas, termostatos e aparelhos de ar-condicionado.
- [Envio resiliente de comandos de climatização](user/resilient-climate-delivery.pt-br.md): entenda as novas tentativas adiadas e o comportamento na reconexão quando um dispositivo de climatização fica temporariamente indisponível.
- [Conforto ambiental](user/comfort.pt-br.md): entenda temperatura, umidade, qualidade do ar por CO2 e atualização das leituras por meio de avaliações locais dos cômodos.
- [Unidades de temperatura e migração](user/temperature-units.pt-br.md): entenda valores padrão em Celsius/Fahrenheit, atualizações, migração, importação/exportação e recuperação.
- [Solução de problemas](user/troubleshooting.pt-br.md): problemas comuns de configuração, recursos do frontend e execução.
- [Diagnóstico](user/diagnostics.pt-br.md): integridade local durante a execução, histórico limitado e relatórios de problemas com dados ocultados.
- [Referência dos sensores](user/sensors.pt-br.md): consulte todos os sensores do Velair, seus principais atributos e exemplos práticos de automação.
- [Sensores de controle e envio por zona](user/zone-sensors.pt-br.md): use o contexto de controle por dispositivo e as evidências de envio durante a execução em painéis e automações.

<a id="developer-documentation"></a>
## Documentação para desenvolvedores

- [Arquitetura](developer/architecture.md): limites dos módulos de backend e frontend, modelo de persistência e fluxo do agendador.
- [Funcionamento interno das programações vinculadas](developer/linked-schedules.md): predefinições de blocos vinculadas, modelos vinculados apenas pelos horários ou completos, transações compartilhadas e programações resolvidas.
- [Manutenção de blueprints](developer/blueprints.md): adicione YAML de blueprints, entradas do catálogo, páginas detalhadas consistentes, traduções e testes.
- [API WebSocket](developer/api.md): contrato da API entre frontend e backend.
- [Funcionamento interno do pré-condicionamento adaptativo](developer/adaptive-preconditioning.md): estados de aprendizado local, ponderação por similaridade, armazenamento e saída da API.
- [Funcionamento interno do Room Assist](developer/room-assist.md): seleção da fonte do sensor ambiente, cálculo da temperatura-alvo assistida, estado durante a execução, restauração e eventos.
- [Funcionamento interno do envio de comandos](developer/climate-delivery.md): novas tentativas acionadas por eventos, recuperação de disponibilidade, serialização, gerações e critérios de sucesso.
- [Funcionamento interno do conforto ambiental](developer/comfort.md): seleção de fontes, avaliação das condições, qualidade dos dados, observadores, saída da API e eventos.
- [Funcionamento interno das unidades de temperatura](developer/temperature-units.md): metadados de armazenamento, limites da migração, conversão portátil, validação e segurança durante a execução.
- [Frontend](developer/frontend.md): elementos do frontend, comandos de compilação, recurso Lovelace, traduções, princípios de interface e fluxo de trabalho.
- [Desenvolvimento](developer/development.md): verificações locais, arquivos gerados, orientações de código e fluxo de contribuição.
- [Testes manuais](developer/manual-testing.md): lista de verificação de versões e comportamentos.

<a id="project-documentation"></a>
## Documentação do projeto

- [Capturas de tela](project/screenshots.md): capturas de tela reais.

Ideias futuras e solicitações de funcionalidades devem ser acompanhadas pelas issues ou discussões do GitHub, para que possam evoluir com as contribuições da comunidade sem criar promessas de desenvolvimento.
