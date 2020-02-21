import { CommonTerrain } from './CommonTerrain';
import { Tile } from './Tile';

import { EPSG4326TileSet } from './EPSG4326TileSet';
import { EPSG3857TileSet } from './EPSG3857TileSet';

import { Frustum, Matrix4 } from '../Three';
import { dataURL } from '../core/lib';

const __frustum = new Frustum();
const __matrix4 = new Matrix4();

const __startEvent = { type: 'progress', name: 'start' };
const __endEvent = { type: 'progress', name: 'end' };

function WebTerrain ( ctx, survey, onLoaded ) {

	CommonTerrain.call( this, ctx );

	this.name = 'WebTerrain';
	this.type = 'CV.WebTerrain';
	this.attributions = [];
	this.log = false;
	this.ctx = ctx;

	this.displayCRS = survey.displayCRS;
	this.surveyCRS = survey.CRS;
	this.limits = survey.limits;
	this.flatZ = survey.modelLimits.max.z;
	this.offsets = survey.offsets;

	this.onLoaded        = onLoaded;
	this.childrenLoading = 0;
	this.childErrors     = 0;
	this.isLoaded        = false;
	this.material        = null;
	this.initialZoom     = null;
	this.dying = false;
	this.tilesLoading = 0;
	this.maxTilesLoading = 0;
	this.overlaysLoading = 0;
	this.debug = true;
	this.coverage = null;
	this.TS = null;
	this.maxTiles = ctx.cfg.value( 'maxTiles', 128 );

	// tile zoom properties
	this.retile_timeout = 80;
	this.retileScaler = 4;
	this.lastActivityTime = 0;
	this.timerId = null;

	this.material = ctx.materials.getCursorMaterial();
	this.canZoom = true;

	this.watcher = this.scheduleRetile.bind( this );
	this.updateFunc = WebTerrain.prototype.zoomCheck.bind( this );

	const self = this;

	switch ( this.displayCRS ) {

	case 'EPSG:3857':

		this.TS = new EPSG3857TileSet( ctx, _tileSetReady );

		break;

	case 'EPSG:4326':
	case 'ORIGINAL':

		this.TS = new EPSG4326TileSet( ctx, _tileSetReady, this.surveyCRS );

		break;

	default:

		onLoaded( this );
		return;

	}

	this.workerPool = this.ctx.workerPools.getPool( this.TS.workerScript );

	return;

	function _tileSetReady () {

		self.tileSets = self.TS.getTileSets();
		self.screenAttribution = self.TS.getScreenAttribution();

		if ( self.hasCoverage() ) {

			self.tileArea( self.limits );

		}

	}

}

WebTerrain.prototype = Object.create( CommonTerrain.prototype );

WebTerrain.prototype.isTiled = true;

WebTerrain.prototype.hasCoverage = function () {

	// iterate through available tileSets and pick the first match

	const limits = this.limits;
	const baseDirectory = this.ctx.cfg.value( 'terrainDirectory', '' );
	const tileSets = this.tileSets;
	const TS = this.TS;

	for ( var i = 0, l = tileSets.length; i < l; i++ ) {

		const tileSet = tileSets[ i ];

		const coverage = TS.getCoverage( limits, tileSet.minZoom );

		if (
			coverage.minX >= tileSet.minX &&
			coverage.maxX <= tileSet.maxX &&
			coverage.minY >= tileSet.minY &&
			coverage.maxY <= tileSet.maxY
		) {

			tileSet.directory = baseDirectory + tileSet.subdirectory;

			TS.tileSet = tileSet;

			this.isFlat = tileSet.isFlat;
			this.log = tileSet.log === undefined ? false : tileSet.log;
			this.attributions = tileSet.attributions;

			console.log( 'selected tile set:', tileSet.title );

			return true;

		}

	}

	return false;

};

WebTerrain.prototype.pickCoverage = function ( limits ) {

	const tileSet = this.TS.tileSet;

	var zoom = tileSet.overlayMaxZoom + 1;
	var coverage;

	do {

		coverage = this.TS.getCoverage( limits, --zoom );

	} while ( coverage.count > 4 && zoom > tileSet.minZoom );

	return coverage;

};

