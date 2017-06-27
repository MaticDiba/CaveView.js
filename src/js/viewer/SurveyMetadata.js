function SurveyMetadata( name, metadata ) {

	this.name = name;

	var routes = [];
	var traces = [];

	if ( metadata !== undefined ) {

		if ( metadata.routes ) routes = metadata.routes;
		if ( metadata.traces ) traces = metadata.traces;

	}

	var localMetadata = localStorage.getItem( name );

	if ( localMetadata === null ) {

		localMetadata = { routes: {}, traces: [] };
		localStorage.setItem( name, JSON.stringify( localMetadata ) );

	} else {

		localMetadata = JSON.parse( localMetadata );

		console.log( 'reading local metadata' );
		console.log( localMetadata );

		var localRoutes = localMetadata.routes;
		var routeName, route;

		// add local routes to any routes in metadata (if any)

		for ( routeName in localRoutes ) {

			route = localRoutes[ routeName ];
			route.local = true;

			routes[ routeName ] = route;

		}

	}

	this.routes = routes;
	this.traces = traces;

}

SurveyMetadata.prototype.constructor = SurveyMetadata;

SurveyMetadata.prototype.getTraces = function () {

	return this.traces;

};

SurveyMetadata.prototype.getRoutes = function () {

	return this.routes;

};

SurveyMetadata.prototype.toDownload = function () {

	// dump of json top window for cut and paste capture

	var routesJSON = {
		name: 'test',
		version: 1.0,
		routes: this.routes,
		traces: this.traces
	};

	return 'data:text/json;charset=utf8,' + encodeURIComponent( JSON.stringify( routesJSON ) );

}

export { SurveyMetadata };