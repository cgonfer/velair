<a id="practical-examples-presets-and-linked-templates"></a>
# Exemplos práticos: predefinições e modelos ligados
<!-- velair-docs:start -->
Traduções: [Original em inglês](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Estado das traduções](../translation-status.md)

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

Este guia apresenta definições domésticas com **Predefinição**, **Perfis**, modelos diários e predefinições do Velair. Nomes, entidades e temperaturas são exemplos: use modos e alvos aceites pelos seus termóstatos. As temperaturas estão em Celsius; o Velair também aceita Fahrenheit.

Para as regras completas, consulte [Predefinições de blocos e modelos ligados](linked-schedules.pt-pt.md).

<a id="choose-what-you-want-to-share"></a>
## Escolher o que partilhar

| Objetivo | Escolha | Alterações posteriores |
|---|---|---|
| Reutilizar temperatura e opções em horários independentes | Uma predefinição do Velair em cada bloco | Editar a predefinição atualiza os blocos; os horários permanecem independentes. |
| Começar por um modelo e personalizar blocos | Copiar blocos | Edições do modelo não atualizam a cópia. Referências copiadas a predefinições continuam ligadas. |
| Duplicar um dia configurado | Clonar | A cópia mantém tipo de ligação, atribuições e referências a predefinições da origem. |
| Usar os mesmos horários com ajustes diferentes de aquecimento ou arrefecimento | Um modelo com **Apenas horários** | Mudanças de horário atualizam todos os dias ligados; os ajustes permanecem independentes. |
| Manter vários dias idênticos em horários e ajustes | Um modelo com **Horários e definições** | Horários e ajustes acompanham o modelo; controlos do destino são apenas para leitura. |

Um modelo representa um dia, não uma semana completa. Ligue explicitamente cada dia da semana e termóstato necessário. Uma semana pode conter dias independentes e ambos os tipos de ligação. Predefinição é a semana habitual de cada termóstato; não é um Perfil guardado.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Uma rotina de aquecimento para duas divisões

**Situação:** sala e quarto precisam de conforto às 07:00 e temperatura reduzida à noite, às 23:00. Os dois termóstatos aceitam aquecimento e essas temperaturas.

1. Abra **Modelos → Predefinições climáticas**. Crie e guarde estas predefinições:

   | Predefinição | Modo | Alvo |
   |---|---|---|
   | Conforto de aquecimento | Aquecer | 21 °C |
   | Aquecimento noturno | Aquecer | 17 °C |

2. Na biblioteca de modelos diários, crie **Dia útil em casa**. Adicione 07:00 e 23:00. Nas **Configurações adicionais** de cada bloco, escolha a **Predefinição do Velair** correspondente e guarde o modelo.
3. Abra **Programações → Programações padrão**, selecione a sala e segunda-feira. Defina **Origem dos horários** como **Dia útil em casa** e escolha **Horários e definições** em **Associar**. Guarde o dia.
4. Repita para o quarto e cada dia que deve seguir a rotina.

Horário, modo, alvo e opções do dispositivo são apenas para leitura nesses dias ligados. A coluna do alvo ainda mostra 21 °C ou 17 °C; não substitui a temperatura pelo nome da predefinição. Indicadores de origem e detalhes do bloco identificam modelo e predefinição.

Agora faça duas alterações separadas:

| Alteração guardada | Resultado |
|---|---|
| Mover o bloco de 07:00 do modelo para 07:30 | Todos os dias ligados iniciam esse bloco às 07:30. A sua referência à predefinição não muda. |
| Alterar Conforto de aquecimento de 21 °C para 21.5 °C | Todas as referências usam 21.5 °C, inclusive por meio do modelo. Alvos noturnos permanecem 17 °C. |

Guardar o modelo não guarda também um rascunho aberto de Perfil sem relação com ele. Guardar uma predefinição não guarda um rascunho de programação sem relação. Cada recurso tem o seu próprio controlo de gravação.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Inverno e verão com um conjunto de horários

**Situação:** um aparelho de ar condicionado aquece no inverno e arrefece no verão. Os horários da casa permanecem iguais, mas os alvos e ações mudam.

Crie **Dia útil** com blocos às 07:00 e 23:00. Crie as predefinições abaixo e use **Apenas horários** ao associar a segunda-feira da sala em Predefinição e nos dois Perfis:

