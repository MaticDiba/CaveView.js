
import { Cfg, replaceExtension } from '../core/lib';
import { Svx3dHandler } from './svx3dHandler';
import { loxHandler } from './loxHandler';
import { kmlHandler } from './kmlHandler';
import { FileLoader, EventDispatcher } from '../Three';

function CaveLoader ( callback ) {

	if ( ! callback ) {

		alert( 'No callback specified' );

	}

	this.callback = callback;
	this.dataResponse = null;
	this.metadataResponse = null;
	this.taskCount = 0;
	this.section = null;
	this.handler = null;
	this.files = null;

}

CaveLoader.prototype = Object.create( EventDispatcher.prototype );

CaveLoader.prototype.constructor = CaveLoader;

CaveLoader.prototype.setHandler = function ( fileName ) {

	if ( this.handler !== null ) return true;

	const rev = fileName.split( '.' ).reverse();

	this.extention = rev.shift().toLowerCase();

	switch ( this.extention ) {

	case '3d':

		this.handler = new Svx3dHandler( fileName );

		break;

	case 'lox':

		this.handler = new loxHandler( fileName );

		break;


	case 'kml':

		this.handler = new kmlHandler( fileName );

		break;

	default:

		console.warn( 'Cave: unknown response extension [', self.extention, ']' );
		return false;

	}

	return true;

};

CaveLoader.prototype.loadURLs = function ( files ) {

	this.files = files;
	this.loadURL( files.pop() );

};

CaveLoader.prototype.loadURL = function ( fileName, section ) {

	console.log( fileName );

	this.dispatchEvent( { type: 'progress', name: 'start' } );

	if ( section !== undefined ) this.section = section;

	const self = this;
	const prefix = Cfg.value( 'surveyDirectory', '' );

	// setup file handler
	if ( ! this.setHandler( fileName ) ) {

		alert( 'Cave: unknown file extension [' + self.extention + ']' );
		return false;

	}

	const handler = this.handler;

	this.doneCount = 0;
	this.taskCount = handler.isRegion ? 1 : 2;

	const loader = new FileLoader().setPath( prefix );

	loader.setResponseType( 'json' ).load( replaceExtension( fileName, 'json' ), _metadataLoaded, undefined, _metadataError );

	if ( handler.mimeType !== undefined ) loader.setMimeType( 'text/xml' );

	loader.setResponseType( handler.type );

	loader.load( fileName, _dataLoaded, _progress, _dataError );

	return true;

	function _dataLoaded ( result ) {

		self.doneCount++;
		self.dataResponse = result;

		if ( self.doneCount === self.taskCount ) self.callHandler();

	}

	function _metadataLoaded ( result ) {

		self.doneCount++;
		self.metadataResponse = result;

		if ( self.doneCount === self.taskCount ) self.callHandler();

	}

	function _progress ( e ) {

		self.dispatchEvent( { type: 'progress', name: 'set', progress: Math.round( 100 * e.loaded / e.total ) } );

	}

	function _dataError ( event ) {

		self.doneCount++;

		console.warn( ' error event', event );

		if ( self.doneCount === self.taskCount ) self.callHandler( fileName );

	}

	function _metadataError ( /* event */ ) {

		self.doneCount++;

		if ( self.doneCount === self.taskCount ) self.callHandler( fileName );

	}

};

CaveLoader.prototype.loadFile = function ( file, section ) {

	this.dispatchEvent( { type: 'progress', name: 'start' } );

	if ( section !== undefined ) this.section = section;

	const self = this;
	const fileName = file.name;

	if ( ! this.setHandler( fileName ) ) {

		alert( 'Cave: unknown file extension [' + this.extention + ']' );
		return false;

	}

	const fLoader = new FileReader();

	fLoader.addEventListener( 'load', _loaded );
	fLoader.addEventListener( 'progress', _progress );

	switch ( this.handler.type ) {

	case 'arraybuffer':

		fLoader.readAsArrayBuffer( file );

		break;

	default:

		alert( 'unknown file data type' );
		return false;

	}

	return true;

	function _loaded () {

		self.dataResponse = fLoader.result;
		self.callHandler();

		fLoader.removeEventListener( 'load', _loaded );
		fLoader.removeEventListener( 'progress', _progress );

	}

	function _progress ( e ) {

		self.dispatchEvent( { type: 'progress', name: 'set', progress: Math.round( 100 * e.loaded / e.total ) } );

	}

};

CaveLoader.prototype.callHandler = function () {

	if ( this.dataResponse === null ) {

		this.callback( false );
		this.dispatchEvent( { type: 'progress', name: 'stop' } );

		return;

	}

	const data = this.dataResponse;
	const metadata = this.metadataResponse;
	const section = this.section;
	const files = this.files;

	this.dataResponse = null;
	this.metadataResponse = null;
	this.section = null;

	const moreFiles = files !== null && files.length > 0;

	// start the next download to overlap parsing previous file

	if ( moreFiles ) this.loadURL( files.pop() );

	this.handler.parse( data, metadata, section );

	if ( ! moreFiles ) {

		this.callback( this.handler.end() );
		this.dispatchEvent( { type: 'progress', name: 'end' } );

		this.handler = null;

	}

};

export { CaveLoader };

// EOF