<a id="practical-examples-presets-and-linked-templates"></a>
# Exemplos práticos: predefinições e modelos vinculados
<!-- velair-docs:start -->
Traduções: [Original em inglês](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Status das traduções](../translation-status.md)

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

Este guia apresenta configurações domésticas com **Padrão**, **Perfis**, modelos diários e predefinições do Velair. Nomes, entidades e temperaturas são exemplos: use modos e alvos aceitos pelos seus termostatos. As temperaturas estão em Celsius; o Velair também aceita Fahrenheit.

Para as regras completas, consulte [Predefinições de blocos e modelos vinculados](linked-schedules.pt-br.md).

<a id="choose-what-you-want-to-share"></a>
## Escolher o que compartilhar

| Objetivo | Escolha | Alterações posteriores |
|---|---|---|
| Reutilizar temperatura e opções em horários independentes | Uma predefinição do Velair em cada bloco | Editar a predefinição atualiza os blocos; os horários permanecem independentes. |
| Começar por um modelo e personalizar blocos | Copiar blocos | Edições do modelo não atualizam a cópia. Referências copiadas a predefinições continuam vinculadas. |
| Duplicar um dia configurado | Clonar | A cópia mantém tipo de vínculo, atribuições e referências a predefinições da origem. |
| Usar os mesmos horários com ajustes diferentes de aquecimento ou resfriamento | Um modelo com **Somente horários** | Mudanças de horário atualizam todos os dias vinculados; os ajustes permanecem independentes. |
| Manter vários dias idênticos em horários e ajustes | Um modelo com **Horários e configurações** | Horários e ajustes acompanham o modelo; controles do destino são somente leitura. |

Um modelo representa um dia, não uma semana inteira. Vincule explicitamente cada dia da semana e termostato necessário. Uma semana pode conter dias independentes e ambos os tipos de vínculo. Padrão é a semana habitual de cada termostato; não é um Perfil salvo.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Uma rotina de aquecimento para dois cômodos

**Situação:** sala e quarto precisam de conforto às 07:00 e temperatura reduzida à noite, às 23:00. Os dois termostatos aceitam aquecimento e essas temperaturas.

1. Abra **Modelos → Predefinições climáticas**. Crie e salve estas predefinições:

   | Predefinição | Modo | Alvo |
   |---|---|---|
   | Conforto de aquecimento | Aquecer | 21 °C |
   | Aquecimento noturno | Aquecer | 17 °C |

2. Na biblioteca de modelos diários, crie **Dia útil em casa**. Adicione 07:00 e 23:00. Nas **Configurações adicionais** de cada bloco, escolha a **Predefinição do Velair** correspondente e salve o modelo.
3. Abra **Programações → Programações padrão**, selecione a sala e segunda-feira. Defina **Origem dos horários** como **Dia útil em casa** e escolha **Horários e configurações** em **Vincular**. Salve o dia.
4. Repita para o quarto e cada dia que deve seguir a rotina.

Horário, modo, alvo e opções do dispositivo são somente leitura nesses dias vinculados. A coluna do alvo ainda mostra 21 °C ou 17 °C; não substitui a temperatura pelo nome da predefinição. Indicadores de origem e detalhes do bloco identificam modelo e predefinição.

Agora faça duas alterações separadas:

| Alteração salva | Resultado |
|---|---|
| Mover o bloco de 07:00 do modelo para 07:30 | Todos os dias vinculados iniciam esse bloco às 07:30. Sua referência à predefinição não muda. |
| Alterar Conforto de aquecimento de 21 °C para 21.5 °C | Todas as referências usam 21.5 °C, inclusive por meio do modelo. Alvos noturnos permanecem 17 °C. |

Salvar o modelo não salva também um rascunho aberto de Perfil sem relação com ele. Salvar uma predefinição não salva um rascunho de programação sem relação. Cada recurso tem seu próprio controle de salvamento.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Inverno e verão com um conjunto de horários

**Situação:** um ar-condicionado aquece no inverno e resfria no verão. Os horários da casa permanecem iguais, mas os alvos e ações mudam.

Crie **Dia útil** com blocos às 07:00 e 23:00. Crie as predefinições abaixo e use **Somente horários** ao vincular a segunda-feira da sala em Padrão e nos dois Perfis:

