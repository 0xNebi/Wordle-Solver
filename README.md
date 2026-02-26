# Wordle Solver

A Wordle helper tool available in two versions — a classic Python desktop app and a modern web-based version.

---

## Python Version (Original)

A desktop GUI built with Python and Tkinter.

**Requirements:** Python 3.x (tkinter is included with Python on Windows)

```bash
cd python-version
python WordleSolver.py
```

The word list is already included in `src/word_groups/`.

**Current State:** The default dictionary is set to English.

To use the solver with a different language, you must replace the existing English word lists located in `src/word_groups/` with a new dictionary file in your language of choice.

---

## Web Version (Improved)

A modern responsive web app built with React, TypeScript, and Vite.  
Fetches a full English dictionary automatically — no local word files needed.

**Requirements:** Node.js 18+

```bash
cd web-version
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### How to use
1. Type letters using your keyboard or the on-screen keyboard
2. Click a submitted letter to cycle its color: **gray** (absent) → **yellow** (wrong position) → **green** (correct)
3. Press **Suggest** to get the best next guess
4. Switch between **Solve** mode (narrows down answers) and **Explore** mode (finds best new letters to try)

---

## Repository Structure

```
├── python-version/    # Original Python/Tkinter desktop app
└── web-version/       # Improved React/Vite web app
```

