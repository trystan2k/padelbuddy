# Execution Plan: Task #38 - Implement Multi-Language Support for Portuguese and Spanish

**Plan ID:** 38  
**Task Title:** Implement Multi-Language Support for Portuguese and Spanish  
**Created:** 2026-02-25  
**Platform:** Zepp OS v1.0 (Amazfit watches)  
**Framework:** Zepp OS Mini Program Framework (JavaScript)

---

## Task Analysis

### Main Objective
Add multi-language support for Portuguese (Brazil - pt-BR) and Spanish (Spain - es-ES) using Zepp OS native i18n system.

### Identified Dependencies
- **Zepp OS v1.0 Native i18n**: Project already uses `gettext` from 'i18n' module with `.po` files at `page/i18n/`
- **Language Mappings** (from Zepp OS):
  - English: 2 (en-US) - Default fallback
  - Spanish: 3 (es-ES)
  - Portuguese (Brazil): 20 (pt-BR)
- **Existing Setup**: `page/i18n/en-US.po` already exists with 53 translation keys

### System Impact
- **New Files**: 2 .po translation files (pt-BR, es-ES)
- **Modified Files**: app.json (i18n configuration)
- **No Code Changes Required**: Existing `gettext()` calls in pages automatically work with new languages

---

## Chosen Approach

### Solution: Use Zepp OS Native i18n
Zepp OS v1.0 has built-in multilingual support using `.po` files. The framework automatically:
1. Detects the device language via `hmSetting.getLanguage()`
2. Loads the appropriate `.po` file based on the language code
3. Returns translated strings via `gettext()` function

This approach is simpler and more reliable than a custom implementation.

### Why Native i18n?
- **No code changes needed**: Existing `gettext()` calls work automatically
- **Official support**: Uses Zepp OS documented i18n system
- **Automatic language detection**: Handled by the framework
- **Less maintenance**: No custom code to maintain

---

## Implementation Steps

### Subtask 38.1: Create Translation Files
**Dependencies:** None  
**Estimated Complexity:** Low

#### Step 38.1.1: Create `page/i18n/pt-BR.po`
Portuguese (Brazil) translations with all 53 keys from en-US.po:

```po
msgid "home.logo"
msgstr "PADEL"

msgid "home.title"
msgstr "Buddy"

msgid "home.startNewGame"
msgstr "Nova Partida"

msgid "home.confirmStartNewGame"
msgstr "Toque Novamente para Reiniciar"

msgid "home.resumeGame"
msgstr "Continuar Partida"

# ... (all 53 keys with Portuguese translations)
```

#### Step 38.1.2: Create `page/i18n/es-ES.po`
Spanish (Spain) translations with all 53 keys:

```po
msgid "home.logo"
msgstr "PADEL"

msgid "home.title"
msgstr "Buddy"

msgid "home.startNewGame"
msgstr "Nueva Partida"

msgid "home.confirmStartNewGame"
msgstr "Toca de Nuevo para Reiniciar"

msgid "home.resumeGame"
msgstr "Continuar Partida"

# ... (all 53 keys with Spanish translations)
```

#### Validation Checkpoint 38.1
- [ ] `page/i18n/pt-BR.po` created with 53 translation keys
- [ ] `page/i18n/es-ES.po` created with 53 translation keys
- [ ] All msgid keys match en-US.po exactly
- [ ] All .po files are valid format

---

### Subtask 38.2: Update app.json Configuration
**Dependencies:** 38.1  
**Estimated Complexity:** Low

#### Step 38.2.1: Add i18n entries to app.json

```json
{
  "i18n": {
    "en-US": {
      "appName": "Padel Buddy"
    },
    "pt-BR": {
      "appName": "Padel Buddy"
    },
    "es-ES": {
      "appName": "Padel Buddy"
    }
  },
  "defaultLanguage": "en-US"
}
```

#### Validation Checkpoint 38.2
- [ ] app.json has i18n entries for en-US, pt-BR, es-ES
- [ ] defaultLanguage is set to en-US
- [ ] JSON is valid

---

### Subtask 38.3: Lint Fixes (Code Quality)
**Dependencies:** None  
**Estimated Complexity:** Low

Fix pre-existing lint warnings discovered during QA:

1. Remove unused `gettext` imports from `app-side/index.js` and `setting/index.js`
2. Rename unused catch variables `e` to `_e` in `page/settings.js` and `utils/app-data-clear.js`

#### Validation Checkpoint 38.3
- [ ] No lint errors
- [ ] All tests pass

---

### Subtask 38.4: Testing
**Dependencies:** 38.1, 38.2, 38.3  
**Estimated Complexity:** Low

#### Step 38.4.1: Run automated tests
```bash
npm run complete-check
```

#### Step 38.4.2: Manual testing checklist
- [ ] Build app with `zeus build`
- [ ] Test on simulator with English (code 2) - all UI in English
- [ ] Test on simulator with Spanish (code 3) - all UI in Spanish
- [ ] Test on simulator with Portuguese Brazil (code 20) - all UI in Portuguese
- [ ] Verify no regressions in existing functionality

#### Validation Checkpoint 38.4
- [ ] All 211 tests pass
- [ ] No lint errors
- [ ] Manual testing successful

---

## File Summary

### Files Created (2 files)
```
page/i18n/pt-BR.po    # Portuguese (Brazil) translations
page/i18n/es-ES.po    # Spanish (Spain) translations
```

### Files Modified (5 files)
```
app.json                      # Add i18n configuration
app-side/index.js             # Remove unused import (lint fix)
setting/index.js              # Remove unused import (lint fix)
page/settings.js              # Rename unused catch variable (lint fix)
utils/app-data-clear.js       # Rename unused catch variables (lint fix)
```

---

## Translation Keys (53 total)

| Category | Keys |
|----------|------|
| Home | home.logo, home.title, home.startNewGame, home.confirmStartNewGame, home.resumeGame, home.clearData, home.clearDataConfirm, home.previousMatches |
| Game | game.title, game.setLabel, game.setsLabel, game.gamesLabel, game.setsWonLabel, game.teamAAddPoint, game.teamBAddPoint, game.teamARemovePoint, game.teamBRemovePoint, game.backHome, game.home, game.finishedLabel, game.winsSuffix, game.matchFinished, game.undo |
| Setup | setup.title, setup.selectSetsHint, setup.option.oneSet, setup.option.threeSets, setup.option.fiveSets, setup.startMatch, setup.saveFailed |
| Summary | summary.title, summary.teamAWins, summary.teamBWins, summary.matchFinished, summary.matchUnavailable, summary.finalScoreLabel, summary.setHistoryTitle, summary.noSetHistory, summary.home, summary.startNewGame |
| History | history.title, history.empty, history.back, history.detail.title, history.detail.notFound, history.detail.wins, history.detail.draw, history.detail.setHistory, history.deleteConfirmToast |
| Settings | settings.title, settings.previousMatches, settings.clearAppData, settings.clearDataConfirm, settings.dataCleared, settings.clearFailed, settings.version |

---

## Notes

### Zepp OS Language Codes
| Code | Locale | Language |
|------|--------|----------|
| 2 | en-US | English (USA) - Default |
| 3 | es-ES | Spanish (Spain) |
| 20 | pt-BR | Portuguese (Brazil) |

### Why pt-BR Only?
Brazilian Portuguese is more widely used for padel and the user requested pt-BR only (not pt-PT).

### Future Enhancements (Out of Scope)
- Add pt-PT (Portugal Portuguese) support if needed
- Add additional languages (French, German, etc.)
- Add settings UI to manually change language
