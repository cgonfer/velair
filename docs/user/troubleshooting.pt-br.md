<a id="troubleshooting"></a>
# Solução de problemas
<!-- velair-docs:start -->
Traduções: [Original em inglês](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.6 |
| Última sincronização | 2026-10-28 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

<a id="a-lovelace-card-shows-configuration-error"></a>
## Um cartão Lovelace mostra um erro de configuração

Confirme que o Velair está instalado e configurado antes de o dashboard carregar o cartão. Quando os recursos são gerenciados pela interface do Home Assistant, o Velair registra e atualiza automaticamente seu módulo. Na instalação normal não é necessária configuração manual do recurso.

Se o erro persistir:

1. Confirme que o recurso usa `/velair_frontend/velair-card.js` e o tipo **Módulo JavaScript**. Um parâmetro automático `?v=...` é esperado para recursos gerenciados pela interface; não o remova nem edite.
2. Procure recursos duplicados ou antigos, como `/local/velair-card.js`. O Velair migra e consolida esses caminhos locais exatos automaticamente nos recursos da interface. Outros caminhos e URLs externas precisam de revisão manual.
3. Reinicie o Home Assistant após atualizar a integração.
4. Recarregue o navegador ou aplicativo complementar e abra o dashboard diretamente, sem visitar primeiro o painel lateral do Velair.

Se os recursos são gerenciados em YAML, adicione o módulo manualmente pela URL estável sem parâmetros e remova ali entradas antigas ou duplicadas. Escrever um cartão ou dashboard em YAML não significa, por si só, gerenciar os recursos em YAML. Consulte a [instalação](installation.pt-br.md#resources-managed-in-yaml). Verifique os logs do Home Assistant para falhas de registro ou avisos de YAML; o Velair não cria notificações persistentes nessas verificações.

Se o registro automático falhar, você pode adicionar o recurso manualmente em **Configurações > Dashboards > Recursos**, como **Módulo JavaScript**:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair não aparece na barra lateral

Reinicie o Home Assistant depois de instalar ou atualizar a integração. O painel da barra lateral é registrado durante a configuração da integração.

Se a integração acabou de ser atualizada, recarregue a página sem usar o cache do navegador ou recarregue o aplicativo complementar do Home Assistant.

<a id="the-lovelace-card-shows-old-ui"></a>
## O cartão Lovelace mostra a interface antiga

Primeiro reinicie o Home Assistant e recarregue o navegador ou aplicativo afetado. O Velair atualiza automaticamente os recursos gerenciados pela interface, incluindo a migração de `/local/velair-card.js` e a consolidação das duplicatas reconhecidas. Confira os logs se a atualização falhar. Outros caminhos e URLs externas precisam de revisão manual.

O Velair serve esse recurso com cabeçalhos sem cache. Para recursos da interface, mantém automaticamente `?v=...` e usa a mesma URL versionada no painel lateral e nos cartões. A URL estável `/velair_frontend/velair-card.js` continua válida para configuração manual e YAML. Não adicione identificadores de build nem edite parâmetros de versão entre releases.

Uma atualização normalmente exige apenas reiniciar o Home Assistant e recarregar navegador ou aplicativo. Se o backend informa a versão nova mas a interface anterior persiste, faça uma atualização forçada ou limpe o cache do site antes de relatar o problema.

<a id="a-climate-entity-is-missing"></a>
## Uma entidade de climatização não aparece

Abra as opções da integração Velair e confirme que a entidade está selecionada. Velair gerencia apenas as entidades `climate.*` configuradas na integração.

Se a entidade não existe mais no Home Assistant, Velair mostra o problema confirmado em **Diagnóstico**.

<a id="a-mode-is-not-available"></a>
## Um modo não está disponível

Velair lê os modos HVAC compatíveis na entidade de climatização. Se um modo não aparece, a entidade não está informando que oferece suporte a ele.

Ao aplicar modelos ou clonar programações, Velair rejeita modos incompatíveis com uma mensagem clara. Altere o bloco para **Manter o modo atual** ou selecione um modo compatível com o equipamento de destino.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## A temperatura é ajustada ao aplicar modelos

Ao aplicar um modelo, o Velair valida as configurações de climatização efetivas de acordo com o termostato de destino. Primeiro, rejeita temperaturas abaixo do mínimo ou acima do máximo do termostato. Valores dentro desses limites podem então ser arredondados para o incremento de temperatura suportado, inclusive perto dos limites da faixa. Essa validação também se aplica a presets compartilhados e modelos vinculados; uma configuração compartilhada incompatível impede que a operação afetada seja salva. Ajuste a temperatura ou escolha um destino compatível antes de tentar novamente.

<a id="export-does-not-download-on-mobile"></a>
## A exportação não é baixada no celular

Por enquanto, a exportação só aparece em computadores, pois os aplicativos complementares para dispositivos móveis não tratam downloads de forma consistente. A importação continua disponível tanto em computadores quanto em dispositivos móveis.

<a id="scheduler-does-not-apply-after-restart"></a>
## O agendador não aplica a programação após reiniciar

Por padrão, Velair restaura seu estado sem enviar comandos aos equipamentos depois que o Home Assistant inicia.

Ative **Aplicar programação ativo após inicialização** em Configurações se quiser que Velair aplique a programação ativa após reiniciar.

<a id="reset-to-defaults"></a>
## Restaurar os valores padrão

Use **Configurações > Manutenção > Redefinir Velair**. Isso apaga todos os dados armazenados do Velair, incluindo programações, modelos, preferências do painel, reforços e pausas ativos, configurações de conforto e Room Assist, configurações e aprendizado de pré-condicionamento adaptativo e comportamento na inicialização. Em seguida, recria os valores padrão na unidade correta para os equipamentos atualmente gerenciados.

Exporte os dados primeiro se puder precisar deles para recuperação.

<a id="temperature-unit-requires-attention"></a>
## A unidade de temperatura exige atenção

Velair lê a unidade de temperatura do Home Assistant. Se Configurações informar que a unidade armazenada e a unidade do Home Assistant são diferentes, a programação automática e o envio de valores térmicos permanecem interrompidos para impedir que uma temperatura antiga seja aplicada com um significado incorreto.

- Se Velair oferecer uma migração de temperaturas armazenadas, verifique se todos os valores ainda usam a unidade de origem indicada e execute a migração uma vez. Não fazer nada apenas mantém a programação interrompida; Velair nunca converte os dados silenciosamente.
- Se uma atualização de dados antigos publicados em Celsius exigir uma redefinição, exporte primeiro uma cópia para consulta, se for útil, e use **Redefinir Velair** para criar os valores padrão na unidade atual do Home Assistant.
- Se uma redefinição, migração ou importação tiver sido salva, mas a recuperação em execução falhar, recarregue a integração Velair ou reinicie o Home Assistant. Velair permanece parado até a recuperação, por segurança.

Se uma programação for marcada como incompatível depois que um equipamento voltar a ficar disponível, confira a temperatura alvo de acordo com os limites e o incremento efetivo informados pela entidade. Quando `target_temp_step` estiver ausente, configure o incremento real do dispositivo na linha desse equipamento em Configurações. O campo mostra o último incremento válido que Velair lembra, depois o valor alternativo manual salvo ou `1` quando nenhum deles existe. Salvar um valor manual enquanto o atributo está ausente substitui a observação anterior. O valor manual é ignorado, mas continua salvo, sempre que o Home Assistant informa um incremento válido.

Backups antigos sem unidade registrada são aceitos como Celsius. A tela de importação mostra essa suposição e converte os valores térmicos selecionados quando a unidade atual do Home Assistant é Fahrenheit.

Consulte [Unidades de temperatura e migração](temperature-units.pt-br.md) para entender todas as opções e o comportamento dos backups.
