/** Downloads exact official provider archives and verifies every cached read. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { cacheDirectory, testsRoot } from './paths.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(testsRoot, 'providers.json'), 'utf8'));
const maximumArchiveBytes = 128 * 1024 * 1024;

/** Returns original bytes only when their SHA-256 matches the committed manifest. */
export async function getProviderArchive(provider) {
	const specification = manifest[provider];
	if (!specification) {
		throw new Error('Unknown test provider: ' + provider);
	}
	const filename = path.basename(new URL(specification.url).pathname);
	const cachePath = path.join(cacheDirectory, filename);
	let bytes;
	if (fs.existsSync(cachePath)) {
		bytes = fs.readFileSync(cachePath);
	} else {
		const response = await fetch(specification.url, { signal: AbortSignal.timeout(60_000) });
		if (!response.ok || Number(response.headers.get('content-length')) > maximumArchiveBytes) {
			throw new Error('Provider archive download failed: ' + filename + ' (' + response.status + ').');
		}
		bytes = Buffer.from(await response.arrayBuffer());
	}
	if (bytes.length > maximumArchiveBytes || createHash('sha256').update(bytes).digest('hex') !== specification.sha256) {
		throw new Error('Provider SHA-256 mismatch: ' + filename + '. Do not update the expected hash without reviewing the provider.');
	}
	if (!fs.existsSync(cachePath)) {
		fs.mkdirSync(cacheDirectory, { recursive: true });
		fs.writeFileSync(cachePath, bytes);
	}
	return new File([bytes], filename);
}
