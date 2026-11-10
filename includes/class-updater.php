<?php
/**
 * Supplies verified GitHub release metadata to the native WordPress updater.
 *
 * @package Rocketsky\Quiet_Yoast
 * @since   1.2.0
 */

namespace Rocketsky\Quiet_Yoast;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Offers only the official stable Quiet Yoast installation package.
 *
 * @since 1.2.0
 */
final class Updater {

	/**
	 * Canonical Update URI, also the base for release and package URLs.
	 *
	 * @since 1.2.0
	 * @var string
	 */
	private const REPOSITORY = 'https://github.com/rktsky/wpplugin.quiet-yoast';

	/**
	 * Slug shared by the installed directory, plugin file and release ZIP.
	 *
	 * @since 1.2.0
	 * @var string
	 */
	private const SLUG = 'rktsky-quiet-yoast';

	/**
	 * Main file path within the released installation ZIP.
	 *
	 * @since 1.2.0
	 * @var string
	 */
	private const PLUGIN_FILE = self::SLUG . '/' . self::SLUG . '.php';

	/**
	 * WordPress minimum maintained by this stable release channel.
	 *
	 * @since 1.2.0
	 * @var string
	 */
	private const REQUIRES_WP = '6.5';

	/**
	 * PHP minimum maintained by this stable release channel.
	 *
	 * @since 1.2.0
	 * @var string
	 */
	private const REQUIRES_PHP = '7.4';

	/**
	 * Network-scoped cache for the validated version or an empty failure marker.
	 *
	 * @since 1.2.0
	 * @var string
	 */
	private const CACHE_KEY = 'rktsky_quiet_yoast_release_v1';

	/**
	 * Registers only for the installable ZIP's canonical plugin path.
	 *
	 * Runs independently of Yoast's edition so administrators can update the
	 * active extension even when the presentation cleanup is inactive.
	 *
	 * @since 1.2.0
	 * @param string $main_file Absolute path to the main plugin file.
	 * @return void
	 */
	public static function register( string $main_file ): void {
		if ( self::PLUGIN_FILE !== plugin_basename( $main_file ) ) {
			return;
		}

		add_filter( 'update_plugins_github.com', array( self::class, 'filter_update' ), 10, 3 );
		add_filter( 'plugins_api', array( self::class, 'filter_information' ), 10, 3 );
	}

	/**
	 * Supplies release metadata for this plugin alone.
	 *
	 * WordPress compares versions and uses current-version metadata to keep its
	 * automatic update control available. During a lookup failure that metadata
	 * carries no package. The site's native automatic update preference applies.
	 *
	 * @since 1.2.0
	 * @param array|false         $update      Incoming update data or false.
	 * @param array<string,mixed> $plugin_data Plugin headers, including UpdateURI and Version.
	 * @param string              $plugin_file Plugin basename relative to the plugins directory.
	 * @return array|false Native update metadata or the incoming value for other plugins.
	 */
	public static function filter_update( $update, array $plugin_data, string $plugin_file ) {
		if ( self::PLUGIN_FILE !== $plugin_file || self::REPOSITORY !== ( $plugin_data['UpdateURI'] ?? '' ) ) {
			return $update;
		}

		$version = self::latest_version();
		if ( '' === $version ) {
			$installed = $plugin_data['Version'] ?? '';
			if ( ! is_string( $installed ) || '' === $installed ) {
				return $update;
			}

			return array(
				'slug'    => self::SLUG,
				'version' => $installed,
				'url'     => self::REPOSITORY . '/releases',
			);
		}

		return array(
			'slug'         => self::SLUG,
			'version'      => $version,
			'url'          => self::REPOSITORY . '/releases/tag/v' . $version,
			'package'      => self::package_url( $version ),
			'requires'     => self::REQUIRES_WP,
			'requires_php' => self::REQUIRES_PHP,
		);
	}

