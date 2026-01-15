// Moon data - artifacts, craters, maria, resources

export const ARTIFACTS = [
  // 1959-1969 Early missions
  { name: "Luna 2", lat: 29.1, lon: 0.0, operator: "Soviet Union", year: 1959, type: "Impactor", status: "Impactor", description: "First spacecraft to reach the Moon's surface" },
  { name: "Luna 2 Third Stage", lat: 30.0, lon: 1.0, operator: "Soviet Union", year: 1959, type: "Rocket Stage", status: "Crashed", description: "Rocket stage from Luna 2 mission" },
  { name: "Ranger 4", lat: -15.5, lon: -130.7, operator: "United States", year: 1962, type: "Impactor", status: "Crashed", description: "First US spacecraft to reach the Moon, failed electronically" },
  { name: "Ranger 6", lat: 9.358, lon: 21.480, operator: "United States", year: 1964, type: "Impactor", status: "Impactor" },
  { name: "Ranger 7", lat: -10.63, lon: -20.60, operator: "United States", year: 1964, type: "Impactor", status: "Impactor" },
  { name: "Luna 5", lat: -8.0, lon: -23.0, operator: "Soviet Union", year: 1965, type: "Probe", status: "Crashed" },
  { name: "Luna 7", lat: 9.8, lon: 47.8, operator: "Soviet Union", year: 1965, type: "Probe", status: "Crashed" },
  { name: "Luna 8", lat: 9.1, lon: 63.3, operator: "Soviet Union", year: 1965, type: "Probe", status: "Crashed" },
  { name: "Ranger 8", lat: 2.638, lon: 24.787, operator: "United States", year: 1965, type: "Impactor", status: "Impactor" },
  { name: "Ranger 9", lat: -12.828, lon: -2.387, operator: "United States", year: 1965, type: "Impactor", status: "Impactor" },
  { name: "Luna 9", lat: 7.08, lon: -64.37, operator: "Soviet Union", year: 1966, type: "Lander", status: "Landed", description: "First controlled soft landing on the Moon" },
  { name: "Surveyor 1", lat: -2.474, lon: -43.339, operator: "United States", year: 1966, type: "Lander", status: "Landed", description: "First US soft landing, transmitted 11,237 photos" },
  { name: "Luna 13", lat: 18.87, lon: -62.05, operator: "Soviet Union", year: 1966, type: "Lander", status: "Landed" },
  { name: "Surveyor 3", lat: -3.015, lon: -23.418, operator: "United States", year: 1967, type: "Lander", status: "Landed" },
  { name: "Surveyor 5", lat: 1.461, lon: 23.195, operator: "United States", year: 1967, type: "Lander", status: "Landed" },
  { name: "Surveyor 6", lat: 0.49, lon: -1.40, operator: "United States", year: 1967, type: "Lander", status: "Landed" },
  { name: "Surveyor 7", lat: -40.86, lon: -11.47, operator: "United States", year: 1968, type: "Lander", status: "Landed" },
  { name: "Apollo 11 Eagle", lat: 0.6741, lon: 23.4730, operator: "United States", year: 1969, type: "Lander", status: "Landed", description: "First crewed lunar landing - Armstrong and Aldrin" },
  { name: "Apollo 11 Flag", lat: 0.6734, lon: 23.4731, operator: "United States", year: 1969, type: "Equipment", status: "Landed", description: "US flag planted during first Moon walk" },
  { name: "Apollo 12 Intrepid", lat: -3.0124, lon: -23.4216, operator: "United States", year: 1969, type: "Lander", status: "Landed", description: "Landed near Surveyor 3, crew visited the probe" },
  
  // 1970s missions
  { name: "Luna 16", lat: -0.5137, lon: 56.3638, operator: "Soviet Union", year: 1970, type: "Sample Return", status: "Landed" },
  { name: "Luna 17/Lunokhod 1", lat: 38.2378, lon: -35.0, operator: "Soviet Union", year: 1970, type: "Rover", status: "Landed" },
  { name: "Apollo 14 Antares", lat: -3.6453, lon: -17.4714, operator: "United States", year: 1971, type: "Lander", status: "Landed" },
  { name: "Apollo 15 Falcon", lat: 26.1322, lon: 3.6339, operator: "United States", year: 1971, type: "Lander", status: "Landed" },
  { name: "Apollo 15 Rover", lat: 26.1333, lon: 3.6340, operator: "United States", year: 1971, type: "Rover", status: "Landed" },
  { name: "Luna 20", lat: 3.57, lon: 56.55, operator: "Soviet Union", year: 1972, type: "Sample Return", status: "Landed" },
  { name: "Apollo 16 Orion", lat: -8.9999, lon: 15.5001, operator: "United States", year: 1972, type: "Lander", status: "Landed" },
  { name: "Apollo 17 Challenger", lat: 20.1908, lon: 30.7717, operator: "United States", year: 1972, type: "Lander", status: "Landed" },
  { name: "Luna 21/Lunokhod 2", lat: 25.85, lon: 30.45, operator: "Soviet Union", year: 1973, type: "Rover", status: "Landed" },
  { name: "Luna 23", lat: 13.0, lon: 62.0, operator: "Soviet Union", year: 1974, type: "Sample Return", status: "Landed", description: "Landed in Mare Crisium but drilling device was damaged" },
  { name: "Luna 24", lat: 12.7145, lon: 62.2129, operator: "Soviet Union", year: 1976, type: "Sample Return", status: "Landed" },
  
  // 1990s-2000s
  { name: "Hiten", lat: -34.3, lon: -55.6, operator: "Japan", year: 1993, type: "Orbiter", status: "Crashed" },
  { name: "Lunar Prospector", lat: -87.5, lon: -42.0, operator: "United States", year: 1999, type: "Orbiter", status: "Crashed" },
  { name: "SMART-1", lat: -34.24, lon: -46.19, operator: "Europe", year: 2006, type: "Orbiter", status: "Crashed" },
  
  // Modern missions 2007-2025
  { name: "SELENE/Kaguya", lat: -65.5, lon: -80.4, operator: "Japan", year: 2009, type: "Orbiter", status: "Crashed" },
  { name: "Chang'e 1", lat: 1.50, lon: -52.36, operator: "China", year: 2009, type: "Orbiter", status: "Crashed" },
  { name: "Chandrayaan-1 MIP", lat: -89.76, lon: -39.40, operator: "India", year: 2008, type: "Impactor", status: "Impactor" },
  { name: "LCROSS Centaur", lat: -84.675, lon: -48.725, operator: "United States", year: 2009, type: "Impactor", status: "Impactor" },
  { name: "LRO", lat: 0, lon: 0, operator: "United States", year: 2009, type: "Orbiter", status: "Orbiting" },
  { name: "GRAIL-A Ebb", lat: 75.62, lon: -26.63, operator: "United States", year: 2012, type: "Orbiter", status: "Crashed" },
  { name: "GRAIL-B Flow", lat: 75.65, lon: -26.68, operator: "United States", year: 2012, type: "Orbiter", status: "Crashed" },
  { name: "Chang'e 3/Yutu", lat: 44.1214, lon: -19.5116, operator: "China", year: 2013, type: "Lander/Rover", status: "Landed" },
  { name: "LADEE", lat: 11.85, lon: -27.79, operator: "United States", year: 2014, type: "Orbiter", status: "Crashed" },
  { name: "Chang'e 4/Yutu-2", lat: -45.4446, lon: 177.5991, operator: "China", year: 2019, type: "Lander/Rover", status: "Landed" },
  { name: "Beresheet", lat: 32.5956, lon: 19.3496, operator: "Israel", year: 2019, type: "Lander", status: "Crashed", description: "First privately funded lunar lander attempt" },
  { name: "Chandrayaan-2 Vikram", lat: -70.9, lon: 22.8, operator: "India", year: 2019, type: "Lander", status: "Crashed", description: "Lost communication during descent near south pole" },
  { name: "Chang'e 5", lat: 43.0576, lon: -51.9163, operator: "China", year: 2020, type: "Sample Return", status: "Landed", description: "Returned 1.731 kg of lunar samples" },
  { name: "Hakuto-R Mission 1", lat: 47.5, lon: 43.8, operator: "Japan", year: 2023, type: "Lander", status: "Crashed", description: "ispace private lander crashed in Atlas crater" },
  { name: "Chandrayaan-3 Vikram", lat: -69.373, lon: 32.319, operator: "India", year: 2023, type: "Lander", status: "Landed", description: "India's successful south pole landing" },
  { name: "Chandrayaan-3 Pragyan", lat: -69.373, lon: 32.320, operator: "India", year: 2023, type: "Rover", status: "Landed", description: "Rover deployed from Chandrayaan-3" },
  { name: "Luna 25", lat: -57.86, lon: 68.77, operator: "Russia", year: 2023, type: "Lander", status: "Crashed", description: "Russia's first lunar mission since 1976, crashed during descent" },
  { name: "SLIM", lat: -13.3, lon: 25.2, operator: "Japan", year: 2024, type: "Lander", status: "Landed", description: "Smart Lander for Investigating Moon, landed upside-down but functional" },
  { name: "Odysseus (IM-1)", lat: -80.13, lon: -1.44, operator: "United States", year: 2024, type: "Lander", status: "Landed", description: "First US soft landing since Apollo 17 (Intuitive Machines)" },
  { name: "Chang'e 6", lat: -41.6385, lon: -153.9852, operator: "China", year: 2024, type: "Sample Return", status: "Landed", description: "First sample return from far side of the Moon" },

  // 2025 additions
  { name: "Blue Ghost Mission 1", lat: 18.57, lon: 61.82, operator: "United States", year: 2025, type: "Lander", status: "Landed", description: "Firefly Aerospace's first successful commercial lunar landing" },
  { name: "Hakuto-R M2", lat: 55.0, lon: 1.4, operator: "Japan", year: 2025, type: "Lander", status: "Crashed", description: "ispace second attempt, flipped over one minute before landing" },
  { name: "IM-2 Athena", lat: -84.79, lon: 29.30, operator: "United States", year: 2025, type: "Lander", status: "Landed", description: "Intuitive Machines second mission, landed on its side" }
];

