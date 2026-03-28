import mapData from '../assets/map_topology.json';

export interface UserProfile {
  id: string;
  name: string;
  nodeId: string;
  category: 'residential' | 'commercial' | 'critical';
  categoryLabel: string;
  categoryIcon: string;
  address: string;
  priority: boolean;
  monthlyUsageLitres: number;
  ratePerKL: number;
}

/* ── Indian name pools ─────────────────────────────────── */
const FIRST = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
  'Ananya','Diya','Myra','Sara','Aadhya','Isha','Kavya','Riya','Priya','Meera',
  'Rajesh','Sunil','Pradeep','Vikram','Manoj','Neha','Pooja','Sunita','Rekha','Kiran'];
const LAST = ['Sharma','Patel','Singh','Kumar','Gupta','Verma','Joshi','Mehta','Reddy','Nair',
  'Kapoor','Malhotra','Bhat','Chauhan','Rao','Iyer','Pillai','Chopra','Saxena','Mishra'];

const HOSPITALS = ['PGIMER Wing','Civil Hospital','Govt. Health Centre','PHC Clinic','CHC Ward'];
const COMMERCIAL = ['Elante Mall Unit','IT Park Office','Sector Market','Industrial Estate','Tribune Complex'];

/* ── Deterministic hash for stable names ───────────────── */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ── Map lat/lng to Chandigarh sector number ───────────── */
// Chandigarh sectors form a grid: rows run NW→SE (by lat), cols run NE→SW (by lng)
// Our projection spans roughly lat 30.717–30.770, lng 76.744–76.806
function getSectorFromCoords(lat: number | undefined, lng: number | undefined): number {
  if (!lat || !lng) return 17; // default to central sector
  
  // Normalize to 0–1 within our projection bounds
  const latMin = 30.717, latMax = 30.770;
  const lngMin = 76.744, lngMax = 76.806;
  const ny = Math.max(0, Math.min(1, (lat - latMin) / (latMax - latMin))); // 0=south, 1=north
  const nx = Math.max(0, Math.min(1, (lng - lngMin) / (lngMax - lngMin))); // 0=west, 1=east
  
  // Chandigarh sector grid (approx 8 rows × 6 cols)
  // North = Sectors 1-6, South = Sectors 42-47
  const row = Math.floor((1 - ny) * 7.99); // 0=north, 7=south
  const col = Math.floor(nx * 5.99);        // 0=west, 5=east
  
  // Sector mapping grid (north to south, west to east)
  const sectorGrid: number[][] = [
    [ 1,  2,  3,  4,  5,  6],   // row 0 (northmost)
    [ 7,  8,  9, 10, 11, 12],   // row 1
    [14, 15, 16, 17, 18, 19],   // row 2
    [20, 21, 22, 23, 24, 25],   // row 3
    [26, 27, 28, 29, 30, 31],   // row 4
    [32, 33, 34, 35, 36, 37],   // row 5
    [38, 39, 40, 41, 42, 43],   // row 6
    [44, 45, 46, 47, 48, 49],   // row 7 (southmost)
  ];
  
  return sectorGrid[row]?.[col] ?? 17;
}

/* ── Generate profiles from real topology ──────────────── */
const profiles: UserProfile[] = [];
const profileMap = new Map<string, UserProfile>();

for (const node of (mapData.nodes as any[])) {
  if (node.is_source) continue; // sources aren't consumer nodes
  
  const h = hashStr(node.id);
  const crit: number = node.criticality ?? 0;
  
  const category = crit >= 2 ? 'critical' : crit === 1 ? 'commercial' : 'residential';
  const categoryLabel = crit >= 2 ? '🏥 Hospital / Critical' : crit === 1 ? '🏢 Commercial' : '🏠 Residential';
  const categoryIcon = crit >= 2 ? '🏥' : crit === 1 ? '🏢' : '🏠';

  let name: string;
  if (crit >= 2) {
    name = HOSPITALS[h % HOSPITALS.length];
  } else if (crit === 1) {
    name = COMMERCIAL[h % COMMERCIAL.length];
  } else {
    name = `${FIRST[h % FIRST.length]} ${LAST[(h >> 4) % LAST.length]}`;
  }

  const zone = node.zone_id || 'DMA-1';
  // Derive sector from actual lat/lng so it matches the city map tiles
  const sectorNum = getSectorFromCoords(node.lat, node.lng);
  const address = `Sector ${sectorNum}, ${zone}`;

  const baseDemand = node.base_demand || 0.5;
  const monthlyUsageLitres = Math.round(baseDemand * 3600 * 8 * 30); // 8 hrs/day supply

  const profile: UserProfile = {
    id: node.id,
    name,
    nodeId: node.id,
    category,
    categoryLabel,
    categoryIcon,
    address,
    priority: crit >= 2,
    monthlyUsageLitres,
    ratePerKL: crit >= 2 ? 0 : crit === 1 ? 18 : 8, // ₹/kL
  };
  profiles.push(profile);
  profileMap.set(node.id, profile);
}

// Sort: critical first, then commercial, then residential
profiles.sort((a, b) => {
  const order = { critical: 0, commercial: 1, residential: 2 };
  return order[a.category] - order[b.category];
});

export const allProfiles = profiles;
export const getProfile = (nodeId: string) => profileMap.get(nodeId);
export const defaultConsumerNode = profiles[0]?.nodeId || 'n1';
