import { TextureLoader, Box2, Vector2, Color } from '../Three';

import {TerrainOverlayMaterial } from '../materials/TerrainOverlayMaterial';
import proj4 from 'proj4';
import { TERRAIN_BLEND } from '../core/constants';

class Overlay {

	constructor ( ctx, overlayProvider ) {

		this.provider = overlayProvider;
		this.active = false;
		this.hasCoverage = false;
		this.crsSupported = overlayProvider.crsSupported === undefined ? [ 'EPSG:3857', 'EPSG:4326', 'ORIGINAL' ] : overlayProvider.crsSupported;
		this.throughMode = TERRAIN_BLEND;
		this.ctx = ctx;

		const attribution = overlayProvider.getAttribution();

		if ( attribution ) {

			const c = new Color( ctx.cfg.themeValue( 'background' ) );
			const hsl = { h: 0, s: 0, l: 0 };

			c.getHSL( hsl );

			attribution.classList.add( 'overlay-branding' );
			attribution.style.color = hsl.l < 0.5 ? 'white' : 'black';

			this.attribution = attribution;

		}

		this.materialCache = new Map();
		this.missing = new Set();

		const coverage = overlayProvider.coverage;

		if ( coverage !== undefined ) {

			this.coverage = new Box2(
				new Vector2( coverage.minX, coverage.minY ),
				new Vector2( coverage.maxX, coverage.maxY )
			);

		}

	}

	getMinZoom () {

		return this.provider.minZoom;

	}

	checkCoverage ( limits, displayCRS, surveyCRS ) {

		const coverage = this.coverage;

		if ( this.crsSupported.indexOf( displayCRS ) === -1 ) return false;

		// transform survey limits to wgs84 for comparison with overlay limits

		const transform = proj4( ( displayCRS === 'ORIGINAL' ? surveyCRS : displayCRS ), 'WGS84' );
		const wgs84Limits = new Box2();

		wgs84Limits.expandByPoint( transform.forward( { x: limits.min.x, y: limits.min.y } ) );
		wgs84Limits.expandByPoint( transform.forward( { x: limits.min.x, y: limits.max.y } ) );
		wgs84Limits.expandByPoint( transform.forward( { x: limits.max.x, y: limits.min.y } ) );
		wgs84Limits.expandByPoint( transform.forward( { x: limits.max.x, y: limits.max.y } ) );

		this.provider.crs = displayCRS;
		this.hasCoverage = ( coverage === undefined ) ? true : coverage.intersectsBox( wgs84Limits );

		return this.hasCoverage;

	}

	showAttribution () {

		const attribution = this.attribution;

		if ( attribution !== undefined ) this.ctx.container.appendChild( attribution );

	}

	hideAttribution () {

		const attribution = this.attribution;
		const parent = attribution.parentNode;

		if ( parent !== null ) parent.removeChild( attribution );

	}

	getTile ( x, y, z ) {

		const key = x + ':' + y + ':' + z;
		const cfg = this.ctx.cfg;
		const materials = this.ctx.materials;

		const material = this.materialCache.get( key );
		const overlayMaxZoom = this.provider.maxZoom;

		let repeat = 1;
		let xOffset = 0;
		let yOffset = 0;

		return new Promise( resolve => {

			if ( material !== undefined ) {

				resolve( this.active ? material : null );
				return;

			}

			const zoomDelta = z - overlayMaxZoom;

			if ( zoomDelta > 0 ) {

				const scale = Math.pow( 2, zoomDelta );

				repeat = 1 / scale;

				// get image for lower zoom
				const newX = Math.floor( x * repeat );
				const newY = Math.floor( y * repeat );

				xOffset = ( x - newX * scale ) / scale;
				yOffset = 1 - ( y - newY * scale ) / scale;
				yOffset -= repeat;

				x = newX;
				y = newY;
				z = overlayMaxZoom;

			}

			const url = this.provider.getUrl( x, y, z );

			if ( url === null || this.missing.has( url ) ) {

				resolve( materials.getMissingMaterial() );
				return;

			}
			/*
			new ImageBitmapLoader()
				.setCrossOrigin( 'anonymous' )
				.setOptions( { imageOrientation: 'flipY' } )
				.load(
					url,
					// success handler
					imageBitmap => {

						if ( ! this.active ) {

							texture.dispose();

							resolve( null );
							return;

						}
						const texture = new CanvasTexture( imageBitmap );
			*/
			new TextureLoader()
				.setCrossOrigin( 'anonymous' )
				.load(
					url,
					// success handler
					texture => {

						if ( ! this.active ) {

							texture.dispose();

							resolve( null );
							return;

						}

						const material = new TerrainOverlayMaterial( this.ctx );

						texture.anisotropy = cfg.value( 'anisotropy', 4 );

						texture.repeat.setScalar( repeat );
						texture.offset.set( xOffset, yOffset );

						material.map = texture;
						material.needsUpdate = true;

						this.materialCache.set( key, material );

						resolve( material );

					},

					// progress handler
					undefined,
					// error handler
					() => {

						this.missing.add( url );
						resolve( this.active ? materials.getMissingMaterial() : null );

					}
				);
		});
	}

	setActive () {

		this.showAttribution();
		this.active = true;

	}

	setInactive () {

		// flush cache
		this.materialCache.forEach( material => {

			material.map.dispose();
			material.dispose();

		} );

		this.materialCache.clear();

		this.hideAttribution();
		this.active = false;

	}

}

export { Overlay };