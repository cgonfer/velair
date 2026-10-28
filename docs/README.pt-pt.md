<a id="documentation"></a>
# Documentação
<!-- velair-docs:start -->
Traduções: [Original em inglês](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Estado das traduções](translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.6 |
| Última sincronização | 2026-10-28 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

A documentação do Velair está organizada por público e tema.

<a id="user-documentation"></a>
## Documentação para utilizadores

- [Instalação](user/installation.pt-pt.md): instalar o Velair através do HACS ou manualmente.
- [Utilização](user/usage.pt-pt.md): configurar equipamentos de climatização, programações, modelos, perfis, reforços, pausas, importação/exportação e serviços.
- [Grupos de divisão](user/room-groups.pt-pt.md): compartilhe programação, controlo e aprendizagem de uma divisão entre vários dispositivos, observando cada um individualmente.
- [Navegação no painel e ligações diretas](user/usage.pt-pt.md#panel-navigation-and-direct-links): criar ligações paro separadores e secções, restaurar a secção ao atualizar a página e utilizar o histórico do navegador.
- [Alterações externas e ajuste manual](user/manual-control.pt-pt.md): escolher se o Velair mantém o controlo automático ou o cede a alterações feitas em cartões do HA, comandos remotos, dispositivos e automações.
- [Execução externa de programações](user/external-systems.pt-pt.md): publicar programações semanais efetivas compatíveis, incluindo a seleção de Perfis e Modos, em controladores suportados, sem misturar a lógica dos fornecedores com o programador do Velair.
- [Perfis de climatização](user/climate-profiles.pt-pt.md): coordenar programações alternativas e disponibilizar Modos configuráveis às automações do Home Assistant.
- [Predefinições de blocos e modelos ligados](user/linked-schedules.pt-pt.md): reutilizar definições de climatização e partilhar horários diários ou programações diárias completas entre programações predefinidas e de Perfil.
- [Exemplos de predefinições e modelos](user/linked-schedule-examples.pt-pt.md): configurar a casa passo a passo, programações sazonais, cópias, alterações partilhadas e resolução de problemas.
- [Automações com predefinições](user/preset-automations.pt-pt.md): atualizar temperaturas-alvo partilhadas e definições dos dispositivos a partir de scripts, com exemplos baseados na temperatura exterior e substituição explícita.
- [Eventos para automações](user/automation-events.pt-pt.md): utilizar os dados completos dos eventos de execução nas automações do Home Assistant.
- [Blueprints de automação](user/blueprints.pt-pt.md): importar auxiliares opcionais de ocupação, janelas abertas e temperatura sazonal, sem consultas periódicas.
- [Seleção sazonal da climatização](user/blueprints/seasonal-climate-selection.pt-pt.md): escolher Modos ou outras ações a partir de alterações estáveis de temperatura, com notificações de diagnóstico imediatas.
- [Pré-condicionamento adaptativo](user/adaptive-preconditioning.pt-pt.md): antecipar as temperaturas de conforto programadas com aprendizagem local.
- [Regresso planeado](user/planned-return.pt-pt.md): configurar ausências com base na ocupação e chegadas semanais ou pontuais, com exemplos de cancelamento antes e depois da confirmação de saída.
- [Room Assist](user/room-assist.pt-pt.md): utilizar um sensor de temperatura separado na divisão para válvulas termostáticas, termóstatos e aparelhos de ar condicionado.
- [Controlo do fornecimento](user/shared-climate-supply.pt-pt.md): controlar um interruptor partilhado de aquecimento ou arrefecimento pela procura estimada das divisões, com histerese do fornecimento e exceções por termóstato.
- [Envio resiliente de comandos de climatização](user/resilient-climate-delivery.pt-pt.md): compreender as novas tentativas adiadas e o comportamento de restabelecimento da ligação quando um equipamento fica temporariamente indisponível.
- [Conforto ambiental](user/comfort.pt-pt.md): compreender a temperatura, a humidade, a qualidade do ar por CO2 e a atualidade das leituras através de avaliações locais das divisões.
- [Unidades de temperatura e migração](user/temperature-units.pt-pt.md): compreender os valores predefinidos em Celsius/Fahrenheit, atualizações, migração, importação/exportação e recuperação.
- [Resolução de problemas](user/troubleshooting.pt-pt.md): problemas comuns de instalação, funções da interface e funcionamento.
- [Diagnóstico](user/diagnostics.pt-pt.md): estado de funcionamento local, histórico limitado e relatórios de problemas com dados ocultados.
- [Referência dos sensores](user/sensors.pt-pt.md): consultar todos os sensores do Velair, os seus atributos principais e exemplos práticos de automação.
- [Sensores de controlo e envio por zona](user/zone-sensors.pt-pt.md): utilizar o contexto de responsabilidade pelo controlo de cada equipamento e as evidências de envio durante a execução em painéis e automações.

<a id="developer-documentation"></a>
## Documentação para programadores

- [Arquitetura](developer/architecture.md): limites dos módulos de backend e frontend, modelo de persistência e funcionamento do programador.
- [Funcionamento interno das programações ligadas](developer/linked-schedules.md): predefinições de blocos partilhadas, ligações apenas de horários ou completas, transações partilhadas e programações efetivas.
- [Manutenção de blueprints](developer/blueprints.md): adicionar YAML de blueprints, entradas no catálogo, páginas detalhadas consistentes, traduções e testes.
- [API WebSocket](developer/api.md): contrato da API entre frontend e backend.
- [Funcionamento interno do pré-condicionamento adaptativo](developer/adaptive-preconditioning.md): estados da aprendizagem local, ponderação por semelhança, armazenamento e dados da API.
- [Funcionamento interno do Room Assist](developer/room-assist.md): seleção do sensor da divisão, cálculo da temperatura-alvo assistida, estado de execução, restauro e eventos.
- [Funcionamento interno do envio de comandos](developer/climate-delivery.md): novas tentativas por eventos, recuperação da disponibilidade, serialização, gerações e limites de confirmação do sucesso.
- [Funcionamento interno do conforto ambiental](developer/comfort.md): seleção de fontes, avaliação das condições, qualidade dos dados, observadores, dados da API e eventos.
- [Funcionamento interno das unidades de temperatura](developer/temperature-units.md): metadados de armazenamento, limites da migração, conversão portátil, validação e segurança durante a execução.
- [Frontend](developer/frontend.md): elementos da interface, comandos de compilação, recurso Lovelace, traduções, princípios visuais e fluxo de trabalho.
- [Desenvolvimento](developer/development.md): verificações locais, ficheiros gerados, orientações de código e processo de contribuição.
- [Testes manuais](developer/manual-testing.md): lista de verificação de versões e comportamento.

<a id="project-documentation"></a>
## Documentação do projeto

- [Capturas de ecrã](project/screenshots.md): capturas reais.

As ideias futuras e os pedidos de funcionalidades devem ser acompanhados nos problemas ou discussões do GitHub, para poderem evoluir com o feedback da comunidade sem criar promessas de desenvolvimento.
