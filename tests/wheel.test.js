import { describe, it, expect } from "vitest";
import { indexAtPointer, targetRotation, easeOut } from "../src/domain/wheel.js";
import { formatAirDate } from "../src/domain/catalogue.js";

describe("wheel maths", () => {
  it("lands on the requested segment for every count, index and jitter", () => {
    for (let count = 1; count <= 12; count++) {
      for (let index = 0; index < count; index++) {
        for (const jitter of [-0.45, -0.2, 0, 0.3, 0.45]) {
          for (const current of [0, 1.234, 40.5, -3]) {
            const r = targetRotation(current, index, count, { jitter });
            expect(indexAtPointer(r, count)).toBe(index);
          }
        }
      }
    }
  });
  it("always spins forward by at least the requested turns", () => {
    for (const current of [0, 2.5, 100]) {
      const r = targetRotation(current, 3, 10, { turns: 5 });
      expect(r - current).toBeGreaterThanOrEqual(5 * 2 * Math.PI);
      expect(r - current).toBeLessThan(6 * 2 * Math.PI);
    }
  });
  it("clamps extreme jitter so it cannot spill into a neighbouring segment", () => {
    const r = targetRotation(0, 4, 8, { jitter: 5 });
    expect(indexAtPointer(r, 8)).toBe(4);
  });
  it("eases from 0 to 1 and never decreases", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeOut(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("formatAirDate", () => {
  it("formats ISO dates without locale surprises", () => {
    expect(formatAirDate("2002-10-20")).toBe("20 Oct 2002");
    expect(formatAirDate("2007-02-04")).toBe("4 Feb 2007");
    expect(formatAirDate("2011-09-01")).toBe("1 Sep 2011");
  });
});
