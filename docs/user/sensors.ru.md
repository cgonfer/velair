<a id="velair-sensor-reference"></a>
# Справочник датчиков Velair
<!-- velair-docs:start -->
Переводы: [Оригинал на английском](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Статус переводов](../translation-status.md)

<details>
<summary>Статус этого перевода</summary>

| Сведения | Статус |
| --- | --- |
| Версия для сверки | 1.9.0-beta.1 |
| Последняя синхронизация | 2026-10-11 |
| Языковая проверка | Перевод с помощью ИИ |
| Соответствие оригиналу | Соответствует актуальному английскому оригиналу. |

</details>

---
<!-- velair-docs:end -->

Velair создаёт сущности Home Assistant, чтобы панели и автоматизации могли получать текущее состояние планировщика, Комфорта, отправки команд и отдельных устройств без открытия панели Velair.

ID сущностей здесь приведены для примера. Home Assistant может добавлять суффиксы или позволять переименование, поэтому используйте фактические ID из собственного реестра сущностей.

<a id="quick-guide"></a>
## Краткий справочник

| Сущность | Для чего создаётся | Основное назначение |
| --- | --- | --- |
| **Следующее запланированное событие** | Интеграция Velair | Показ следующего запланированного действия Velair. |
| **Состояние планировщика** | Интеграция Velair | Проверка простоя, работы по расписанию, паузы или переопределения. |
| **Состояние диагностики** | Интеграция Velair | Оповещения о текущей исправности Velair. |
| **Текущая целевая температура** | Каждое управляемое устройство | Показ текущей цели, принадлежащей Velair. |
| **Состояние окружающей среды** | Каждое управляемое устройство | Состояние Комфорта, качество данных, расчётные показатели и наружные условия. |
| **Возможность проветривания** | Каждое управляемое устройство | Автоматизации или показ осторожных подсказок об открытии окон. |
| **Качество воздуха** | Каждое управляемое устройство | Оценка CO2 независимо от температурного Комфорта. |
| **Переопределение зоны** | Каждое управляемое устройство | Показ активного форсированного режима или паузы. |
| **Управление зоной** | Каждое управляемое устройство | Кто управляет устройством: Velair, ручная настройка или внешнее выполнение. |
| **Диагностика доставки зоны** | Каждое управляемое устройство; отключена по умолчанию | Отладка или автоматизации по последнему результату локальной отправки команд. |
| **Начало предварительного прогрева** | Каждое управляемое устройство | Время раннего запуска, запланированного адаптивной подготовкой. |
| **Room Assist** | Каждое управляемое устройство | Текущее состояние Room Assist и сведения о применённой цели. |

