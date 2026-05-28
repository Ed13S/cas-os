# CAS OS

## Professional User Manual & Deployment Guide

Version: 1.0
Platform: Browser / Laptop / Mobile PWA
Compatibility: Windows, macOS, Linux, Android, iOS
License: Personal / Educational Use

---

# 1. INTRODUCTION

CAS OS is a next-generation browser-based Computational Algebra System (CAS) inspired by:

* TI-Nspire CAS
* Wolfram Alpha
* Desmos
* Symbolab

The system combines:

* symbolic algebra
* calculus
* graphing
* physics solving
* chemistry balancing
* offline AI tutoring
* handwriting input
* progressive web app (PWA) support

into one unified educational operating environment.

The platform is fully browser-based and deployable through GitHub Pages.

---

# 2. CORE FEATURES

## 2.1 Symbolic Algebra

The CAS engine supports:

* simplification
* expansion
* factoring
* symbolic solving
* systems of equations
* matrix operations

### Examples

```text
solve x^2=4
factor x^2-9
expand (x+2)^3
```

---

## 2.2 Calculus Engine

Supports:

* derivatives
* integrals
* limits
* Taylor series
* symbolic calculus

### Examples

```text
diff x^3
int x^2
limit sin(x)/x
taylor sin(x)
```

---

## 2.3 Graphing System

The graphing engine supports:

* 2D graphing
* multi-function plotting
* interactive zoom
* pan controls
* future 3D support

### Example

```text
plot x^2
plot sin(x)
```

---

## 2.4 Step-by-Step Engine

The explanation engine provides human-readable reasoning steps.

Example output:

```text
Step 1: Move all terms to one side
Step 2: Set equation equal to zero
Step 3: Factor the polynomial
Step 4: Solve roots
```

---

## 2.5 Physics Engine

Supported categories:

* kinematics
* force equations
* momentum
* energy
* gravity
* vectors

### Example

```text
physics F=m*a
physics v=u+at
```

---

## 2.6 Chemistry Engine

Supports:

* equation balancing
* stoichiometry preparation
* molecular parsing

### Example

```text
chem H2 + O2 -> H2O
```

---

## 2.7 Offline AI Tutor

The embedded AI assistant can:

* explain algebra
* explain derivatives
* guide solving steps
* provide conceptual help

No API key is required for offline mode.

---

## 2.8 Handwriting Input

The handwriting module allows:

* equation drawing
* mouse/touch input
* conversion into CAS expressions

Designed for tablets and touch devices.

---

# 3. INSTALLATION

## 3.1 Local Installation

### Method A — Direct Launch

Open:

```text
index.html
```

in your browser.

---

### Method B — Local Server (Recommended)

Install Node.js:

https://nodejs.org

Run:

```bash
npx serve
```

Then open the generated localhost URL.

---

# 4. GITHUB PAGES DEPLOYMENT

## Step 1 — Create Repository

Create a GitHub repository:

```text
cas-os-godmode
```

---

## Step 2 — Upload Files

Upload all project files into the repository root.

---

## Step 3 — Enable Pages

Navigate to:

```text
Settings → Pages
```

Select:

```text
Deploy from branch
```

Branch:

```text
main
```

Folder:

```text
/ (root)
```

---

## Step 4 — Wait for Deployment

GitHub Pages deployment usually takes:

```text
1–3 minutes
```

Your application will appear at:

```text
https://YOURNAME.github.io/cas-os-godmode/
```

---

# 5. PWA INSTALLATION

CAS OS supports installation as a Progressive Web App.

## Desktop

Chrome/Edge:

* Click install icon in address bar

---

## Mobile

Android:

* Add to Home Screen

iPhone:

* Share → Add to Home Screen

---

# 6. COMMAND REFERENCE

## Algebra

```text
solve x^2=4
factor x^2-9
expand (x+1)^3
simplify 2x+3x
```

---

## Calculus

```text
diff x^3
int x^2
limit sin(x)/x
taylor e^x
```

---

## Graphing

```text
plot x^2
plot sin(x)
```

---

## Physics

```text
physics F=m*a
physics v=u+at
```

---

## Chemistry

```text
chem H2 + O2 -> H2O
```

---

# 7. ARCHITECTURE

## Core Modules

| File           | Purpose                |
| -------------- | ---------------------- |
| index.html     | Main UI                |
| cas-engine.js  | Symbolic engine        |
| steps.js       | Explanation engine     |
| graph.js       | Graph plotting         |
| physics.js     | Physics calculations   |
| chemistry.js   | Chemistry balancing    |
| ai-mini.js     | Offline AI tutor       |
| handwriting.js | Drawing recognition    |
| sw.js          | Offline service worker |

---

# 8. SAFETY & STABILITY

The system is intentionally modular.

Benefits:

* isolated upgrades
* safe debugging
* offline capability
* reduced crash risk
* browser compatibility

---

# 9. PERFORMANCE NOTES

Recommended browsers:

* Chrome
* Edge
* Firefox

Recommended RAM:

```text
4 GB minimum
8 GB recommended
```

---

# 10. FUTURE EXPANSION

Planned capabilities:

* full 3D graphing
* vector fields
* symbolic proof assistant
* real handwriting AI recognition
* embedded transformer LLM
* voice-controlled CAS
* mobile native packaging

---

# 11. TROUBLESHOOTING

## Graph Not Rendering

Refresh page or verify Plotly CDN availability.

---

## CAS Error

Check expression syntax.

---

## GitHub Pages Not Updating

Wait several minutes and clear browser cache.

---

# 12. LICENSE

Educational and personal use recommended.

Third-party libraries:

* Math.js
* Algebrite
* Plotly.js

All trademarks belong to their respective owners.

---

# END OF MANUAL
