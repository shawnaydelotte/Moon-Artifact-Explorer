# Moon Artifact Explorer 🌙

An interactive 3D visualization of artificial objects on the Moon using Three.js, featuring all lunar missions from 1959 to 2025.

## 📺 Demo

![Moon Explorer Demo](demo-assets/moon-explorer-demo.gif)

*Interactive demonstration showing resource overlays, search functionality, and advanced visual settings*

## 🚀 Live Demo

Deploy to GitHub Pages and visit: `https://[your-username].github.io/moon-explorer/`

## ✨ Features

- **Full 3D Globe** - Rotate, zoom, and explore with smooth OrbitControls
- **55+ Lunar Artifacts** - From Luna 2 (1959) to IM-2 Athena (2025)
- **Procedural Terrain** - Elevation data influenced by real crater and mare positions
- **Resource Overlays** - Water ice, Helium-3, Titanium, KREEP, minerals
- **Interactive Search** - Filter by name, year, or country of origin
- **Hover Tooltips** - Detailed information for each artifact
- **Keyboard Shortcuts** - Quick access to all features

## 🎮 Controls

### Mouse
- **Drag** - Orbit around the moon
- **Scroll** - Zoom in/out
- **Hover** - View artifact details

### Keyboard

| Key | Action |
|-----|--------|
| G | Toggle grid |
| L | Toggle labels |
| T | Toggle terrain |
| P | Toggle poles |
| V | Cycle terrain mode |
| W | Water ice deposits |
| I | Helium-3 deposits |
| N | Titanium deposits |
| K | KREEP deposits |
| X | Mineral deposits |
| A | Toggle all resources |
| +/- | Resource opacity |
| R | Reset view |
| S | Focus Surveyor 3 |
| / | Search |
| D | Help overlay |
| 1-9 | Quick focus artifacts |

## 📁 Project Structure

```
moon-explorer/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # UI styling
└── js/
    ├── main.js         # Three.js application
    └── data.js         # Artifact & feature data
```

## 🛠️ Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Upload all files maintaining the folder structure
3. Go to Settings → Pages → Source → Deploy from branch
4. Select `main` branch and `/ (root)` folder
5. Your site will be live at `https://username.github.io/repo-name/`

## 🔧 Technologies

- **Three.js** - 3D rendering
- **OrbitControls** - Camera interaction
- **ES6 Modules** - Modern JavaScript
- **CSS3** - UI styling

## 📊 Data Sources

- NASA, ESA, JAXA, ISRO, CNSA mission archives
- IAU planetary nomenclature for craters and maria
- Lunar remote sensing studies for resource deposits

## License

MIT - Feel free to use and modify!