| Horário compartilhado | Atribuição em Padrão | Atribuição no Perfil Inverno | Atribuição no Perfil Verão |
|---|---|---|---|
| 07:00 | Conforto habitual: Aquecer, 20 °C | Conforto de inverno: Aquecer, 21 °C | Conforto de verão: Resfriar, 25 °C |
| 23:00 | Desligar manual | Noite de inverno: Aquecer, 17 °C | Predefinição Desligar |

Para configurar um Perfil, selecione **Programações de perfil**, crie o Perfil e defina a sala como **Cronograma de perfil**. Selecione o dia, escolha **Dia útil → Somente horários** e configure suas atribuições. Salve o Perfil completo. Em Padrão, salve separadamente cada dia editado.

Mover o horário da manhã do modelo para 07:30 move as três programações. Alterar o alvo próprio do modelo não muda essas atribuições. Editar **Conforto de inverno** afeta suas referências, inclusive o Perfil Inverno, mas não transforma o alvo de resfriamento do Verão em aquecimento.

O Perfil selecionado continua determinando qual semana executa. O Home Assistant pode selecionar Inverno ou Verão pelas ações existentes de Perfil; o modelo não decide a estação. Por exemplo, após criar um Perfil com ID de automação `summer`, esta ação o seleciona:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Para voltar às programações Padrão salvas:

```yaml
action: velair.deactivate_profile
```

Use o **ID de automação** mostrado no Perfil, que pode ser diferente do nome de exibição. Consulte [Perfis climáticos](climate-profiles.pt-br.md) para Modos e regras de ativação.

Para clima ameno, um dispositivo controlado localmente pode ter um Perfil separado com comportamento **Pausa → Desligar a climatização**. Uma automação pode selecioná-lo. Isso difere de um bloco Desligar programado: uma zona pausada não volta a seguir blocos posteriores. Pausa não está disponível para zonas controladas externamente; valem as ações de programação aceitas pelo provedor.

Limites de previsão meteorológica, verificações periódicas de temperatura externa, notificações de janelas e atrasar o desligamento noturno continuam sendo decisões das automações do Home Assistant. Predefinições e vínculos não acrescentam essas regras ao Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Copiar um dia e personalizar o quarto de hóspedes

**Situação:** o quarto de hóspedes deve começar por Dia útil em casa, mas os visitantes querem aquecimento no café da manhã às 08:00, em vez de 07:00.

Em Programações, selecione o quarto de hóspedes e o dia. Mantenha **Origem dos horários → Programação própria** e escolha **Dia útil em casa** no seletor separado **Modelos** para copiar os blocos. Altere a manhã para 08:00 e salve. O dia é independente do modelo. Mover Dia útil em casa depois para 07:30 não move o bloco das 08:00 do quarto.

Se o bloco copiado usa **Conforto de aquecimento**, continua referenciando essa predefinição. Editá-la para 21.5 °C também muda o alvo do quarto de hóspedes. Ser independente de um modelo não significa ser independente de uma predefinição.

Para manter o quarto a 20 °C independentemente de futuras edições, abra Configurações adicionais do bloco, escolha **Sem preset do Velair**, edite o alvo manual para 20 °C e salve. Remover primeiro a predefinição preserva os ajustes efetivos; não esvazia o bloco.

Clonar um dia difere de copiar blocos da biblioteca: preserva o vínculo de modelo do dia de origem. Por exemplo, clone uma segunda-feira que segue **Dia útil em casa → Horários e configurações** para terça-feira. Os dois dias agora seguem Dia útil em casa; mudar seu início de 07:00 para 07:30 atualiza ambos.

Com **Somente horários**, a clonagem mantém o mesmo vínculo e copia suas atribuições, inclusive predefinições. Depois, você pode mudar as atribuições da terça sem alterar as da segunda, enquanto ambas acompanham os horários do modelo.

Também é possível clonar segunda-feira para segunda-feira em outro termostato. O destino mantém o mesmo tipo de vínculo se compatível; outros dias mantêm suas configurações. Se uma predefinição compartilhada de Aquecer não puder ser usada em um dispositivo apenas de resfriamento, a clonagem é rejeitada em vez de remover silenciosamente o vínculo. Padrão valida todos os destinos selecionados juntos. Nos Perfis, clonar atualiza apenas o rascunho validado até salvar o Perfil.