export const CRATERS = [
  { name: "Tycho", lat: -43.31, lon: -11.36, size: 85 },
  { name: "Copernicus", lat: 9.62, lon: -20.08, size: 93 },
  { name: "Kepler", lat: 8.12, lon: -38.01, size: 32 },
  { name: "Aristarchus", lat: 23.73, lon: -47.49, size: 40 },
  { name: "Plato", lat: 51.62, lon: -9.38, size: 101 },
  { name: "Archimedes", lat: 29.72, lon: -4.04, size: 83 },
  { name: "Eratosthenes", lat: 14.47, lon: -11.32, size: 59 },
  { name: "Ptolemaeus", lat: -9.2, lon: -1.8, size: 154 },
  { name: "Alphonsus", lat: -13.39, lon: -2.78, size: 118 },
  { name: "Arzachel", lat: -18.19, lon: -1.88, size: 97 },
  { name: "Clavius", lat: -58.4, lon: -14.4, size: 231 },
  { name: "Grimaldi", lat: -5.2, lon: -68.6, size: 172 },
  { name: "Schickard", lat: -44.4, lon: -54.6, size: 227 },
  { name: "Theophilus", lat: -11.4, lon: 26.4, size: 100 },
  { name: "Langrenus", lat: -8.9, lon: 60.9, size: 132 },
  { name: "Petavius", lat: -25.3, lon: 60.4, size: 177 },
  { name: "Humboldt", lat: -27.0, lon: 80.9, size: 207 },
  { name: "Janssen", lat: -45.0, lon: 40.0, size: 190 }
];