WebTerrain.prototype.loadTile = function ( x, y, z, parentTile, existingTile ) {

	if ( existingTile === undefined ) {

		existingTile = parentTile.children.find( function ( tile ) {
			return ( tile.x === x && tile.y === y && tile.zoom === z );
		} );

	}

	const self = this;
	const tileSpec = this.TS.getTileSpec( x, y, z, this.limits );

	if ( tileSpec === null ) return;

	tileSpec.offsets = this.offsets,
	tileSpec.flatZ = this.flatZ;

	if ( this.log ) console.log( 'load: [ ', z +'/' + x + '/' + y, ']' );

	this.maxTilesLoading = Math.max( this.maxTilesLoading, ++this.tilesLoading );

	// get Tile instance.

	const tile = existingTile ? existingTile : new Tile( this.ctx, x, y, z, tileSpec );

	tile.setPending( parentTile ); // tile load/reload pending

	this.workerPool.runWorker( tileSpec, _mapLoaded );

	return;

	function _mapLoaded ( event ) {

		const tileData = event.data;
		const worker = event.currentTarget;
		const overlay = self.activeOverlay;

		// return worker to pool

		self.workerPool.putWorker( worker );

		--self.tilesLoading;

		// the survey/region in the viewer may have changed while the height maps are being loaded.
		// bail out in this case to avoid errors

		if ( self.dying ) {

			self.dispatchEvent( __endEvent );
			return;

		}

		// error out early if we or other tiles have failed to load.

		if ( tileData.status !== 'ok' || tile.parent.childErrors !== 0 ) {

			tile.setFailed();

			// signal error to caller
			if ( self.tilesLoading === 0 && ! self.isLoaded ) {

				self.onLoaded( self );

			}

			self.dispatchEvent( __endEvent );

			return;

		}

		tile.createFromBufferAttributes( tileData.index, tileData.attributes, tileData.boundingBox, self.material );

		self.dispatchEvent( { type: 'progress', name: 'set', progress: 100 * ( self.maxTilesLoading - self.tilesLoading ) / self.maxTilesLoading } );

		if ( tile.setLoaded( overlay, _loaded ) ) {

			if ( overlay !== null && tile.zoom < overlay.getMinZoom() ) {

				self.zoomTile( tile );

			}

		}

	}

	function _loaded () {

		if ( self.tilesLoading === 0 ) self.dispatchEvent( __endEvent );

		if ( ! self.isLoaded ) {

			self.isLoaded = true;
			self.onLoaded( self );

		}

	}

};

WebTerrain.prototype.initProgress = function () {

	if ( this.tilesLoading > 0 ) {

		this.dispatchEvent( __startEvent );

	}

};

WebTerrain.prototype.tileArea = function ( limits ) {

	const coverage = this.pickCoverage( limits );
	const zoom = coverage.zoom;

	this.initialZoom = zoom;
	this.coverage = coverage;

	for ( var x = coverage.minX; x < coverage.maxX + 1; x++ ) {

		for ( var y = coverage.minY; y < coverage.maxY + 1; y++ ) {

			this.loadTile( x, y, zoom, this );

		}

	}

	this.initProgress();

	return;

};

WebTerrain.prototype.tileSet = function () {

	const tileSet = Object.assign( {}, EPSG3857TileSet.defaultTileSet );
	const coverage = this.coverage;

	delete tileSet.isFlat;
	delete tileSet.directory;

	tileSet.title = 'new tile set';
	tileSet.subdirectory = 'new_tile_set';

	tileSet.minZoom = coverage.zoom;

	tileSet.minX = coverage.minX;
	tileSet.maxX = coverage.maxX;
	tileSet.minY = coverage.minY;
	tileSet.maxY = coverage.maxY;

	return dataURL( tileSet );

};

WebTerrain.prototype.zoomTile = function ( tile ) {

	const zoom = tile.zoom + 1;
	const x = tile.x * 2;
	const y = tile.y * 2;

	this.loadTile( x,     y,     zoom, tile );
	this.loadTile( x + 1, y,     zoom, tile );
	this.loadTile( x,     y + 1, zoom, tile );
	this.loadTile( x + 1, y + 1, zoom, tile );

};

