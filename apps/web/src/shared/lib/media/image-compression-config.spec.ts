import { describe, expect, test } from 'bun:test';

import {
  IMAGE_COMPRESSION_DEFAULTS,
  imageCompressionConfigSchema,
} from './image-compression-config';

describe('imageCompressionConfigSchema', () => {
  test('accepts the defaults', () => {
    expect(imageCompressionConfigSchema.safeParse(IMAGE_COMPRESSION_DEFAULTS).success).toBe(
      true
    );
  });

  test('accepts the quality boundaries, 1 and 100', () => {
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        quality: 1,
      }).success
    ).toBe(true);
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        quality: 100,
      }).success
    ).toBe(true);
  });

  test('rejects a quality outside 1-100', () => {
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        quality: 0,
      }).success
    ).toBe(false);
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        quality: 101,
      }).success
    ).toBe(false);
  });

  test('rejects a non-integer quality', () => {
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        quality: 82.5,
      }).success
    ).toBe(false);
  });

  test('rejects a maxWidth outside its allowed range', () => {
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        maxWidth: 0,
      }).success
    ).toBe(false);
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        maxWidth: 100000,
      }).success
    ).toBe(false);
  });

  test('rejects a format outside the fixed set', () => {
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        format: 'jpeg',
      }).success
    ).toBe(false);
  });

  test('accepts the "original" format, the escape hatch from webp', () => {
    expect(
      imageCompressionConfigSchema.safeParse({
        ...IMAGE_COMPRESSION_DEFAULTS,
        format: 'original',
      }).success
    ).toBe(true);
  });

  test('rejects a config missing a required field', () => {
    const { enabled: _enabled, ...withoutEnabled } = IMAGE_COMPRESSION_DEFAULTS;
    expect(imageCompressionConfigSchema.safeParse(withoutEnabled).success).toBe(false);
  });
});
