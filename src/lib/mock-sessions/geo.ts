import type { RawSession } from '@/lib/mock-sessions/types';
import zipcodes from 'zipcodes';

export type LngLat = [number, number]; // [lng, lat]

export function aggregateZipPoints(sessions: RawSession[]): LngLat[] {
  const points: LngLat[] = [];
  for (const s of sessions) {
    const zip = readZipFromDemographics(s.demographics) || '';
    if (!zip) continue;
    const normalized = zip.replace(/[^0-9]/g, '').slice(0, 5);
    if (!/^[0-9]{5}$/.test(normalized)) continue;
    const info = zipcodes.lookup(normalized);
    if (!info || typeof info.longitude !== 'number' || typeof info.latitude !== 'number') continue;
    points.push([info.longitude, info.latitude]);
  }
  return points;
}

function readZipFromDemographics(demo: Record<string, string> | undefined): string | undefined {
  if (!demo) return undefined;
  // allow common variants and case differences
  const keys = Object.keys(demo);
  const foundKey = keys.find((k) => /^(zip\s*code|zipcode|zip|postal\s*code)$/i.test(k));
  if (foundKey) return demo[foundKey];
  return demo['Zip Code'] || demo['ZIP Code'] || demo['Zip'] || demo['Postal Code'];
}


