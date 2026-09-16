# Mukul Jakhar — UPSC Prelims Notebook

A static website (no build step). Works on GitHub Pages as-is.

## Put it online (GitHub Pages)
1. Create a new public repository on GitHub and upload everything in this folder (keep the folder structure).
2. Repository → Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)` → Save.
3. After a minute the site is live at `https://<username>.github.io/<repo-name>/`.

Opening `index.html` directly from your computer mostly works, but some browsers block loading the paper files that way. Online it always works.

## Folder structure
```
index.html                     page shell
assets/css/style.css           all styles
assets/js/config.js            THE STRUCTURE: subjects, sections, topics, current-affairs categories, papers
assets/js/app.js               pages and navigation
assets/js/exam.js              attempt mode, timer, scoring, review
assets/js/ink.js               pen / highlighter / eraser / rough sheet
data/papers/<year>.js          answer key + which page each question starts on
data/papers/img/<year>/pNN.webp  question booklet pages (Series A)
data/notes/<subject>/<section>/<topic>.js   notes
data/current-affairs/<category>.js          current affairs
```

## Adding notes
1. Create `data/notes/<subject>/<section>/<topic>.js` (see `data/notes/polity/constitution/preamble.js`).
2. In `assets/js/config.js`, add `ready: true` to that topic.

## Adding current affairs
1. Copy `data/current-affairs/_TEMPLATE.js` to `data/current-affairs/<category-id>.js` and change the id inside.
2. In `config.js`, add `ready: true` to that category.

## Papers
Answer keys are UPSC's Series A keys (2026 is the provisional key). In a key string `x` means the question was dropped: it earns no marks and no penalty. Scoring: +2 correct, −0.66 wrong, 0 blank.
