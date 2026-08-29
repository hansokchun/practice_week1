import type { ExploreBounds } from "./explore-photo-repository";

type ExploreMarkerPhoto = {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
};

export type ExploreMarkerCluster = {
  readonly id: string;
  readonly photoIds: readonly string[];
  readonly latitude: number;
  readonly longitude: number;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly pointBounds: ExploreBounds;
};

const DEFAULT_CLUSTER_THRESHOLD_PERCENT = 5;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function createExploreMarkerClusters(
  photos: readonly ExploreMarkerPhoto[],
  bounds: ExploreBounds,
  thresholdPercent = DEFAULT_CLUSTER_THRESHOLD_PERCENT
): readonly ExploreMarkerCluster[] {
  if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0) {
    throw new TypeError("Explore marker threshold must be positive");
  }
  if (photos.length === 0) return [];

  const width = bounds.east - bounds.west;
  const height = bounds.north - bounds.south;
  if (!(width > 0) || !(height > 0)) throw new TypeError("Explore bounds are invalid");

  const points = photos.map((photo) => ({
    id: photo.id,
    latitude: photo.lat,
    longitude: photo.lng,
    x: ((photo.lng - bounds.west) / width) * 100,
    y: ((bounds.north - photo.lat) / height) * 100
  }));
  const parents = points.map((_, index) => index);

  function find(index: number): number {
    let root = index;
    while (parents[root] !== root) root = parents[root] ?? root;
    while (parents[index] !== index) {
      const next = parents[index] ?? index;
      parents[index] = root;
      index = next;
    }
    return root;
  }

  function union(left: number, right: number) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  }

  const cells = new Map<string, number[]>();
  const thresholdSquared = thresholdPercent * thresholdPercent;
  points.forEach((point, index) => {
    const cellX = Math.floor(point.x / thresholdPercent);
    const cellY = Math.floor(point.y / thresholdPercent);
    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        for (const candidateIndex of cells.get(`${x}:${y}`) ?? []) {
          const candidate = points[candidateIndex];
          if (candidate === undefined) continue;
          const horizontal = point.x - candidate.x;
          const vertical = point.y - candidate.y;
          if ((horizontal * horizontal) + (vertical * vertical) <= thresholdSquared) {
            union(index, candidateIndex);
          }
        }
      }
    }
    const key = `${cellX}:${cellY}`;
    const cell = cells.get(key);
    if (cell === undefined) cells.set(key, [index]);
    else cell.push(index);
  });

  const groups = new Map<number, number[]>();
  points.forEach((_, index) => {
    const root = find(index);
    const group = groups.get(root);
    if (group === undefined) groups.set(root, [index]);
    else group.push(index);
  });

  return [...groups.values()]
    .sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0))
    .map((indices) => {
      const clusterPoints = indices.flatMap((index) => points[index] === undefined ? [] : [points[index]]);
      const photoIds = clusterPoints.map((point) => point.id);
      const leftPercent = clusterPoints.reduce((sum, point) => sum + point.x, 0) / clusterPoints.length;
      const topPercent = clusterPoints.reduce((sum, point) => sum + point.y, 0) / clusterPoints.length;
      return {
        id: `cluster:${[...photoIds].sort().join("|")}`,
        photoIds,
        latitude: clusterPoints.reduce((sum, point) => sum + point.latitude, 0) / clusterPoints.length,
        longitude: clusterPoints.reduce((sum, point) => sum + point.longitude, 0) / clusterPoints.length,
        leftPercent: clamp(leftPercent, 8, 92),
        topPercent: clamp(topPercent, 20, 74),
        pointBounds: {
          north: Math.max(...clusterPoints.map((point) => point.latitude)),
          south: Math.min(...clusterPoints.map((point) => point.latitude)),
          east: Math.max(...clusterPoints.map((point) => point.longitude)),
          west: Math.min(...clusterPoints.map((point) => point.longitude))
        }
      };
    });
}

export function getExploreClusterZoomBounds(cluster: ExploreMarkerCluster): ExploreBounds {
  const latitudeDelta = Math.max(0.01, cluster.pointBounds.north - cluster.pointBounds.south);
  const longitudeDelta = Math.max(0.012, cluster.pointBounds.east - cluster.pointBounds.west);
  const latitudePadding = latitudeDelta * 0.18;
  const longitudePadding = longitudeDelta * 0.18;
  return {
    north: Math.min(90, cluster.pointBounds.north + latitudePadding),
    south: Math.max(-90, cluster.pointBounds.south - latitudePadding),
    east: Math.min(180, cluster.pointBounds.east + longitudePadding),
    west: Math.max(-180, cluster.pointBounds.west - longitudePadding)
  };
}

export function getNextExploreClusterPhotoId(
  photoIds: readonly string[],
  selectedPhotoId: string | null
): string | null {
  if (photoIds.length === 0) return null;
  const selectedIndex = selectedPhotoId === null ? -1 : photoIds.indexOf(selectedPhotoId);
  return photoIds[(selectedIndex + 1) % photoIds.length] ?? photoIds[0] ?? null;
}