WebTerrain.prototype.setOverlay = function ( overlay, overlayLoadedCallback ) {

	if ( this.tilesLoading > 0 ) return;

	const self = this;
	const currentOverlay = this.activeOverlay;
	const throughMode = overlay.throughMode;

	if ( currentOverlay !== null ) {

		if ( currentOverlay === overlay ) {

			this.traverse( _setTileThroughMode );

			return;

		} else {

			currentOverlay.setInactive();

		}

	}

	overlay.setActive();

	this.activeOverlay = overlay;

	let overlayMinZoom = overlay.getMinZoom();

	this.traverse( _setTileOverlays );

	return;

	function _setTileOverlays ( tile ) {

		if ( ! tile.isTile || ! tile.isMesh ) return;

		if ( tile.zoom < overlayMinZoom ) {

			// no overlay for this zoom layer, zoom to next level
			self.zoomTile( tile );

		} else {

			tile.setOverlay( overlay, _overlayLoaded );
			self.overlaysLoading++;

		}

	}

	function _setTileThroughMode ( tile ) {

		if ( ! tile.isTile || ! tile.isMesh ) return;

		tile.setThroughMode( throughMode );

	}

	function _overlayLoaded () {

		if ( --self.overlaysLoading === 0 ) overlayLoadedCallback();

	}

};

WebTerrain.prototype.removed = function () {

	const self = this;

	this.dying = true;

	this.traverse( _disposeTileMesh );

	this.commonRemoved();

	return;

	function _disposeTileMesh ( obj ) {

		if ( obj !== self ) obj.removed( obj );

	}

};

WebTerrain.prototype.setMaterial = function ( material ) {

	if ( this.tilesLoading > 0 ) return;

	this.traverse( _setTileMeshMaterial );

	this.activeOverlay = null;

	material.needsUpdate = true;
	material.fog = false;

	this.material = material;

	return;

	function _setTileMeshMaterial ( obj ) {

		if ( ! obj.isTile ) return;

		obj.setMaterial( material );

	}

};


WebTerrain.prototype.zoomCheck = function ( cameraManager ) {

	if ( performance.now() - this.lastActivityTime < this.retile_timeout ) return;
	if ( this.tilesLoading > 0 ) return true;

	const self = this;
	const frustum = __frustum;
	const camera = cameraManager.activeCamera;
	const lastFrame = cameraManager.getLastFrame();

	const candidateTiles      = [];
	const candidateEvictTiles = [];
	const resurrectTiles      = [];

	var retry = false;
	var i;

	frustum.setFromProjectionMatrix( __matrix4.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );

	// scan scene graph of terrain

	this.traverse( _scanTiles );

	const resurrectCount = resurrectTiles.length;
	const candidateCount = candidateTiles.length;

	_evictTiles();

	if ( resurrectCount !== 0 ) {

		for ( i = 0; i < resurrectCount; i++ ) {

			const tile = resurrectTiles[ i ];

			// reload tile (use exiting tile object to preserve canZoom).
			this.loadTile( tile.x, tile.y, tile.zoom, tile.parent, tile );

		}

		retry = true;

	} else if ( candidateCount !== 0 ) {

		for ( i = 0; i < candidateCount; i++ ) {

			this.zoomTile( candidateTiles[ i ] );

		}

		retry = true;

	}

	this.initProgress();

	if ( retry ) {

		this.timerId = setTimeout( this.updateFunc, this.retile_timeout * this.retileScaler, cameraManager );
		this.retileScaler *= 2;

	}

	return;

	function _scanTiles( tile ) {

		const parent = tile.parent;

		if ( ! tile.isTile || ! parent.canZoom ) return;

		if ( tile.isMesh && tile.canZoom && tile.lastFrame === lastFrame ) {

			// this tile intersects the screen

			// this tile is loaded, maybe increase resolution?
			// now safe if tile has evicted children or not

			tile.computeProjectedArea( camera );
			if ( tile.area / 4 > 0.81 ) candidateTiles.push( tile );

		} else if ( ! parent.isMesh && tile.evicted && frustum.intersectsBox( tile.getWorldBoundingBox() ) ) {

			// this tile is not loaded, but has been previously

			// flag subtiles to prevent premature resurrection
			// and indicate replaced by superior
			tile.traverse( function ( subtile ) {

				subtile.evicted = false;
				if ( subtile !== tile ) subtile.replaced = true;

			} );

			resurrectTiles.push( tile );

		} else {

			// off screen tile
			if ( tile.isMesh && tile.lastFrame !== lastFrame ) candidateEvictTiles.push( tile );

		}

	}

	function _evictTiles() {

		const candidateCount = candidateEvictTiles.length;
		const evictTarget = Tile.liveTiles - self.maxTiles;
		const evictCount = Math.min( candidateCount, evictTarget );

		if ( evictCount > 0 ) {

			candidateEvictTiles.sort( _sortByPressure );

			let i;
			let now = performance.now();

			for ( i = 0; i < evictCount; i++ ) {

				const tile = candidateEvictTiles[ i ];

				if ( tile.evictionCount === 0 ) {

					tile.evictionCount = now;

				} else if ( now - tile.evictionCount > 1000 ) {

					tile.evict();

				}

			}

		}

		function _sortByPressure( tileA, tileB ) {

			const zoomDiff = tileB.zoom - tileA.zoom;

			if ( zoomDiff !== 0 ) {

				return zoomDiff;

			}

			const frameDiff = tileA.lastFrame - tileB.lastFrame;

			if ( frameDiff !== 0 ) {

				return frameDiff;

			}

			const xDiff = tileA.x - tileB.x;

			if ( xDiff !== 0 ) {

				return xDiff;

			} else {

				return tileA.y - tileB.y;

			}

		}

	}

};

