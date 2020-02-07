import { BufferGeometry, Float32BufferAttribute, Mesh } from '../../Three';


function Walls ( ctx ) {

	const geometry = new BufferGeometry();

	Mesh.call( this, geometry, ctx.materials.getUnselectedWallMaterial() );

	this.type = 'Walls';
	this.ctx = ctx;

	return this;

}

Walls.prototype = Object.create( Mesh.prototype );

Walls.prototype.ready = true;

Walls.prototype.addWalls = function ( vertices, indices, indexRuns ) {

	const geometry = this.geometry;
	const positions = new Float32BufferAttribute( vertices.length * 3, 3 );

	geometry.setAttribute( 'position', positions.copyVector3sArray( vertices ) );

	geometry.setIndex( indices );

	geometry.computeVertexNormals();
	geometry.computeBoundingBox();

	this.indexRuns = indexRuns;

	return this;

};

Walls.prototype.setShading = function ( selectedRuns, selectedMaterial ) {

	const geometry = this.geometry;
	const indexRuns = this.indexRuns;
	const materials = this.ctx.materials;

	geometry.clearGroups();

	this.visible = true && this.ready;

	if ( selectedRuns.size && indexRuns ) {

		this.material = [ selectedMaterial, materials.getUnselectedWallMaterial() ];

		let indexRun = indexRuns[ 0 ];

		let start = indexRun.start;
		let count = indexRun.count;

		let currentMaterial;
		let lastMaterial = selectedRuns.has( indexRun.survey ) ? 0 : 1;

		// merge adjacent runs with shared material.

		for ( var run = 1, l = indexRuns.length; run < l; run++ ) {

			indexRun = indexRuns[ run ];

			currentMaterial = selectedRuns.has( indexRun.survey ) ? 0 : 1;

			if ( currentMaterial === lastMaterial && indexRun.start === start + count ) {

				count += indexRun.count;

			} else {

				geometry.addGroup( start, count, lastMaterial );

				start = indexRun.start;
				count = indexRun.count;

				lastMaterial = currentMaterial;

			}

		}

		geometry.addGroup( start, count, lastMaterial );

	} else {

		this.material = selectedMaterial;

	}

};

Walls.prototype.cutRuns = function ( selectedRuns ) {

	const geometry = this.geometry;

	const vertices = geometry.getAttribute( 'position' );
	const indices = geometry.index;

	const indexRuns = this.indexRuns;

	const newIndices = [];
	const newVertices = [];

	const newIndexRuns = [];

	// map old vertex index values to new index values
	const vMap = new Map();

	const l = indexRuns.length;

	var run, newVertexIndex = 0, fp = 0;

	for ( run = 0; run < l; run++ ) {

		const indexRun = indexRuns[ run ];
		let i;

		if ( selectedRuns.has( indexRun.survey ) ) {

			const start = indexRun.start;
			const count = indexRun.count;

			const end = start + count;

			const itemSize = vertices.itemSize;
			const oldVertices = vertices.array;

			for ( i = start; i < end; i++ ) {

				const index = indices.getX( i );

				let newIndex = vMap.get( index );

				if ( newIndex === undefined ) {

					const offset = index * itemSize;

					newIndex = newVertexIndex++;

					vMap.set( index, newIndex );

					newVertices.push( oldVertices[ offset ], oldVertices[ offset + 1 ], oldVertices[ offset + 2 ] );

				}

				newIndices.push( newIndex );

			}

			indexRun.start = fp;

			fp += count;

			newIndexRuns.push( indexRun );

		}

	}

	if ( newIndices.length === 0 ) return false;

	// replace position and index attributes - dispose of old attributes
	geometry.index = new indices.constructor( newIndices );
	geometry.setAttribute( 'position', new Float32BufferAttribute( newVertices, 3 ) );

	geometry.computeVertexNormals();
	geometry.computeBoundingBox();

	this.indexRuns = newIndexRuns;

	return true;

};

export { Walls };