Para uma terça independente, clone e escolha **Desvincular** antes de salvar. O dia mantém seus ajustes atuais e predefinições vinculadas, mas deixa de acompanhar o modelo. **Copiar blocos** da biblioteca continua sendo uma operação independente.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Alterar um vínculo preservando o rascunho desejado

**Situação:** segunda-feira está vinculada a Dia útil em casa. Você quer personalizar essa segunda sem alterar os demais dias vinculados.

| Escolha | Resultado no rascunho |
|---|---|
| Mudar **Horários e configurações** para **Somente horários** | Manter os ajustes atuais do modelo como atribuições próprias do dia, inclusive predefinições. Horários ainda acompanham o modelo. |
| Mudar **Somente horários** para **Horários e configurações** | Confirmar a substituição das atribuições pelos ajustes do modelo. Cancelar mantém a seleção e o rascunho originais. |
| Escolher outro modelo | Confirmar a substituição do rascunho. Cancelar mantém o modelo e ajustes atuais. |
| Usar **Desvincular** | Manter horários e ajustes do rascunho como dia independente, inclusive predefinições. |
| Escolher **Programação própria** | Confirmar o descarte das edições do dia e restaurar o dia salvo como rascunho independente. |

Essas operações não salvam automaticamente. Salve o dia Padrão ou o Perfil completo quando estiver pronto.

Para uma diferença concreta, suponha que a segunda salva tenha um bloco independente às 09:00 a 20 °C. Você seleciona um modelo que começa às 08:00 e ajusta sua atribuição apenas de horários para 21 °C, sem salvar:

- **Desvincular** mantém 08:00 e 21 °C no rascunho independente.
- **Programação própria** restaura 09:00 e 20 °C salvos.

Se a segunda salva já estava vinculada, Programação própria usa os valores atuais desse dia salvo e os torna independentes. Não recupera uma programação manual anterior à criação do vínculo.

Transformar um dia vinculado em independente usa valores adaptados ao termostato. Por exemplo, um alvo manual compartilhado de 18.3 °C pode aparecer como 18.5 °C em um dispositivo com passos de 0.5 °C. Após Desvincular, esse alvo manual permanece 18.5 °C. Um bloco com predefinição mantém sua referência a ela. Nenhuma operação altera a biblioteca compartilhada.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Adicionar um bloco ao meio-dia a um modelo compartilhado

**Situação:** Dia útil já tem blocos às 07:00 e 23:00. Você adiciona 12:00 com Aquecer manual a 18 °C. Cômodos e Perfis diferentes usam esse modelo.

<a id="a-compatible-hours-only-destination"></a>
### Destino compatível vinculado apenas pelos horários

Se o destino aceita Aquecer a 18 °C, o Velair propõe copiar essa configuração para sua nova atribuição de 12:00. Revise em **Dias vinculados** e salve o modelo.

Apenas o horário permanece compartilhado. Alterar depois o alvo das 12:00 do modelo para 19 °C não muda essa atribuição. Se o novo bloco fizer referência a uma predefinição compatível, a atribuição mantém essa referência; edições posteriores da predefinição continuam sendo propagadas.

<a id="an-incompatible-hours-only-destination"></a>
### Destino incompatível vinculado apenas pelos horários

Suponha que outro termostato tenha temperatura-alvo mínima de 19 °C. Sua atribuição existente das 07:00 usa a predefinição válida **Conforto do escritório: Aquecer, 21 °C**. O novo alvo de 18 °C é incompatível, então o Velair procura uma atribuição salva no dia desse mesmo termostato:

1. Um bloco exatamente às 12:00, se existia antes da edição.
2. Blocos anteriores, começando pelo mais próximo.
3. Blocos posteriores, começando pelo mais próximo.

Neste caso, propõe Conforto do escritório das 07:00. Dias vinculados identifica a alternativa e sua origem. Você pode aceitá-la ou escolher outra atribuição válida antes de salvar. Sua predefinição continua vinculada.

Um bloco de origem incompatível é ignorado. Um bloco movido ou excluído nesta edição ainda pode fornecer a atribuição previamente salva; outro recém-adicionado não pode. Se não houver origem válida, Dias vinculados mostra uma atribuição pendente. Complete-a manualmente ou escolha uma predefinição compatível; nada é salvo enquanto houver pendências.

