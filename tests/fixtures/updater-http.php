<?php
/**
 * Supplies synthetic HTTP responses for the native updater integration test.
 *
 * @package Rocketsky\Tests\Quiet_Yoast
 * @since   1.2.0
 */

if ( ! defined( 'QUIET_YOAST_TEST_RUN' ) || true !== QUIET_YOAST_TEST_RUN ) {
	return;
}

if ( ! defined( 'FS_METHOD' ) ) {
	define( 'FS_METHOD', 'direct' );
}

add_filter(
	'pre_http_request',
	static function ( $preempt, $args, $url ) {
		$fixture = json_decode( file_get_contents( '/tmp/quiet-yoast-updater-response.json' ), true );
		$body    = '';
		$status  = 200;
		$headers = array();

		if ( preg_match( '~\Ahttps?://api\.wordpress\.org/plugins/update-check/1\.1/\z~', $url ) ) {
			$body = '{"plugins":{},"translations":[],"no_update":{}}';
		} elseif ( 'https://api.github.com/repos/rktsky/wpplugin.quiet-yoast/releases/latest' === $url ) {
			file_put_contents( '/tmp/quiet-yoast-updater-requests.log', "metadata\n", FILE_APPEND );
			$status = $fixture['status'];
			$body   = $fixture['body'];
		} elseif ( $fixture['package'] === $url ) {
			if ( empty( $args['stream'] ) || empty( $args['filename'] ) ) {
				return new WP_Error( 'unexpected_download', 'Expected a native streamed plugin download.' );
			}
			file_put_contents( '/tmp/quiet-yoast-updater-requests.log', "package\n", FILE_APPEND );
			copy( '/tmp/quiet-yoast-updater.zip', $args['filename'] );
			$headers['content-type'] = 'application/zip';
		} else {
			return $preempt;
		}

		return array(
			'headers'  => $headers,
			'body'     => $body,
			'response' => array( 'code' => $status, 'message' => get_status_header_desc( $status ) ),
			'cookies'  => array(),
			'filename' => $args['filename'] ?? null,
		);
	},
	10,
	3
);
