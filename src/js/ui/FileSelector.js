import { EventDispatcher } from '../Three';

function FileSelector ( container, ctx ) {

	this.fileList = [];
	this.fileCount = 0;
	this.currentIndex = Infinity;
	this.loadedFile = null;
	this.isMultiple = false;
	this.splash = null;
	this.localFilename = null;

	const self = this;

	container.addEventListener( 'drop', _handleDrop );
	container.addEventListener( 'dragenter', _handleDragenter );
	container.addEventListener( 'dragover', _handleDragover );
	container.addEventListener( 'dragleave', _handleDragleave );

	Object.defineProperty( this, 'file', {
		get: function () { return this.selectedFile; },
		set: this.selectFile
	} );

	function _closeSpash () {

		const splash = self.splash;

		if ( splash !== null ) {

			splash.parentNode.removeChild( splash );
			self.splash = null;

		}

	}

	function _handleDragenter ( event ) {

		if ( self.splash !== null ) return;

		const splash = document.createElement( 'div' );

		splash.innerHTML = ctx.cfg.i18n( 'dnd.splash_text' ) || 'dnd.splash_text';

		splash.id = 'cv-splash';

		container.appendChild( splash );

		event.preventDefault();

		self.splash = splash;

		// sometimes a dragleave event doesn't get here.
		setTimeout( _closeSpash, 10000 );

	}

	function _handleDragover ( event ) {

		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';

	}


	function _handleDragleave ( event ) {

		_closeSpash();
		event.preventDefault();

	}

	function _handleDrop ( event ) {

		_closeSpash();

		const dt = event.dataTransfer;

		event.preventDefault();

		const count = dt.files.length;
		const files = [];

		if ( count > 0 ) {

			for( var i = 0; i < count; i++ ) {

				files.push( dt.files[ i ] );

			}

			self.selectFile( files, null );

		}

	}

	this.dispose = function () {

		container.removeEventListener( 'drop', _handleDrop );
		container.removeEventListener( 'dragover', _handleDragover );
		container.removeEventListener( 'dragleave', _handleDragleave );
		container.removeEventListener( 'dragenter', _handleDragenter );

	};

}

FileSelector.prototype = Object.create( EventDispatcher.prototype );

FileSelector.prototype.addList = function ( list ) {

	this.fileList = list;
	this.fileCount = list.length;

};

FileSelector.prototype.nextFile = function () {

	const fileList = this.fileList;

	//cycle through caves in list provided
	if ( this.fileCount === 0 ) return false;

	if ( ++this.currentIndex >= this.fileCount ) this.currentIndex = 0;

	this.selectFile( fileList[ this.currentIndex ] );

};

FileSelector.prototype.selectFile = function ( file, section ) {

	if ( Array.isArray( file ) ) {

		if ( file.length === 1 ) {

			this.localFilename = file[ 0 ].name;
			this.selectedFile = file[ 0 ];
			this.isMultiple = false;

		} else {

			this.selectedFile = '[multiple]';
			this.localFilename = 'multiple';
			this.isMultiple = true;

		}

	} else {

		this.selectedFile = file;
		this.localFilename = file;

	}

	this.loadedFile = file;

	this.dispatchEvent( { type: 'selected', file: file, section: section } );

};

FileSelector.prototype.reload = function () {

	this.selectFile( this.loadedFile );

};

export { FileSelector};