<a id="a-completely-linked-destination"></a>
### Destino com vínculo completo

Para **Horários e configurações**, o novo bloco das 12:00 vem diretamente do modelo. Não há alternativa baseada nos ajustes antigos do cômodo.

Se o alvo de 18 °C do modelo for incompatível com qualquer destino completo, todo o salvamento fica bloqueado. Altere o alvo para um valor aceito por todos ou mude o destino afetado para Somente horários ou um dia independente e salve essa mudança primeiro.

A verificação inclui Perfis inativos e programações Padrão ocultas por outro Perfil ativo. Até concluir um salvamento válido, todos os destinos salvos mantêm a programação anterior.

<a id="move-or-remove-an-existing-block"></a>
### Mover ou remover um bloco existente

Mover 07:00 para 07:30 preserva a atribuição da manhã de cada destino apenas de horários; não a substitui pelo alvo do modelo. Destinos completos acompanham o modelo atualizado. Remover um bloco remove atribuições correspondentes apenas de horários e o bloco correspondente dos vínculos completos no mesmo salvamento.

Um bloco tem identidade estável. Excluí-lo e adicionar outro no mesmo horário cria um novo bloco; isso não é tratado como mover o original.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Entender os usos antes de editar ou excluir

**Situação:** a predefinição Conforto de aquecimento está selecionada em:

- Um bloco de Dia útil em casa.
- Um bloco Padrão independente na sexta-feira.
- Uma atribuição apenas de horários em um Perfil Inverno.

A predefinição tem **três referências diretas**. Se mais dois dias usarem Dia útil em casa com Horários e configurações, herdarão a predefinição pelo modelo. Aparecem como destinos afetados adicionais, sem aumentar a contagem direta para cinco.

Editar a predefinição afeta todas essas referências e destinos herdados. Todos precisam ser compatíveis para salvar. Uma predefinição referenciada por um modelo não pode ser excluída mesmo se ele não tiver dias vinculados: remova primeiro a referência no modelo.

A contagem **Dias vinculados** de um modelo significa outra coisa. Vincular segunda e terça cria dois dias vinculados. Copiar para sexta não cria vínculo nem aumenta a contagem. Cópias não são acompanhadas como usos do modelo.

Exclua um modelo apenas após desvincular todos os seus dias salvos em Padrão e Perfis. Editar nome, horários ou ajustes mantém sua posição na biblioteca.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. O que acontece enquanto uma programação está ativa?

Suponha que a sala siga automaticamente Conforto de aquecimento a 21 °C. Salvar essa predefinição a 21.5 °C atualiza a intenção ativa de controle. O dispositivo físico ainda precisa aceitar a ação; salvar não comprova que o cômodo aqueceu.

Se a sala tiver um Reforço a 23 °C, editar a predefinição não o cancela. Ao expirar, o Velair usa a configuração atual da programação. Pausas e Ajuste manual também mantêm sua autoridade. Ativar um Perfil é uma ação separada: cancela Reforços nas zonas afetadas, enquanto pausas globais e por zona continuam prioritárias. Consulte [Regras de autoridade dos Perfis](climate-profiles.pt-br.md).

Se Inverno fornece sua própria semana, editar Padrão não substitui sua programação ativa. Voltar a Padrão usa os ajustes Padrão salvos mais recentes. Um Perfil configurado para **Programação padrão** herda vínculos e predefinições de Padrão, em vez de armazenar outra cópia.

Um dia vazio não desliga implicitamente a climatização. Um bloco noturno de sexta às 23:00 continua em um sábado vazio até começar outro bloco programado. Adicione um bloco Desligar explícito se essa for a ação desejada.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Opções do dispositivo, resfriamento e faixas de temperatura

**Situação:** um ar-condicionado do quarto disponibiliza a predefinição nativa `sleep` e o ventilador `quiet`. Você quer ambos às 23:00 com resfriamento a 25 °C.

Crie uma predefinição do Velair chamada **Noite de verão no quarto** com Resfriar, 25 °C, Predefinição do dispositivo `sleep` e Modo do ventilador `quiet`. Selecione-a no bloco das 23:00 pelas Configurações adicionais. **Predefinição do Velair** é a configuração compartilhada; **Predefinição do dispositivo** é um comando dentro dela. O resumo mostra alvo, modo e ambas as opções juntos.

