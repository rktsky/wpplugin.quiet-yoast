/**
 * Corrects presentation counts for confirmed hidden Yoast advertisements.
 *
 * @since 1.1.0
 *
 * Provider markup was verified against Yoast SEO 28.8. Standard DOM APIs only:
 * no React, Redux, assessment, licence or provider function is changed. Only
 * an existing title Text node and an owned empty-panel attribute are written.
 */
( function () {
	'use strict';

	/**
	 * @typedef {Object} CounterState
	 * @property {Element} container Direct parent of the verified list.
	 * @property {number|null} hidden Confirmed excluded rows, or unknown.
	 * @property {string|null} prefix Native translated title prefix.
	 * @property {string|null} expandedLabel Observed open-state accessibility label.
	 * @property {Text} text Provider-owned title Text retained across updates.
	 * @property {string} kind Either features or readability.
	 * @property {Element} button Native toggle used to confirm collapse.
	 */

	const problemsSelector = '#yoast-readability-analysis-results-sidebar-problems-collapsible, #yoast-readability-analysis-results-metabox-problems-collapsible';
	const discoverySelector = 'fieldset.yst-group, ' + problemsSelector;
	const candidates = Array.from( document.querySelectorAll( '#yoast-seo-settings, #wpseo_meta, #editor, #yoast-elementor-react-tab, #yoast-elementor-react-panel' ) );
	const roots = candidates.filter( root => ! candidates.some( other => other !== root && other.contains( root ) ) );
	const counters = new Map();
	const titles = new WeakMap();
	let queued = false;

	if ( ! roots.length || ! window.MutationObserver ) {
		return;
	}

	const observer = new MutationObserver( receive );

	/**
	 * Finds the sole numeric title Text node without replacing React elements.
	 *
	 * @since 1.1.0
	 * @param {Element} heading The verified title heading or button.
	 * @return {Text|null} Unique title text, or null for unknown/ambiguous markup.
	 */
	function findTitle( heading ) {
		const walker = document.createTreeWalker( heading, NodeFilter.SHOW_TEXT );
		let found = null;
		let text;
		while ( ( text = walker.nextNode() ) ) {
			if ( /\(\d+\)\s*$/.test( text.data ) ) {
				if ( found ) {
					return null;
				}
				found = text;
			}
		}
		return found;
	}

	/**
	 * Registers a verified counter while retaining evidence across collapse.
	 *
	 * @since 1.1.0
	 * @param {Element} container The direct parent of the result/feature list.
	 * @param {Element} heading The title heading or exact Problems button.
	 * @param {string} kind Either features or readability.
	 * @return {void}
	 */
	function register( container, heading, kind ) {
		const text = findTitle( heading );
		if ( ! text || ! roots.some( root => root.contains( container ) ) ) {
			return;
		}
		if ( ! titles.has( text ) ) {
			titles.set( text, { native: text.data } );
		}
		const state = counters.get( container ) || { container, hidden: null, prefix: null, expandedLabel: null };
		const button = kind === 'features' ? heading.parentElement : heading;
		Object.assign( state, { text, kind, button } );
		counters.set( container, state );
	}

	/**
	 * Discovers only the settings sections and explicitly identified Problems.
	 *
	 * @since 1.1.0
	 * @return {void}
	 */
	function discover() {
		for ( const section of document.querySelectorAll( '#yoast-seo-settings fieldset.yst-group' ) ) {
			const heading = section.querySelector( ':scope > button > h2' );
			if ( heading ) {
				register( section, heading, 'features' );
			}
		}
		for ( const button of document.querySelectorAll( problemsSelector ) ) {
			const heading = button.parentElement;
			if ( heading && heading.tagName === 'H3' && heading.parentElement ) {
				register( heading.parentElement, button, 'readability' );
			}
		}
	}

	/**
	 * Recognises only a provider advertisement that CSS actually hides itself.
	 *
	 * A hidden accordion ancestor or a real assessment with a locked AI button
	 * must never reduce a count. Available feature toggles continue to count.
	 *
	 * @since 1.1.0
	 * @param {Element} row A direct list item in the verified provider list.
	 * @param {string} kind The verified counter type.
	 * @return {boolean} Whether this exact row is a hidden Premium advertisement.
	 */
	function isHiddenAdvertisement( row, kind ) {
		const marker = kind === 'features'
			? row.querySelector( ':scope > [id^="card-wpseo-"] .yst-button--upsell' )
			: row.querySelector( 'a[href^="https://yoa.st/word-complexity-"]' );
		return Boolean( marker ) && getComputedStyle( row ).display === 'none';
	}

	/**
	 * Confirms collapse before reusing evidence from an unmounted list.
	 *
	 * Current settings buttons have no aria-expanded. Their translated screen-
	 * reader label changes on collapse, so compare it with the observed expanded
	 * label without guessing an English label, translation or section position.
	 *
	 * @since 1.1.0
	 * @param {CounterState} state Verified container, native button and prior label.
	 * @return {boolean} Whether native markup confirms a collapsed direct list.
	 */
	function isCollapsed( state ) {
		if ( state.container.querySelector( 'ul' ) ) {
			return false;
		}
		const expanded = state.button.getAttribute( 'aria-expanded' );
		if ( expanded !== null ) {
			return expanded === 'false';
		}
		const label = state.button.querySelector( '.yst-sr-only' );
		return state.kind === 'features' && Boolean( state.expandedLabel ) && Boolean( label )
			&& label.textContent !== state.expandedLabel && state.container.children.length === 1
			&& state.container.firstElementChild === state.button;
	}

	/**
	 * Reconciles a displayed count with verified direct list items.
	 *
	 * Unknown structures/counts retain native text. A confirmed exclusion is
	 * cached while React unmounts a collapsed list; no fixed decrement is used.
	 *
	 * @since 1.1.0
	 * @param {CounterState} state Owned counter evidence and current title Text.
	 * @return {void}
	 */
	function update( state ) {
		const title = titles.get( state.text );
		const match = /^(.*\()(\d+)(\)\s*)$/.exec( title.native );
		const total = match ? Number( match[ 2 ] ) : NaN;
		let output = title.native;
		state.container.removeAttribute( 'data-rktsky-quiet-empty' );
		if ( ! match || ! Number.isSafeInteger( total ) ) {
			return;
		}
		if ( state.prefix !== match[ 1 ] ) {
			state.hidden = null;
			state.prefix = match[ 1 ];
		}
		const list = state.container.querySelector( ':scope > ul' );
		if ( list ) {
			const label = state.button.querySelector( '.yst-sr-only' );
			state.expandedLabel = label ? label.textContent : null;
			const rows = Array.from( list.children );
			const valid = rows.every( row => row.tagName === 'LI' && ( state.kind !== 'features' || row.querySelector( ':scope > [id^="card-wpseo-"]' ) ) );
			state.hidden = valid && rows.length === total
				? rows.filter( row => isHiddenAdvertisement( row, state.kind ) ).length
				: null;
		} else if ( ! isCollapsed( state ) ) {
			state.hidden = null;
		}
		if ( state.hidden !== null && state.hidden > 0 && state.hidden <= total ) {
			const remaining = total - state.hidden;
			output = match[ 1 ] + remaining + match[ 3 ];
			if ( remaining === 0 ) {
				state.container.setAttribute( 'data-rktsky-quiet-empty', 'true' );
			}
		}
		if ( state.text.data !== output ) {
			state.text.data = output;
		}
	}

	/**
	 * Associates a mutation with a known counter or newly rendered markup.
	 *
	 * @since 1.1.0
	 * @param {MutationRecord} record A native provider/browser DOM mutation.
	 * @return {boolean} Whether a bounded counter refresh is needed.
	 */
	function isRelevant( record ) {
		for ( let parent = record.target.parentElement; parent; parent = parent.parentElement ) {
			if ( counters.has( parent ) ) {
				return true;
			}
		}
		if ( counters.has( record.target ) ) {
			return true;
		}
		for ( const node of [ ...record.addedNodes, ...record.removedNodes ] ) {
			if ( node.nodeType === Node.ELEMENT_NODE && ( node.matches( discoverySelector ) || node.querySelector( discoverySelector ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Records upstream title writes even if equal to our last displayed value.
	 *
	 * @since 1.1.0
	 * @param {MutationRecord[]} records Mutations received while observing.
	 * @return {boolean} Whether any record belongs to the counter adapter.
	 */
	function capture( records ) {
		let relevant = false;
		for ( const record of records ) {
			const title = titles.get( record.target );
			if ( record.type === 'characterData' && title ) {
				title.native = record.target.data;
				relevant = true;
			} else if ( isRelevant( record ) ) {
				relevant = true;
			}
		}
		return relevant;
	}

	/**
	 * Batches provider changes without polling or observing our own writes.
	 *
	 * @since 1.1.0
	 * @param {MutationRecord[]} records Changes in the owning administration roots.
	 * @return {void}
	 */
	function receive( records ) {
		if ( capture( records ) && ! queued ) {
			queued = true;
			queueMicrotask( refresh );
		}
	}

	/**
	 * Reconnects observation only within persistent owning screen roots.
	 *
	 * @since 1.1.0
	 * @return {void}
	 */
	function observe() {
		for ( const root of roots ) {
			observer.observe( root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [ 'class', 'href', 'id', 'aria-expanded' ] } );
		}
	}

	/**
	 * Applies one synchronous presentation pass, retaining provider DOM nodes.
	 *
	 * Pending native records are consumed before disconnecting so a rapid React
	 * commit cannot be mistaken for our own update. Removed panels are released.
	 *
	 * @since 1.1.0
	 * @return {void}
	 */
	function refresh() {
		queued = false;
		capture( observer.takeRecords() );
		observer.disconnect();
		try {
			discover();
			for ( const [ container, state ] of counters ) {
				if ( ! container.isConnected || ! container.contains( state.text ) ) {
					counters.delete( container );
				} else {
					update( state );
				}
			}
		} finally {
			observe();
		}
	}

	refresh();
}() );