| Horário partilhado | Atribuição em Predefinição | Atribuição no Perfil Inverno | Atribuição no Perfil Verão |
|---|---|---|---|
| 07:00 | Conforto habitual: Aquecer, 20 °C | Conforto de inverno: Aquecer, 21 °C | Conforto de verão: Arrefecer, 25 °C |
| 23:00 | Desligar manual | Noite de inverno: Aquecer, 17 °C | Predefinição Desligar |

Para configurar um Perfil, selecione **Programações de perfil**, crie o Perfil e defina a sala como **Cronograma de perfil**. Selecione o dia, escolha **Dia útil → Apenas horários** e configure as suas atribuições. Guarde o Perfil completo. Em Predefinição, guarde separadamente cada dia editado.

Mover o horário da manhã do modelo para 07:30 move as três programações. Alterar o alvo próprio do modelo não muda essas atribuições. Editar **Conforto de inverno** afeta as suas referências, inclusive o Perfil Inverno, mas não transforma o alvo de arrefecimento do Verão em aquecimento.

O Perfil selecionado continua a determinar qual semana executa. O Home Assistant pode selecionar Inverno ou Verão pelas ações existentes de Perfil; o modelo não decide a estação. Por exemplo, após criar um Perfil com ID de automação `summer`, esta ação o seleciona:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Para voltar às programações predefinidas guardadas:

```yaml
action: velair.deactivate_profile
```

Utilize o **ID de automação** mostrado no Perfil, que pode ser diferente do nome apresentado. Consulte [Perfis climáticos](climate-profiles.pt-pt.md) para Modos e regras de ativação.

Para tempo ameno, um dispositivo controlado localmente pode ter um Perfil separado com comportamento **Pausa → Desligar a climatização**. Uma automação pode selecioná-lo. Isso difere de um bloco Desligar programado: uma zona pausada não volta a seguir blocos posteriores. Pausa não está disponível para zonas controladas externamente; valem as ações de programação aceites pelo fornecedor.

Limites de previsão meteorológica, verificações periódicas de temperatura exterior, notificações de janelas e atrasar o desligamento noturno continuam a ser decisões das automações do Home Assistant. Predefinições e ligações não acrescentam essas regras ao Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Copiar um dia e personalizar o quarto de hóspedes

**Situação:** o quarto de hóspedes deve começar por Dia útil em casa, mas os visitantes querem aquecimento no pequeno-almoço às 08:00, em vez de 07:00.

Em Programações, selecione o quarto de hóspedes e o dia. Mantenha **Origem dos horários → Programação própria** e escolha **Dia útil em casa** no seletor separado **Modelos** para copiar os blocos. Altere a manhã para 08:00 e guarde. O dia é independente do modelo. Mover Dia útil em casa depois para 07:30 não move o bloco das 08:00 do quarto.

Se o bloco copiado usa **Conforto de aquecimento**, continua a referenciar essa predefinição. Editá-la para 21.5 °C também muda o alvo do quarto de hóspedes. Ser independente de um modelo não significa ser independente de uma predefinição.

Para manter o quarto a 20 °C independentemente de futuras edições, abra Configurações adicionais do bloco, escolha **Sem preset do Velair**, edite o alvo manual para 20 °C e guarde. Remover primeiro a predefinição preserva os ajustes efetivos; não esvazia o bloco.

Clonar um dia difere de copiar blocos da biblioteca: preserva a ligação de modelo do dia de origem. Por exemplo, clone uma segunda-feira que segue **Dia útil em casa → Horários e definições** para terça-feira. Os dois dias agora seguem Dia útil em casa; mudar o seu início de 07:00 para 07:30 atualiza ambos.

Com **Apenas horários**, a clonagem mantém a mesma ligação e copia as suas atribuições, inclusive predefinições. Depois, pode mudar as atribuições da terça sem alterar as da segunda, enquanto ambas acompanham os horários do modelo.

Também é possível clonar segunda-feira para segunda-feira noutro termóstato. O destino mantém o mesmo tipo de ligação se compatível; outros dias mantêm as suas definições. Se uma predefinição partilhada de Aquecer não puder ser usada num dispositivo apenas de arrefecimento, a clonagem é rejeitada em vez de remover silenciosamente a ligação. Predefinição valida todos os destinos selecionados juntos. Nos Perfis, clonar atualiza apenas o rascunho validado até guardar o Perfil.

