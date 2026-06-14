"""Config flow for Velair."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import ConfigFlowResult, OptionsFlowWithReload
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP, CONF_CLIMATE_ENTITIES, DOMAIN


class VelairConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Velair."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return VelairOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")

        errors: dict[str, str] = {}

        if user_input is not None:
            climate_entities = user_input.get(CONF_CLIMATE_ENTITIES, [])
            if not climate_entities:
                errors[CONF_CLIMATE_ENTITIES] = "no_climate_entities"
            else:
                return self.async_create_entry(
                    title="Velair",
                    data={
                        CONF_CLIMATE_ENTITIES: climate_entities,
                        CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: user_input.get(
                            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
                            False,
                        ),
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=_climate_entities_schema(),
            errors=errors,
        )


class VelairOptionsFlow(OptionsFlowWithReload):
    """Handle options for Velair."""

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Manage integration options."""
        errors: dict[str, str] = {}

        if user_input is not None:
            climate_entities = user_input.get(CONF_CLIMATE_ENTITIES, [])
            if not climate_entities:
                errors[CONF_CLIMATE_ENTITIES] = "no_climate_entities"
            else:
                return self.async_create_entry(
                    data={
                        CONF_CLIMATE_ENTITIES: climate_entities,
                        CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: user_input.get(
                            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
                            False,
                        ),
                    }
                )

        current_climate_entities = self.config_entry.options.get(
            CONF_CLIMATE_ENTITIES,
            self.config_entry.data.get(CONF_CLIMATE_ENTITIES, []),
        )
        apply_on_startup = self.config_entry.options.get(
            CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
            self.config_entry.data.get(CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP, False),
        )

        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                _climate_entities_schema(),
                {
                    CONF_CLIMATE_ENTITIES: current_climate_entities,
                    CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP: apply_on_startup,
                },
            ),
            errors=errors,
        )


def _climate_entities_schema() -> vol.Schema:
    """Return the climate entity selector schema."""
    return vol.Schema(
        {
            vol.Required(CONF_CLIMATE_ENTITIES): selector.EntitySelector(
                selector.EntitySelectorConfig(
                    domain="climate",
                    multiple=True,
                )
            ),
            vol.Optional(
                CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP,
                default=False,
            ): selector.BooleanSelector(),
        }
    )
