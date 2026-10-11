<a id="temperature-units-and-migration"></a>
# Unidades de temperatura e migração
<!-- velair-docs:start -->
Traduções: [Original em inglês](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Status das traduções](../translation-status.md)

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

Velair oferece suporte a Celsius e Fahrenheit seguindo a unidade de temperatura configurada no Home Assistant. Não há um seletor de unidade separado no Velair. A unidade detectada aparece apenas para consulta em **Configurações > Unidade de temperatura**; para alterá-la, use as configurações do sistema de unidades do Home Assistant.

<a id="new-installations-and-resets"></a>
## Novas instalações e redefinições

Na primeira configuração, Velair cria programações, modelos integrados, limites de conforto, limites do Room Assist e configurações de pré-condicionamento adaptativo na unidade detectada no Home Assistant. Redefinir Velair recria esses valores padrão na unidade detectada naquele momento.

As temperaturas alvo são validadas de acordo com os valores mínimo e máximo e o incremento efetivo de temperatura de cada equipamento gerenciado. Velair usa `target_temp_step` diretamente quando o Home Assistant fornece esse atributo. Caso contrário, Configurações mostra o valor alternativo efetivo: o último incremento válido informado pela entidade, o valor manual salvo para a zona ou `1` quando nenhum deles existe. Você pode definir o incremento real do dispositivo. Salvar esse valor enquanto o atributo está ausente apaga a observação anterior, sem alterar as regras da programação. Quando a entidade voltar a informar um incremento válido, ele terá prioridade e será salvo novamente. Assim, uma entidade inconsistente não invalida programações existentes com temperaturas decimais apenas por omitir o atributo.

Os valores alvo permitidos são calculados a partir da temperatura mínima informada pelo equipamento, e não de zero. Isso preserva os valores realmente aceitos pelo dispositivo em Celsius e Fahrenheit, inclusive quando a temperatura mínima não é um múltiplo exato do incremento.

<a id="existing-stored-data"></a>
## Dados já armazenados

Velair armazena as configurações térmicas na unidade registrada junto com os dados. Se a unidade do Home Assistant mudar, os números armazenados não serão reinterpretados silenciosamente.

Quando os dados armazenados já indicam uma unidade e o Home Assistant passa a informar a outra, Velair:

1. interrompe a programação automática e o envio de valores térmicos;
2. preserva o estado de recuperação ativo do Room Assist e interrompe seus ouvintes de eventos;
3. cria uma notificação persistente no Home Assistant;
4. mostra as unidades de origem e destino nas Configurações do Velair; e
5. oferece uma migração explícita de todos os dados térmicos armazenados.

Execute essa migração somente se todos os valores armazenados ainda usarem a unidade de origem indicada. A operação converte programações, modelos, temperaturas alvo das substituições ativas e anteriores, incrementos alternativos de temperatura, limites de conforto, configurações do Room Assist, configurações de pré-condicionamento adaptativo, últimos incrementos informados, taxas e observações de aprendizado. Quando o incremento efetivo está disponível, as temperaturas alvo de um equipamento conhecido são ajustadas a ele. Outros valores editáveis convertidos usam uma precisão segura, sem inventar um incremento para o dispositivo.

O agendador só volta a funcionar depois que os dados convertidos forem armazenados com sucesso e o estado de execução for restaurado. Após uma operação bem-sucedida, Room Assist restaura a temperatura alvo programada já convertida e apaga seu estado de recuperação salvo. Se os dados forem salvos, mas a recuperação em execução falhar, Velair permanece parado e informa que é necessário recarregar a integração ou reiniciar o Home Assistant.

<a id="upgrading-published-celsius-only-data"></a>
## Atualização de versões publicadas que usavam apenas Celsius

As versões publicadas de Velair anteriores aos metadados de unidade tratavam os valores térmicos armazenados como Celsius. Por isso, Velair considera que os dados antigos sem unidade registrada estão em Celsius.

- Se o Home Assistant usa Celsius, Velair pode continuar usando esses valores e registra os metadados de unidade.
- Se o Home Assistant usa Fahrenheit, Velair não tenta adivinhar se os valores foram editados manualmente. Ele interrompe o agendador e solicita **Redefinir Velair**, que substitui os dados antigos por novos valores padrão em Fahrenheit.

A exportação continua disponível enquanto essa redefinição estiver pendente, permitindo salvar uma cópia para consulta antes de apagar as programações e configurações antigas.

<a id="export-and-import"></a>
## Exportação e importação

As exportações atuais incluem o campo `temperature_unit`. Se o arquivo importado usa a outra unidade, Velair converte as seções térmicas selecionadas para a unidade atual do Home Assistant antes de armazená-las.

Backups antigos sem `temperature_unit` são aceitos e tratados como Celsius. A tela de importação mostra essa suposição antes de importar. Em uma instalação que usa Fahrenheit, esses valores antigos são convertidos automaticamente para Fahrenheit.

A importação continua substituindo os dados das seções selecionadas: programações, modelos, configurações ou dados de aprendizado correspondentes são sobrescritos. Exporte a configuração atual primeiro se você puder precisar de uma cópia para recuperação.

O incremento alternativo manual de cada zona faz parte dos dados portáveis da zona e é convertido como uma diferença de temperatura quando as unidades diferem. O último incremento observado na entidade local é uma informação interna sobre o dispositivo e não é exportado.

<a id="temporarily-unavailable-climates"></a>
## Equipamentos temporariamente indisponíveis

Um equipamento indisponível pode não informar seus limites ou seu incremento de temperatura. Velair ainda pode migrar ou importar os dados armazenados e validar as programações quando o equipamento voltar a informar seus recursos. Uma programação incompatível é identificada no painel e precisa ser corrigida antes de poder ser utilizada com segurança.

<a id="what-velair-converts"></a>
## O que Velair converte

As configurações armazenadas e os dados de backups importados só são convertidos durante uma migração ou importação explícita. As leituras e temperaturas alvo atuais dos equipamentos já pertencem ao Home Assistant e não são convertidas novamente. As leituras de sensores separados do ambiente interno ou de sensores externos só são convertidas no momento da comparação, quando sua unidade declarada é diferente da unidade do equipamento gerenciado.
