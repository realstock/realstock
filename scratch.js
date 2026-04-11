const fs = require('fs');

const BRAZIL_STATE_BOUNDS = {
  "Acre": { north: -7.1, south: -11.1, east: -66.5, west: -73.9 },
  "Alagoas": { north: -8.8, south: -10.5, east: -35.1, west: -38.3 },
  "Amapá": { north: 4.4, south: -1.3, east: -49.8, west: -54.8 },
  "Amazonas": { north: 2.3, south: -9.8, east: -56.1, west: -73.8 },
  "Bahia": { north: -8.5, south: -18.3, east: -37.3, west: -46.6 },
  "Ceará": { north: -2.7, south: -7.8, east: -37.2, west: -41.4 },
  "Distrito Federal": { north: -15.5, south: -16.0, east: -47.3, west: -48.2 },
  "Espírito Santo": { north: -17.8, south: -21.3, east: -39.6, west: -41.8 },
  "Goiás": { north: -12.4, south: -19.5, east: -45.9, west: -53.2 },
  "Maranhão": { north: -1.0, south: -10.2, east: -41.8, west: -48.7 },
  "Mato Grosso": { north: -7.2, south: -17.9, east: -50.2, west: -61.5 },
  "Mato Grosso do Sul": { north: -17.1, south: -24.0, east: -50.9, west: -57.8 },
  "Minas Gerais": { north: -14.2, south: -22.9, east: -39.8, west: -51.0 },
  "Pará": { north: 2.5, south: -9.8, east: -45.9, west: -58.8 },
  "Paraíba": { north: -6.0, south: -8.3, east: -34.7, west: -38.7 },
  "Paraná": { north: -22.5, south: -26.7, east: -48.0, west: -54.6 },
  "Pernambuco": { north: -7.2, south: -9.4, east: -34.8, west: -41.3 },
  "Piauí": { north: -2.7, south: -10.9, east: -40.3, west: -45.9 },
  "Rio de Janeiro": { north: -20.7, south: -23.3, east: -40.9, west: -44.8 },
  "Rio Grande do Norte": { north: -4.8, south: -6.9, east: -34.9, west: -38.5 },
  "Rio Grande do Sul": { north: -27.0, south: -33.7, east: -49.6, west: -57.6 },
  "Rondônia": { north: -7.9, south: -13.7, east: -59.7, west: -66.8 },
  "Roraima": { north: 5.2, south: -1.5, east: -58.8, west: -64.8 },
  "Santa Catarina": { north: -25.9, south: -29.3, east: -48.3, west: -53.8 },
  "São Paulo": { north: -19.7, south: -25.3, east: -44.1, west: -53.1 },
  "Sergipe": { north: -9.5, south: -11.5, east: -36.3, west: -38.2 },
  "Tocantins": { north: -5.1, south: -13.4, east: -45.7, west: -50.7 },
};

let code = fs.readFileSync('app/page.tsx', 'utf8');

const constantsInjection = `
const BRAZIL_STATE_BOUNDS: Record<string, ClusterZoomTarget> = ${JSON.stringify(BRAZIL_STATE_BOUNDS, null, 2)};
`;

code = code.replace(
  'function formatLabel(value: string) {',
  constantsInjection + '\nfunction formatLabel(value: string) {'
);

code = code.replace(
  'onChange={(e) => setStateName(e.target.value)}',
  `onChange={(e) => {
                      const st = e.target.value;
                      setStateName(st);
                      if (st && BRAZIL_STATE_BOUNDS[st]) {
                        handleClusterZoomRequest(BRAZIL_STATE_BOUNDS[st]);
                      }
                    }}`
);

fs.writeFileSync('app/page.tsx', code);
