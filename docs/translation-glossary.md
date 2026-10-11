# Documentation translation glossary

Use these terms consistently when translating Velair user documentation. Keep Home Assistant entity IDs, service names, attributes, YAML keys, code samples, and external URLs unchanged. Interface labels may be translated to match the maintained locale; identifiers such as `Room Assist`, `Humidex`, and `HVAC` remain recognizable.

| English | Spanish | French |
| --- | --- | --- |
| sidebar panel | panel de la barra lateral | panneau de la barre latérale |
| climate entity | entidad de climatización | entité climatique |
| managed climate | equipo de climatización gestionado | équipement climatique géré |
| scheduler | programador | planificateur |
| schedule | horario / programación | horaire / programmation |
| schedule block | bloque del horario | bloc horaire |
| target temperature | temperatura objetivo | température cible |
| target range | intervalo de temperaturas objetivo | plage de températures cibles |
| heating | calefacción | chauffage |
| cooling | refrigeración | refroidissement |
| climate profile | perfil climático | profil climatique |
| Mode | Modo | Mode |
| climate preset | preset climático | préréglage climatique |
| linked template | plantilla vinculada | modèle lié |
| times only | solo horarios | horaires uniquement |
| times and settings | horarios y ajustes | horaires et réglages |
| Boost | Refuerzo | Forçage |
| Pause | Pausa | Pause |
| Manual adjustment | ajuste manual | réglage manuel |
| Adaptive Preconditioning | Preacondicionamiento adaptativo | préconditionnement adaptatif (« Anticipation » / « Anticipation adaptative du confort » dans le panneau) |
| Planned Return | Regreso a casa | Retour prévu |
| One-off return | Regreso puntual | Retour ponctuel |
| household occupancy | ocupación del hogar | occupation du foyer |
| confirmed departure | salida confirmada | départ confirmé |
| away setup | configuración de ausencia | configuration d’absence |
| return setup | configuración de retorno | configuration de retour |
| Room Assist | Room Assist | Room Assist |
| Environmental Comfort | Confort ambiental | Confort environnemental |
| Environmental condition | Estado ambiental | Conditions ambiantes |
| relative humidity | humedad relativa | humidité relative |
| absolute humidity | humedad absoluta | humidité absolue |
| dew point | punto de rocío | point de rosée |
| freshness | vigencia de los datos | fraîcheur des données |
| stale reading | lectura desactualizada | relevé périmé |
| Diagnostics | Diagnóstico | Diagnostic |
| bounded history | historial limitado | historique limité |
| delivery evidence | evidencia de entrega de órdenes | preuve de transmission des commandes |
| troubleshooting | resolución de problemas | dépannage |
| read-only | de solo lectura | en lecture seule |
| local-first | con prioridad local | priorité au fonctionnement local |
| source of truth | fuente de referencia | source de référence |

English remains the canonical source. Synchronization and linguistic review are recorded separately for each guide. A blank glossary cell means the term is pending translation, not an English fallback copy.

Literal control names follow the interface even when a locale still displays an English label. Narrative wording may use a natural localized term and explain that label. Blueprint form labels remain English unless the blueprint itself provides a translation.

## German

| English | German |
| --- | --- |
| sidebar panel | Seitenleisten-Panel |
| climate entity | Klimaentität |
| managed climate | verwaltetes Klimagerät |
| scheduler | Zeitplaner |
| schedule | Zeitplan |
| schedule block | Zeitplanblock |
| target temperature | Zieltemperatur / Solltemperatur |
| target range | Solltemperaturbereich |
| heating | Heizen / Heizung |
| cooling | Kühlen / Kühlung |
| climate profile | Klimaprofil |
| Mode | Modus |
| climate preset | Klima-Preset |
| linked template | verknüpfte Vorlage |
| times only | Nur Zeiten |
| times and settings | Zeiten und Einstellungen |
| Boost | Temporäre Anpassung |
| Pause | Pause |
| Manual adjustment | Manuelle Anpassung |
| Adaptive Preconditioning | adaptive Vorkonditionierung |
| Planned Return | Geplante Rückkehr |
| One-off return | einmalige Rückkehr |
| household occupancy | Anwesenheit im Haushalt |
| confirmed departure | bestätigte Abwesenheit |
| away setup | Abwesenheitskonfiguration |
| return setup | Rückkehrkonfiguration |
| Room Assist | Room Assist |
| Environmental Comfort | Umgebungskomfort |
| Environmental condition | Umgebungszustand |
| relative humidity | relative Luftfeuchtigkeit |
| absolute humidity | absolute Luftfeuchtigkeit |
| dew point | Taupunkt |
| freshness | Aktualität der Daten |
| stale reading | veralteter Messwert |
| Diagnostics | Diagnose |
| bounded history | begrenzter Verlauf |
| delivery evidence | Übertragungsnachweise |
| troubleshooting | Fehlerbehebung |
| read-only | schreibgeschützt |
| local-first | vorrangig lokal |
| source of truth | maßgebliche Datenquelle |

