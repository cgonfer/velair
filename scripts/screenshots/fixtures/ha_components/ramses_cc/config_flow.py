"""Create an explicitly synthetic controller only in disposable screenshot HA."""

from homeassistant.config_entries import ConfigFlow


class ScreenshotControllerFlow(ConfigFlow, domain="ramses_cc"):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")
        return self.async_create_entry(title="Screenshot virtual controller", data={})
