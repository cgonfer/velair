<a id="installation"></a>
# Instalação
<!-- velair-docs:start -->
Traduções: [Original em inglês](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Status das traduções](../translation-status.md)

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

O Velair está disponível na loja padrão do HACS. A instalação manual continua disponível para quem não usa o HACS ou precisa testar uma compilação específica.

<a id="hacs"></a>
## HACS

1. Abra o HACS.
2. Procure **Velair** nas integrações disponíveis.
3. Abra o Velair e selecione **Baixar**.
4. Reinicie o Home Assistant.
5. Acesse **Configurações > Dispositivos e serviços**.
6. Adicione a integração Velair.
7. Selecione as entidades `climate.*` que o Velair poderá gerenciar.

O Velair usa a unidade de temperatura selecionada no Home Assistant. Uma instalação nova cria programações, modelos, limites de conforto, configurações do Room Assist e valores padrão de pré-condicionamento adaptativo para essa unidade. Ela aparece apenas para consulta nas Configurações do Velair e deve ser alterada pelo Home Assistant.

Instalações existentes que atualizam uma versão publicada do Velair compatível apenas com Celsius podem precisar de uma redefinição quando o Home Assistant usa Fahrenheit. Antes de continuar, consulte [Unidades de temperatura e migração](temperature-units.pt-br.md) para exportar uma cópia de referência, se necessário.

<a id="manual-installation"></a>
## Instalação manual

A instalação manual normalmente só é necessária quando você não usa o HACS ou quer testar uma compilação do GitHub Actions ou de uma versão publicada no GitHub.

Os arquivos da versão incluem `velair-custom-component-<version>.zip`. Extraia-o de forma que esta pasta exista:

```text
<home_assistant_config>/custom_components/velair
```

Para uma cópia local do repositório, copie:

```text
custom_components/velair
```

para:

```text
<home_assistant_config>/custom_components/velair
```

Reinicie o Home Assistant e adicione o Velair em **Configurações > Dispositivos e serviços**.

<a id="github-actions-artifacts"></a>
## Artefatos do GitHub Actions

Cada execução bem-sucedida da integração contínua disponibiliza artefatos temporários:

- `velair-custom-component`: a pasta completa `custom_components/velair`, com o pacote frontend gerado nessa execução.
- `velair-lovelace-resource`: os arquivos compilados `velair-card.js`, para testes manuais avançados do recurso Lovelace.

Execuções de versões com tag também anexam arquivos ZIP à versão no GitHub. Prefira o HACS para o uso habitual; use esses artefatos para testar uma execução específica do fluxo de trabalho ou instalar manualmente.

<a id="optional-lovelace-card"></a>
## Cartão Lovelace opcional

O painel da barra lateral é registrado automaticamente. O cartão Lovelace é opcional.

Adicione o recurso disponibilizado pela integração:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Depois, adicione um ou mais cartões Velair. Cada cartão usa os mesmos dados do backend e componentes visuais do painel da barra lateral.

```yaml
type: custom:velair-card
view: overview-status
```

Valores aceitos para `view`:

- `climate`: estado e controles de um dispositivo de climatização gerenciado, com a ação opcional de retorno pontual da casa junto a Reforço e Pausa. Cartões existentes mantêm essa ação oculta; novas configurações criadas pelo seletor de cartões a habilitam.
- `overview-status`: estado do agendador e controles de pausa, parada e retomada.
- `overview-boosts`: reforços ativos.
- `overview-events`: próximos eventos.
- `overview-timeline`: linha do tempo de hoje.
- `overview-zones`: visão geral das zonas.
- `active-setup`: Modo e Perfis atuais, com controles opcionais.
- `schedules`: editor completo de programações.
- `sensors`: configuração do Room Assist e estado em tempo real.
- `comfort`: configuração e estado do conforto ambiental.
- `preconditioning`: configuração do pré-condicionamento adaptativo e estado do aprendizado local.
- `planned-return`: controles compactos de retorno pontual, contagem das fontes de ocupação configuradas e linha do tempo da saída confirmada. Sem fontes de ocupação salvas, **Plan return** aplica Ausente imediatamente; a rotina semanal automática continua exigindo fontes.
- `diagnostics`: integridade durante a execução, histórico limitado, filtros e exportação de relatório para comunicar problemas.

<a id="updating"></a>
## Atualização

Depois de atualizar o Velair:

1. Reinicie o Home Assistant.
2. Faça uma atualização completa da página no navegador ou recarregue o aplicativo Companion do Home Assistant.
3. Confirme que a seção de manutenção das Configurações mostra a versão esperada da integração.
