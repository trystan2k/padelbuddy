# Padel Buddy

A padel score tracking app for Amazfit watches running Zepp OS. Track match scores directly from your wrist with an intuitive interface designed for padel players.

## Features

- **One-tap scoring** for both teams (Team A and Team B)
- **Undo functionality** to correct scoring mistakes
- **Real-time score display** showing current game points and set scores
- **Match persistence** - resume interrupted games automatically
- **Match summary screen** with scrollable match history
- **Screen keep-awake** during active games to prevent interruptions
- **Traditional padel scoring** including deuce, advantage, and tie-break at 6-6
- **Responsive design** optimized for round (GTR-3) and square (GTS-3) watch faces

## Supported Devices

- Amazfit GTR 3 / GTR 3 Pro (gtr3, gtr3-w)
- Amazfit GTS 3 / GTS 3 Pro (Zurich, ZurichW)

## Screens

1. **Home Screen** - Start new games or resume saved matches
2. **Setup Screen** - Configure match settings before starting
3. **Game Screen** - Main scoring interface with touch controls
4. **Summary Screen** - View match history and final scores

## Getting Started

### Prerequisites

- Node.js 16+ (tested with Node 20)
- Zeus CLI installed globally:
  ```bash
  npm i -g @zeppos/zeus-cli
  ```
- Zepp OS Simulator (for local testing)
- Zepp mobile app with Developer Mode enabled for real-device testing
- A Zepp/Open Platform account: https://console.zepp.com

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd padelscore
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   zeus dev
   ```

### Testing on Device

1. Login to your Zepp account:
   ```bash
   zeus login
   ```

2. Generate a QR code and scan it with the Zepp app:
   ```bash
   zeus preview
   ```

3. Enable Developer Mode in Zepp App:
   - Profile → Settings → About → Tap the Zepp icon 7 times

### Building for Distribution

```bash
zeus build
```

This generates a `.zab` package file ready for distribution.

## Development

### Project Structure

```
padelscore/
├── app.js                 # Application entry point
├── app.json               # App configuration (permissions, targets, i18n)
├── page/                  # Watch UI screens
│   ├── index.js          # Home screen
│   ├── setup.js          # Match setup screen
│   ├── game.js           # Main game screen
│   └── summary.js        # Match summary screen
├── utils/                 # Core business logic
│   ├── scoring-engine.js # Padel scoring logic
│   ├── match-state.js    # State management
│   ├── match-storage.js  # Persistence layer
│   └── history-stack.js  # Undo/redo functionality
├── tests/                 # Test suite
├── assets/                # Icons and resources
└── docs/                  # Documentation and development logs
```

### Running Tests

```bash
npm test
```

### Code Style

- **Indentation**: 2 spaces
- **Line endings**: LF
- **Naming**: camelCase for variables/functions, kebab-case for files
- **Responsive Units**: Use `rpx` for layouts, `px` only for fixed sizing

## Scoring Rules

The app implements traditional padel/tennis scoring:

- **Game Points**: 0 → 15 → 30 → 40 → Game
- **Deuce/Advantage**: Enabled when both teams reach 40
- **Set Win**: First to 6 games with a 2-game margin
- **Tie-Break**: Played at 6-6 games (first to 7 points, win by 2)
- **Match**: Best of 3 sets (first to 2 sets wins)

## Key Technologies

- **Runtime**: Zepp OS (Amazfit devices)
- **Framework**: Zepp OS Mini Program Framework
- **Language**: JavaScript (ES6+)
- **UI System**: Zepp OS UI Widgets (Canvas-based rendering)
- **Storage**: Local storage via `device:os.local_storage` permission

## Documentation

- [Getting Started Guide](docs/GET_STARTED.md)
- [Product Requirements Document](docs/PRD.md)
- [Development Logs](docs/development-logs/)
- [Zepp OS Official Documentation](https://docs.zepp.com/docs/1.0/intro/)
