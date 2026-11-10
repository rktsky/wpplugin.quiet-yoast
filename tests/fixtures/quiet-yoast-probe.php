<?php
/**
 * Captures native WordPress integration state inside the isolated test runtime.
 *
 * This fixture writes only the synthetic probe file mounted by the test suite.
 * It is excluded from distribution and remains inert outside that runtime.
 *
 * @package Rocketsky\Tests\Quiet_Yoast
 * @since   1.1.0
 */

namespace Rocketsky\Tests\Quiet_Yoast;

if ( ! defined( 'ABSPATH' ) || ! defined( 'QUIET_YOAST_TEST_RUN' ) || true !== QUIET_YOAST_TEST_RUN ) {
	return;
}

/**
 * Observes provider output without changing the plugin under test.
 *
 * @since 1.1.0
 */
final class Probe {

	/**
	 * Initializes the request-local probe and synthetic runtime hooks.
	 *
	 * The query flag selects a native editor only within the guarded fixture;
	 * it does not process saved data or expose an application endpoint.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public static function boot(): void {
		$GLOBALS['quiet_yoast_probe'] = array();

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Guarded test-only editor selection; no persistence.
		if ( isset( $_GET['quiet_classic'] ) ) {
			add_filter( 'use_block_editor_for_post', '__return_false' );
		}

		add_filter( 'pre_wp_mail', '__return_false' );
		add_action( 'plugins_loaded', array( self::class, 'register' ), 100 );
	}

	/**
	 * Registers snapshots before and after the owned integration callbacks.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public static function register(): void {
		$action_hooks = array(
			'plugin_action_links_wordpress-seo/wp-seo.php',
			'network_admin_plugin_action_links_wordpress-seo/wp-seo.php',
		);

		foreach ( $action_hooks as $action_hook ) {
			add_filter( $action_hook, array( self::class, 'plugin_links_before' ), PHP_INT_MAX - 1 );
			add_filter( $action_hook, array( self::class, 'plugin_links_after' ), PHP_INT_MAX );
		}

		add_action( 'admin_menu', array( self::class, 'menus_before' ), PHP_INT_MAX - 1 );
		add_action( 'admin_menu', array( self::class, 'menus_after' ), PHP_INT_MAX );
		add_action( 'admin_bar_menu', array( self::class, 'toolbar_before' ), PHP_INT_MAX - 1 );
		add_action( 'admin_bar_menu', array( self::class, 'toolbar_after' ), PHP_INT_MAX );
		add_action( 'shutdown', array( self::class, 'collect' ), PHP_INT_MAX );
	}

	/**
	 * Captures native row links without changing their keys or HTML.
	 *
	 * @since 1.1.0
	 * @param array<string|int, string> $links Native plugin action links.
	 * @return array<string|int, string> The unchanged links.
	 */
	public static function plugin_links_before( $links ) {
		$GLOBALS['quiet_yoast_probe']['plugin_links_before'] = $links;
		return $links;
	}

	/**
	 * Captures filtered row links without changing their keys or HTML.
	 *
	 * @since 1.1.0
	 * @param array<string|int, string> $links Filtered plugin action links.
	 * @return array<string|int, string> The unchanged links.
	 */
	public static function plugin_links_after( $links ) {
		$GLOBALS['quiet_yoast_probe']['plugin_links_after'] = $links;
		return $links;
	}

	/**
	 * Captures Yoast submenu slugs before native menu removal.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public static function menus_before(): void {
		$GLOBALS['quiet_yoast_probe']['menus_before'] = array_column( $GLOBALS['submenu']['wpseo_dashboard'] ?? array(), 2 );
	}

	/**
	 * Captures Yoast submenu slugs after native menu removal.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public static function menus_after(): void {
		$GLOBALS['quiet_yoast_probe']['menus_after'] = array_column( $GLOBALS['submenu']['wpseo_dashboard'] ?? array(), 2 );
	}

	/**
	 * Captures native toolbar node identities before removal.
	 *
	 * @since 1.1.0
	 * @param \WP_Admin_Bar $bar The native toolbar instance.
	 * @return void
	 */
	public static function toolbar_before( \WP_Admin_Bar $bar ): void {
		$GLOBALS['quiet_yoast_probe']['toolbar_before'] = array_keys( $bar->get_nodes() ?: array() );
	}

