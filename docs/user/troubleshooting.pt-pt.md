<a id="troubleshooting"></a>
# Resolução de problemas
<!-- velair-docs:start -->
Traduções: [Original em inglês](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Estado das traduções](../translation-status.md)

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

<a id="a-lovelace-card-shows-configuration-error"></a>
## Um cartão Lovelace apresenta um erro de configuração

Confirme que o Velair está instalado e configurado antes de o painel carregar o cartão. A integração disponibiliza o respetivo recurso de interface logo no início do arranque do Home Assistant, para que os cartões não fiquem à espera do módulo após um reinício normal.

Se o erro continuar:

1. Confirme que o URL do recurso do painel é exatamente `/velair_frontend/velair-card.js` e que o tipo é **Módulo JavaScript**.
2. Remova funções duplicados ou antigos, como `/local/velair-card.js`.
3. Reinicie o Home Assistant depois de atualizar a integração.
4. Atualize a página no navegador ou recarregue a aplicação complementar do Home Assistant.

A consola do navegador ou o separador de rede deve indicar se o pedido do módulo falhou. Inclua o erro completo ao comunicar um problema reproduzível.

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair não aparece na barra lateral

Reinicie o Home Assistant depois de instalar ou atualizar a integração. O painel da barra lateral é registado durante a configuração da integração.

Se a integração acabou de ser atualizada, atualize a página sem utilizar a cache do navegador ou recarregue a aplicação complementar do Home Assistant.

<a id="the-lovelace-card-shows-old-ui"></a>
## O cartão Lovelace mostra a interface antiga

Verifique os funções do painel. Remova funções de desenvolvimento antigos, como:

```yaml
url: /local/velair-card.js
type: module
```

Utilize o recurso fornecido pela integração:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

O Velair fornece esse recurso com cabeçalhos que impedem a utilização da cache. A barra lateral utiliza um URL automaticamente associado à versão e elementos internos isolados, para que um cartão Lovelace antigo em cache não impeça a atualização do painel. Normalmente, atualizar a integração exige apenas reiniciar o Home Assistant e atualizar a página no navegador ou recarregar a aplicação complementar. Se o backend comunica a nova versão, mas a interface anterior continua visível, atualize a página sem utilizar a cache ou limpe a cache do sítio antes de comunicar o problema. Não é necessário adicionar identificadores de compilação nem editar o URL do recurso entre versões.

<a id="a-climate-entity-is-missing"></a>
## Uma entidade de climatização não aparece

Abra as opções da integração Velair e confirme que a entidade está selecionada. Velair gere apenas as entidades `climate.*` configuradas na integração.

Se a entidade já não existe no Home Assistant, Velair mostra o problema confirmado em **Diagnóstico**.

<a id="a-mode-is-not-available"></a>
## Um modo não está disponível

O Velair lê os modos HVAC suportados na entidade de climatização. Se um modo não aparece, a entidade não o está a indicar como suportado.

Ao aplicar modelos ou clonar programações, Velair rejeita modos incompatíveis com uma mensagem clara. Altere o bloco para **Manter o modo atual** ou selecione um modo compatível com o equipamento de destino.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## A temperatura é ajustada ao aplicar modelos

Ao aplicar um modelo, o Velair valida as configurações de climatização efetivas de acordo com o termostato de destino. Primeiro, rejeita temperaturas abaixo do mínimo ou acima do máximo do termostato. Valores dentro desses limites podem depois ser arredondados para o passo de temperatura suportado, incluindo perto dos limites do intervalo. Esta validação também se aplica a predefinições partilhadas e modelos ligados; uma configuração partilhada incompatível impede que a operação afetada seja guardada. Ajuste a temperatura ou escolha um destino compatível antes de tentar novamente.

<a id="export-does-not-download-on-mobile"></a>
## A exportação não é descarregada no telemóvel

Por agora, a exportação só aparece em computadores, pois as aplicações complementares para dispositivos móveis não tratam as transferências de forma consistente. A importação continua disponível tanto em computadores como em dispositivos móveis.

<a id="scheduler-does-not-apply-after-restart"></a>
## O programador não aplica a programação após reiniciar

Por predefinição, o Velair restaura o seu estado sem enviar comandos aos equipamentos depois de o Home Assistant arrancar.

Ative **Aplicar programação ativo após arranque** em Definições se pretender que o Velair aplique a programação ativa após reiniciar.

<a id="reset-to-defaults"></a>
## Restaurar os valores predefinidos

Utilize **Definições > Manutenção > Repor Velair**. Esta operação elimina todos os dados armazenados do Velair, incluindo programações, modelos, preferências do painel, reforços e pausas ativos, definições de conforto e Room Assist, definições e aprendizagem de pré-condicionamento adaptativo e comportamento no arranque. Em seguida, recria os valores predefinidos na unidade correta para os equipamentos atualmente geridos.

Exporte os dados primeiro se puder precisar deles para recuperação.

<a id="temperature-unit-requires-attention"></a>
## A unidade de temperatura exige atenção

Velair lê a unidade de temperatura do Home Assistant. Se Definições comunicar que a unidade armazenada e a unidade do Home Assistant são diferentes, a programação automática e o envio de valores térmicos permanecem interrompidos para impedir que uma temperatura antiga seja aplicada com um significado incorreto.

- Se o Velair oferecer uma migração de temperaturas armazenadas, verifique se todos os valores ainda estão na unidade de origem indicada e execute a migração uma vez. Não efetuar a migração apenas mantém a programação interrompida; o Velair nunca converte os dados silenciosamente.
- Se uma atualização de dados antigos publicados em Celsius exigir uma reposição, exporte primeiro uma cópia para consulta, se for útil, e utilize **Repor Velair** para criar os valores predefinidos na unidade atual do Home Assistant.
- Se uma reposição, migração ou importação tiver sido guardada, mas a recuperação em execução falhar, recarregue a integração Velair ou reinicie o Home Assistant. Velair permanece parado até a recuperação, por segurança.

Se uma programação for marcada como incompatível depois de um equipamento voltar a estar disponível, verifique a temperatura alvo de acordo com os limites e o passo efetivo comunicados pela entidade. Quando `target_temp_step` estiver ausente, configure o passo real do dispositivo na linha desse equipamento em Definições. O campo mostra o último passo válido que Velair tem registado, ou, na sua ausência, o valor alternativo manual guardado ou `1` quando nenhum deles existe. Guardar um valor manual enquanto o atributo está ausente substitui a observação anterior. O valor manual é ignorado, mas continua guardado, sempre que o Home Assistant comunica um passo válido.

Cópias de segurança antigas sem unidade registada são aceites como Celsius. O ecrã de importação mostra esse pressuposto e converte os valores térmicos selecionados quando a unidade atual do Home Assistant é Fahrenheit.

Consulte [Unidades de temperatura e migração](temperature-units.pt-pt.md) para compreender todas as opções e o comportamento das cópias de segurança.
