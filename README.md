# 🪔 Diwali Jeopardy Web App

A celebratory, Diwali-themed interactive Jeopardy web application featuring live teams scoring, custom multimedia clues (Audio, Video, YouTube, Spotify, Images), interactive hints, and festive animations (glowing diyas, toran garlands, rangoli motifs, sparks, and fireworks celebration).

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [How to Change Questions, Categories & Names](#-how-to-change-questions-categories--names)
  - [1. Changing Questions, Hints & Answers](#1-changing-questions-hints--answers)
  - [2. Changing Category Names](#2-changing-category-names)
  - [3. Changing the Game Title & Subtitle](#3-changing-the-game-title--subtitle)
  - [4. Changing Currency & Points](#4-changing-currency--points)
- [How to Embed Music, Video & Media](#-how-to-embed-music-video--media)
  - [Folder Setup](#folder-setup)
  - [Embedding Local Audio (MP3 / WAV / M4A)](#1-embedding-local-audio)
  - [Embedding Local Video (MP4 / WebM)](#2-embedding-local-video)
  - [Embedding YouTube Videos & Shorts](#3-embedding-youtube-videos--shorts)
  - [Embedding Spotify / External Iframes](#4-embedding-spotify--external-iframes)
  - [Embedding Images (Rebus / Logos / Photos)](#5-embedding-images)
  - [Answer Media (Reveal media with the answer)](#6-answer-media)
- [Teams & Live Scoreboard](#-teams--live-scoreboard)
- [Keyboard Shortcuts & Controls](#-keyboard-shortcuts--controls)
- [Repository File Map](#-repository-file-map)

---

## 🚀 Quick Start

Because modern browsers restrict audio/video playback and local storage over raw `file://` URLs, run the app using any local HTTP server:

### Option A: Using `npx serve` (Recommended)
```bash
npx serve .
```
Then open `http://localhost:3000` in your browser.

### Option B: Using Python
```bash
# Python 3
python3 -m http.server 3000
```
Then open `http://localhost:3000` in your browser.

### Option C: VS Code Live Server
Right-click on `index.html` in VS Code and select **"Open with Live Server"**.

---

## ✏️ How to Change Questions, Categories & Names

All game questions, answers, and categories live in **[`script.js`](file:///Users/kartikjindal/Downloads/Jeopardy-%20Game%20Final/Jeopardy-%20Game%20Final/script.js)** inside the `gameData` object.

### 1. Changing Questions, Hints & Answers

Open **`script.js`**. Each question is organized by category name and point value (`100`, `200`, `300`, `400`, `500`):

```javascript
const gameData = {
    "Category Name": {
        100: {
            question: "Your question or clue text goes here",
            hint: "Optional hint that appears when player clicks 'Show Hint'",
            answer: "What is The Answer"
        },
        200: {
            question: "Another trivia clue...",
            hint: "A helpful nudge",
            answer: "What is Another Answer"
        }
    }
};
```

- **`question`**: The clue displayed when the tile is clicked.
- **`hint`**: (Optional) Hidden behind an interactive **"💡 Show Hint"** button so players don't see it immediately. If left empty (`""` or omitted), the hint button is automatically hidden.
- **`answer`**: Revealed when the host clicks **"Reveal Answer"**.

---

### 2. Changing Category Names

To change a column header on the board, simply rename the key in `gameData` in **`script.js`**:

```javascript
const gameData = {
    "Bollywood Classics": { ... },
    "Sangeet vangeet": { ... },
    "Chronically online": { ... },
    "Main character energy only": { ... },
    "3 MORE SHOTS PLEASE !!": { ... }
};
```
The game board automatically updates its column headers, grid columns, and ARIA labels.

---

### 3. Changing the Game Title & Subtitle

To change the title shown at the top of the board, open **[`index.html`](file:///Users/kartikjindal/Downloads/Jeopardy-%20Game%20Final/Jeopardy-%20Game%20Final/index.html)** and edit lines 54 and 61:

```html
<!-- Main Title -->
<h1 class="title" data-text="JEOPARDY!">JEOPARDY!</h1>

<!-- Subtitle / Tagline -->
<p class="subtitle">Golmaal Hai Bhai Sabh Golmaal Hai • Diwali Edition</p>
```

You can also edit the top eyebrow text (line 45):
```html
<p class="eyebrow">Shubh Deepavali</p>
```

---

### 4. Changing Currency & Points

- Point values default to **100, 200, 300, 400, 500**.
- The currency symbol is formatted as **₹** (Rupee).
- To add a different tier of points (e.g., 200, 400, 600, 800, 1000), update the keys in each category in `script.js`.

---

## 🎵 How to Embed Music, Video & Media

The game includes a dedicated multimedia engine in **[`media.js`](file:///Users/kartikjindal/Downloads/Jeopardy-%20Game%20Final/Jeopardy-%20Game%20Final/media.js)** that supports local audio files, local video files, YouTube links, Spotify embeds, and images.

Tiles with audio or video automatically show a badge on the board (`🎵` for audio, `🎬` for video) so contestants know it's a media clue!

### Folder Setup

Drop your media files into the **`media/`** folder:
```
media/
├── sangeet1.mp3
├── intro.mp4
├── clip.webm
└── poster.jpg
```

---

### 1. Embedding Local Audio

Play a song or sound clip with the built-in Diwali audio player (includes custom play/pause, restart, timeline scrubber, and time indicator):

```javascript
"Sangeet vangeet": {
    100: {
        question: "🎵 Listen to the beat and name that song / movie!",
        audio: "media/sangeet1.mp3",  // Path inside the project
        start: 15,                    // (Optional) Start playing at second 15
        end: 45,                      // (Optional) Stop playing at second 45
        hint: "Title track of Imran Khan rom-com",
        answer: "what is i hate luv storys"
    }
}
```

---

### 2. Embedding Local Video

Play an MP4 or WebM video inside an expansive, responsive 16:9 Diwali player:

```javascript
"Chronically online": {
    100: {
        question: "Name this viral internet meme / soundbite!",
        video: "media/kazookid.mp4",        // Path to local MP4
        poster: "media/kazookid-still.jpg", // (Optional) Preview thumbnail
        start: 0,                           // (Optional) Clip start in seconds
        end: 18,                            // (Optional) Clip end in seconds
        hint: "Wait a minute... who are you?",
        answer: "What is Kazoo Kid 🎺"
    }
}
```

---

### 3. Embedding YouTube Videos & Shorts

Paste **any standard YouTube URL**, short URL, or Shorts link. The player automatically sets up the embed and handles start/end timestamps and autoplay:

```javascript
"Chronically online": {
    200: {
        question: "Watch this clip and tell us what happens next!",
        youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Or: https://youtu.be/dQw4w9WgXcQ
        start: 30, // Starts at 0:30
        end: 55,   // Ends at 0:55
        hint: "Never gonna...",
        answer: "What is Never Gonna Give You Up"
    }
}
```

#### 🎵 Music Beat Clues (Anti-Spoiler "Sangeet" Mode)
For music categories (like **"Sangeet vangeet"**) where contestants must guess the song from the intro beat, add `isAudio: true`. The player autoplays the beat snippet with an animated Diwali equalizer and live countdown while masking video titles/spoilers during the question. When the answer is revealed, the video unmasks and contestants can enjoy the full song:

```javascript
"Sangeet vangeet": {
    100: {
        question: "🎵 Listen to the beat and name that song / movie!",
        youtube: "https://youtu.be/fzv1uqd_1v8?si=VQxhZGtn0_i-VTo3",
        start: 0,
        end: 4,         // Stops at second 4, right before lyrics
        isAudio: true,  // Displays festive Diwali beat player & audio badge
        hint: "Title track of Imran Khan & Sonam Kapoor rom-com",
        answer: "what is i hate luv storys"
    }
}
```

---

### 4. Embedding Spotify / External Iframes

Embed a Spotify track, playlist, SoundCloud player, or any external iframe via `embed`:

```javascript
"Sangeet vangeet": {
    300: {
        question: "Listen to this track:",
        embed: "https://open.spotify.com/embed/track/6rqhFgbbKwnb9MLmUQDhG6",
        hint: "Famous Bollywood ballad",
        answer: "What is Roobaroo"
    }
}
```

---

### 5. Embedding Images

For visual puzzles, brand logos, or photos:

```javascript
"Brand Logos": {
    100: {
        question: "Identify this company from its emblem:",
        image: "brands/brand1.png",
        hint: "Tech conglomerate",
        answer: "What is Microsoft"
    }
}
```

---

### 6. Answer Media

You can also reveal media **when the answer is revealed** (e.g. play the full song or reveal the uncropped image after they guess):

Simply prefix any media property with `answer`:
- `answerAudio`: `"media/full-song.mp3"`
- `answerVideo`: `"media/full-clip.mp4"`
- `answerYoutube`: `"https://youtu.be/..."`
- `answerImage`: `"rebus/Rebus1_solution.png"`
- `answerStart` / `answerEnd`: seconds

```javascript
100: {
    question: "🎵 Guess the track from this short 5-second teaser:",
    audio: "media/teaser.mp3",
    hint: "Released in 2022",
    answer: "What is Kesariya",
    answerYoutube: "https://youtu.be/BddP6PYo2gs" // Plays official music video on reveal
}
```

> **Note**: Opening and closing modals automatically pauses all playing audio/video, so nothing keeps playing in the background.

---

## 👥 Teams & Live Scoreboard

The app includes a built-in team scoreboard at the bottom:

1. **Add Teams**: Click **`+ Add Team`** to add unlimited teams.
2. **Team Names & Colors**: Edit team names directly, or click the color swatch to pick a unique color.
3. **Adjust Points**:
   - Use the **`+`** and **`-`** step buttons to increment/decrement scores by ₹100, ₹200, ₹500, etc.
   - Click directly on any team's score number to type an exact amount.
4. **Award Points inside Question Modals**:
   - When a question is answered, the modal displays the **"AWARD POINTS"** panel with quick buttons for each team.
   - Clicking a team immediately adds the clue's value to that team and places a colored badge on the board tile.
5. **Persistence**: Scores, teams, and lit diyas are stored in browser `localStorage`.
6. **Reset Game**: Click the reset button in the header to extinguish all diyas and reset scores back to ₹0 (includes confirmation prompt).

---

## ⌨️ Keyboard Shortcuts & Controls

| Key | Action |
| --- | --- |
| **`ESC`** | Close current question modal |
| **`Enter`** / **`Space`** | Reveal answer (or close if answer is revealed) |
| **Click Diya / Card** | Open question modal |
| **Click "💡 Show Hint"** | Reveal hidden hint |
| **Click "Close" / `✕`** | Return to board (automatically lights the diya) |

---

## 📁 Repository File Map

```
Jeopardy- Game Final/
├── index.html          # Main HTML structure, hero banner, Diwali rangoli & board container
├── styles.css          # Diwali design system (gradients, diyas, animations, responsive layout)
├── script.js           # Questions & categories configuration (gameData)
├── game.js             # Core board logic, question dialogs, diya lighting & particle effects
├── media.js            # Multimedia engine (Audio players, video, YouTube & Spotify embeds)
├── teams.js            # Teams manager, point awards, and scoreboard persistence
├── media/              # Folder for custom audio (MP3) and video (MP4) assets
├── brands/             # Brand logo images
├── rebus/              # Rebus puzzle image clues
└── .gitignore          # Ignores OS files (.DS_Store), screencasts (.mov), and node modules
```