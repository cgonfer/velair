# Seasonal climate selection blueprint changelog

## 1.1.0 - Velair 1.9.0-beta.4

- Confirm a continuous winter, mild-weather, or summer range instead of an unchanged temperature value. Updates within the range preserve the original deadline.
- Run actions once per range entry; subsequent readings in the same range do not repeat them. Leaving and returning requires a fresh confirmation.
- Invalid readings cancel confirmation; value or unit recovery starts a full new wait. A deleted and recreated entity establishes a baseline without selecting a season; a subsequent range transition is required. Startup and reload do not select a season or restore timers; a range transition or sensor recovery is needed afterward.
- Replaces the beta behavior at the existing URL without a legacy behavior option. Existing input names are retained.

## 1.0.0 - Velair 1.9.0-beta.1

- Initial version of Seasonal climate selection.
- Runs configurable winter, mild-weather, or summer actions after a changed temperature sensor value remains stable for the selected delay.
- Supports Celsius/Fahrenheit comparison and immediate persistent notifications in all Velair-supported languages for invalid readings or configuration.
- Provides a concise configuration description, explicit threshold-unit selection, and a separate diagnostic-notification language choice.
- Startup checks diagnostics only; native pending timers are not recovered after restart or reload.
