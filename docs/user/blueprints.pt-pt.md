<a id="automation-blueprints"></a>
# Blueprints de automação
<!-- velair-docs:start -->
Traduções: [Original em inglês](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Estado das traduções](../translation-status.md)

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


O Velair mantém a presença, as portas, os convidados e as condições específicas de cada casa no Home Assistant, em vez de criar um segundo motor de automação. Estes blueprints opcionais oferecem um ponto de partida orientado para casos comuns, mantendo o funcionamento inteiramente local e baseado em eventos.

Importar um blueprint não altera o Velair por si só. O Home Assistant começa por adicionar o blueprint reutilizável; depois, crie e configure uma automação a partir dele. As automações existentes podem receber atualizações do blueprint através de uma nova importação, ou pode utilizar **Assumir controlo** para tornar a automação independente no Home Assistant.

Os pacotes da integração no HACS não copiam automaticamente os blueprints de automação para a pasta de blueprints do Home Assistant. Utilize as ligações de importação abaixo.

<a id="available-blueprints"></a>
## Blueprints disponíveis

Os blueprints estão listados por ordem alfabética.

- [Em casa e ausente com base na ocupação](#home-and-away-from-occupancy)
- [Pausar uma zona enquanto houver janelas abertas](#pause-a-zone-while-windows-are-open)
- [Seleção sazonal da climatização](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Em casa e ausente com base na ocupação

Execute as ações escolhidas do Home Assistant quando uma entidade de ocupação agregada passar a indicar presença ou ausência. As ações podem selecionar um Modo do Velair, ativar um Perfil ou coordenar o Velair com o resto da casa. Uma notificação com atraso avisa quando a ocupação fica indisponível.

**Versão:** 1.0.0 · **Requer:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.pt-pt.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a documentação de Em casa e ausente com base na ocupação"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint de Em casa e ausente com base na ocupação" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Pausar uma zona enquanto houver janelas abertas

Pause um ou mais equipamentos geridos pelo Velair enquanto alguma janela ou porta selecionada permanecer aberta. Depois, retome as programações apenas onde a pausa ativa ainda pertence à automação. Uma notificação com atraso do Home Assistant identifica os contactos indisponíveis e os termóstatos afetados.

**Versão:** 1.0.0 · **Requer:** Home Assistant 2024.6.0+ e Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.pt-pt.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a documentação de Pausar uma zona enquanto houver janelas abertas"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint de pausa por janelas abertas" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Seleção sazonal da climatização

Execute ações configuráveis de inverno, tempo ameno ou verão depois de o valor alterado de um sensor de temperatura permanecer estável durante um atraso positivo, inicialmente 30 minutos. Utilize o editor normal de ações para escolher Modos do Velair ou outras ações do Home Assistant. Leituras inválidas geram uma notificação imediata; no arranque, apenas se verifica o diagnóstico, sem escolher uma estação.

As notificações de diagnóstico suportam os mesmos idiomas que o Velair, selecionados explicitamente no blueprint.

**Versão:** 1.0.0 · **Requer:** Home Assistant 2024.6.0+ · **Categoria:** Temperatura / automação sazonal

<p>
  <a href="blueprints/seasonal-climate-selection.pt-pt.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a documentação de seleção sazonal da climatização"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint de seleção sazonal da climatização" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a fonte YAML da seleção sazonal da climatização"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Comportamento comum

- Os blueprints respondem a eventos de estado e de arranque do Home Assistant; não fazem consultas periódicas.
- Os atrasos configuráveis filtram alterações breves de estado.
- Os estados `unknown` e `unavailable` são tratados de forma prudente.
- O blueprint de ocupação comunica problemas persistentes de disponibilidade da ocupação e remove o aviso após a recuperação.
- O blueprint de janelas comunica problemas persistentes de disponibilidade dos contactos sem atrasar o controlo dos que continuam a funcionar.
- O blueprint sazonal comunica imediatamente leituras de temperatura inválidas e nunca seleciona uma estação no arranque.
- A configuração dos blueprints permanece no Home Assistant, não no armazenamento do Velair.
- Importar novamente o mesmo URL atualiza o blueprint utilizado pelas automações existentes.

A página de cada blueprint documenta os respetivos requisitos, configuração, exemplo, comportamento de segurança, limitações e passos de resolução de problemas.

<a id="versions-and-updates"></a>
## Versões e atualizações

Os blueprints utilizam versões semânticas próprias, independentemente da integração Velair. As ligações de importação seguem intencionalmente a versão corrente de `main`. Importe novamente o mesmo URL para obter uma atualização compatível de uma automação existente. O Home Assistant não atualiza automaticamente os blueprints importados.

As atualizações da versão 1 preservam os nomes das entradas existentes, e qualquer nova entrada tem um valor predefinido. Uma alteração incompatível é publicada com um novo nome de ficheiro e versão principal, mantendo o URL existente disponível. O Velair não inspeciona nem migra automações do Home Assistant ou dados de `.storage`. **Assumir controlo** torna a automação independente, mas também impede que receba atualizações posteriores do blueprint.
