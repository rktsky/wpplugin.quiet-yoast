/** Exercises the GitHub release contract through the native WordPress updater. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pluginDirectory, resultsDirectory, testsRoot } from './paths.mjs';
import { bootTestWordPress } from './runtime.mjs';

const slug = 'rktsky-quiet-yoast';
const mainFile = `${slug}.php`;
const pluginFile = `${slug}/${mainFile}`;
const pluginPath = `/wordpress/wp-content/plugins/${slug}`;
const updateUri = 'https://github.com/rktsky/wpplugin.quiet-yoast';
const cacheKey = 'rktsky_quiet_yoast_release_v1';
const packagePath = '/tmp/quiet-yoast-updater.zip';
const responsePath = '/tmp/quiet-yoast-updater-response.json';
const requestLog = '/tmp/quiet-yoast-updater-requests.log';
const installedVersion = '0.0.1';
const releaseFiles = [
	mainFile,
	'includes/class-plugin.php',
	'includes/class-updater.php',
	'assets/admin.css',
	'assets/counters.js',
	'readme.txt',
	'LICENSE.txt',
	'docs/interfaces.txt',
	'docs/verification.txt',
];
const files = new Map(releaseFiles.map(file => [file, fs.readFileSync(path.join(pluginDirectory, file))]));
const mainSource = files.get(mainFile).toString('utf8');
const versionHeader = /(\* Version: )(\d+\.\d+\.\d+)\b/;
const releaseVersion = mainSource.match(versionHeader)?.[2];
assert.ok(releaseVersion, 'Expected a stable version in the owned plugin header.');

const archiveName = `${slug}-${releaseVersion}.zip`;
const packageUrl = `${updateUri}/releases/download/v${releaseVersion}/${archiveName}`;
const { handler, php } = await bootTestWordPress({ pluginDirectory: null });
const results = [];

/** Run a PHP request in the isolated in-memory installation. */
async function run(code) {
	const result = await php.run({ code: `<?php ${code}` });
	assert.equal(result.exitCode, 0, result.errors || result.text);
	assert.equal(result.errors, '', result.errors);
	return result;
}

/** Record an assertion that already completed successfully. */
function passed(name) {
	console.log('PASS', name);
	results.push({ name, pass: true });
}

/** Supply a release response without contacting GitHub from the fixture. */
function setRelease(payload, status = 200) {
	const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
	php.writeFile(responsePath, JSON.stringify({ status, body, package: packageUrl }));
}

/** Count only the synthetic GitHub requests made by WordPress. */
function requests() {
	return php.readFileAsText(requestLog).split('\n').filter(Boolean);
}

/** Refresh WordPress's update data independently of the release cache. */
async function refresh({ clearRelease = true } = {}) {
	php.writeFile(requestLog, '');
	const result = await run(`
		require '/wordpress/wp-load.php';
		${clearRelease ? `delete_site_transient('${cacheKey}');` : ''}
		delete_site_transient('update_plugins');
		wp_update_plugins();
		$updates = get_site_transient('update_plugins');
		echo wp_json_encode(array(
			'update' => $updates->response['${pluginFile}'] ?? null,
			'current' => $updates->no_update['${pluginFile}'] ?? null,
		));
	`);
	return JSON.parse(result.text);
}

