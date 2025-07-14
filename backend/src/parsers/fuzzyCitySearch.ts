import Fuse from 'fuse.js';
import cities from '../data/cities.json';

const fuse = new Fuse(cities, { includeScore: true, threshold: 0.3 });

export function fuzzyCitySearch(city: string) {
  return fuse.search(city);
}

export default fuse;