	/**
	 * Captures native toolbar node identities after removal.
	 *
	 * @since 1.1.0
	 * @param \WP_Admin_Bar $bar The native toolbar instance.
	 * @return void
	 */
	public static function toolbar_after( \WP_Admin_Bar $bar ): void {
		$GLOBALS['quiet_yoast_probe']['toolbar_after'] = array_keys( $bar->get_nodes() ?: array() );
	}

	/**
	 * Identifies the owned asset handles in the native queues.
	 *
	 * @since 1.1.0
	 * @param string $handle An enqueued asset handle.
	 * @return bool Whether the handle belongs to the owned publisher.
	 */
	public static function is_owned_handle( $handle ): bool {
		return false !== strpos( $handle, 'rktsky' );
	}

	/**
	 * Identifies Yoast destinations in the native menu arrays.
	 *
	 * @since 1.1.0
	 * @param string $slug A native administration page slug.
	 * @return bool Whether the slug is a Yoast destination.
	 */
	public static function is_yoast_slug( $slug ): bool {
		return 0 === strpos( $slug, 'wpseo' );
	}

	/**
	 * Identifies callbacks registered by the plugin, excluding this fixture.
	 *
	 * @since 1.1.0
	 * @param mixed $callback A native hook callback.
	 * @return bool Whether it belongs to the plugin namespace.
	 */
	private static function is_plugin_callback( $callback ): bool {
		if ( ! is_array( $callback ) ) {
			return false;
		}

		$class = is_object( $callback[0] ) ? get_class( $callback[0] ) : $callback[0];
		return is_string( $class ) && 0 === strpos( $class, 'Rocketsky\\Quiet_Yoast' );
	}

	/**
	 * Writes the synthetic request snapshot to the owned mounted fixture file.
	 *
	 * The test runner consumes this file immediately. Native HTML pages, cookies
	 * and sessions are not written here; compact public results are generated by
	 * the runner separately. No provider files or database records are changed.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public static function collect(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$probe  = &$GLOBALS['quiet_yoast_probe'];

		$probe['screen']              = $screen ? array( $screen->id, $screen->base ) : null;
		$probe['own_styles']          = array_values( array_filter( wp_styles()->queue, array( self::class, 'is_owned_handle' ) ) );
		$probe['own_scripts']         = array_values( array_filter( wp_scripts()->queue, array( self::class, 'is_owned_handle' ) ) );
		$probe['own_script_registry'] = array();

		foreach ( wp_scripts()->registered as $handle => $script ) {
			if ( 0 === strpos( $handle, 'rktsky' ) ) {
				$probe['own_script_registry'][ $handle ] = array(
					'src'   => $script->src,
					'deps'  => $script->deps,
					'ver'   => $script->ver,
					'extra' => $script->extra,
				);
			}
		}

		$probe['top_menus']    = array_values( array_filter( array_column( $GLOBALS['menu'] ?? array(), 2 ), array( self::class, 'is_yoast_slug' ) ) );
		$probe['all_submenus'] = array();

		foreach ( $GLOBALS['submenu'] ?? array() as $items ) {
			foreach ( $items as $item ) {
				if ( self::is_yoast_slug( $item[2] ) ) {
					$probe['all_submenus'][] = $item[2];
				}
			}
		}

		if ( ! is_admin() ) {
			$probe['frontend_styles']  = $probe['own_styles'];
			$probe['frontend_scripts'] = $probe['own_scripts'];
		}

		$probe['owned_hooks'] = array();
		foreach ( $GLOBALS['wp_filter'] as $hook => $callbacks ) {
			foreach ( $callbacks->callbacks as $priority => $handlers ) {
				foreach ( $handlers as $callback ) {
					$function = $callback['function'];
					if ( self::is_plugin_callback( $function ) ) {
						$probe['owned_hooks'][] = array( $hook, $priority, $function[1] );
					}
				}
			}
		}

		file_put_contents( '/test-fixtures/probe.json', wp_json_encode( $probe ) );
	}
}

Probe::boot();
