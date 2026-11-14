// South polar stereographic, same as the LOLA DEM: +proj=stere +lat_0=-90 +lon_0=0 +R=1737400.
// x/y in metres, pole at (0, 0), 0°E straight up, 90°E to the right.
export const MOON_R = 1_737_400;

export function polarXY(lat: number, lonE: number): { x: number; y: number } {
  const rho = 2 * MOON_R * Math.tan(((90 + lat) * Math.PI) / 360);
  const lon = (lonE * Math.PI) / 180;
  return { x: rho * Math.sin(lon), y: rho * Math.cos(lon) };
}

export interface Basemap {
  image: string;
  x_min_m: number;
  x_max_m: number;
  y_min_m: number;
  y_max_m: number;
  credit?: string;
}
