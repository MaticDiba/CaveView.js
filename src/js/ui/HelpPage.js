import { Page } from './Page';

class HelpPage extends Page {

	constructor ( frame, avenControls ) {

		super( 'icon_help', 'help' );

		frame.addPage( this );
		const self = this;

		let dl;

		this.addHeader( avenControls ? 'header_svx' : 'header_native' );

		this.addHeader( 'shading.header' );

		dl = document.createElement( 'dl' );

		_addKey( '1', 'shading.height' );
		_addKey( '2', 'shading.inclination' );
		_addKey( '3', 'shading.length' );
		_addKey( '4', 'shading.height_cursor' );
		_addKey( '5', 'shading.single' );
		_addKey( '6', 'shading.survey' );
		_addKey( '7', 'shading.route' );
		_addKey( '8', 'shading.depth' );
		_addKey( '9', 'shading.depth_cursor' );
		_addKey( '0', 'shading.distance' );
		_addKey( '<alt>f', 'shading.flat' );

		if ( ! avenControls ) {

			_addKey( '[', 'shading.cursor_up' );
			_addKey( ']', 'shading.cursor_down' );

		}

		this.appendChild( dl );

		this.addHeader( 'view.header' );

		dl = document.createElement( 'dl' );

		if ( avenControls ) {

			_addKey( 'P', 'view.plan' );
			_addKey( 'L', 'view.elevation' );

			_addKey( '', '-' );

			_addKey( 'N', 'view.north' );
			_addKey( 'E', 'view.east' );
			_addKey( 'S', 'view.south' );
			_addKey( 'W', 'view.west' );

			_addKey( '', '-' );

			_addKey( 'C', 'view.rotate_clockwise' );
			_addKey( 'V', 'view.rotate_anticlockwise' );

			_addKey( ']', 'view.zoom_in' );
			_addKey( '[', 'view.zoom_out' );

			_addKey( 'F', 'view.full_screen' );

			_addKey( '', '-' );

			_addKey( '" "', 'view.auto_rotate' );
			_addKey( 'Z', 'view.rotate_speed_up' );
			_addKey( 'X', 'view.rotate_speed_down' );
			_addKey( 'R', 'view.reverse_rotation' );

			_addKey( '', '-' );

			_addKey( '<del>', 'view.reset' );

		} else {

			_addKey( 'F', 'view.full_screen' );
			_addKey( 'O', 'view.orthogonal' );
			_addKey( 'P', 'view.perspective' );
			_addKey( 'R', 'view.reset' );
			_addKey( '.', 'view.center' );
			_addKey( 'N', 'view.next' );

		}

		_addKey( '<alt>L', 'view.show_labels' );
		_addKey( '<alt>S', 'view.control_mode' );
		_addKey( '<alt>X', 'view.zoom_to_cursor' );
		_addKey( '(', 'view.decrease_focal_length' );
		_addKey( ')', 'view.increase_focal_length' );

		this.appendChild( dl );

		this.addHeader( 'visibility.header' );

		dl = document.createElement( 'dl' );

		if ( avenControls ) {

			_addKey( 'J', 'visibility.station_labels' );
			_addKey( 'Q', 'visibility.splays' );
			_addKey( 'T', 'visibility.terrain' );
			_addKey( '<ctrl>B', 'visibility.bounding_box' );
			_addKey( '<ctrl>N', 'visibility.station_labels' );
			_addKey( '<ctrl>X', 'visibility.stations' );
			_addKey( '<ctrl>L', 'visibility.survey' );
			_addKey( '<ctrl>F', 'visibility.surface' );
			_addKey( '<alt>E',  'visibility.entrance_labels' );

			_addKey( '', '-' );

			_addKey( '<', 'visibility.opacity_down' );
			_addKey( '>', 'visibility.opacity_up' );

		} else {

			_addKey( 'C', 'visibility.scraps' );
			_addKey( 'J', 'visibility.station_labels' );
			_addKey( 'L', 'visibility.entrance_labels' );
			_addKey( 'Q', 'visibility.splays' );
			_addKey( 'S', 'visibility.surface' );
			_addKey( 'T', 'visibility.terrain' );
			_addKey( 'W', 'visibility.walls' );
			_addKey( 'Z', 'visibility.stations' );

			_addKey( '', '-' );

			_addKey( '<', 'visibility.opacity_down' );
			_addKey( '>', 'visibility.opacity_up' );

		}

		this.appendChild( dl );

		if ( ! avenControls ) {

			this.addHeader( 'selection.header' );

			dl = document.createElement( 'dl' );

			_addKey( 'V', 'selection.remove' );

			this.appendChild( dl );

		}

		function _addKey( key, description ) {

			const dt = document.createElement( 'dt' );
			const dd = document.createElement( 'dd' );

			dt.textContent = key;
			dd.textContent = self.i18n( description );

			dl.appendChild( dt );
			dl.appendChild( dd );

		}

	}

}

export { HelpPage };