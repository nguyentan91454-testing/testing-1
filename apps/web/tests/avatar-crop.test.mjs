import assert from "node:assert/strict";
import { test } from "node:test";
import { avatarCropGeometry, avatarFileError, constrainAvatarCrop, drawAvatarCrop, initialAvatarCrop } from "../src/lib/avatar-crop.ts";

test("landscape and portrait images cover the crop and cannot be dragged beyond an edge", () => {
  for (const [width, height] of [[1200, 600], [600, 1200], [600, 600]]) {
    for (const rotation of [0, 90, 180, 270]) {
      for (const zoom of [1, 1.5, 3]) {
        for (const direction of [-1, 1]) {
          const crop = constrainAvatarCrop(width, height, { zoom, rotation, x: direction * 10000, y: direction * 10000 });
          const geometry = avatarCropGeometry(width, height, crop);
          const sideways = rotation % 180 !== 0;
          const halfWidth = (sideways ? height : width) * geometry.scale / 2;
          const halfHeight = (sideways ? width : height) * geometry.scale / 2;
          assert.ok(halfWidth - Math.abs(crop.x) >= 160 - 1e-8, "horizontal coverage");
          assert.ok(halfHeight - Math.abs(crop.y) >= 160 - 1e-8, "vertical coverage");
        }
      }
    }
  }
});

test("rotation swaps the available panning axis and recenters the narrow axis", () => {
  assert.deepEqual(constrainAvatarCrop(1200, 600, { ...initialAvatarCrop, x: 100, y: 100 }), { zoom: 1, rotation: 0, x: 100, y: 0 });
  assert.deepEqual(constrainAvatarCrop(1200, 600, { zoom: 1, rotation: 90, x: 100, y: 100 }), { zoom: 1, rotation: 90, x: 0, y: 100 });
});

test("zooming back out clamps an off-center crop and enforces the supported range", () => {
  const crop = constrainAvatarCrop(600, 600, { zoom: 3, rotation: 0, x: 900, y: -900 });
  assert.equal(crop.x, 320);
  assert.equal(crop.y, -320);
  const reset = constrainAvatarCrop(600, 600, { ...crop, zoom: 0.5 });
  assert.equal(reset.zoom, 1);
  assert.ok(reset.x === 0 && reset.y === 0);
  assert.equal(constrainAvatarCrop(600, 600, { ...crop, zoom: 10 }).zoom, 3);
});

test("preview and exported image use the same transform at every output size", () => {
  for (const size of [42, 128, 320, 512]) {
    const operations = [];
    const context = new Proxy({}, { get: (_, key) => (...args) => operations.push([key, ...args]), set: () => true });
    const canvas = { width: size, height: size, getContext: () => context };
    const image = { naturalWidth: 1200, naturalHeight: 600 };
    drawAvatarCrop(canvas, image, { zoom: 2, rotation: 90, x: 50, y: -80 });
    assert.deepEqual(operations.find(([name]) => name === "scale"), ["scale", size / 320, size / 320]);
    assert.deepEqual(operations.find(([name]) => name === "translate"), ["translate", 210, 80]);
    assert.deepEqual(operations.find(([name]) => name === "rotate"), ["rotate", Math.PI / 2]);
    assert.deepEqual(operations.find(([name]) => name === "drawImage"), ["drawImage", image, -640, -320, 1280, 640]);
  }
});

test("rejects empty files, unsupported formats and files over 5 MB", () => {
  assert.equal(avatarFileError({ type: "image/png", size: 5 * 1024 * 1024 }), "");
  assert.equal(avatarFileError({ type: "image/webp", size: 100 }), "");
  assert.ok(avatarFileError({ type: "image/png", size: 0 }));
  assert.ok(avatarFileError({ type: "image/png", size: 5 * 1024 * 1024 + 1 }));
  assert.ok(avatarFileError({ type: "image/svg+xml", size: 100 }));
});
