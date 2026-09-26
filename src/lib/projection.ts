// Web Mercator projection, tuned to match the 704x937 basemap canvas
// (same math Google Maps uses), so markers land on real locations.
export const MAP_WIDTH = 704;
export const MAP_HEIGHT = 937;

const MLON0 = 87.55;
const MLAT0 = 27.05;
const MR = 7331.27894934242;

const mercN = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));

export const projectX = (lon: number) => (lon - MLON0) * (Math.PI / 180) * MR;
export const projectY = (lat: number) => (mercN(MLAT0) - mercN(lat)) * MR;