	/**
	 * Supports the native version-details dialog with a link to the release.
	 *
	 * Remote release notes are never rendered as HTML in the admin. The modal
	 * shares the update cache and reports an unavailable release as a WP_Error.
	 *
	 * @since 1.2.0
	 * @param false|object|array $result Incoming plugin API result.
	 * @param string             $action Requested plugin API operation.
	 * @param object             $args   Request arguments, including the slug.
	 * @return false|object|array Native plugin information, WP_Error or incoming result.
	 */
	public static function filter_information( $result, string $action, object $args ) {
		if ( false !== $result || 'plugin_information' !== $action || self::SLUG !== ( $args->slug ?? '' ) ) {
			return $result;
		}

		$version = self::latest_version();
		if ( '' === $version ) {
			return new \WP_Error(
				'rktsky_quiet_yoast_release_unavailable',
				__( 'Quiet Yoast release details are temporarily unavailable.', 'rktsky-quiet-yoast' )
			);
		}

		$url = self::REPOSITORY . '/releases/tag/v' . $version;

		return (object) array(
			'name'          => 'Rocketsky – Quiet Yoast',
			'slug'          => self::SLUG,
			'version'       => $version,
			'requires'      => self::REQUIRES_WP,
			'requires_php'  => self::REQUIRES_PHP,
			'download_link' => self::package_url( $version ),
			'sections'      => array(
				'changelog' => sprintf(
					'<p><a href="%s" target="_blank" rel="noopener noreferrer">%s</a></p>',
					esc_url( $url ),
					esc_html__( 'Read the release notes on GitHub', 'rktsky-quiet-yoast' )
				),
			),
		);
	}

	/**
	 * Reads and caches the current stable version from GitHub.
	 *
	 * The fixed anonymous request carries no site URL or credentials. A short
	 * negative cache bounds retries on network errors, rate limits and malformed
	 * releases. A missing transient is false, distinct from an empty result.
	 *
	 * @since 1.2.0
	 * @return string Validated numeric version or an empty string on failure.
	 */
	private static function latest_version(): string {
		$cached = get_site_transient( self::CACHE_KEY );
		if ( is_string( $cached ) && ( '' === $cached || self::is_stable_version( $cached ) ) ) {
			return $cached;
		}

		$response = wp_safe_remote_get(
			'https://api.github.com/repos/rktsky/wpplugin.quiet-yoast/releases/latest',
			array(
				'timeout'             => 5,
				'redirection'         => 0,
				'limit_response_size' => 256 * 1024,
				'user-agent'          => 'Rocketsky-Quiet-Yoast',
				'headers'             => array(
					'Accept'               => 'application/vnd.github+json',
					'X-GitHub-Api-Version' => '2026-03-10',
				),
			)
		);

		$version = '';
		if ( ! is_wp_error( $response ) && 200 === (int) wp_remote_retrieve_response_code( $response ) ) {
			$version = self::release_version( json_decode( wp_remote_retrieve_body( $response ), true ) );
		}

		set_site_transient( self::CACHE_KEY, $version, ( '' === $version ? 5 : 15 ) * MINUTE_IN_SECONDS );

		return $version;
	}

	/**
	 * Accepts only stable releases with the exact uploaded installation ZIP.
	 *
	 * The download URL is checked against a known HTTPS origin and versioned
	 * path. Source archives, renamed assets and incomplete uploads are ignored.
	 *
	 * @since 1.2.0
	 * @param mixed $release Decoded GitHub response; invalid shapes are rejected.
	 * @return string Canonical version or an empty string for an unusable release.
	 */
	private static function release_version( $release ): string {
		if ( ! is_array( $release ) || false !== ( $release['draft'] ?? null ) || false !== ( $release['prerelease'] ?? null ) ) {
			return '';
		}

		$tag = $release['tag_name'] ?? '';
		if ( ! is_string( $tag ) || 'v' !== substr( $tag, 0, 1 ) ) {
			return '';
		}

		$version = substr( $tag, 1 );
		$assets  = $release['assets'] ?? null;
		if ( ! self::is_stable_version( $version ) || ! is_array( $assets ) ) {
			return '';
		}

		$filename = self::SLUG . '-' . $version . '.zip';
		$url      = self::package_url( $version );
		foreach ( $assets as $asset ) {
			if ( is_array( $asset ) && $filename === ( $asset['name'] ?? '' ) && 'uploaded' === ( $asset['state'] ?? '' ) && $url === ( $asset['browser_download_url'] ?? '' ) ) {
				return $version;
			}
		}

		return '';
	}

	/**
	 * Checks the release channel's three numeric version components.
	 *
	 * @since 1.2.0
	 * @param string $version Version without the tag's v prefix.
	 * @return bool Whether the version is canonical and stable.
	 */
	private static function is_stable_version( string $version ): bool {
		return 1 === preg_match( '/\A(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){2}\z/', $version );
	}

	/**
	 * Builds the fixed GitHub download path for a validated version.
	 *
	 * @since 1.2.0
	 * @param string $version Validated three-component version.
	 * @return string HTTPS installation package URL.
	 */
	private static function package_url( string $version ): string {
		return self::REPOSITORY . '/releases/download/v' . $version . '/' . self::SLUG . '-' . $version . '.zip';
	}
}
