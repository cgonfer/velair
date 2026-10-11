# Documentation translations

English guides are the source of truth. Translations are ordinary Markdown files
beside the source: `usage.es.md`, `usage.fr.md`, and so on. Supported suffixes are
`es`, `fr`, `de`, `it`, `nl`, `pl`, `pt-br`, `pt-pt`, and `ru`.

## Translate or refresh one guide

1. Read the entire English source and translate it into its sibling file.
   Preserve code, entity IDs, examples, commands, URLs and technical meaning.
   Localize relative links to an existing translated guide when available;
   otherwise retain the English destination. Preserve link fragments.
2. For every translated heading, preserve the English GitHub heading slug in an
   explicit anchor above it, for example `<a id="block-presets"></a>`. This keeps
   fragment links stable across languages. Repeated English headings use the
   same numbered suffixes as GitHub (`heading`, `heading-1`, etc.).
3. Stamp only the guide and language actually synchronized:

```powershell
node scripts/documentation-translations.mjs sync --document docs/user/usage.md --language es --version 1.8.0 --review-status automatic
```

The default reference version comes from the integration manifest. The default
date is the current UTC date; `--date YYYY-MM-DD` can record a known synchronization
date. The command validates translated local links and fragments before writing
the catalogue. It does not translate content.

Use `--review-status reviewed` only after the translation has been reviewed.
Synchronization and review are independent: an automatic translation can match
the current source; a reviewed translation can become stale after a source edit.
Do not use `sync` to refresh a stale stamp without updating and checking content.

## Navigation and status

```powershell
node scripts/documentation-translations.mjs report
node scripts/documentation-translations.mjs update-headers
node scripts/documentation-translations.mjs check
```

`report` prints the language matrix. `update-headers` updates navigation in
registered originals and translations and regenerates `docs/translation-status.md`.
It never changes synchronization hashes, dates, versions or review status.
The generated block is delimited by `velair-docs:start` and `velair-docs:end`
HTML comments. Do not edit those blocks by hand.

Language navigation stays visible below the title. Translations place their
reference version, synchronization date, linguistic review and source freshness
in a two-column Markdown table inside a closed `<details>` disclosure. A blank
line after the summary lets GitHub render the table. A stale-source warning and link to English remain visible
outside the disclosure. A horizontal rule separates the header from the guide;
English originals only need navigation and that separator.

`check` rejects malformed catalogue metadata, missing or escaping files,
unregistered translated files, incorrect generated headers and broken local
links or Markdown anchors in translations. Pending languages are allowed;
stale translations are allowed when their generated warning is current.
Publish the source, translation, catalogue, navigation and status together.

## Catalogue and hashes

`docs/translations.json` uses schema version 1. Each English source path maps to
`translations`, keyed by locale. Each translation records its `path`, SHA-256
`sourceHash`, `synchronizedAt`, `referenceVersion` and `reviewStatus` (`automatic`
or `reviewed`). Paths must be confined to `docs/` and follow the sibling suffix
convention. CRLF is normalized to LF before hashing. Everything in the English
source, including code, contributes to the hash except generated navigation.

The Node library exports `readCatalogue`, `sourceHash`,
`buildDocumentationAvailability`, `renderHeader`, `updateHeaders`,
`checkDocumentation`, `reportDocumentation` and `syncTranslation`.
Build availability is a source-to-locale map containing only file paths. It
includes valid stale translations so users can access them with the source-change
warning. No hashes or synchronization state need to be shipped in the frontend.
