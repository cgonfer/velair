<a id="installation"></a>
# Instalação
<!-- velair-docs:start -->
Traduções: [Original em inglês](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Estado das traduções](../translation-status.md)

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

O Velair está disponível na loja predefinida do HACS. A instalação manual continua disponível para quem não utiliza o HACS ou precisa de testar uma compilação específica.

<a id="hacs"></a>
## HACS

1. Abra o HACS.
2. Procure **Velair** nas integrações disponíveis.
3. Abra o Velair e selecione **Transferir**.
4. Reinicie o Home Assistant.
5. Aceda a **Definições > Dispositivos e serviços**.
6. Adicione a integração Velair.
7. Selecione as entidades `climate.*` que o Velair pode gerir.

O Velair utiliza a unidade de temperatura selecionada no Home Assistant. Uma nova instalação cria programações, modelos, limiares de Conforto, definições do Room Assist e valores predefinidos de Pré-condicionamento adaptativo para essa unidade. A unidade é apresentada nas Definições do Velair apenas para consulta e deve ser alterada através do Home Assistant, não do Velair.

As instalações existentes que atualizem a partir de uma versão publicada do Velair que só suportava Celsius podem precisar de ser repostas quando o Home Assistant utiliza Fahrenheit. Consulte [Unidades de temperatura e migração](temperature-units.pt-pt.md) antes de avançar, para poder exportar primeiro uma cópia de referência, se necessário.

<a id="manual-installation"></a>
## Instalação manual

A instalação manual normalmente só é necessária quando não utiliza o HACS ou pretende testar uma compilação de GitHub Actions ou GitHub Release.

Os ficheiros das versões incluem `velair-custom-component-<version>.zip`. Extraia-o de forma a que esta pasta exista:

```text
<home_assistant_config>/custom_components/velair
```

Para uma cópia do repositório, copie:

```text
custom_components/velair
```

para:

```text
<home_assistant_config>/custom_components/velair
```

Reinicie o Home Assistant e adicione o Velair em **Definições > Dispositivos e serviços**.

<a id="github-actions-artifacts"></a>
## Artefactos de GitHub Actions

Cada execução bem-sucedida da CI disponibiliza artefactos temporários:

- `velair-custom-component`: a pasta completa `custom_components/velair`, com o bundle da interface gerado nessa execução.
- `velair-lovelace-resource`: os ficheiros compilados `velair-card.js` para testes manuais avançados do recurso Lovelace.

As execuções de versões com tag também anexam ficheiros zip à GitHub Release. Prefira o HACS para utilização normal; utilize estes artefactos para testar uma execução específica ou instalar manualmente.

<a id="optional-lovelace-card"></a>
## Cartão Lovelace opcional

O painel da barra lateral é registrado automaticamente. O cartão Lovelace é opcional. Quando os recursos do painel de controlo são gerenciados pela interface do Home Assistant, o Velair registra automaticamente seu módulo JavaScript durante a configuração da integração, inclusive para instalações existentes após uma atualização. Confira em **Definições > Dashboards > Recursos** (disponível no menu de três pontos). Nesse modo não é necessário configurar recursos manualmente; adicione os cartões diretamente.

A URL do recurso é `/velair_frontend/velair-card.js?v=...`. O Velair atualiza o parâmetro de versão quando o bundle instalado muda; não o edite manualmente. Após instalar ou atualizar, reinicie o Home Assistant e recarregue o navegador ou aplicativo complementar. Os cartões devem funcionar ao abrir o painel de controlo diretamente, sem visitar antes o painel lateral do Velair.

Depois adicione um ou mais cartões Velair. Cada cartão utiliza os mesmos dados do backend e componentes visuais que o painel da barra lateral.

```yaml
type: custom:velair-card
view: overview-status
```

Valores de `view` suportados:

- `climate`: estado e controlos de um equipamento gerido, com uma ação opcional de regresso pontual do agregado familiar, junto de Reforço e Pausa. Os cartões existentes mantêm esta ação oculta; as novas configurações criadas no seletor de cartões ativam-na.
- `overview-estado`: estado do programador e controlos de pausa/paragem/retoma.
- `overview-boosts`: reforços ativos.
- `overview-events`: próximos eventos.
- `overview-timeline`: linha temporal de hoje.
- `overview-zones`: visão geral das zonas.
- `active-setup`: Modo e Perfis atuais, com controlos opcionais.
- `schedules`: editor completo de programações.
- `sensors`: configuração e estado em tempo real do Room Assist.
- `comfort`: configuração e estado do conforto ambiental.
- `preconditioning`: configuração do pré-condicionamento adaptativo e estado da aprendizagem local.
- `planned-return`: controlos compactos de regresso pontual, contagem das fontes de ocupação configuradas e linha temporal de saída confirmada. Sem fontes de ocupação guardadas, **Planear regresso** aplica imediatamente a configuração de ausência; a rotina semanal automática continua a exigir fontes.
- `diagnostics`: estado de funcionamento, histórico limitado, filtros e exportação de relatórios de problemas.

<a id="resources-managed-in-yaml"></a>
### Recursos gerenciados em YAML

Se sua configuração usa `lovelace.resource_mode: yaml`, o Velair deixa a lista de recursos sob seu controlo. Adicione à configuração `lovelace` existente:

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /velair_frontend/velair-card.js
      type: module
```

A URL estável sem parâmetro de versão continua compatível; não há versão para manter no YAML. Preserve os outros recursos existentes. Escrever um cartão ou painel de controlo em YAML não seleciona, por si só, o gerenciamento de recursos em YAML.

<a id="card-discovery-and-resource-troubleshooting"></a>
### Descoberta de cartões e solução de problemas do recurso

Use apenas o módulo da integração `/velair_frontend/velair-card.js`, com o parâmetro automático de versão quando os recursos são gerenciados pela interface. O Velair migra a entrada antiga exata `/local/velair-card.js` e consolida automaticamente as duplicatas desses dois caminhos locais. Outros caminhos e URLs externas não são alterados. Para recursos gerenciados em YAML, remova entradas antigas ou duplicadas manualmente, reinicie o Home Assistant e recarregue o navegador. Elementos personalizados do navegador não podem ser substituídos após o registro; um recurso antigo carregado primeiro pode manter uma implementação desatualizada.

Se um recurso precisar de atenção em YAML ou o registro automático falhar, consulte as instruções do Velair nos registos do Home Assistant. As verificações de recursos não criam notificações persistentes.

O seletor de cartões do dashboard descobre o Velair pelos metadados do frontend. Adicionar `type: custom:velair-card` manualmente em YAML usa o elemento personalizado registado; são verificações separadas. Se o cartão funcionar por YAML, mas não aparecer no seletor, informe essa diferença ao relatar o problema.

Se a descoberta diferir entre computador e telemóvel, verifique erros JavaScript no console de desenvolvimento do navegador afetado e a solicitação do recurso na aba Network. Inclua as versões do Home Assistant e do Velair, o navegador afetado, a URL exata do recurso e o texto relevante de erros. Remova informações privadas antes de compartilhar logs. O carregamento bem-sucedido em outro navegador não determina a causa da falha no navegador afetado.

<a id="updating"></a>
## Atualização


Depois de atualizar o Velair:

1. Reinicie o Home Assistant.
2. Force a atualização do navegador ou recarregue a aplicação Companion do Home Assistant.
3. Confirme que a secção de manutenção das Definições mostra a versão esperada da integração.
