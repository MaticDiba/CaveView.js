import { replaceExtension } from '../core/lib';
import { Panel } from './Panel';

class RoutePanel extends Panel {

	constructor ( page, viewer, fileSelector ) {

		super( page );

		const self = this;
		const metadata = viewer.getMetadata();
		const routeNames = viewer.routeNames;

		this.add( page.addHeader( 'route.header' ) );

		let routeSelector = page.addSelect( 'route.current', routeNames, viewer, 'route' );
		let getNewRouteName;

		this.add( routeSelector );

		this.add( page.addButton( 'route.save', _saveRoute ) );

		this.add( page.addTextBox( 'route.new', '---', function ( getter ) { getNewRouteName = getter; } ) );

		this.add( page.addButton( 'route.add', _newRoute ) );

		this.add( page.addDownloadButton( 'route.download', metadata.getURL, replaceExtension( fileSelector.file, 'json' ) ) );

		function _newRoute () {

			console.log( getNewRouteName );
			//routes.addRoute( getNewRouteName() );

			// update selector

			routeSelector = self.addSelect( 'Current Route', viewer.routeNames, viewer, 'route', routeSelector );

		}

		function _saveRoute () {

			//routes.saveCurrent();

		}

	}

}

export { RoutePanel };