export interface MapLabel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preferredX: number;
  preferredY: number;
  selected: boolean;
}

interface Rectangle {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function layoutMapLabels(
  labels: MapLabel[],
  width: number,
  height: number,
): Map<string, readonly [number, number] | null> {
  const padding = 6;
  const gap = 4;
  const occupied: Rectangle[] = [];
  const result = new Map<string, readonly [number, number] | null>();
  const ordered = [...labels].sort((a, b) =>
    Number(b.selected) - Number(a.selected) || b.width - a.width || a.id.localeCompare(b.id),
  );

  for (const label of ordered) {
    const minX = padding + label.width / 2;
    const maxX = width - padding - label.width / 2;
    const minY = padding + label.height / 2;
    const maxY = height - padding - label.height / 2;
    if (label.x < 0 || label.x > width || label.y < 0 || label.y > height || minX > maxX || minY > maxY) {
      result.set(label.id, null);
      continue;
    }

    const preferredX = label.x + label.preferredX;
    const preferredY = label.y + label.preferredY;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const xs = [clamp(preferredX, minX, maxX), minX, maxX];
    const ys = [clamp(preferredY, minY, maxY), minY, maxY];
    for (const rect of occupied) {
      xs.push(rect.left - gap - label.width / 2, rect.right + gap + label.width / 2);
      ys.push(rect.top - gap - label.height / 2, rect.bottom + gap + label.height / 2);
    }

    let best: { x: number; y: number; distance: number } | undefined;
    for (const x of xs) {
      if (x < minX || x > maxX) continue;
      for (const y of ys) {
        if (y < minY || y > maxY) continue;
        const rect = {
          left: x - label.width / 2,
          right: x + label.width / 2,
          top: y - label.height / 2,
          bottom: y + label.height / 2,
        };
        if (occupied.some((other) =>
          rect.left < other.right + gap && rect.right + gap > other.left
          && rect.top < other.bottom + gap && rect.bottom + gap > other.top,
        )) continue;
        const distance = (x - preferredX) ** 2 + (y - preferredY) ** 2;
        if (!best || distance < best.distance) best = { x, y, distance };
      }
    }

    if (!best) {
      result.set(label.id, null);
      continue;
    }
    occupied.push({
      left: best.x - label.width / 2,
      right: best.x + label.width / 2,
      top: best.y - label.height / 2,
      bottom: best.y + label.height / 2,
    });
    result.set(label.id, [best.x - label.x, best.y - label.y]);
  }
  return result;
}
