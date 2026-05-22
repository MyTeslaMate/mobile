export function strideDownsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const out: T[] = new Array(target);
  const step = arr.length / target;
  for (let i = 0; i < target; i++) {
    out[i] = arr[Math.floor(i * step)];
  }
  out[target - 1] = arr[arr.length - 1];
  return out;
}

type LatLng = { latitude: number; longitude: number };

function perpDistance(p: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.longitude - a.longitude;
  const dy = b.latitude - a.latitude;
  if (dx === 0 && dy === 0) {
    const ex = p.longitude - a.longitude;
    const ey = p.latitude - a.latitude;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const num = Math.abs(dy * p.longitude - dx * p.latitude + b.longitude * a.latitude - b.latitude * a.longitude);
  const den = Math.sqrt(dx * dx + dy * dy);
  return num / den;
}

export function rdp(points: LatLng[], epsilon: number): LatLng[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > epsilon && index !== -1) {
      keep[index] = 1;
      stack.push([first, index]);
      stack.push([index, last]);
    }
  }

  const out: LatLng[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]);
  }
  return out;
}