try {
	// Simulate an older installed version that already contains the updater.
	for (const [file, bytes] of files) {
		const destination = `${pluginPath}/${file}`;
		php.mkdirTree(path.posix.dirname(destination));
		const contents = file === mainFile
			? mainSource.replace(versionHeader, (_match, label) => label + installedVersion)
			: bytes;
		php.writeFile(destination, contents);
	}

	const suppliedZip = process.env.QUIET_YOAST_RELEASE_ZIP;
	if (suppliedZip) {
		php.writeFile(packagePath, fs.readFileSync(suppliedZip));
	} else {
		const encoded = Object.fromEntries([...files].map(([file, bytes]) => [file, bytes.toString('base64')]));
		php.writeFile('/tmp/quiet-yoast-updater-files.json', JSON.stringify(encoded));
		await run(`
			$files = json_decode(file_get_contents('/tmp/quiet-yoast-updater-files.json'), true);
			$zip = new ZipArchive();
			if (true !== $zip->open('${packagePath}', ZipArchive::CREATE)) {
				throw new RuntimeException('Could not create the owned release ZIP fixture.');
			}
			foreach ($files as $file => $bytes) {
				$zip->addFromString('${slug}/' . $file, base64_decode($bytes, true));
			}
			if (!$zip->close()) {
				throw new RuntimeException('Could not write the owned release ZIP fixture.');
			}
			unlink('/tmp/quiet-yoast-updater-files.json');
		`);
	}
	const archive = php.readFileAsBuffer(packagePath);
	const asset = {
		name: archiveName,
		state: 'uploaded',
		browser_download_url: packageUrl,
		size: archive.length,
		digest: `sha256:${createHash('sha256').update(archive).digest('hex')}`,
	};
	const release = {
		tag_name: `v${releaseVersion}`,
		html_url: `${updateUri}/releases/tag/v${releaseVersion}`,
		draft: false,
		prerelease: false,
		assets: [asset],
	};
	setRelease(release);
	php.writeFile(requestLog, '');
	php.writeFile(
		'/wordpress/wp-content/mu-plugins/quiet-yoast-updater-http.php',
		fs.readFileSync(path.join(testsRoot, 'fixtures/updater-http.php')),
	);

	const auth = await run(`
		require '/wordpress/wp-load.php';
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		foreach (array('wordpress-seo/wp-seo.php', '${pluginFile}') as $plugin) {
			$result = activate_plugin($plugin);
			if (is_wp_error($result)) {
				throw new RuntimeException($result->get_error_message());
			}
		}
		wp_set_current_user(1);
		wp_set_auth_cookie(1);
	`);
	const cookies = (auth.headers['set-cookie'] || []).map(cookie => cookie.split(';')[0]).join('; ');
	assert.match(cookies, /wordpress_logged_in_/);

	const equalAsset = {
		...asset,
		name: `${slug}-${installedVersion}.zip`,
		browser_download_url: `${updateUri}/releases/download/v${installedVersion}/${slug}-${installedVersion}.zip`,
	};
	setRelease({
		...release,
		tag_name: `v${installedVersion}`,
		html_url: `${updateUri}/releases/tag/v${installedVersion}`,
		assets: [equalAsset],
	});
	const equal = await refresh();
	assert.equal(equal.update, null);
	assert.equal(equal.current.new_version, installedVersion);
	assert.equal(equal.current.package, equalAsset.browser_download_url);
	assert.equal(equal.current.autoupdate, undefined);
	passed('The same stable version supports native opt-in without offering an upgrade');

	const rejected = [
		['a draft', { ...release, draft: true }],
		['a prerelease', { ...release, prerelease: true }],
		['a non-version tag', { ...release, tag_name: 'main' }],
		['a missing installable asset', { ...release, assets: [] }],
		['an unfinished asset', { ...release, assets: [{ ...asset, state: 'starter' }] }],
		['an unexpected download host', { ...release, assets: [{ ...asset, browser_download_url: packageUrl.replace('github.com', 'github.com.example.test') }] }],
		['malformed JSON', '{'],
	];
	for (const [label, payload] of rejected) {
		setRelease(payload);
		const state = await refresh();
		assert.equal(state.update, null, label);
		assert.ok(!state.current?.package, label);
		assert.deepEqual(requests(), ['metadata'], label);
	}
	passed('Drafts, prereleases, invalid metadata and unrelated ZIPs never produce a package');

	setRelease(release, 403);
	assert.equal((await refresh()).update, null);
	assert.deepEqual(requests(), ['metadata']);
	assert.equal((await refresh({ clearRelease: false })).update, null);
	assert.deepEqual(requests(), []);
	passed('A GitHub rate limit produces no update and backs off subsequent checks');

	setRelease(release);
	const pending = await refresh();
	assert.equal(pending.update.new_version, releaseVersion);
	assert.equal(pending.update.package, packageUrl);
	assert.equal(pending.update.id, updateUri);
	assert.deepEqual(requests(), ['metadata']);
	const cached = await refresh({ clearRelease: false });
	assert.equal(cached.update.package, packageUrl);
	assert.deepEqual(requests(), []);
	passed('WordPress discovers the exact installable GitHub ZIP and reuses cached metadata');

	const adminRequest = { url: '/wp-admin/plugins.php', headers: { cookie: cookies } };
	let admin = await handler.request(adminRequest);
	if (admin.httpStatusCode === 302) {
		admin = await handler.request(adminRequest);
	}
	assert.equal(admin.httpStatusCode, 200, `Expected the authenticated native plugin list: ${admin.headers.location ?? ''}`);
	const updateRow = admin.text.match(/<tr class="plugin-update-tr[^>]*data-plugin="rktsky-quiet-yoast\/rktsky-quiet-yoast\.php"[^>]*>[\s\S]*?<\/tr>/)?.[0];
	assert.ok(updateRow?.includes('class="update-link"'), 'Expected the native Update now link.');
	assert.ok(updateRow.includes(releaseVersion));
	const nonce = admin.text.match(/var _wpUpdatesSettings = \{"ajax_nonce":"([a-f0-9]+)"\}/)?.[1];
	assert.ok(nonce, 'Expected the native updates nonce in the plugin list.');
	passed('The authenticated Plugins screen displays the native update action');

	const information = await handler.request({
		url: `/wp-admin/plugin-install.php?tab=plugin-information&plugin=${slug}&section=changelog&TB_iframe=true`,
		headers: { cookie: cookies },
	});
	assert.equal(information.httpStatusCode, 200);
	assert.ok(information.text.includes(`href="${release.html_url}"`));
	assert.deepEqual(requests(), []);
	passed('The native version-details dialog links to the cached GitHub release');

	const body = new URLSearchParams({
		action: 'update-plugin',
		plugin: pluginFile,
		slug,
		_ajax_nonce: nonce,
	});
	const response = await handler.request({
		url: '/wp-admin/admin-ajax.php',
		method: 'POST',
		headers: { cookie: cookies, 'content-type': 'application/x-www-form-urlencoded' },
		body: Buffer.from(body.toString()),
	});
	assert.equal(response.httpStatusCode, 200, response.text);
	const update = JSON.parse(response.text);
	assert.equal(update.success, true, response.text);
	assert.equal(update.data.oldVersion, `Version ${installedVersion}`);
	assert.equal(update.data.newVersion, `Version ${releaseVersion}`);
	assert.equal(requests().filter(request => request === 'package').length, 1);
	passed('Native update-plugin AJAX streams and installs the versioned release ZIP');

	for (const [file, bytes] of files) {
		assert.deepEqual(Buffer.from(php.readFileAsBuffer(`${pluginPath}/${file}`)), bytes, file);
	}
	const installed = await run(`
		require '/wordpress/wp-load.php';
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		echo wp_json_encode(array(
			'active' => is_plugin_active('${pluginFile}'),
			'version' => get_plugin_data(WP_PLUGIN_DIR . '/${pluginFile}')['Version'],
			'autoUpdates' => get_site_option('auto_update_plugins', array()),
		));
	`);
	assert.deepEqual(JSON.parse(installed.text), { active: true, version: releaseVersion, autoUpdates: [] });
	assert.equal((await refresh({ clearRelease: false })).update, null);
	passed('All release files match the new version in the original active plugin folder');

	fs.writeFileSync(path.join(resultsDirectory, 'updater-results.json'), JSON.stringify({
		installedVersion,
		releaseVersion,
		archive: suppliedZip ? 'supplied release ZIP' : 'generated fixture ZIP',
		results,
	}, null, 2));
} finally {
	await handler[Symbol.asyncDispose]();
}