Para uma terça independente, clone e escolha **Desvincular** antes de guardar. O dia mantém os seus ajustes atuais e predefinições ligadas, mas deixa de acompanhar o modelo. **Copiar blocos** da biblioteca continua a ser uma operação independente.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Alterar uma ligação preservando o rascunho desejado

**Situação:** segunda-feira está ligada a Dia útil em casa. Pretende personalizar essa segunda sem alterar os demais dias ligados.

| Escolha | Resultado no rascunho |
|---|---|
| Mudar **Horários e definições** para **Apenas horários** | Manter os ajustes atuais do modelo como atribuições próprias do dia, inclusive predefinições. Horários ainda acompanham o modelo. |
| Mudar **Apenas horários** para **Horários e definições** | Confirmar a substituição das atribuições pelos ajustes do modelo. Cancelar mantém a seleção e o rascunho originais. |
| Escolher outro modelo | Confirmar a substituição do rascunho. Cancelar mantém o modelo e ajustes atuais. |
| Usar **Desvincular** | Manter horários e ajustes do rascunho como dia independente, inclusive predefinições. |
| Escolher **Programação própria** | Confirmar o descarte das edições do dia e restaurar o dia guardado como rascunho independente. |

Essas operações não guardam automaticamente. Guarde o dia Predefinição ou o Perfil completo quando estiver pronto.

Para uma diferença concreta, suponha que a segunda-feira guardada tenha um bloco independente às 09:00 a 20 °C. Seleciona um modelo que começa às 08:00 e ajusta a sua atribuição apenas de horários para 21 °C, sem guardar:

- **Desvincular** mantém 08:00 e 21 °C no rascunho independente.
- **Programação própria** restaura 09:00 e 20 °C guardados.

Se a segunda-feira guardada já estava ligada, Programação própria usa os valores atuais desse dia guardado e os torna independentes. Não recupera uma programação manual anterior à criação da ligação.

Transformar um dia ligado em independente usa valores adaptados ao termóstato. Por exemplo, um alvo manual partilhado de 18.3 °C pode aparecer como 18.5 °C num dispositivo com passos de 0.5 °C. Após Desassociar, esse alvo manual permanece 18.5 °C. Um bloco com predefinição mantém a sua referência a ela. Nenhuma operação altera a biblioteca partilhada.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Adicionar um bloco ao meio-dia a um modelo partilhado

**Situação:** Dia útil já tem blocos às 07:00 e 23:00. Adicione 12:00 com Aquecer manual a 18 °C. Divisões e Perfis diferentes usam esse modelo.

<a id="a-compatible-hours-only-destination"></a>
### Destino compatível ligado apenas pelos horários

Se o destino aceita Aquecer a 18 °C, o Velair propõe copiar essa configuração para a sua nova atribuição de 12:00. Reveja em **Dias associados** e guarde o modelo.

Apenas o horário permanece partilhado. Alterar depois o alvo das 12:00 do modelo para 19 °C não muda essa atribuição. Se o novo bloco fizer referência a uma predefinição compatível, a atribuição mantém essa referência; edições posteriores da predefinição continuam a ser propagadas.

<a id="an-incompatible-hours-only-destination"></a>
### Destino incompatível ligado apenas pelos horários

Suponha que outro termóstato tenha temperatura-alvo mínima de 19 °C. A sua atribuição existente das 07:00 usa a predefinição válida **Conforto do escritório: Aquecer, 21 °C**. O novo alvo de 18 °C é incompatível, então o Velair procura uma atribuição guardada no dia desse mesmo termóstato:

1. Um bloco exatamente às 12:00, se existia antes da edição.
2. Blocos anteriores, começando pelo mais próximo.
3. Blocos posteriores, começando pelo mais próximo.

Neste caso, propõe Conforto do escritório das 07:00. Dias associados identifica a alternativa e a sua origem. Pode aceitá-la ou escolher outra atribuição válida antes de guardar. A sua predefinição continua ligada.

Um bloco de origem incompatível é ignorado. Um bloco movido ou eliminado nesta edição ainda pode fornecer a atribuição previamente guardada; outro recém-adicionado não pode. Se não houver origem válida, Dias associados mostra uma atribuição pendente. Complete-a manualmente ou escolha uma predefinição compatível; nada é guardado enquanto houver pendências.

