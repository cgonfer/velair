<a id="temperature-units-and-migration"></a>
# Unidades de temperatura e migração
<!-- velair-docs:start -->
Traduções: [Original em inglês](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Estado das traduções](../translation-status.md)

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

O Velair suporta Celsius e Fahrenheit e segue a unidade de temperatura configurada no Home Assistant. Não existe um seletor de unidade separado no Velair. A unidade detetada aparece apenas para consulta em **Definições > Unidade de temperatura**; para a alterar, utilize as definições do sistema de unidades do Home Assistant.

<a id="new-installations-and-resets"></a>
## Novas instalações e reposições

Na configuração inicial, o Velair cria programações, modelos integrados, limites de conforto, limites do Room Assist e definições de pré-condicionamento adaptativo na unidade detetada no Home Assistant. Repor o Velair recria esses valores predefinidos na unidade detetada nesse momento.

As temperaturas alvo são validadas de acordo com os valores mínimo e máximo e o passo efetivo de temperatura de cada equipamento gerido. Velair usa `target_temp_step` diretamente quando o Home Assistant fornece esse atributo. Caso contrário, Definições mostra o valor alternativo efetivo: o último passo válido comunicado pela entidade, o valor manual guardado para a zona ou `1` quando nenhum deles existe. Pode definir o passo real do dispositivo. Guardar esse valor enquanto o atributo está ausente elimina a observação anterior, sem alterar as regras da programação. Quando a entidade voltar a comunicar um passo válido, ele terá prioridade e será guardado novamente. Assim, uma entidade inconsistente não invalida programações existentes com temperaturas decimais apenas por omitir o atributo.

Os valores alvo permitidos são calculados a partir da temperatura mínima comunicada pelo equipamento, e não de zero. Isto preserva os valores realmente aceites pelo dispositivo em Celsius e Fahrenheit, incluindo os casos em que a temperatura mínima não é um múltiplo exato do passo.

<a id="existing-stored-data"></a>
## Dados já armazenados

O Velair armazena as definições térmicas na unidade registada com os dados. Se a unidade do Home Assistant mudar, os números armazenados não serão reinterpretados silenciosamente.

Quando os dados armazenados já indicam uma unidade e o Home Assistant passa a informar a outra, Velair:

1. interrompe a programação automática e o envio de valores térmicos;
2. preserva o estado de recuperação ativo do Room Assist e interrompe os respetivos recetores de eventos;
3. cria uma notificação persistente no Home Assistant;
4. mostra as unidades de origem e destino nas Definições do Velair; e
5. oferece uma migração explícita de todos os dados térmicos armazenados.

Execute esta migração apenas se todos os valores armazenados ainda estiverem na unidade de origem indicada. A operação converte programações, modelos, temperaturas alvo das substituições ativas e anteriores, passos alternativos de temperatura, limites de conforto, definições do Room Assist, definições de pré-condicionamento adaptativo, últimos passos comunicados, taxas e observações de aprendizagem. Quando o passo efetivo está disponível, as temperaturas alvo de um equipamento conhecido são ajustadas a esse passo. Os restantes valores editáveis convertidos utilizam uma precisão segura, sem inventar um passo para o dispositivo.

O programador só volta a funcionar depois de os dados convertidos serem armazenados com sucesso e de o estado de execução ser restaurado. Após uma operação bem-sucedida, Room Assist restaura a temperatura alvo programada já convertida e elimina o seu estado de recuperação guardado. Se os dados forem guardados, mas a recuperação em execução falhar, Velair permanece parado e informa que é necessário recarregar a integração ou reiniciar o Home Assistant.

<a id="upgrading-published-celsius-only-data"></a>
## Atualização de versões publicadas que usavam apenas Celsius

As versões publicadas do Velair anteriores aos metadados de unidade tratavam os valores térmicos armazenados como Celsius. Por isso, o Velair considera que os dados antigos sem unidade registada estão em Celsius.

- Se o Home Assistant utiliza Celsius, o Velair pode continuar a utilizar esses valores e regista os metadados de unidade.
- Se o Home Assistant utiliza Fahrenheit, o Velair não tenta adivinhar se os valores foram editados manualmente. Interrompe o programador e solicita **Repor Velair**, que substitui os dados antigos por novos valores predefinidos em Fahrenheit.

A exportação continua disponível enquanto essa reposição estiver pendente, permitindo guardar uma cópia para consulta antes de eliminar as programações e definições antigas.

<a id="export-and-import"></a>
## Exportação e importação

As exportações atuais incluem o campo `temperature_unit`. Se o ficheiro importado utiliza a outra unidade, o Velair converte as secções térmicas selecionadas para a unidade atual do Home Assistant antes de as armazenar.

Cópias de segurança antigas sem `temperature_unit` são aceites e tratadas como Celsius. O ecrã de importação mostra esse pressuposto antes da importação. Numa instalação que utiliza Fahrenheit, esses valores antigos são convertidos automaticamente para Fahrenheit.

A importação continua a substituir os dados das secções selecionadas: programações, modelos, definições ou dados de aprendizagem correspondentes são substituídos. Exporte primeiro a configuração atual se puder precisar de uma cópia para recuperação.

O passo alternativo manual de cada zona faz parte dos dados portáteis da zona e é convertido como uma diferença de temperatura quando as unidades diferem. O último passo observado na entidade local é uma informação interna sobre o dispositivo e não é exportado.

<a id="temporarily-unavailable-climates"></a>
## Equipamentos temporariamente indisponíveis

Um equipamento indisponível pode não comunicar os respetivos limites ou o passo de temperatura. O Velair pode, ainda assim, migrar ou importar os dados armazenados e validar as programações quando o equipamento voltar a comunicar as suas capacidades. Uma programação incompatível é identificada no painel e tem de ser corrigida antes de poder ser utilizada com segurança.

<a id="what-velair-converts"></a>
## O que Velair converte

As definições armazenadas e os dados de cópias de segurança importados só são convertidos durante uma migração ou importação explícita. As leituras e temperaturas alvo atuais dos equipamentos já pertencem ao Home Assistant e não são convertidas novamente. As leituras de sensores de temperatura ambiente da divisão ou do exterior só são convertidas no momento da comparação, quando a unidade declarada é diferente da unidade do equipamento gerido.
