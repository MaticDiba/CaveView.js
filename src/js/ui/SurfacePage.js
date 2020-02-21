import {
	SHADING_CURSOR, SHADING_HEIGHT, SHADING_INCLINATION, SHADING_SINGLE,
	// TERRAIN_BLEND, TERRAIN_STENCIL, TERRAIN_BASIC
} from '../core/constants';

import { Page } from './Page';

const surfaceShadingModes = {
	'surface.shading.height':        SHADING_HEIGHT,
	'surface.shading.inclination':   SHADING_INCLINATION,
	'surface.shading.height_cursor': SHADING_CURSOR,
	'surface.shading.fixed':         SHADING_SINGLE
};

/*
const terrainThroughModes = {
	'terrain.through.basic':   TERRAIN_BASIC,
	'terrain.through.blend':   TERRAIN_BLEND,
	'terrain.through.stencil': TERRAIN_STENCIL
};
*/

function SurfacePage ( frame, viewer ) {

	const controls = [];

	Page.call( this, 'icon_terrain', 'surface' );

	frame.addPage ( this );

	this.addHeader( 'surface.header' );

	if ( viewer.hasSurfaceLegs ) {

		this.addCheckbox( 'surface.legs', viewer, 'surfaceLegs' );
		this.addSelect( 'surface.shading.caption', surfaceShadingModes, viewer, 'surfaceShading' );

	}

	if ( viewer.hasTerrain ) {

		this.addHeader( 'terrain.header' );

		this.addCheckbox( 'terrain.terrain', viewer, 'terrain' );

		controls.push( this.addSelect( 'terrain.shading.caption', viewer.terrainShadingModes, viewer, 'terrainShading' ) );

		// controls.push( this.addSelect( 'terrain.through.caption', terrainThroughModes, viewer, 'terrainThrough' ) );

		controls.push( this.addRange( 'terrain.opacity', viewer, 'terrainOpacity' ) );

		controls.push( this.addCheckbox( 'terrain.datum_shift', viewer, 'terrainDatumShift' ) );
		controls.push( this.addCheckbox( 'terrain.lighting', viewer, 'terrainDirectionalLighting' ) );

		if ( ! viewer.hasRealTerrain ) {

			controls.push( this.addDownloadButton( 'terrain.downloadTileSet', viewer.terrainTileSet, 'tileSetEntry.json' ) );

		}

		const attributions = viewer.terrainAttributions;

		for ( var i = 0; i < attributions.length; i++ ) {

			this.addText( attributions[ i ] );

		}

	}

	_onChange( { name: 'terrain' } );

	this.onChange = _onChange;

	return this;

	function _onChange ( event ) {

		// change UI dynamicly to only display useful controls
		if ( event.name === 'terrain' ) {

			frame.setControlsVisibility( controls, viewer.terrain );

		}

	}

}

SurfacePage.prototype = Object.create( Page.prototype );

export { SurfacePage };