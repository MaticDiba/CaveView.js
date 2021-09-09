import { ClusterMarkers } from './ClusterMarkers';
import { STATION_ENTRANCE, FEATURE_ENTRANCE_DOTS } from '../core/constants';
import { Points, BufferGeometry, Float32BufferAttribute } from '../Three';

class Entrances extends ClusterMarkers {

	constructor ( ctx, survey ) {

		super( ctx, survey.modelLimits, 4 );

		const self = this;
		const surveyTree = survey.surveyTree;
		const entrances = survey.metadata.entrances;
		const vertices = [];

		const geometry = new BufferGeometry();

		const material = ctx.materials.getEntrancePointMaterial();

		this.entranceColor = ctx.cfg.themeColor( 'stations.entrances.marker' );

		const markers = new Points( geometry, material );

		markers.layers.set( FEATURE_ENTRANCE_DOTS );

		// remove common elements from station names if no alternatives available

		let endNode = surveyTree;

		while ( endNode.children.length === 1 ) endNode = endNode.children [ 0 ];

		// find entrances and add Markers

		surveyTree.traverse( _addEntrance );

		const l = vertices.length * 3;

		if ( l > 0 ) {

			const positions = new Float32BufferAttribute( l, 3 );
			const colors = new Float32BufferAttribute( l, 3 );

			positions.copyVector3sArray( vertices );

			geometry.setAttribute( 'position', positions );
			geometry.setAttribute( 'color', colors );

		} else {

			this.visible = false;

		}

		this.markers = markers;
		this.vertices = vertices;
		this.metadata = survey.metadata;

		// set default colors - needs to be after markers property is set
		this.setSelection( null );

		this.addStatic( markers );

		return this;

		function _addEntrance( node ) {

			if ( ! ( node.type & STATION_ENTRANCE ) ) return;

			let name;

			const entranceInfo = entrances[ node.getPath() ];

			if ( entranceInfo !== undefined && entranceInfo.name !== undefined ) {

				name = entranceInfo.name;

			} else if ( node.comment !== undefined ) {

				name = node.comment;

			} else {

				name = node.getPath( endNode );

			}

			vertices.push( node );

			if ( name === '-skip' ) return;

			self.addMarker( node, ' ' + name + ' ' );

		}

	}

	getStation ( index ) {

		const station = this.vertices[ index ];
		const stationName = station.getPath();

		return {
			station: station,
			name: stationName,
			info: this.metadata.entrances[ stationName ]
		};

	}

	setStation ( station, info ) {

		const metadata = this.metadata;

		metadata.entrances[ station.getPath() ] = info;

		metadata.saveLocal();

	}

	intersectLabels ( mouse, camera, scale ) {

		const labels = this.labels.filter( _filter ).sort( _sort );

		return ( labels.length === 0 ) ? null : labels[ 0 ];

		function _filter ( label ) {

			return label.intersects( mouse, camera, scale );

		}

		function _sort ( a, b ) {

			return a.depth - b.depth;

		}

	}

	setSelection ( selection ) {

		const colors = this.markers.geometry.getAttribute( 'color' );
		const color = this.entranceColor;

		if ( colors === undefined ) return;

		if ( selection === null || selection.isEmpty() ) {

			const array = colors.array;
			const l = array.length;

			for ( let i = 0; i < l; i += 3 ) {

				color.toArray( array, i );

			}

		} else {

			const idSet = selection.getIds();

			this.vertices.forEach( function ( node, i ) {

				if ( idSet.has( node.id ) ) {

					color.toArray( colors, i * 3 );

				} else {

					colors.setXYZ( i, 0.5, 0.5, 0.5 );

				}

			} );

		}

		colors.needsUpdate = true;

	}

}

export { Entrances };