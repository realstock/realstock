const fs = require('fs');

let file = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Add new states
if (!file.includes('availableCities')) {
  file = file.replace(
    'const [availablePropertyTypes, setAvailablePropertyTypes] = useState<string[]>([]);',
    `const [availablePropertyTypes, setAvailablePropertyTypes] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState("");`
  );
}

// 2. Add neighborhood to dependency array
if (!file.includes('neighborhood,')) {
  file = file.replace(
    'city,\n    bedroomsMin',
    'city,\n    neighborhood,\n    bedroomsMin'
  );
}

if (!file.includes('neighborhood: neighborhood,')) {
  file = file.replace(
    'city,\n        bedroomsMin',
    'city,\n        neighborhood,\n        bedroomsMin'
  );
}

// 3. Clear neighborhood
if (!file.includes('setNeighborhood("");')) {
  file = file.replace(
    'setCity("");\n    setBedroomsMin',
    'setCity("");\n    setNeighborhood("");\n    setBedroomsMin'
  );
}

// 4. Update loadFilters signature and useEffect
if (!file.includes('url.searchParams.set("state", uf)')) {
  file = file.replace(
    /async function loadFilters\(\) \{[\s\S]*?console.error\("Falha ao buscar filtros:", e\);\n    \}\n  \}/g,
    `async function loadFilters(uf?: string, cidade?: string) {
    try {
      const url = new URL("/api/properties/filters", window.location.origin);
      if (uf) url.searchParams.set("state", uf);
      if (cidade) url.searchParams.set("city", cidade);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        if (!uf) setAvailableStates(data.states || []);
        if (!uf) setAvailableCountries(data.countries || []);
        if (!uf) setAvailablePropertyTypes(data.propertyTypes || []);
        if (data.cities) setAvailableCities(data.cities || []);
        if (data.neighborhoods) setAvailableNeighborhoods(data.neighborhoods || []);
      }
    } catch (e) {
      console.error("Falha ao buscar filtros:", e);
    }
  }

  useEffect(() => {
    loadFilters(stateName, city);
  }, [stateName, city]);`
  );
}

// Remove empty loadFilters from initial properties useEffect if any
file = file.replace(
  /loadFilters\(\);\n  \}, \[\]\);/g,
  `// loadFilters initial hook handled implicitly now\n  }, []);`
);

// 5. Add flyTo logic to Aplicar button
const flyToLogic = `
  async function handleApplyFilters() {
    if (neighborhood && city && stateName) {
      try {
        setLoading(true);
        const res = await fetch(\`https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(neighborhood + ", " + city + ", " + stateName + ", Brasil")}&format=json&limit=1\`);
        const data = await res.json();
        if (data && data.length > 0) {
          const bb = data[0].boundingbox;
          handleClusterZoomRequest({ north: parseFloat(bb[1]), south: parseFloat(bb[0]), west: parseFloat(bb[2]), east: parseFloat(bb[3]) });
          return;
        }
      } catch(e) {}
    } else if (city && stateName) {
      try {
        setLoading(true);
        const res = await fetch(\`https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(city + ", " + stateName + ", Brasil")}&format=json&limit=1\`);
        const data = await res.json();
        if (data && data.length > 0) {
          const bb = data[0].boundingbox;
          handleClusterZoomRequest({ north: parseFloat(bb[1]), south: parseFloat(bb[0]), west: parseFloat(bb[2]), east: parseFloat(bb[3]) });
          return;
        }
      } catch(e) {}
    } else if (stateName && BRAZIL_STATE_BOUNDS[stateName]) {
      handleClusterZoomRequest(BRAZIL_STATE_BOUNDS[stateName]);
      return;
    }
    
    if (bounds) loadFilteredProperties(bounds);
    else loadInitialProperties();
  }
`;

if (!file.includes('async function handleApplyFilters')) {
  file = file.replace(
    'function clearFilters() {',
    flyToLogic + '\n  function clearFilters() {'
  );
}

// Map the old onClick of the button to handleApplyFilters
file = file.replace(
  /onClick=\{\(\) =>\s*bounds \? loadFilteredProperties\(bounds\) : loadInitialProperties\(\)\s*\}/g,
  `onClick={handleApplyFilters}`
);


// 6. Update HTML elements: make City a select, add Neighborhood select
const selectCityAndNeighborhood = `
                <Grid2>
                  <Field label="Cidade">
                    <select
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setNeighborhood("");
                      }}
                      className="input"
                    >
                      <option value="">Todas</option>
                      {availableCities.map(c => (
                         <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Bairro">
                    <select
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="input"
                    >
                      <option value="">Todos</option>
                      {availableNeighborhoods.map(b => (
                         <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </Field>
                </Grid2>
`;

file = file.replace(
  /<Field label="Cidade">\s*<input\s*value=\{city\}\s*onChange=\{\(e\) => setCity\(e\.target\.value\)\}\s*className="input"\s*placeholder="Trairi"\s*\/>\s*<\/Field>/g,
  selectCityAndNeighborhood.replace('<Grid2>', '').replace('</Grid2>', '')
);


// wait, earlier it was:
// <Field label="Estado"> ... </Field>
// <Field label="Cidade"> ... <input value={city} ... /> </Field>
// wrapped in <Grid2>
/*
              <Grid2>
                <Field label="Estado">
...
                </Field>

                <Field label="Cidade">
                  <input
                    value={city}
                    ...
                  />
                </Field>
              </Grid2>
*/

// Let's do a reliable replacement for the grid2 block specifically:
const oldBlock = \`                <Field label="Cidade">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input"
                    placeholder="Trairi"
                  />
                </Field>\`;

if (file.includes('placeholder="Trairi"')) {
   file = file.replace(oldBlock, \`                <Field label="Cidade">
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setNeighborhood("");
                    }}
                    className="input"
                  >
                    <option value="">Todas</option>
                    {availableCities.map(c => (
                       <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </Grid2>

              <Grid2>
                <Field label="Bairro">
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="input"
                  >
                    <option value="">Todos</option>
                    {availableNeighborhoods.map(b => (
                       <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Field>      
\`);
}

fs.writeFileSync('app/page.tsx', file);
console.log("Patched successfully!");