WebTerrain.prototype.getHeights = function ( points, callback ) {

	const tileSet = this.TS;
	const self = this;

	const tileSpecs = {};
	const results = [];

	// sort points in to requests per tile

	points.forEach( function ( point, i ) {

		const tileSpec = tileSet.findTile( point );
		const key = tileSpec.x + ':' + tileSpec.y + ':' + tileSpec.z;

		point.index = i;

		if ( tileSpecs[ key ] === undefined ) {

			// new tile query
			tileSpecs[ key ] = tileSpec;

		} else {

			// merge requested point with existing query
			tileSpecs[ key ].dataOffsets.push( tileSpec.dataOffsets[ 0 ] );
			tileSpecs[ key ].points.push( tileSpec.points[ 0 ] );

		}

	} );

	// dispatch requests

	let requestCount = 0;

	for ( var key in tileSpecs) {

		this.workerPool.runWorker( tileSpecs[ key ], _mapLoaded );
		requestCount++;

	}

	return;

	function _mapLoaded ( event ) {

		// return worker to pool

		self.workerPool.putWorker( event.currentTarget );

		const resultPoints = event.data.points;

		resultPoints.forEach( function ( point ) { results[ point.index ] = point; } );

		if ( --requestCount === 0 ) {

			callback( results );

		}

	}

};

WebTerrain.prototype.fitSurface = function ( modelPoints, offsets ) {

	if ( this.TS.findTile === undefined ) {

		this._fitSurface( modelPoints );
		return;

	}

	const self = this;

	// adjust to geographical values
	const points = modelPoints.map( function ( point ) { return point.clone().add( offsets); } );

	this.getHeights( points, _heightsReturned );

	function _heightsReturned ( ret ) {

		var n = 0, s1 = 0, s2 = 0;

		ret.forEach( function ( a ) {

			const v = points[ a.index ].z - a.z;
			s1 += v;
			s2 += v * v;
			n++;

		} );

		let sd = Math.sqrt( s2 / n - Math.pow( s1 / n, 2 ) );

		// simple average
		self.datumShift = s1 / n;

		console.log( 'Adjustmenting terrain height by:', self.datumShift, 'sd:',sd );

	}

};

WebTerrain.prototype.scheduleRetile = function ( event) {

	if ( ! this.visible ) return;

	if ( this.timerId !== null ) clearTimeout( this.timerId );

	this.retileScaler = 4;
	this.lastActivityTime = performance.now();
	this.timerId = setTimeout( this.updateFunc, this.retile_timeout, event.cameraManager );

};


WebTerrain.prototype.watch = function ( obj ) {

	obj.addEventListener( 'moved', this.watcher );

};

WebTerrain.prototype.unwatch = function ( obj ) {

	obj.removeEventListener( 'moved', this.watcher );

};

export { WebTerrain };