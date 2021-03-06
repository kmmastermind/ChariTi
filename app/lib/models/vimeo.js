var APP = require("core");
var HTTP = require("http");
var UTIL = require("utilities");

function Model() {
	var TID;

	this.init = function(_id) {
		APP.log("debug", "VIMEO.init(" + _id + ")");

		TID = _id;

		var db = Ti.Database.open("ChariTi");

		db.execute("CREATE TABLE IF NOT EXISTS vimeo_" + TID + " (id TEXT PRIMARY KEY, title TEXT, description TEXT, date TEXT, link TEXT);");

		db.close();
	};

	this.fetch = function(_params) {
		APP.log("debug", "VIMEO.fetch");
		APP.log("trace", JSON.stringify(_params));

		var isStale = UTIL.isStale(_params.url, _params.cache);

		if(isStale) {
			if(_params.cache !== 0 && isStale !== "new") {
				_params.callback();
			}

			HTTP.request({
				timeout: 10000,
				type: "GET",
				format: "JSON",
				url: _params.url,
				passthrough: _params.callback,
				success: this.handleData,
				failure: _params.error
			});
		} else {
			_params.callback();
		}
	};

	this.handleData = function(_data, _url, _callback) {
		APP.log("debug", "VIMEO.handleData");

		if(_data.length > 0) {
			var db = Ti.Database.open("ChariTi");

			db.execute("DELETE FROM vimeo_" + TID + ";");
			db.execute("BEGIN TRANSACTION;");

			for(var i = 0, x = _data.length; i < x; i++) {
				var video = _data[i];

				var id = UTIL.escapeString(video.id);
				var title = UTIL.cleanEscapeString(video.title);
				var description = UTIL.cleanEscapeString(video.description);
				var date = UTIL.escapeString(video.upload_date);
				var link = UTIL.cleanEscapeString(video.mobile_url);

				db.execute("INSERT OR ABORT INTO vimeo_" + TID + " (id, title, description, date, link) VALUES (" + id + ", " + title + ", " + description + ", " + date + ", " + link + ");");
			}

			db.execute("INSERT OR REPLACE INTO updates (url, time) VALUES(" + UTIL.escapeString(_url) + ", " + new Date().getTime() + ");");
			db.execute("END TRANSACTION;");
			db.close();
		}

		if(_callback) {
			_callback();
		}
	};

	this.getVideos = function() {
		APP.log("debug", "VIMEO.getVideos");

		var db = Ti.Database.open("ChariTi");
		var data = db.execute("SELECT id, title, date, link FROM vimeo_" + TID + " ORDER BY date DESC;");
		var temp = [];

		while(data.isValidRow()) {
			temp.push({
				id: data.fieldByName("id"),
				title: data.fieldByName("title"),
				date: data.fieldByName("date"),
				link: data.fieldByName("link")
			});

			data.next();
		}

		data.close();
		db.close();

		return temp;
	};
}

module.exports = function() {
	return new Model();
};