<a id="a-completely-linked-destination"></a>
### Destino com ligação completa

Para **Horários e definições**, o novo bloco das 12:00 vem diretamente do modelo. Não há alternativa baseada nos ajustes antigos da divisão.

Se o alvo de 18 °C do modelo for incompatível com qualquer destino completo, toda a gravação fica bloqueada. Altere o alvo para um valor aceite por todos ou mude o destino afetado para Apenas horários ou um dia independente e guarde essa mudança primeiro.

A verificação inclui Perfis inativos e programações predefinidas ocultas por outro Perfil ativo. Até concluir uma gravação válida, todos os destinos guardados mantêm a programação anterior.

<a id="move-or-remove-an-existing-block"></a>
### Mover ou remover um bloco existente

Mover 07:00 para 07:30 preserva a atribuição da manhã de cada destino apenas de horários; não a substitui pelo alvo do modelo. Destinos completos acompanham o modelo atualizado. Remover um bloco remove atribuições correspondentes apenas de horários e o bloco correspondente das ligações completas na mesma gravação.

Um bloco tem identidade estável. Eliminá-lo e adicionar outro no mesmo horário cria um novo bloco; isso não é tratado como mover o original.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Entender as utilizações antes de editar ou eliminar

**Situação:** a predefinição Conforto de aquecimento está selecionada em:

- Um bloco de Dia útil em casa.
- Um bloco Predefinição independente na sexta-feira.
- Uma atribuição apenas de horários em um Perfil Inverno.

A predefinição tem **três referências diretas**. Se mais dois dias usarem Dia útil em casa com Horários e definições, herdarão a predefinição pelo modelo. Aparecem como destinos afetados adicionais, sem aumentar a contagem direta para cinco.

Editar a predefinição afeta todas essas referências e destinos herdados. Todos precisam de ser compatíveis para guardar. Uma predefinição referenciada por um modelo não pode ser eliminada mesmo se ele não tiver dias ligados: remova primeiro a referência no modelo.

A contagem **Dias associados** de um modelo significa outra coisa. Vincular segunda e terça cria dois dias ligados. Copiar para sexta não cria ligação nem aumenta a contagem. Cópias não são acompanhadas como usos do modelo.

Elimine um modelo apenas após desassociar todos seus dias guardados em Predefinição e Perfis. Editar nome, horários ou ajustes mantém a sua posição na biblioteca.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. O que acontece enquanto uma programação está ativa?

Suponha que a sala siga automaticamente Conforto de aquecimento a 21 °C. Guardar essa predefinição a 21.5 °C atualiza a intenção ativa de controlo. O dispositivo físico ainda precisa de aceitar a ação; guardar não comprova que a divisão aqueceu.

Se a sala tiver um Reforço a 23 °C, editar a predefinição não o cancela. Ao expirar, o Velair usa a configuração atual da programação. Pausas e Ajuste manual também mantêm a sua autoridade. Ativar um Perfil é uma ação separada: cancela Reforços nas zonas afetadas, enquanto pausas globais e por zona continuam prioritárias. Consulte [Regras de autoridade dos Perfis](climate-profiles.pt-pt.md).

Se Inverno fornece a sua própria semana, editar Predefinição não substitui a sua programação ativa. Voltar a Predefinição usa os ajustes Predefinição guardados mais recentes. Um Perfil configurado para **Programação padrão** herda ligações e predefinições de Predefinição, em vez de armazenar outra cópia.

Um dia vazio não desliga implicitamente a climatização. Um bloco noturno de sexta às 23:00 continua em um sábado vazio até começar outro bloco programado. Adicione um bloco Desligar explícito se essa for a ação desejada.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Opções do dispositivo, arrefecimento e intervalos de temperatura

**Situação:** um aparelho de ar condicionado do quarto disponibiliza a predefinição nativa `sleep` e a ventoinha `quiet`. Pretende ambos às 23:00 com arrefecimento a 25 °C.

Crie uma predefinição do Velair chamada **Noite de verão no quarto** com Arrefecer, 25 °C, Predefinição do dispositivo `sleep` e Modo da ventoinha `quiet`. Selecione-a no bloco das 23:00 pelas Configurações adicionais. **Predefinição do Velair** é a configuração partilhada; **Predefinição do dispositivo** é um comando dentro dela. O resumo mostra alvo, modo e ambas as opções juntos.

