import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chunkCache, transcribePiece, type Recording } from '../../src/voice/asr';

test('diarization failure falls back to text with an unverified speaker', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'yj-asr-test-'));
  const source = join(folder, 'sample.m4a');
  const originalFetch = globalThis.fetch;
  const formats: string[] = [];
  try {
    await writeFile(source, 'sample audio');
    const recording: Recording = { source, relative: 'sample.m4a', duration: 2, bytes: 12n,
      signature: 'test', cache: join(folder, 'cache'), pieces: [{ index: 0, start: 0, end: 2, keepStart: 0, keepEnd: 2 }] };
    globalThis.fetch = async (_url, init) => {
      assert.ok(init?.body instanceof FormData);
      formats.push(String(init.body.get('response_format')));
      return formats.length === 1
        ? Response.json({ base_resp: { status_msg: 'speaker diarization failed (1033)' } }, { status: 500 })
        : Response.json({ text: '测试原文', duration: 2 });
    };
    assert.equal(await transcribePiece(recording, recording.pieces[0], { key: 'test', endpoint: 'https://example.test' }), 'transcribed');
    const raw = JSON.parse(await readFile(chunkCache(recording, recording.pieces[0]), 'utf8'));
    assert.deepEqual(formats, ['verbose_json', 'json']);
    assert.equal(raw.segments[0].speaker, 'unverified');
    assert.equal(raw.segments[0].text, '测试原文');
  } finally {
    globalThis.fetch = originalFetch;
    await rm(folder, { recursive: true, force: true });
  }
});
