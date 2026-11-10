<?php
/**
 * Plugin Name: Rocketsky – Quiet Yoast
 * Description: Blendet Premium-Werbung in der kostenlosen Version von Yoast SEO aus.
 * Version: 1.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Requires Plugins: wordpress-seo
 * Author: Rocketsky
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: rktsky-quiet-yoast
 *
 * Boots an independent presentation extension without changing third-party files.
 *
 * @package Rocketsky\Quiet_Yoast
 * @since   1.0.0
 */

namespace Rocketsky\Quiet_Yoast;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/includes/class-plugin.php';

add_action( 'plugins_loaded', array( Plugin::class, 'boot' ), 20 );
