// httpGet: відсутній файл → FileMissingError, також коли dev-сервер/Pages віддає index.html зі статусом 200.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpGet } from './httpGet';
import { FileMissingError } from './loadRegion';

const respond = (status: number, type: string, body = 'x') => vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } }));
afterEach(() => vi.unstubAllGlobals());

describe('httpGet', () => {
  it('Given 404, Then FileMissingError', async () => {
    vi.stubGlobal('fetch', respond(404, 'text/plain'));
    await expect(httpGet('targets.geojson')).rejects.toBeInstanceOf(FileMissingError);
  });

  it('Given SPA-fallback index.html (200, text/html), Then FileMissingError', async () => {
    vi.stubGlobal('fetch', respond(200, 'text/html', '<!doctype html>'));
    await expect(httpGet('targets.geojson')).rejects.toBeInstanceOf(FileMissingError);
  });

  it('Given 500, Then звичайна помилка', async () => {
    vi.stubGlobal('fetch', respond(500, 'text/plain'));
    await expect(httpGet('region.json')).rejects.toThrow('HTTP 500');
  });

  it('Given файл, Then байти, URL через dataUrl', async () => {
    const f = respond(200, 'application/octet-stream', 'abcd');
    vi.stubGlobal('fetch', f);
    expect((await httpGet('slope.f32')).byteLength).toBe(4);
    expect(String((f.mock.calls[0] as unknown[])[0])).toMatch(/data\/gale\/slope\.f32$/);
  });
});
