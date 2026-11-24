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

  it('keeps club labels in place when a club is selected or deselected', () => {
    const labels: MapLabel[] = ['first', 'second', 'third'].map((id, index) => ({
      id,
      x: 150 + index * 6,
      y: 160 + index * 4,
      width: 100 + index * 12,
      height: 24,
      preferredX: index * 8,
      preferredY: 0,
      selected: false,
    }));
    const initial = layoutMapLabels(labels, 400, 390, 4, false, 40);
    const selected = layoutMapLabels(labels.map((label) => ({
      ...label, selected: label.id === 'second',
    })), 400, 390, 4, false, 40);

    expect(selected).toEqual(initial);
  });

  it('respects a larger requested gap between food labels', () => {
    const labels: MapLabel[] = ['first', 'second'].map((id) => ({
      id, x: 180, y: 180, width: 120, height: 24, preferredX: 0, preferredY: -58, selected: false,
    }));
    const positions = layoutMapLabels(labels, 360, 390, 14);
    const first = positions.get('first');
    const second = positions.get('second');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(Math.abs(first![0] - second![0]) >= 134 || Math.abs(first![1] - second![1]) >= 38).toBe(true);
    expect(first).toEqual([0, -58]);
  });

  it('keeps food labels in place when a restaurant is selected or deselected', () => {
    const labels: MapLabel[] = ['first', 'second'].map((id) => ({
      id, x: 180, y: 180, width: 120, height: 24, preferredX: 91, preferredY: 0, selected: false,
    }));
    const initial = layoutMapLabels(labels, 360, 390, 14, false, 34);
    const selected = layoutMapLabels(labels.map((label) => ({
      ...label, selected: label.id === 'second',
    })), 360, 390, 14, false, 34);
    expect(selected).toEqual(initial);
    expect(layoutMapLabels(labels, 360, 390, 14, false, 34)).toEqual(initial);
  });

  it('places food labels beside their markers without overlapping any marker', () => {
    const labels: MapLabel[] = [
      { id: 'left', x: 140, y: 180, width: 100, height: 24, preferredX: -81, preferredY: 0, selected: false },
      { id: 'right', x: 220, y: 180, width: 100, height: 24, preferredX: 81, preferredY: 0, selected: false },
      { id: 'nearby', x: 225, y: 230, width: 90, height: 24, preferredX: 76, preferredY: 0, selected: false },
    ];
    const positions = layoutMapLabels(labels, 400, 390, 14, false, 34);
    expect(positions.get('left')).toEqual([-81, 0]);
    expect(positions.get('right')).toEqual([81, 0]);
    for (const label of labels) {
      const position = positions.get(label.id);
      expect(position).toBeTruthy();
      const [x, y] = position!;
      const left = label.x + x - label.width / 2;
      const right = label.x + x + label.width / 2;
      const top = label.y + y - label.height / 2;
      const bottom = label.y + y + label.height / 2;
      for (const marker of labels) {
        expect(right <= marker.x - 17 - 14 || left >= marker.x + 17 + 14
          || bottom <= marker.y - 17 - 14 || top >= marker.y + 17 + 14).toBe(true);
      }
    }
  });

  it('moves a club label sideways when it would cover a location pin', () => {
    const labels: MapLabel[] = [{
      id: 'club', x: 180, y: 180, width: 100, height: 24,
      preferredX: 0, preferredY: 0, selected: false,
    }];
    const position = layoutMapLabels(labels, 360, 390, 4, true, 40).get('club');
    expect(position).toBeTruthy();
    expect(Math.abs(position![0])).toBeGreaterThanOrEqual(74);
    expect(position![1]).toBe(0);
  });

  it('avoids every club location pin when labels are close together', () => {
    const labels: MapLabel[] = [
      { id: 'a', x: 150, y: 150, width: 100, height: 24, preferredX: 20, preferredY: 0, selected: true },
      { id: 'b', x: 205, y: 160, width: 90, height: 24, preferredX: -20, preferredY: 0, selected: false },
      { id: 'c', x: 200, y: 215, width: 80, height: 24, preferredX: 0, preferredY: -30, selected: false },
    ];
    const positions = layoutMapLabels(labels, 400, 390, 4, true, 40);
    for (const label of labels) {
      const position = positions.get(label.id);
      expect(position).toBeTruthy();
      const [x, y] = position!;
      const left = label.x + x - label.width / 2;
      const right = label.x + x + label.width / 2;
      const top = label.y + y - label.height / 2;
      const bottom = label.y + y + label.height / 2;
      for (const marker of labels) {
        expect(right <= marker.x - 24 || left >= marker.x + 24
          || bottom <= marker.y - 24 || top >= marker.y + 24).toBe(true);
      }
    }
  });

  it('hides labels whose club is outside the visible map', () => {
    const positions = layoutMapLabels([{
      id: 'outside', x: -1, y: 20, width: 60, height: 24, preferredX: 10, preferredY: 0, selected: false,
    }], 100, 100);
    expect(positions.get('outside')).toBeNull();
  });
});
