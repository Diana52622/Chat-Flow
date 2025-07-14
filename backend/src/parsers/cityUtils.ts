import cities from '../data/cities.json';
import { capitalize } from '../utils/capitalize';

const citiesSet = new Set(cities.map(c => c.toLowerCase()));

export function cleanCityCandidate(candidate: string): string {
  const candidates = candidate.split(/[,;]+/).map(s => s.trim());
  for (const cand of candidates) {
    if (citiesSet.has(cand.toLowerCase())) {
      return capitalize(cand);
    }
    const words = cand.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      let part = words.slice(i, i + 2).join(' ');
      if (citiesSet.has(part.toLowerCase())) {
        return capitalize(part);
      }
      part = words[i];
      if (citiesSet.has(part.toLowerCase())) {
        return capitalize(part);
      }
    }
  }
  return '';
}
