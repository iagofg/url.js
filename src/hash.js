
// https://computerrock.com/blog/html5-changing-the-browser-url-without-refreshing-page/
// https://developer.mozilla.org/en-US/docs/Web/API/History_API
// https://github.com/browserstate/history.js

// onexit/onenter/onready event handler arguments:
// function hevent(event, hdelay) { ... }
//    event is the event object, which also is a string with the page which is closing, opening or is ready. It has all the typical methods like e.preventDefault();
//    hdelay is a callback that is defined if the action is delayable, otherwise will be null.
//    must return true if the action is accepted, false if the action must be cancelled or hdelay if the hdelay callback will be used.
// example: onexit(page, hevent);

(function() {
	var $hash = {};
	var exithandlers = {};
	var enterhandlers = {};
	var readyhandlers = {};
	var HASHJS_EMULATION_MS = 333;
	var emuinterval = null;
	var previous_hash = null;
	console.log("hash.js loaded");
	
	function add(handlers, page, callback) {
		if (!(page in handlers)) {
			handlers[page] = [];
		}
		handlers[page].push(callback);
	}
	function onexit(page, callback) {
		return add(exithandlers, page, callback);
	}
	function onenter(page, callback) {
		return add(enterhandlers, page, callback);
	}
	function onready(page, callback) {
		return add(readyhandlers, page, callback);
	}
	$hash.onexit = onexit;
	$hash.onenter = onenter;
	$hash.onready = onready;
	
	function go(url) {
		window.location = url;
	}
	function back(ammount) {
		window.history.back(ammount);
	}
	function replace(url) {
		back(-1);
		go(url);
	}
	$hash.go = go;
	$hash.back = back;
	$hash.replace = replace;
	
	function call(handlers, page) {
		if (page in handlers) {
			for (var i = 0; i < handlers[page].length; ++i) {
				handlers[page][i](page);
			}
		} else if ("*" in handlers) {
			for (var i = 0; i < handlers["*"].length; ++i) {
				handlers["*"][i](page);
			}
		}
	}
	
	function filter_hash(location_hash) {
		return location_hash.substr(0, 1) == "#" ? location_hash.substr(1) : location_hash;
	}
	
	function onload(e) {
		console.log("onload", e);
	}
	function onbeforeunload(e) {
		//var querystring = "";
		//var querystring = "Esto es una prueba";
		//var querystring = false;
		//console.log("onbeforeunload", e);
		//e.preventDefault(); // cancel the event
		//e.returnValue = querystring; // chrome requires returnValue to be set
		//e.returnValue = '[1] You have made changes on this page that you have not yet confirmed. If you navigate away from this page you will lose your unsaved changes';
		//return "[2] You have made changes on this page that you have not yet confirmed. If you navigate away from this page you will lose your unsaved changes";
		//event.returnValue = null; //"Any text"; //true; //false;
		//return null; //"Any text"; //true; //false;
		//return querystring;
		
		var askforconfirmation = false;
		if (askforconfirmation) {
			e['returnValue'] = true;
			return "SE PIERDEN CAMBIOS";
		} else {
			delete e['returnValue'];
		}
		
	}
	function onunload(e) {
		console.log("onunload", e);
	}
	function onhashchange(e) {
		console.log("onhashchange", e);
		var location_hash = window.location.hash;
		if (previous_hash !== null) {
			//console.log("exithash: \"" + previous_hash + "\"");
			call(exithandlers, filter_hash(previous_hash));
		}
		//console.log("enterhash: \"" + hash + "\"");
		call(enterhandlers, filter_hash(location_hash));
		//console.log("readyhash: \"" + hash + "\"");
		call(readyhandlers, filter_hash(location_hash));
		previous_hash = location_hash;
	}
	function emu_onhashchange() {
		var location_hash = window.location.hash;
		if (location_hash != previous_hash) {
			onhashchange();
		}
	}
	console.log("register events");
	window.addEventListener("load", onload);
	window.addEventListener("beforeunload", onbeforeunload);
	//window.addEventListener("unload", onunload);
	window.addEventListener("hashchange", onhashchange);
	emuinterval = setInterval(emu_onhashchange, HASHJS_EMULATION_MS);
	window.$hash = $hash;
})();