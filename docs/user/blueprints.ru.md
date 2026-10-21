<a id="automation-blueprints"></a>
# Шаблоны автоматизаций
<!-- velair-docs:start -->
Переводы: [Оригинал на английском](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Статус переводов](../translation-status.md)

<details>
<summary>Статус этого перевода</summary>

| Сведения | Статус |
| --- | --- |
| Версия для сверки | 1.9.0-beta.4 |
| Последняя синхронизация | 2026-10-21 |
| Языковая проверка | Перевод с помощью ИИ |
| Соответствие оригиналу | Соответствует актуальному английскому оригиналу. |

</details>

---
<!-- velair-docs:end -->

Velair оставляет управление присутствием, дверями, гостями и особыми условиями вашего дома в Home Assistant, не создавая второй механизм автоматизаций. Эти необязательные blueprint-шаблоны помогают настроить распространённые сценарии. Они работают полностью локально и реагируют на события.

Сам по себе импорт blueprint-шаблона ничего не меняет в Velair. Сначала Home Assistant добавляет многоразовый шаблон; затем вы создаёте на его основе автоматизацию и настраиваете её. Обновить шаблон для существующих автоматизаций можно повторным импортом. Действие **Take control** позволяет превратить автоматизацию в самостоятельную автоматизацию Home Assistant.

Пакеты интеграций HACS не копируют blueprint-шаблоны в каталог Home Assistant автоматически. Используйте ссылки для импорта ниже.

<a id="available-blueprints"></a>
## Доступные шаблоны

Шаблоны перечислены в алфавитном порядке их английских названий.

- [Дома и в отъезде по датчику присутствия](#home-and-away-from-occupancy)
- [Пауза зоны при открытых окнах](#pause-a-zone-while-windows-are-open)
- [Сезонный выбор режима климата](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Дома и в отъезде по датчику присутствия

Выполняет выбранные действия Home Assistant, когда одна сущность, объединяющая данные о присутствии, показывает, что дома кто-то есть или никого нет. Действия могут выбирать режим Velair, активировать профиль или согласовывать работу Velair с остальными системами дома. Уведомление с задержкой сообщает о недоступности данных о присутствии.

**Версия:** 1.0.0 · **Требуется:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.ru.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Открыть руководство по шаблону «Дома и в отъезде по датчику присутствия»"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Открыть Home Assistant и импортировать шаблон «Дома и в отъезде по датчику присутствия»" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Пауза зоны при открытых окнах

Приостанавливает одно или несколько устройств, управляемых Velair, пока хотя бы одно выбранное окно или дверь открыто. Затем возобновляет расписания только там, где активная пауза всё ещё принадлежит этой автоматизации. Уведомление Home Assistant с задержкой перечисляет недоступные контактные датчики и затронутые термостаты.

**Версия:** 1.0.0 · **Требуется:** Home Assistant 2024.6.0+ и Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.ru.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Открыть руководство по шаблону «Пауза зоны при открытых окнах»"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Открыть Home Assistant и импортировать шаблон «Пауза зоны при открытых окнах»" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Сезонный выбор режима климата

Выполняет настраиваемые действия для зимы, межсезонья или лета один раз после того, как температура остаётся в новом сезонном диапазоне в течение положительной задержки, первоначально 30 минут. Изменения внутри этого диапазона сохраняют срок ожидания и не повторяют действия. В стандартном редакторе действий можно выбрать режимы Velair или другие действия Home Assistant. Некорректные показания вызывают немедленное уведомление; при запуске проверяется диагностика, но сезон не выбирается.

Диагностические уведомления поддерживают те же языки, что и Velair. Язык явно выбирается в шаблоне.

**Версия:** 1.1.0 · **Требуется:** Home Assistant 2024.6.0+ · **Категория:** автоматизации по температуре и сезону

<p>
  <a href="blueprints/seasonal-climate-selection.ru.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Открыть руководство по шаблону сезонного выбора режима климата"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Открыть Home Assistant и импортировать шаблон сезонного выбора режима климата" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Открыть исходный YAML-файл шаблона сезонного выбора режима климата"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Общее поведение

- Шаблоны реагируют на изменения состояния и запуск Home Assistant; периодического опроса нет.
- Настраиваемые задержки отфильтровывают кратковременные изменения состояния.
- Состояния `unknown` и `unavailable` обрабатываются с осторожностью.
- Шаблон присутствия сообщает о длительной недоступности данных и удаляет предупреждение после восстановления.
- Шаблон окон сообщает о длительной недоступности контактных датчиков, не задерживая управление по датчикам, которые продолжают работать.
- Сезонный шаблон немедленно сообщает о некорректных показаниях температуры и никогда не выбирает сезон при запуске.
- Настройки шаблонов хранятся в Home Assistant, а не в хранилище Velair.
- Повторный импорт того же URL обновляет шаблон, используемый существующими автоматизациями.

На странице каждого шаблона описаны его требования, настройки, пример, защитные меры, ограничения и способы устранения неполадок.

<a id="versions-and-updates"></a>
## Версии и обновления

Шаблоны используют собственные семантические версии независимо от интеграции Velair. Ссылки для импорта намеренно ведут к текущей версии в `main`. Повторно импортируйте тот же URL, чтобы установить совместимое обновление для существующей автоматизации. Home Assistant не обновляет импортированные шаблоны автоматически.

Обновления в пределах версии 1 сохраняют существующие имена входных параметров; новые параметры имеют значения по умолчанию. Несовместимое изменение публикуется под новым именем файла и новой основной версией, а прежний URL остаётся доступным. Velair не проверяет и не преобразует автоматизации Home Assistant или данные `.storage`. Действие **Take control** делает автоматизацию независимой, но после этого она перестаёт получать обновления шаблона.