The environmental-condition sensor is named **Raumklima** in the integration. **Lieferdiagnose** is the searchable delivery-sensor label; explanatory prose uses Übertragungsdiagnose. Adaptive Preconditioning also appears as Adaptive Komfortzeitplanung in the panel.

## Italian

| English | Italian |
| --- | --- |
| sidebar panel | pannello della barra laterale |
| climate entity | entità climatica |
| managed climate | dispositivo climatico gestito |
| scheduler | pianificatore |
| schedule | programmazione |
| schedule block | blocco della programmazione |
| target temperature | temperatura obiettivo |
| target range | intervallo di temperature obiettivo |
| heating | riscaldamento |
| cooling | raffrescamento |
| climate profile | profilo climatico |
| Mode | Modalità |
| climate preset | preset climatico |
| linked template | modello collegato |
| times only | Solo orari |
| times and settings | Orari e impostazioni |
| Boost | Incremento |
| Pause | Pausa |
| Manual adjustment | Regolazione manuale |
| Adaptive Preconditioning | Precondizionamento adattivo |
| Planned Return | Rientro pianificato |
| One-off return | rientro occasionale |
| household occupancy | presenza nell’abitazione |
| confirmed departure | partenza confermata |
| away setup | configurazione assenza |
| return setup | configurazione rientro |
| Room Assist | Room Assist |
| Environmental Comfort | Comfort ambientale |
| Environmental condition | Condizione ambientale |
| relative humidity | umidità relativa |
| absolute humidity | umidità assoluta |
| dew point | punto di rugiada |
| freshness | aggiornamento delle letture |
| stale reading | lettura non aggiornata |
| Diagnostics | Diagnostica |
| bounded history | cronologia limitata |
| delivery evidence | informazioni sull’invio dei comandi |
| troubleshooting | risoluzione dei problemi |
| read-only | sola lettura |
| local-first | priorità al funzionamento locale |
| source of truth | fonte di riferimento |

The Planned Return selector uses **Ritorno programmato**, while history uses **Rientro pianificato**. Boost also appears as **Potenziamento** in some climate-card controls. The panel uses **Raffreddamento** for cooling and **Freschezza dei dati** for data freshness; explanatory prose may use raffrescamento and aggiornamento delle letture. The delivery sensor is named **Diagnostica consegna di {zone}**.

## Dutch

| English | Dutch |
| --- | --- |
| sidebar panel | zijbalkpaneel |
| climate entity | klimaatentiteit |
| managed climate | beheerd klimaatapparaat |
| scheduler | planner |
| schedule | schema / planning |
| schedule block | schemablok |
| target temperature | doeltemperatuur |
| target range | doeltemperatuurbereik |
| heating | verwarmen / verwarming |
| cooling | koelen / koeling |
| climate profile | klimaatprofiel |
| Mode | Modus |
| climate preset | klimaatpreset |
| linked template | gekoppeld sjabloon |
| times only | Alleen tijden |
| times and settings | Tijden en instellingen |
| Boost | Tijdelijke aanpassing |
| Pause | Pauzeren / pauze |
| Manual adjustment | Handmatige aanpassing |
| Adaptive Preconditioning | adaptieve voorconditionering |
| Planned Return | Geplande terugkeer |
| One-off return | eenmalige terugkeer (the corresponding routine heading remains `One-off return` in the maintained panel; narrative Dutch and the climate-card action may use the Dutch form) |
| household occupancy | aanwezigheid in het huishouden / bezetting van het huis |
| confirmed departure | bevestigd vertrek |
| away setup | afwezigheidsconfiguratie |
| return setup | terugkeerconfiguratie |
| Room Assist | Room Assist |
| Environmental Comfort | omgevingscomfort |
| Environmental condition | Omgevingsconditie |
| relative humidity | relatieve luchtvochtigheid |
| absolute humidity | absolute luchtvochtigheid |
| dew point | dauwpunt |
| freshness | actualiteit van gegevens |
| stale reading | verouderde meting |
| Diagnostics | diagnose / diagnostiek (the maintained tab label remains `Diagnostics`) |
| bounded history | begrensde geschiedenis |
| delivery evidence | gegevens over opdrachtuitvoering / bewijs van opdrachtacceptatie |
| troubleshooting | problemen oplossen |
| read-only | alleen-lezen |
| local-first | met lokale werking als uitgangspunt |
| source of truth | leidende gegevensbron |

