import { VERSION, LEG_CAVE } from '../core/constants';
import { Page } from './Page';

class InfoPage extends Page {

	constructor ( frame, viewer, fileSelector ) {

		super( 'icon_info', 'info' );

		frame.addPage( this );

		this.addHeader( 'header' );

		this.addHeader( 'stats.header' );

		this.addText( this.i18n( 'file' ) + ': ' + fileSelector.file );

		const stats = viewer.getLegStats( LEG_CAVE );

		this.addLine( this.i18n( 'stats.legs' ) + ': ' + stats.legCount );
		this.addLine( this.i18n( 'stats.totalLength' ) + ': ' + stats.legLength.toFixed( 2 ) + '\u202fm' );
		this.addLine( this.i18n( 'stats.minLength' ) + ': ' + stats.minLegLength.toFixed( 2 ) + '\u202fm' );
		this.addLine( this.i18n( 'stats.maxLength' ) + ': ' + stats.maxLegLength.toFixed( 2 ) + '\u202fm' );

		this.addHeader( 'CaveView v' + VERSION + '.' );

		this.addLogo();
		this.addText( this.i18n( 'summary' ) );

		this.addText( this.i18n( 'more' ) + ': ' );
		this.addLink( 'https://aardgoose.github.io/CaveView.js/', this.i18n( 'github' ) );
		this.addText( '© Angus Sawyer, 2021' );

	}

}

export { InfoPage };