Em um destino compatível com essas opções, o indicador de ajustes conta três: uma ligação do Velair mais duas opções do dispositivo. Temperatura e modo HVAC não entram nessa contagem. Uma opção omitida não é redefinida: remover `quiet` da configuração partilhada deixa de enviar um comando à ventoinha, em vez de atribuir outro valor.

Para outra rotina, crie **Apenas ventoinha silenciosa** só com a opção de ventoinha, sem alvo ou modo HVAC. Uma referência programada envia essa configuração sem pedir mudança de modo ou ligar um dispositivo desligado. Não tem alvo para Pré-condicionamento ou Room Assist. Copiada para um termóstato sem controlo de ventoinha, ficaria vazia e seria rejeitada.

Um dispositivo com intervalo nativo Aquecer/arrefecer pode utilizar uma predefinição **Intervalo em casa** com Aquecer/arrefecer, limite inferior de 19 °C e superior de 24 °C. Ambos aparecem nas colunas do alvo e vêm da mesma predefinição. Alterar o superior para 25 °C atualiza as referências mantendo o inferior. Um termóstato de temperatura única não pode utilizar esse intervalo; o Velair não inventa um alvo escalar nem limite ausente. Use uma predefinição compatível separada para ele.

Predefinições apenas de modo selecionam HVAC sem temperatura nem opções adicionais. Uma predefinição Desligar solicita desligamento, sem alvo ou opções extras. Essas ações mantêm a sua semântica existente quando referenciadas em um modelo; partilhá-las não acrescenta controlo contínuo de temperatura.

<a id="troubleshooting-shared-configurations"></a>
## Resolução de problemas nas definições partilhadas

| O que aparece | O que conferir ou fazer |
|---|---|
| Um horário bloqueado | O dia acompanha horários de modelo. Edite o modelo ou use Desassociar. |
| Modo e alvo também bloqueados | O dia acompanha o modelo completo ou o bloco usa uma predefinição. Edite a origem partilhada. |
| Um dia copiado ainda muda de temperatura | Manteve uma referência a predefinição. Escolha Sem preset do Velair para tornar o bloco manual. |
| Edição de modelo falha embora a divisão ativa pareça válida | Verifique Dias associados para Perfis inativos, dias Predefinição ocultos e outros termóstatos. |
| Novo horário ligado está pendente | Escolha configuração manual válida ou predefinição em Dias associados. |
| Permanece um erro de fornecedor relativo à semana completa | Resolva grelha de horários, ações aceites ou limite de blocos do fornecedor. Escolher um bloco de origem não resolve essas restrições. |
| Compatibilidade passa, mas guardar falha | A verificação testou um termóstato. Guardar valida todos os destinos reais guardados. |
| Botão de eliminação desativado | Remova primeiro todas as referências guardadas; modelos podem referenciar predefinições sem dias ligados. |
| Outra sessão alterou a configuração | Atualize a configuração e reveja o rascunho preservado antes de tentar novamente. |
| Pré-visualização falha ou continua a carregar | Mantenha o rascunho e tente novamente. O Velair não presume ajustes nem remove referências para conseguir guardar. |

Opções adicionais incompatíveis podem ser filtradas da configuração efetiva de um destino. Alvos fora dos limites e modos incompatíveis são rejeitados. Uma ação apenas de opções não pode ficar vazia após filtrar. Controladores externos impõem restrições adicionais; publicar uma programação nunca faz a execução passar para o controlo local.

<a id="back-up-the-whole-setup"></a>
## Criar uma cópia de segurança de toda a configuração

Use a exportação do Velair em vez de copiar apenas um dia visível com os valores efetivos. Exportações do modelo 16 preservam ambos os tipos de ligação, predefinições e identidades de blocos. Exportar programações ou Perfis inclui modelos e predefinições de que dependem; o ecrã mostra as secções adicionadas automaticamente.

Na importação, examine as substituições antes de confirmar. Substituir um recurso partilhado também pode afetar usos locais existentes. A configuração combinada precisa de ser válida; novos Perfis não são ativados só porque foram importados. Cópias de segurança antigas continuam importáveis, mas versões antigas do Velair não podem importar uma exportação de modelo 16. Consulte [Portabilidade](usage.pt-pt.md#portability).
