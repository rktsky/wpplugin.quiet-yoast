<?php
/**
 * Removes advertising navigation and loads scoped administration styles.
 *
 * @package Rocketsky\Quiet_Yoast
 * @since   1.0.0
 */

namespace Rocketsky\Quiet_Yoast;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Limits the extension to free Yoast SEO and changes only its presentation.
 *
 * @since 1.0.0
 */
final class Plugin {

	/**
	 * Asset version for native WordPress cache invalidation.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	private const VERSION = '1.1.0';

	/**
	 * Advertising page identifiers verified against original Yoast SEO 28.8.
	 *
	 * Account, support and free Academy pages deliberately remain available.
	 *
	 * @since 1.0.0
	 * @var string[]
	 */
	private const PROMOTIONAL_PAGES = array(
		'wpseo_workouts',
		'wpseo_redirects',
		'wpseo_upgrade_sidebar',
		'wpseo_brand_insights',
	);

	/**
	 * Registers after plugins load, so either plugin installation order works.
	 *
	 * The provider constants identify the loaded edition; no provider classes or
	 * private methods are called. Missing Yoast and Premium retain native output.
	 * This method registers hooks only and never persists configuration.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function boot() {
		if ( ! defined( 'WPSEO_VERSION' ) || defined( 'WPSEO_PREMIUM_FILE' ) || defined( 'WPSEO_PREMIUM_VERSION' ) ) {
			return;
		}

		$plugin = new self();
		add_action( 'wp_loaded', array( $plugin, 'register_menu_filter' ), 20 );
		add_action( 'admin_menu', array( $plugin, 'remove_promotional_menus' ), PHP_INT_MAX );
		add_action( 'network_admin_menu', array( $plugin, 'remove_promotional_menus' ), PHP_INT_MAX );
		add_action( 'admin_bar_menu', array( $plugin, 'remove_promotional_toolbar_nodes' ), PHP_INT_MAX );
		add_action( 'admin_enqueue_scripts', array( $plugin, 'enqueue_assets' ) );
		add_filter( 'plugin_action_links_wordpress-seo/wp-seo.php', array( $plugin, 'filter_plugin_links' ), PHP_INT_MAX );
		add_filter( 'network_admin_plugin_action_links_wordpress-seo/wp-seo.php', array( $plugin, 'filter_plugin_links' ), PHP_INT_MAX );
	}

	/**
	 * Filters Yoast's public menu contract after its integrations have loaded.
	 *
	 * Filtering before parent selection also handles editors, whose first
	 * accessible menu page can otherwise be an upsell. The network-only Yoast
	 * filter is marked internal and is deliberately not used.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_menu_filter() {
		add_filter( 'wpseo_submenu_pages', array( $this, 'filter_promotional_pages' ), PHP_INT_MAX );
	}

	/**
	 * Preserves all page tuples except verified advertising destinations.
	 *
	 * Yoast supplies tuples containing parent, title, menu label, capability,
	 * slug and callback. Unknown tuple shapes are preserved for other extensions.
	 * This changes navigation registration only, never saved data or permissions.
	 *
	 * @since 1.0.0
	 * @param array<int, array<int, mixed>> $pages Yoast's submenu page tuples.
	 * @return array<int, array<int, mixed>> Retained page tuples in their original order.
	 */
	public function filter_promotional_pages( $pages ) {
		foreach ( $pages as $key => $page ) {
			if ( isset( $page[4] ) && in_array( $page[4], self::PROMOTIONAL_PAGES, true ) ) {
				unset( $pages[ $key ] );
			}
		}

		return $pages;
	}

	/**
	 * Removes known upsell entries after WordPress has registered the menus.
	 *
	 * Missing entries are a harmless no-op. Removing navigation does not change
	 * capabilities or deny direct access to a provider page.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function remove_promotional_menus() {
		foreach ( self::PROMOTIONAL_PAGES as $page ) {
			remove_submenu_page( 'wpseo_dashboard', $page );
		}

		remove_submenu_page( 'tools.php', 'wpseo_redirects_tools' );
	}

	/**
	 * Removes upsell links while preserving the SEO toolbar and its scores.
	 *
	 * WordPress invokes this for authenticated toolbars in the administration
	 * area and on the public site. No frontend assets or SEO filters are added.
	 * Unknown node IDs are a harmless no-op; user permissions remain unchanged.
	 *
	 * @since 1.0.0
	 * @param \WP_Admin_Bar $admin_bar The current WordPress toolbar instance.
	 * @return void
	 */
	public function remove_promotional_toolbar_nodes( \WP_Admin_Bar $admin_bar ) {
		foreach ( self::PROMOTIONAL_PAGES as $page ) {
			$admin_bar->remove_node( 'wpseo-' . str_replace( '_', '-', substr( $page, 6 ) ) );
		}

		$admin_bar->remove_node( 'wpseo-get-premium' );
		$admin_bar->remove_node( 'wpseo_brand_insights' );
		$admin_bar->remove_node( 'wpseo-frontend-inspector' );
		$admin_bar->remove_node( 'wpseo-premium-support' );
	}

	/**
	 * Removes the verified Get Premium action from the Yoast plugin row.
	 *
	 * The native HTML API reads individual action links, never whole pages.
	 * Exact host/path comparison preserves configuration, FAQ, deactivation,
	 * subscription management and any unknown links added by other extensions.
	 * Missing or non-string links pass through unchanged.
	 *
	 * @since 1.0.0
	 * @param array<string|int, string> $links Plugin row action links.
	 * @return array<string|int, string> Retained links with original keys and HTML.
	 */
	public function filter_plugin_links( $links ) {
		foreach ( $links as $key => $link ) {
			if ( ! is_string( $link ) ) {
				continue;
			}

			$html = new \WP_HTML_Tag_Processor( $link );
			while ( $html->next_tag( 'A' ) ) {
				$href = $html->get_attribute( 'href' );
				if ( ! is_string( $href ) ) {
					continue;
				}

				$url = wp_parse_url( $href );
				if ( isset( $url['host'], $url['path'] ) && 'yoa.st' === strtolower( $url['host'] ) && '/1yb' === $url['path'] ) {
					unset( $links[ $key ] );
					break;
				}
			}
		}

		return $links;
	}

	/**
	 * Loads local presentation assets only on the screens that consume them.
	 *
	 * CSS hides presentation elements using verified provider markup; it is not
	 * a documented Yoast API and can need maintenance after provider updates.
	 * A missing screen is a no-op. Counter JavaScript is limited further to the
	 * settings page and editors. No frontend assets or remote calls are added;
	 * neither asset changes actual analysis or stored SEO data.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function enqueue_assets() {
		$screen = get_current_screen();
		if ( null === $screen ) {
			return;
		}

		$is_editor = in_array( $screen->base, array( 'post', 'term', 'edit-tags' ), true );
		$is_yoast  = false !== strpos( $screen->id, '_page_wpseo_' );
		if ( ! $is_editor && ! $is_yoast ) {
			return;
		}

		wp_enqueue_style(
			'rktsky-quiet-yoast',
			plugins_url( '../assets/admin.css', __FILE__ ),
			array(),
			self::VERSION
		);

		if ( $is_editor || false !== strpos( $screen->id, '_page_wpseo_page_settings' ) ) {
			wp_enqueue_script(
				'rktsky-quiet-yoast-counters',
				plugins_url( '../assets/counters.js', __FILE__ ),
				array(),
				self::VERSION,
				array( 'in_footer' => true, 'strategy' => 'defer' )
			);
		}
	}
}