The delivery sensor is named **Leveringsdiagnose van {zone}**. The general Boost label is **Tijdelijke aanpassing**; some climate-card controls still use Versterking.

## Polish

| English | Polish |
| --- | --- |
| sidebar panel | panel boczny |
| climate entity | encja klimatu |
| managed climate | zarządzane urządzenie klimatyczne / zarządzana encja klimatu |
| scheduler | mechanizm harmonogramów |
| schedule | harmonogram |
| schedule block | blok harmonogramu |
| target temperature | temperatura docelowa |
| target range | zakres temperatur docelowych |
| heating | ogrzewanie |
| cooling | chłodzenie |
| climate profile | Profil klimatyczny |
| Mode | Tryb |
| climate preset | Preset klimatyczny |
| linked template | powiązany szablon |
| times only | Tylko godziny |
| times and settings | Godziny i ustawienia |
| Boost | Wzmocnienie |
| Pause | Pauza |
| Manual adjustment | Regulacja ręczna (etykieta panelu); sterowanie ręczne (opis działania) |
| Adaptive Preconditioning | adaptacyjne przygotowanie temperatury (opis); Przygotowanie wstępne / Adaptacyjny czas komfortu (etykiety panelu) |
| Planned Return | Planowany powrót |
| One-off return | jednorazowy powrót |
| household occupancy | obecność domowników |
| confirmed departure | potwierdzone wyjście |
| away setup | konfiguracja nieobecności |
| return setup | konfiguracja powrotu |
| Room Assist | Room Assist |
| Environmental Comfort | Komfort otoczenia |
| Environmental condition | Warunki otoczenia |
| relative humidity | wilgotność względna |
| absolute humidity | wilgotność bezwzględna |
| dew point | punkt rosy |
| freshness | aktualność danych (opis); Świeżość danych (etykieta panelu) |
| stale reading | nieaktualny odczyt |
| Diagnostics | Diagnostyka |
| bounded history | ograniczona historia |
| delivery evidence | potwierdzenie przekazania poleceń |
| troubleshooting | rozwiązywanie problemów |
| read-only | tylko do odczytu |
| local-first | działający przede wszystkim lokalnie |
| source of truth | źródło odniesienia |

The Planned Return selector uses **Planowany powrót**, while history uses **Zaplanowany powrót**. The data-freshness section is labelled **Świeżość danych**. A separate indoor room sensor is a czujnik pokojowy; czujnik temperatury zewnętrznej denotes an outdoor sensor.

## Brazilian Portuguese

| English | Brazilian Portuguese |
| --- | --- |
| sidebar panel | painel da barra lateral |
| climate entity | entidade de climatização |
| managed climate | equipamento de climatização gerenciado |
| scheduler | agendador |
| schedule | programação |
| schedule block | bloco da programação |
| target temperature | temperatura-alvo |
| target range | faixa de temperaturas-alvo |
| heating | aquecimento |
| cooling | resfriamento |
| climate profile | Perfil climático |
| Mode | Modo |
| climate preset | predefinição climática |
| linked template | modelo vinculado |
| times only | Somente horários |
| times and settings | Horários e configurações |
| Boost | Reforço |
| Pause | Pausa |
| Manual adjustment | Ajuste manual |
| Adaptive Preconditioning | Pré-condicionamento adaptativo |
| Planned Return | Retorno planejado |
| One-off return | retorno pontual (« One-off return » na interface) |
| household occupancy | presença na casa / ocupação da casa |
| confirmed departure | saída confirmada |
| away setup | configuração de ausência |
| return setup | configuração de retorno |
| Room Assist | Room Assist |
| Environmental Comfort | Conforto ambiental |
| Environmental condition | Condição ambiental |
| relative humidity | umidade relativa |
| absolute humidity | umidade absoluta (« Absolute humidity » na interface) |
| dew point | ponto de orvalho (« Dew point » na interface) |
| freshness | atualização das leituras |
| stale reading | leitura desatualizada |
| Diagnostics | Diagnóstico |
| bounded history | histórico limitado |
| delivery evidence | evidências de envio de comandos |
| troubleshooting | solução de problemas |
| read-only | somente leitura / apenas para consulta |
| local-first | com prioridade ao funcionamento local |
| source of truth | fonte de referência |

