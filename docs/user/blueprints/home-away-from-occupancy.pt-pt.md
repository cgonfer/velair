<a id="home-and-away-from-occupancy"></a>
# Em casa e ausente a partir da ocupação
<!-- velair-docs:start -->
Traduções: [Original em inglês](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [Estado das traduções](../../translation-status.md)

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

Execute as ações escolhidas no Home Assistant quando uma entidade consolidada de ocupação passar a indicar presença ou ausência. Isto mantém a lógica de presença de pessoas, visitantes e condições específicas da casa no Home Assistant, facilitando a configuração de mudanças comuns de Modo e Perfil do Velair. Uma notificação após um atraso explica quando a entidade não consegue fornecer uma decisão segura entre Em casa e Ausente.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir o Home Assistant e importar o blueprint Em casa e ausente a partir da ocupação" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consultar a fonte YAML de Em casa e ausente a partir da ocupação"></a>
</p>

[Consultar histórico de alterações](../../../blueprints/changelogs/occupancy_home_away.md) · [Voltar ao índice de blueprints](../blueprints.pt-pt.md)

<a id="when-to-use-it"></a>
## Quando utilizar

Utilize este blueprint quando o Home Assistant já tiver uma entidade que representa se a casa está ocupada. É adequado para mudanças entre Em casa, Ausente ou estados semelhantes, em que as ações finais devem aguardar um atraso e ser verificadas novamente antes de executar.

<a id="requirements"></a>
## Requisitos

- Blueprint versão 1.0.0 e Home Assistant 2024.6.0 ou mais recente.
- Um `binary_sensor` ou `input_boolean` com `on`/`off`, ou um grupo de pessoas com `home`/`not_home`.
- O Velair só é necessário quando as ações configuradas usam os seus Modos, Perfis, entidades ou serviços. Nos restantes casos, o blueprint pode executar ações normais do Home Assistant sem o Velair.

Prepare as regras de pessoas, visitantes, zonas e presença no Home Assistant antes de selecionar aqui a entidade resultante. Um grupo de pessoas pode representar se alguma pessoa monitorizada está `home`, enquanto um sensor binário por template pode incluir um auxiliar de visitantes ou outras exceções da casa. O blueprint aceita `on`/`off` e `home`/`not_home`, em vez de refazer essa decisão.

<a id="configuration"></a>
## Configuração

- **Consolidated occupancy state:** a única entidade que já representa a ocupação de toda a casa.
- **When occupied:** uma ou mais ações normais do Home Assistant.
- **When empty:** uma ou mais ações normais do Home Assistant.
- **Occupied delay:** por quanto tempo a entidade deve permanecer `on` ou `home`.
- **Empty delay:** por quanto tempo deve permanecer `off` ou `not_home`.
- **Availability warning delay:** por quanto tempo `unknown` ou `unavailable` deve persistir antes de o Home Assistant criar uma notificação de diagnóstico. O valor predefinido é 5 minutos.

<a id="example"></a>
## Exemplo

Para a ação de casa ocupada, adicione **Seleção: Selecionar**, escolha a entidade de Modo do Velair apresentada pelo Home Assistant e selecione `Home`. Configure a ação de casa vazia da mesma forma, com `Away`. Selecione a entidade pela interface, sem presumir um ID específico.

As ações geradas equivalem a:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Para ativar diretamente um Perfil:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Utilizar Modos normalmente é mais claro para opções Em casa, Ausente e Férias, pois o estado atual permanece visível no seletor de Modo do Velair do Home Assistant.

<a id="how-it-works"></a>
## Como funciona

Os acionadores de presença (`on`/`home`) e ausência (`off`/`not_home`) usam as durações nativas `for` do Home Assistant, portanto o estado deve permanecer contínuo durante todo o atraso. Acionadores separados de disponibilidade por template detetam um estado `unknown`/`unavailable` prolongado e a recuperação para qualquer estado compatível. O Home Assistant cria uma notificação persistente por automação após o atraso de aviso, atualiza-a em vez de duplicá-la e remove-a após a recuperação. Ações de Em casa e Ausente não executam enquanto a entidade não tiver um estado válido.

Na arranque, as verificações de presença, ausência e disponibilidade executam em ramos internos paralelos. Cada ramo verifica o seu estado inicial, aguarda o estado oposto de forma interrompível até o tempo configurado, continua apenas se o tempo terminar e verifica novamente antes de agir. O modo paralelo externo limitado impede que uma espera inicial por disponibilidade bloqueie uma transição válida posterior de ocupação. Não há consultas periódicas.

<a id="safety-and-precedence"></a>
## Segurança e prioridades

O blueprint executa apenas as ações configuradas. As prioridades existentes de Modo, Perfil, Reforço e pausa do Velair continuam a aplicar-se. Uma entidade de ocupação `unknown` ou `unavailable` não ativa Em casa nem Ausente; o aviso identifica a entidade e explica que as ações ficam suspensas até que ela introduza um estado compatível de presença ou ausência.

<a id="limitations"></a>
## Limitações

- O blueprint aceita intencionalmente uma entidade de ocupação já resolvida; não combina por si só regras de pessoas ou visitantes.
- Temporizadores `for` do Home Assistant não sobrevivem a um reinício, pelo que o processo de arranque recomeça o atraso configurado.
- O ID da notificação usa o ID da entidade da automação. Renomear a automação pode deixar a notificação anterior disponível para remoção manual.
- A execução paralela é limitada a 20 execuções e emite um aviso se uma sequência anormal de eventos ocupar todas as posições.
- Ações criadas com **Assumir controlo** deixam de receber atualizações automáticas do blueprint.

<a id="troubleshooting"></a>
## Resolução de problemas

- Se nenhum ramo executar, confirme que a entidade selecionada informa `on`/`home` ou `off`/`not_home`.
- Se aparecer um aviso, examine a entidade de ocupação indicada e o seu grupo, template, pessoas ou auxiliar de visitantes de origem.
- Se Ausente for ativado demasiado cedo, aumente o atraso de ausência.
- Se o Modo esperado não for selecionado, execute manualmente a ação escolhida no Home Assistant e verifique o nome da opção.
- Se uma ação de Perfil falhar, utilize o ID estável do Perfil, não o nome apresentado editável.

<a id="updating-and-customizing"></a>
## Atualização e personalização

Importe novamente o URL corrente de `main` para instalar uma atualização compatível. Atualizações da versão 1 preservam os nomes dos campos existentes, e todo campo novo tem um valor predefinido, dispensando a migração da automação. Uma futura versão incompatível usará outro nome de ficheiro e nova versão principal, em vez de substituir este URL. O Velair nunca edita automações do Home Assistant ou `.storage` para migrar um blueprint. Use **Assumir controlo** apenas quando a instalação precisar de uma lógica que não possa ser expressa pelos campos fornecidos; a automação independente deixa então de receber atualizações do blueprint.
