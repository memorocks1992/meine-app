import { describe, expect, it } from 'vitest';
import { layoutMapLabels } from './map-label-layout';
import type { MapLabel } from './map-label-layout';

describe('layoutMapLabels', () => {
  it('keeps overlapping labels separated within the map', () => {
    const labels: MapLabel[] = Array.from({ length: 14 }, (_, index) => ({
      id: `club-${index}`,
      x: 180 + (index % 3) * 3,
      y: 180 + (index % 4) * 3,
      width: 90 + index,
      height: 24,
      preferredX: 0,
      preferredY: 0,
      selected: false,
    }));
    const positions = layoutMapLabels(labels, 360, 390);
    const rectangles = labels.map((label) => {
      const position = positions.get(label.id);
      expect(position).toBeTruthy();
      const [x, y] = position!;
      return {
        left: label.x + x - label.width / 2,
        right: label.x + x + label.width / 2,
        top: label.y + y - label.height / 2,
        bottom: label.y + y + label.height / 2,
      };
    });
    for (const [index, rectangle] of rectangles.entries()) {
      expect(rectangle.left).toBeGreaterThanOrEqual(0);
      expect(rectangle.right).toBeLessThanOrEqual(360);
      expect(rectangle.top).toBeGreaterThanOrEqual(0);
      expect(rectangle.bottom).toBeLessThanOrEqual(390);
      for (const other of rectangles.slice(index + 1)) {
        expect(rectangle.right <= other.left || other.right <= rectangle.left
          || rectangle.bottom <= other.top || other.bottom <= rectangle.top).toBe(true);
      }
    }
  });

  it('prioritizes the selected club when there is insufficient space', () => {
    const labels: MapLabel[] = ['other', 'selected'].map((id) => ({
      id, x: 50, y: 20, width: 80, height: 24, preferredX: 0, preferredY: 0, selected: id === 'selected',
    }));
    const positions = layoutMapLabels(labels, 100, 40);
    expect(positions.get('selected')).toBeTruthy();
    expect(positions.get('other')).toBeNull();
  });

  it('hides labels whose club is outside the visible map', () => {
    const positions = layoutMapLabels([{
      id: 'outside', x: -1, y: 20, width: 60, height: 24, preferredX: 10, preferredY: 0, selected: false,
    }], 100, 100);
    expect(positions.get('outside')).toBeNull();
  });
});