export const MARIA = [
  { name: "Mare Tranquillitatis", lat: 8.5, lon: 31.4, size: 873 },
  { name: "Mare Serenitatis", lat: 28.0, lon: 17.5, size: 707 },
  { name: "Mare Crisium", lat: 17.0, lon: 59.1, size: 418 },
  { name: "Mare Imbrium", lat: 32.8, lon: -15.6, size: 1145 },
  { name: "Oceanus Procellarum", lat: 18.4, lon: -57.4, size: 2568 },
  { name: "Mare Nubium", lat: -21.3, lon: -16.6, size: 715 },
  { name: "Mare Humorum", lat: -24.4, lon: -38.6, size: 389 },
  { name: "Mare Fecunditatis", lat: -7.8, lon: 51.3, size: 909 },
  { name: "Mare Nectaris", lat: -15.2, lon: 35.5, size: 333 },
  { name: "Mare Frigoris", lat: 56.0, lon: 1.4, size: 1596 },
  { name: "Mare Vaporum", lat: 13.3, lon: 3.6, size: 245 },
  { name: "Sinus Medii", lat: 2.4, lon: -1.0, size: 335 }
];

export const RESOURCES = [
  // Water Ice deposits (polar regions) - consolidated to reduce overlap
  { name: "South Pole Water Ice", type: "water", subtype: "Permanently Shadowed", lat: -89.0, lon: 0.0, radius: 150, concentration: 0.90, description: "Permanently shadowed regions at south pole including Shackleton, Haworth, and Faustini craters with 5-10% water ice concentration" },
  { name: "Cabeus Water Ice", type: "water", subtype: "LCROSS Impact Site", lat: -85.4, lon: -42.0, radius: 100, concentration: 0.88, description: "Confirmed by LCROSS impact mission with ~5.6% water ice by mass" },
  { name: "Southwest Pole Water", type: "water", subtype: "Amundsen Region", lat: -84.8, lon: 85.0, radius: 120, concentration: 0.75, description: "Amundsen crater region with scattered cold traps and potential ice deposits" },
  { name: "Far South Pole Water", type: "water", subtype: "Sverdrup-de Gerlache", lat: -88.3, lon: -120.0, radius: 90, concentration: 0.78, description: "Connected permanently shadowed regions near lunar south pole" },
  
  // Helium-3 deposits (mare regions, from solar wind implantation)
  { name: "Mare Tranquillitatis He-3", type: "helium", subtype: "³He from Solar Wind", lat: 8.5, lon: 31.4, radius: 400, concentration: 0.85, description: "High-Ti basalts with ~15-20 ppb ³He implanted by solar wind over 3.6 billion years" },
  { name: "Oceanus Procellarum He-3", type: "helium", subtype: "³He, Highest Yield", lat: 18.4, lon: -57.4, radius: 800, concentration: 0.90, description: "Largest mare basin with extensive ilmenite-rich regolith providing maximum ³He yield potential" },
  { name: "Mare Imbrium He-3", type: "helium", subtype: "³He in Regolith", lat: 32.8, lon: -15.6, radius: 500, concentration: 0.80, description: "Ancient impact basin filled with titanium-bearing basalts accumulating solar wind ³He" },
  { name: "Mare Serenitatis He-3", type: "helium", subtype: "³He Deposits", lat: 28.0, lon: 17.5, radius: 350, concentration: 0.78, description: "Mare basalts with moderate ³He concentration from extended solar wind exposure" },
  { name: "Mare Fecunditatis He-3", type: "helium", subtype: "³He Resource", lat: -7.8, lon: 51.3, radius: 450, concentration: 0.72, description: "Eastern mare with consistent ³He distribution in titanium-rich surface materials" },

  // Titanium deposits (ilmenite FeTiO₃ in mare basalts)
  { name: "Mare Tranquillitatis Ti", type: "titanium", subtype: "High-Ti Basalt (13%)", lat: 8.5, lon: 31.4, radius: 300, concentration: 0.90, description: "Very high titanium basalts with 10-13% TiO₂ in ilmenite (FeTiO₃) and pyroxene" },
  { name: "Oceanus Procellarum Ti", type: "titanium", subtype: "Ilmenite (FeTiO₃)", lat: 23.0, lon: -51.0, radius: 400, concentration: 0.85, description: "Extensive titanium deposits in ilmenite-bearing basalts, economically viable for oxygen extraction" },
  { name: "Mare Serenitatis Ti", type: "titanium", subtype: "Moderate-Ti (6-8%)", lat: 28.0, lon: 17.5, radius: 250, concentration: 0.75, description: "Moderate titanium content in younger basalt flows with 6-8% TiO₂" },
  { name: "Mare Moscoviense Ti", type: "titanium", subtype: "Farside Ti Basalt", lat: 27.3, lon: 147.9, radius: 140, concentration: 0.70, description: "Rare farside titanium deposit in isolated mare basalt unit" },
  
  // KREEP deposits (K-Potassium, REE-Rare Earth Elements, P-Phosphorus)
  { name: "Oceanus Procellarum KREEP", type: "kreep", subtype: "K, REE, P, Th, U", lat: 26.0, lon: -15.0, radius: 500, concentration: 0.88, description: "Procellarum KREEP Terrane with high potassium, thorium, uranium, and rare earth elements from late-stage magma differentiation" },
  { name: "Mare Imbrium KREEP", type: "kreep", subtype: "Thorium Anomaly", lat: 38.0, lon: -17.0, radius: 400, concentration: 0.82, description: "Imbrium impact ejecta enriched in KREEP materials excavated from lunar mantle" },
  { name: "Aristarchus Plateau KREEP", type: "kreep", subtype: "Volcanic KREEP", lat: 26.0, lon: -47.0, radius: 150, concentration: 0.75, description: "Volcanic plateau with KREEP-rich basalts indicating evolved magma composition" },
  
  // Mineral deposits (detailed by composition)
  { name: "Aristarchus Pyroclastics", type: "minerals", subtype: "TiO₂, Glass Beads", lat: 26.8, lon: -50.8, radius: 40, concentration: 0.85, description: "Dark mantle deposits rich in volcanic glass beads with 8-10% titanium oxide and orange glass spherules" },
  { name: "Reiner Gamma Swirl", type: "minerals", subtype: "High-Albedo Regolith", lat: 7.5, lon: -59.0, radius: 70, concentration: 0.70, description: "Magnetic anomaly with high-albedo feldspar-rich regolith, possibly sorted by solar wind deflection" },
  { name: "South Pole-Aitken Basin", type: "minerals", subtype: "Olivine, Pyroxene", lat: -50.0, lon: -165.0, radius: 1200, concentration: 0.65, description: "Ancient impact basin (4.3 Gya) exposing lunar mantle with mafic minerals: olivine (Mg,Fe)₂SiO₄ and low-calcium pyroxene" },
  { name: "Tycho Central Peak", type: "minerals", subtype: "Anorthosite (CaAl₂Si₂O₈)", lat: -43.31, lon: -11.36, radius: 120, concentration: 0.72, description: "Central peak uplift exposing pristine anorthositic highland crust composed of plagioclase feldspar" },
  { name: "Copernicus Ejecta", type: "minerals", subtype: "Mixed Regolith", lat: 9.62, lon: -20.08, radius: 130, concentration: 0.68, description: "Bright ray system with freshly excavated minerals from 800m depth: olivine, pyroxene, and iron-bearing glass" },
  { name: "Mare Moscoviense", type: "minerals", subtype: "High-Ti Basalt", lat: 27.3, lon: 147.9, radius: 180, concentration: 0.80, description: "Rare farside mare with titanium-rich basalts (6-8% TiO₂) and clinopyroxene from 3.2 Gya volcanism" },
  { name: "Orientale Basin Ring", type: "minerals", subtype: "Impact Breccia", lat: -19.4, lon: -92.8, radius: 300, concentration: 0.75, description: "Multi-ring impact structure (3.8 Gya) with mixed crustal fragments: noritic anorthosite and melt breccia" },
  { name: "Compton-Belkovich Thorium", type: "minerals", subtype: "Th, U, Granite", lat: 61.1, lon: 99.5, radius: 50, concentration: 0.78, description: "Rare silicic volcanic complex with granite composition enriched in incompatible elements: thorium (20+ ppm) and uranium" }
];

// Status colors
export const STATUS_COLORS = {
  'impactor': 0xff3366,
  'crashed': 0xffee55,
  'landed': 0x66ff66,
  'orbiting': 0x00ffff,
  'returned': 0xffffff,
  'equipment': 0x66ff66
};

// Resource colors
export const RESOURCE_COLORS = {
  'water': 0x64c8ff,
  'helium': 0xff64ff,
  'titanium': 0xff9600,
  'kreep': 0xffff64,
  'minerals': 0x64ff96
};