Velair также создаёт сущности с возможностью записи, например **Автоматическое расписание** и **Режим**. Это элементы управления, а не датчики; см. [руководство по использованию](usage.ru.md#home-assistant-entities).

<a id="global-sensors"></a>
## Общие датчики

<a id="next-climate-event"></a>
### Следующее событие управления климатом

Пример ID сущности:

```text
sensor.velair_next_scheduled_event
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `entity_id` | Климатическая сущность первого события в это время. |
| `action` | `set_temperature`, `set_hvac_mode` или `turn_off`. |
| `hvac_mode` | Режим HVAC, который планирует использовать Velair, если применимо. |
| `temperature` | Одна целевая температура, если применимо. |
| `target_temp_low` / `target_temp_high` | Целевой диапазон, если применимо. |
| `weekday` / `start` | Источник блока расписания. |
| `when` | Фактическое время применения. |
| `target_when` | Исходное время достижения комфорта при раннем начале подготовки. |
| `event_count` | Число событий с одинаковым временем применения. |
| `events` | Сериализованный список всех событий с одинаковым временем применения. |

Пример:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### Текущее состояние расписания

Пример ID сущности:

```text
sensor.velair_current_schedule_state
```

Состояния:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `global_mode` | Текущий общий режим планировщика. |
| `paused_started_at` | Начало общей паузы, если применимо. |
| `paused_until` | Запланированное окончание общей паузы, если применимо. |

<a id="diagnostics-status"></a>
### Состояние диагностики

Пример ID сущности:

```text
sensor.velair_diagnostics_status
```

Состояния:

```text
ok
warning
error
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Краткие сведения о планировщике. |
| `units_ok` / `units_warning` / `units_error` | Число устройств по состоянию исправности. |
| `issue_count` | Общее число текущих проблем. |
| `warning_count` / `error_count` | Число активных предупреждений и ошибок. |
| `issue_codes` | Стабильные коды проблем для автоматизаций. |

Пример триггера:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Датчики отдельных устройств

Для управляемого устройства, например `climate.living_room`, Home Assistant обычно создаёт связанные ID, например `sensor.velair_control_living_room`. Используйте фактические ID своего реестра в панелях и автоматизациях.

<a id="zone-active-target-temperature"></a>
### Текущая целевая температура зоны

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `action` | Действие активной цели Velair. |
| `hvac_mode` | Режим HVAC, выбранный активным блоком или переопределением. |
| `temperature` | Одна активная целевая температура. |
| `target_temp_low` / `target_temp_high` | Активный диапазон для режимов, поддерживающих диапазон. |
| `weekday` / `start` | Источник активного блока в расписании. |
| `when` | Время применения активной цели. |
| `target_when` | Время достижения комфорта, если подготовка перенесла применение раньше. |

Для целей с диапазоном состояние датчика недоступно, поскольку единственного корректного значения температуры нет. Читайте `target_temp_low` и `target_temp_high`.

<a id="zone-environmental-condition"></a>
### Состояние окружающей среды зоны

Состояния:

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` или `unavailable`. |
| `data_issues` | Стабильные коды отсутствующих, устаревших, некорректных либо пригодных, но с непроверенной актуальностью показаний. |
| `range_summary` | Текущий результат относительно диапазонов Комфорта и сопоставление с Humidex. |
| `ventilation_opportunity` | Полные данные о возможности проветривания. |
| `comfort_zone` | Выбранная модель Комфорта и действующий диапазон влажности. |
| `temperature_source` / `humidity_source` | Сущности источников комнатных показаний. |
| `derived_metrics` | Данные включённых Humidex, точки росы и абсолютной влажности. |
| `outdoor` | Необязательное сравнение условий внутри и снаружи. |
| `insights` | Упорядоченные наблюдательные подсказки со стабильными кодами. |

Пример:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Полные данные Комфорта описаны в [Комфорте окружающей среды](comfort.ru.md) и [Датчиках управления зоной и отправки команд](zone-sensors.ru.md#environmental-condition).

<a id="zone-ventilation-opportunity"></a>
### Возможность проветривания зоны

Состояния:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `evaluation_scope` | Оценены температура, влажность или обе. |
| `reason` | Стабильный машиночитаемый код причины. |
| `data_quality` / `data_issues` | Качество сравнения с наружными условиями. |
| `outdoor_temperature_source` | Сущность источника наружной температуры. |
| `outdoor_humidity_source` | Сущность источника наружной влажности, если настроена. |
| `potential_effects` | Ожидаемые возможные эффекты наружного воздуха. |
| `blocked_by` | Условия, препятствующие более определённому выводу о возможности. |

Пример:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Датчик только наблюдает. Velair никогда не открывает окна и не меняет управление климатом по его данным.

<a id="zone-air-quality"></a>
### Качество воздуха зоны

Состояния:

```text
not_monitored
unavailable
good
elevated
poor
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `availability` | Доступность текущего показания CO2. |
| `co2_source` | Датчик CO2, используемый для оценки. |

<a id="zone-override-state"></a>
### Состояние переопределения зоны

Состояния:

```text
none
boost
paused
disabled
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `started_at` | Начало активного переопределения. |
| `until` | Запланированное завершение, если применимо. |
| `action` | Действие переопределения, если применимо. |
| `pause_id` | ID активной паузы при одной причине. |
| `pause_count` / `pause_ids` | Краткие сведения о нескольких паузах. |
| `manual` | Является ли пауза ручной настройкой. |

Используйте этот датчик для состояния форсированного режима и паузы. Для принадлежности управления — автоматической, ручной или внешней — используйте **Управление зоной**.

<a id="zone-control"></a>
### Управление зоной

Состояния:

```text
automatic
manual
external
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` или `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` или `profile_pause`. |
| `profile_id` / `profile_name` | Действующий профиль, управляющий зоной, если применимо. |
| `mode_id` / `mode_name` | Выбранный режим, если применимо. |
| `manual_source` | `explicit`, `external_change` или `other`, только при ручном управлении. |
| `manual_started_at` | Начало ручной настройки. |
| `manual_until` | Запланированное завершение ручной настройки, если применимо. |
| `manual_policy` | `until_next_block`, `for_duration` или `until_resumed`. |

Пример:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Диагностика доставки зоны

Эта диагностическая сущность отключена по умолчанию. Включите её в реестре сущностей Home Assistant, если панели или автоматизации нужны данные отправки команд во время работы.

Состояния:

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `updated_at` | Последнее обновление состояния отправки. |
| `retry_count` | Попытка, представленная текущим состоянием. |
| `last_error_at` / `last_error_code` | Последняя ошибка отправки без конфиденциальных подробностей. |
| `last_accepted_at` | Последнее принятие Home Assistant полной последовательности служб Velair. |
| `last_accepted_source` | `automatic`, `manual`, `boost` или `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` или `other`. |
| `last_accepted_hvac_mode` | Режим HVAC, принятый Home Assistant. |
| `last_accepted_temperature_unit` | Единица, записанная с принятой целью. |
| `last_accepted_temperature` | Принятая одиночная цель, если применимо. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Принятый диапазон, если применимо. |

Пример:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` означает принятие последовательности служб Home Assistant. Это не доказывает достижения цели физическим устройством.

<a id="zone-preconditioning-start"></a>
### Начало предварительной подготовки зоны

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `status` | `planned` или `active`. |
| `scheduled_for` | Исходное время комфорта блока. |
| `lead_minutes` | На сколько минут Velair перенёс начало раньше. |
| `direction` | Отопление или охлаждение. |
| `target_kind` / `target_boundary` | Сведения о прогнозе одной цели или границы диапазона. |
| `boundary_temperature` | Граница, используемая для прогноза. |
| `model_source` | Источник прогноза, выбранный Velair. |
| `target_temperature` | Одна целевая температура, если применимо. |
| `target_temp_low` / `target_temp_high` | Целевой диапазон, если применимо. |
| `hvac_mode` | Режим HVAC события предварительной подготовки. |

<a id="zone-room-assist-state"></a>
### Состояние Room Assist зоны

Состояния:

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Основные атрибуты:

| Атрибут | Значение |
| --- | --- |
| `room_temperature_entity_id` | Источник отдельного комнатного датчика. |
| `target_temperature` | Видимая цель расписания или переопределения. |
| `applied_temperature` | Цель, применённая Room Assist к устройству. |
| `applied_offset` | Текущая применённая поправка. |
| `calculated_temperature` | Рассчитанная цель до ограничений. |
| `assist_delta` | Активная величина коррекции, если больше нуля. |
| `scheduled_target_guard` | Защита от небезопасного изменения цели. |
| `hysteresis_phase` / `hysteresis_target` | Текущая фаза удерживающего диапазона. |
| `deadband_low` / `deadband_high` | Действующий диапазон удержания. |
| `target_temp_low` / `target_temp_high` | Видимая цель диапазона устройства. |
| `applied_target_temp_low` / `applied_target_temp_high` | Диапазон, отправленный после коррекции. |
| `climate_target_temp_low` / `climate_target_temp_high` | Текущий диапазон, сообщённый устройством. |
| `range_shift` | Текущий сдвиг диапазона, если применимо. |
| `direction` | Отопление или охлаждение. |
| `hvac_mode` | Режим HVAC корректируемой цели. |
| `active_from` / `target_when` | Временные сведения о корректируемом блоке. |

<a id="choosing-the-right-surface"></a>
## Выбор подходящего источника данных

| Вопрос | Что использовать |
| --- | --- |
| Что Velair планирует следующим? | **Следующее запланированное событие** |
| Velair на общей паузе или выполняет расписание? | **Состояние планировщика** |
| Velair работает исправно? | **Состояние диагностики** |
| Какая цель сейчас принадлежит Velair? | **Текущая целевая температура** |
| Комната комфортна, показания устарели или отсутствуют? | **Состояние окружающей среды** |
| Может ли наружный воздух помочь? | **Возможность проветривания** |
| Какова оценка CO2? | **Качество воздуха** |
| Устройство в форсированном режиме или на паузе? | **Переопределение зоны** |
| Кто сейчас управляет устройством? | **Управление зоной** |
| Принял ли Home Assistant последнюю команду Velair? | **Диагностика доставки зоны** |
| Когда начнётся предварительная подготовка? | **Начало предварительного прогрева** |
| Что применяет Room Assist? | **Room Assist** |

События удобнее, когда автоматизации нужно реагировать на переход и знать, что изменилось. Датчики удобнее, когда панели или автоматизации нужно текущее состояние, в том числе после перезапуска.
