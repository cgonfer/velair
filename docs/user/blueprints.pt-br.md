<a id="automation-blueprints"></a>
# Blueprints de automação
<!-- velair-docs:start -->
Traduções: [Original em inglês](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.4 |
| Última sincronização | 2026-10-21 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair mantém presença, portas, visitantes e condições específicas da casa no Home Assistant, em vez de criar um segundo mecanismo de automação. Estes blueprints opcionais oferecem pontos de partida guiados para situações comuns, com funcionamento totalmente local e acionado por eventos.

Importar um blueprint não altera o Velair por si só. Primeiro, o Home Assistant adiciona o blueprint reutilizável; depois, você cria e configura uma automação a partir dele. Automações existentes podem receber atualizações do blueprint por uma nova importação, ou você pode usar **Assumir controle** para transformá-las em automações independentes do Home Assistant.

Os pacotes de integração do HACS não copiam os blueprints de automação automaticamente para a pasta de blueprints do Home Assistant. Use os links de importação abaixo.

<a id="available-blueprints"></a>
## Blueprints disponíveis

Os blueprints estão listados em ordem alfabética pelos nomes originais em inglês.

- [Em casa e ausente a partir da ocupação](#home-and-away-from-occupancy)
- [Pausar uma zona enquanto as janelas estão abertas](#pause-a-zone-while-windows-are-open)
- [Seleção sazonal da climatização](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Em casa e ausente a partir da ocupação

Execute as ações escolhidas no Home Assistant quando uma entidade consolidada de ocupação passar a indicar presença ou ausência. As ações podem selecionar um Modo do Velair, ativar um Perfil ou coordenar o Velair com o restante da casa. Uma notificação após um atraso informa quando a ocupação fica indisponível.

**Versão:** 1.0.0 · **Requer:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.pt-br.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a documentação de Em casa e ausente a partir da ocupação"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Em casa e ausente a partir da ocupação" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Pausar uma zona enquanto as janelas estão abertas

Pause um ou mais dispositivos de climatização gerenciados pelo Velair enquanto qualquer janela ou porta selecionada permanecer aberta. Depois, retome suas programações apenas quando a automação ainda for responsável pela pausa ativa. Uma notificação do Home Assistant após um atraso identifica os sensores de contato indisponíveis e os termostatos afetados.

**Versão:** 1.0.0 · **Requer:** Home Assistant 2024.6.0+ e Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.pt-br.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a documentação de Pausar uma zona enquanto as janelas estão abertas"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Pausar uma zona enquanto as janelas estão abertas" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Seleção sazonal da climatização

Execute uma única vez as ações configuráveis de inverno, clima ameno ou verão depois que a temperatura permanecer em uma nova faixa sazonal por um atraso positivo, inicialmente de 30 minutos. Variações dentro dessa faixa preservam o prazo e não repetem as ações. Use o editor padrão de ações para escolher Modos do Velair ou outras ações do Home Assistant. Leituras inválidas geram uma notificação imediata; na inicialização, o diagnóstico é verificado sem selecionar uma estação.

As notificações de diagnóstico aceitam os mesmos idiomas do Velair, selecionados explicitamente no blueprint.

**Versão:** 1.1.0 · **Requer:** Home Assistant 2024.6.0+ · **Categoria:** Temperatura / automação sazonal

<p>
  <a href="blueprints/seasonal-climate-selection.pt-br.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a documentação de Seleção sazonal da climatização"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Seleção sazonal da climatização" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar o código YAML de Seleção sazonal da climatização"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Comportamento compartilhado

- Os blueprints reagem a eventos de estado e inicialização do Home Assistant; não fazem consultas periódicas.
- Atrasos configuráveis filtram mudanças breves de estado.
- Os estados `unknown` e `unavailable` são tratados de forma conservadora.
- O blueprint de ocupação informa problemas prolongados de disponibilidade da ocupação e remove o aviso após a recuperação.
- O blueprint de janelas informa problemas persistentes de disponibilidade dos sensores de contato sem atrasar o controle dos sensores que continuam funcionando.
- O blueprint sazonal informa imediatamente leituras inválidas de temperatura e nunca seleciona uma estação na inicialização.
- A configuração dos blueprints permanece no Home Assistant, não no armazenamento do Velair.
- Importar novamente a mesma URL atualiza o blueprint usado pelas automações existentes.

Cada página de blueprint documenta seus próprios requisitos, configuração, exemplo, comportamento de segurança, limitações e etapas de solução de problemas.

<a id="versions-and-updates"></a>
## Versões e atualizações

Os blueprints usam versões semânticas próprias, independentes da integração Velair. Os links de importação acompanham intencionalmente a versão contínua de `main`. Importe novamente a mesma URL quando quiser uma atualização compatível para uma automação existente. O Home Assistant não atualiza automaticamente os blueprints importados.

Atualizações dentro da versão 1 preservam os nomes dos campos existentes, e todo campo novo tem um valor padrão. Uma mudança incompatível é publicada com outro nome de arquivo e uma nova versão principal, mantendo a URL existente disponível. O Velair não inspeciona nem migra automações do Home Assistant ou dados de `.storage`. **Assumir controle** mantém uma automação independente, mas também interrompe o recebimento de futuras atualizações do blueprint.
