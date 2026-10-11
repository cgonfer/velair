# Seasonal climate selection blueprint changelog

## 1.0.0 - Velair 1.9.0-beta.1

- Initial version of Seasonal climate selection.
- Runs configurable winter, mild-weather, or summer actions after a changed temperature sensor value remains stable for the selected delay.
- Supports Celsius/Fahrenheit comparison and immediate persistent notifications in all Velair-supported languages for invalid readings or configuration.
- Provides a concise configuration description, explicit threshold-unit selection, and a separate diagnostic-notification language choice.
- Startup checks diagnostics only; native pending timers are not recovered after restart or reload.