## European Portuguese

| English | European Portuguese |
| --- | --- |
| sidebar panel | painel da barra lateral |
| climate entity | entidade de climatização |
| managed climate | equipamento de climatização gerido |
| scheduler | programador / agendador |
| schedule | programação |
| schedule block | bloco da programação |
| target temperature | temperatura-alvo |
| target range | intervalo de temperaturas-alvo |
| heating | aquecimento |
| cooling | arrefecimento |
| climate profile | Perfil climático |
| Mode | Modo |
| climate preset | predefinição climática |
| linked template | modelo associado / modelo ligado |
| times only | Apenas horários |
| times and settings | Horários e definições |
| Boost | Reforço |
| Pause | Pausa |
| Manual adjustment | Ajuste manual |
| Adaptive Preconditioning | Pré-condicionamento adaptativo |
| Planned Return | Regresso planeado |
| One-off return | regresso pontual |
| household occupancy | ocupação do agregado familiar |
| confirmed departure | saída confirmada |
| away setup | configuração de ausência |
| return setup | configuração de regresso |
| Room Assist | Room Assist |
| Environmental Comfort | Conforto ambiental |
| Environmental condition | Condição ambiental |
| relative humidity | humidade relativa |
| absolute humidity | humidade absoluta |
| dew point | ponto de orvalho |
| freshness | atualidade das leituras |
| stale reading | leitura desatualizada |
| Diagnostics | Diagnóstico |
| bounded history | histórico limitado |
| delivery evidence | evidências de envio |
| troubleshooting | resolução de problemas |
| read-only | apenas de leitura |
| local-first | funcionamento prioritariamente local |
| source of truth | fonte de referência |

Some existing interface labels use other Portuguese variants: **Cronograma de perfil**, **Programação padrão**, **Configurações adicionais** and **Sem preset do Velair**. Guides preserve these literal control names while explanatory prose uses European Portuguese. The freshness section is labelled **Atualização de dados**, and the delivery sensor uses **Diagnóstico de entrega**. A sensor separado da divisão measures indoors; sensor exterior denotes an outdoor sensor.

## Russian

| English | Russian |
| --- | --- |
| sidebar panel | панель в боковом меню |
| climate entity | климатическая сущность |
| managed climate | управляемое климатическое устройство |
| scheduler | планировщик |
| schedule | расписание |
| schedule block | блок расписания |
| target temperature | целевая температура |
| target range | диапазон целевых температур |
| heating | отопление / обогрев |
| cooling | охлаждение |
| climate profile | климатический профиль |
| Mode | Режим |
| climate preset | климатический пресет |
| linked template | связанный шаблон |
| times only | Только время |
| times and settings | Время и настройки |
| Boost | Форсированный режим |
| Pause | Пауза |
| Manual adjustment | Ручная настройка |
| Adaptive Preconditioning | адаптивная предварительная подготовка («Предварительный прогрев» / «Адаптивное время достижения комфорта» в панели) |
| Planned Return | Запланированное возвращение |
| One-off return | разовое возвращение («One-off return» в панели) |
| household occupancy | присутствие в доме |
| confirmed departure | подтверждённый уход |
| away setup | настройки отсутствия («Away setup» в панели) |
| return setup | настройки возвращения («Return setup» в панели) |
| Room Assist | Room Assist |
| Environmental Comfort | Комфорт окружающей среды |
| Environmental condition | Состояние окружающей среды |
| relative humidity | относительная влажность |
| absolute humidity | абсолютная влажность |
| dew point | точка росы |
| freshness | актуальность данных |
| stale reading | устаревшее показание |
| Diagnostics | Диагностика |
| bounded history | ограниченная история |
| delivery evidence | данные об отправке команд |
| troubleshooting | устранение неполадок |
| read-only | только для чтения |
| local-first | с приоритетом локальной работы |
| source of truth | единый источник достоверных данных |
