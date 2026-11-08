"""Lifecycle and isolation of the common local/CI Linux renderer."""
from pathlib import Path
import json
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/quality"))
import browser


class BrowserServerTests(unittest.TestCase):
    def setUp(self):
        self.lock = json.loads((ROOT / "scripts/quality/environment.json").read_text())

    def test_version_and_immutable_official_image_must_match(self):
        browser.configuration(self.lock)
        for image in ("mcr.microsoft.com/playwright:latest", self.lock['browser']['image'].replace('1.62.1', '1.61.0'),
                      self.lock['browser']['image'].replace('mcr.microsoft.com', 'example.com')):
            with self.subTest(image=image), self.assertRaises(ValueError):
                browser.configuration({'browser': {**self.lock['browser'], 'image': image}})

    def test_loopback_server_has_no_host_mounts_and_is_removed_on_test_failure(self):
        calls = []
        def docker(*args, **kwargs):
            calls.append(args)
            if args[0] == 'port': return '127.0.0.1:40123'
            if args[0] == 'container': return 'present'
            if args[0] == 'inspect' and 'Labels' in args[2]: return 'a' * 32
            return 'sha256:renderer'
        with tempfile.TemporaryDirectory() as directory, patch.object(browser.uuid, 'uuid4') as uid, \
             patch.object(browser, 'docker', side_effect=docker), patch.object(browser, 'urlopen') as request:
            uid.return_value.hex = 'a' * 32
            request.return_value.__enter__.return_value.status = 200
            with self.assertRaisesRegex(RuntimeError, 'test failed'):
                with browser.server(self.lock, Path(directory)) as renderer:
                    self.assertEqual(renderer['endpoint'], 'ws://127.0.0.1:40123/')
                    self.assertTrue((Path(directory) / 'browser-state.json').exists())
                    raise RuntimeError('test failed')
            self.assertFalse((Path(directory) / 'browser-state.json').exists())
        run = next(args for args in calls if args[0] == 'run')
        self.assertIn('127.0.0.1::3000', run)
        self.assertIn('linux/amd64', run)
        self.assertNotIn('--mount', run)
        self.assertNotIn('/var/run/docker.sock', ' '.join(run))
        self.assertIn(('rm', '--force', 'velair-browser-' + 'a' * 32), calls)

    def test_foreign_container_is_never_removed_and_recovery_handle_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / 'browser-state.json'
            state.write_text(json.dumps({'run_id': 'a' * 32, 'container': 'velair-browser-' + 'a' * 32}))
            with patch.object(browser, 'docker', side_effect=['present', 'another-owner']) as command:
                with self.assertRaisesRegex(browser.HarnessError, 'ownership'):
                    browser.stop(state)
                self.assertTrue(state.exists())
                self.assertFalse(any(call.args[0] == 'rm' for call in command.call_args_list))

    def test_externally_published_server_is_rejected_and_cleaned(self):
        def docker(*args, **kwargs):
            if args[0] == 'port': return '0.0.0.0:40123'
            if args[0] == 'container': return ''
            return 'unused'
        with tempfile.TemporaryDirectory() as directory, patch.object(browser, 'docker', side_effect=docker):
            with self.assertRaisesRegex(browser.HarnessError, 'loopback'):
                with browser.server(self.lock, Path(directory)):
                    self.fail('Unsafe endpoint was accepted')
            self.assertFalse((Path(directory) / 'browser-state.json').exists())
