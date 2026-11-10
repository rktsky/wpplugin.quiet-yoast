/** Isolated official Playground test runtime; no server or persistent site. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNodeRuntime, createNodeFsMountHandler } from '@php-wasm/node';
import { bootWordPressAndRequestHandler } from '@wp-playground/wordpress';
import { getProviderArchive } from './download-providers.mjs';
import { pluginDirectory as defaultPluginDirectory } from './paths.mjs';

const playgroundPackage = path.dirname(fileURLToPath(import.meta.resolve('@wp-playground/cli/package.json')));

/** Boots unchanged WordPress/Yoast archives in memory and mounts owned code. */
export async function bootTestWordPress({ phpVersion = '8.3', pluginDirectory = defaultPluginDirectory, extraMounts = [], withYoast = true } = {}) {
	const [wordPressZip, yoastZip] = await Promise.all([
		getProviderArchive('wordpress'),
		withYoast ? getProviderArchive('yoast') : Promise.resolve(null)
	]);
	const handler = await bootWordPressAndRequestHandler({
		createPhpRuntime: () => loadNodeRuntime(phpVersion, { emscriptenOptions: { processId: 1 } }),
		phpVersion,
		siteUrl: 'http://quiet-yoast.test',
		maxPhpInstances: 1,
		cookieStore: false,
		wordPressZip,
		sqliteIntegrationPluginZip: new File([fs.readFileSync(path.join(playgroundPackage, 'sqlite-database-integration.zip'))], 'sqlite-database-integration.zip'),
		constants: {
			QUIET_YOAST_TEST_RUN: true,
			WP_DEBUG: true,
			WP_DEBUG_DISPLAY: false,
			WP_DEBUG_LOG: true,
			DISABLE_WP_CRON: true,
			WP_HTTP_BLOCK_EXTERNAL: true
		},
		hooks: {
			beforeDatabaseSetup: async php => {
				php.mkdir('/wordpress/wp-content/mu-plugins');
				php.writeFile('/wordpress/wp-content/mu-plugins/quiet-test-sideeffects.php', "<?php add_filter('pre_wp_mail', '__return_false');");
				if (yoastZip) {
					php.writeFile('/tmp/wordpress-seo.zip', new Uint8Array(await yoastZip.arrayBuffer()));
					const result = await php.run({ code: "<?php $zip = new ZipArchive(); if ($zip->open('/tmp/wordpress-seo.zip') !== true || !$zip->extractTo('/wordpress/wp-content/plugins')) { throw new RuntimeException('Could not extract the verified Yoast archive.'); } $zip->close();" });
					if (result.exitCode || result.errors) {
						throw new Error('Verified Yoast extraction failed: ' + result.errors);
					}
				}
				await php.mount('/wordpress/wp-content/plugins/rktsky-quiet-yoast', createNodeFsMountHandler(pluginDirectory));
				for (const [target, source] of extraMounts) {
					await php.mount(target, createNodeFsMountHandler(path.resolve(source)));
				}
			}
		},
		onProgress: caption => console.log(caption)
	});
	return { handler, php: await handler.getPrimaryPhp() };
}