Em um destino compatível com essas opções, o indicador de ajustes conta três: um vínculo do Velair mais duas opções do dispositivo. Temperatura e modo HVAC não entram nessa contagem. Uma opção omitida não é redefinida: remover `quiet` da configuração compartilhada deixa de enviar um comando ao ventilador, em vez de atribuir outro valor.

Para outra rotina, crie **Apenas ventilador silencioso** só com a opção de ventilador, sem alvo ou modo HVAC. Uma referência programada envia essa configuração sem pedir mudança de modo ou ligar um dispositivo desligado. Não tem alvo para Pré-condicionamento ou Room Assist. Copiada para um termostato sem controle de ventilador, ficaria vazia e seria rejeitada.

Um dispositivo com faixa nativa Aquecer/resfriar pode usar uma predefinição **Faixa em casa** com Aquecer/resfriar, limite inferior de 19 °C e superior de 24 °C. Ambos aparecem nas colunas do alvo e vêm da mesma predefinição. Alterar o superior para 25 °C atualiza as referências mantendo o inferior. Um termostato de temperatura única não pode usar essa faixa; o Velair não inventa um alvo escalar nem limite ausente. Use uma predefinição compatível separada para ele.

Predefinições apenas de modo selecionam HVAC sem temperatura nem opções adicionais. Uma predefinição Desligar solicita desligamento, sem alvo ou opções extras. Essas ações mantêm sua semântica existente quando referenciadas em um modelo; compartilhá-las não acrescenta controle contínuo de temperatura.

<a id="troubleshooting-shared-configurations"></a>
## Solução de problemas nas configurações compartilhadas

| O que aparece | O que conferir ou fazer |
|---|---|
| Um horário bloqueado | O dia acompanha horários de modelo. Edite o modelo ou use Desvincular. |
| Modo e alvo também bloqueados | O dia acompanha o modelo completo ou o bloco usa uma predefinição. Edite a origem compartilhada. |
| Um dia copiado ainda muda de temperatura | Manteve uma referência a predefinição. Escolha Sem preset do Velair para tornar o bloco manual. |
| Edição de modelo falha embora o cômodo ativo pareça válido | Confira Dias vinculados para Perfis inativos, dias Padrão ocultos e outros termostatos. |
| Novo horário vinculado está pendente | Escolha configuração manual válida ou predefinição em Dias vinculados. |
| Permanece um erro de provedor relativo à semana inteira | Resolva grade de horários, ações aceitas ou limite de blocos do provedor. Escolher um bloco de origem não resolve essas restrições. |
| Compatibilidade passa, mas salvar falha | A verificação testou um termostato. Salvar valida todos os destinos reais salvos. |
| Botão de exclusão desabilitado | Remova primeiro todas as referências salvas; modelos podem referenciar predefinições sem dias vinculados. |
| Outra sessão alterou a configuração | Atualize a configuração e revise o rascunho preservado antes de tentar novamente. |
| Prévia falha ou continua carregando | Mantenha o rascunho e tente novamente. O Velair não presume ajustes nem remove referências para conseguir salvar. |

Opções adicionais incompatíveis podem ser filtradas da configuração efetiva de um destino. Alvos fora dos limites e modos incompatíveis são rejeitados. Uma ação apenas de opções não pode ficar vazia após filtrar. Controladores externos impõem restrições adicionais; publicar uma programação nunca faz a execução passar para o controle local.

<a id="back-up-the-whole-setup"></a>
## Fazer backup de toda a configuração

Use a exportação do Velair em vez de copiar apenas um dia visível com os valores efetivos. Exportações do modelo 16 preservam ambos os vínculos, predefinições e identidades de blocos. Exportar programações ou Perfis inclui modelos e predefinições de que dependem; a tela mostra as seções adicionadas automaticamente.

Na importação, examine as substituições antes de confirmar. Substituir um recurso compartilhado também pode afetar usos locais existentes. A configuração combinada precisa ser válida; novos Perfis não são ativados só porque foram importados. Backups antigos continuam importáveis, mas versões antigas do Velair não podem importar uma exportação de modelo 16. Consulte [Portabilidade](usage.pt-br.md#portability).
