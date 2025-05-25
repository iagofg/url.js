/// url.js
/// light-weight javascript library for managing and cancelling urls, pages and hashchanges events
/// @author info@iagoFG.com
/// @license LGPL 2.1
"use strict";
(function() {
	var URLJS_DEBUG = true;
	if (URLJS_DEBUG) console.log("url.js: libstatus init begin");
	var URLJS_EMULATION_MS = 333;
	var URLJS_WILDCARD = "*";
	var URLJS_WILDCARD_ONLY_IF_NOT_HANDLER = false;
	var URLJS_CANCEL_HISTORY_TRICK = true;
	var URLJS_BEHAVIOUR_ONCANCEL_RETRY = 1;
	var URLJS_BEHAVIOUR_ONCANCEL_RETRY_WAIT_TIME = 333;
	var URLJS_BEHAVIOUR_ONCANCEL_RETURN = 2;
	var URLJS_BEHAVIOUR_CANNOT_DELAY = 3;
	var URLJS_ONBEFOREUNLOAD_RETURNVALUE = "Changes will be lost";
	var URLJS_ONBEFOREUNLOAD_RETURN = URLJS_ONBEFOREUNLOAD_RETURNVALUE;
	var URLJS_LAST_URLCHANGE_MAX_LAPSE_DETECTION = 33;
	var URLJS_LAST_URLCHANGE_TYPE_NONE = 0;
	var URLJS_LAST_URLCHANGE_TYPE_GO = 1;
	var URLJS_LAST_URLCHANGE_TYPE_BACK = 2;
	var URLJS_LAST_URLCHANGE_TYPE_REPLACE = 3;
	var $url = {};
	var _exit_handlers = {};
	var _enter_handlers = {};
	var _ready_handlers = {};
	var _emuinterval = null;
	var _cancel_urlchange_url = null;
	var _cancel_urlchange_until = 0;
	var _urlchange_timestamp = 0;
	var _urlchange_type = URLJS_LAST_URLCHANGE_TYPE_NONE;
	var _previous_history_length = 0;
	var _update_previous_history_length = true;
	var _nonull_previous_hash = null; // finally this seems redudant as long as _previous_hash is not set to null
	var _previous_hash = null;
	var _previous_hash_triggered_exit = false;
	
	function _get_history_len() {
		return (window.history && window.history.length > 0) ? window.history.length : 0;
	}
	
	function status() {
		return {
			history_len: _get_history_len(),
			previous_history_len: _previous_history_length,
		};
	}
	$url.status = status;
	
	function _add_handler(handlers, hash, callback) {
		if (!(hash in handlers)) {
			handlers[hash] = [];
		}
		handlers[hash].push(callback);
	}

	function onexit(hash, callback) {
		return _add_handler(_exit_handlers, hash, callback);
	}
	$url.onexit = onexit;

	function onenter(hash, callback) {
		return _add_handler(_enter_handlers, hash, callback);
	}
	$url.onenter = onenter;

	function onready(hash, callback) {
		return _add_handler(_ready_handlers, hash, callback);
	}
	$url.onready = onready;
	
	function go(url) {
		console.log("go(", url, ")");
		window.location = url;
		_urlchange_timestamp = new Date().getTime();
		_urlchange_type = URLJS_LAST_URLCHANGE_TYPE_GO;
	}
	$url.go = go;

	function back(ammount) {
		console.log("back(", ammount, ")");
		window.history.back(ammount);
		_urlchange_timestamp = new Date().getTime();
		_urlchange_type = URLJS_LAST_URLCHANGE_TYPE_BACK;
	}
	$url.back = back;

	function replace(url) {
		console.log("replace(", url, ")");
		if (window.history.replaceState) {
			window.history.replaceState(undefined, undefined, url);
		} else if (window.location.replace) {
			window.location.replace(url);
		} else {
			back(-1);
			go(url);
		}
		_urlchange_timestamp = new Date().getTime();
		_urlchange_type = URLJS_LAST_URLCHANGE_TYPE_REPLACE;
	}
	$url.replace = replace;

	function _cancel_urlchange() {
		console.log("_cancel_urlchange [1]");
		var timestamp = new Date().getTime();
		if (timestamp > _cancel_urlchange_until) { // only one cancelation can be executed at once
			console.log("_cancel_urlchange [2]");
			if (_urlchange_timestamp + URLJS_LAST_URLCHANGE_MAX_LAPSE_DETECTION > timestamp) { // url change done with go/back/replace methods
				_cancel_urlchange_until = timestamp + URLJS_LAST_URLCHANGE_MAX_LAPSE_DETECTION;
				console.log("_cancel_urlchange [3] (" + _urlchange_type + ")");
				switch (_urlchange_type) {
				case URLJS_LAST_URLCHANGE_TYPE_GO:
					back(-1);
					_cancel_urlchange_url = _nonull_previous_hash;
					break;
				case URLJS_LAST_URLCHANGE_TYPE_BACK:
					if (_nonull_previous_hash != null) go(_cancel_urlchange_url = _nonull_previous_hash);
					break;
				case URLJS_LAST_URLCHANGE_TYPE_REPLACE:
					if (_nonull_previous_hash != null) replace(_cancel_urlchange_url = _nonull_previous_hash);
					break;
				}
			} else { // url change done with a href or browser/device button
				_cancel_urlchange_until = timestamp + URLJS_LAST_URLCHANGE_MAX_LAPSE_DETECTION;
				var history_len = _get_history_len();
				console.log("history_len", history_len, "; _previous_history_length", _previous_history_length);
				
				/*
				if (history_len > _previous_history_length) { // last navigation was forward
					console.log("~~~~~~~~~ _cancel_urlchange [2 A ]");
					back(-1);
					if (_nonull_previous_hash != null) replace(_cancel_urlchange_url = _nonull_previous_hash);
					if (URLJS_CANCEL_HISTORY_TRICK) {
						go(_nonull_previous_hash);
						back(-1);
					}
				} else { // we cannot be sure if last navigation was forward, replace or backward, so assume backward
					console.log("~~~~~~~~~ _cancel_urlchange [2 B ]");
				}
				*/
				/* */
				if (history_len > _previous_history_length) { // last navigation was forward
					console.log("~~~~~~~~~ _cancel_urlchange [2 A ]");
					//_previous_history_length = _get_history_len();
					back(-1);
					_update_previous_history_length = false;
					if (_nonull_previous_hash != null) replace(_cancel_urlchange_url = _nonull_previous_hash);
					_cancel_urlchange_url = _nonull_previous_hash;
					//_previous_history_length = _get_history_len();
				} else { // we cannot be sure if last navigation was forward, replace or backward, so assume backward
					console.log("~~~~~~~~~ _cancel_urlchange [2 B ]");
					if (_nonull_previous_hash != null) {
						go(_cancel_urlchange_url = _nonull_previous_hash);
						//_previous_history_length = _get_history_len();
					}
				}
				/* */
				/*
				if (history_len > _previous_history_length) { // last navigation was forward
					back(-1);
					if (_nonull_previous_hash != null) replace(_cancel_urlchange_url = _nonull_previous_hash);
					_cancel_urlchange_url = _nonull_previous_hash;
					_previous_history_length = _get_history_len();
				} else { // we cannot be sure if last navigation was forward, replace or backward, so assume backward
					if (_nonull_previous_hash != null) {
						go(_cancel_urlchange_url = _nonull_previous_hash);
						_previous_history_length = _get_history_len();
					}
				}
				*/
			}
		} else {
			console.warn("Cannot nest two url cancelation processes.");
		}
	}

	function _call_handler(handler, hash, behaviour, cb) {
		if (typeof handler == "function") {
			var allowed_delayed_call_handler = true;
			var local_delayed_call_handler = null;
			if (behaviour !== URLJS_BEHAVIOUR_CANNOT_DELAY) {
				local_delayed_call_handler = function(retv) { // this 
					if (allowed_delayed_call_handler) {
						allowed_delayed_call_handler = false; // cb can be only called 1 time
						if (retv === false) _cancel_urlchange();
						if (typeof cb == "function") cb(retv);
					}
				}
			}
			var retv = handler(hash, local_delayed_call_handler);
			if (behaviour !== URLJS_BEHAVIOUR_CANNOT_DELAY && retv === local_delayed_call_handler) {
				// do nothing, wait for local_delayed_call_handler call, if invoker does not call local_delayed_call_handler then process will not continue for this jump
			} else { // retv === true || false
				//console.log("_call_handler non delayed cb, allowed_delayed_call_handler = ", allowed_delayed_call_handler);
				if (allowed_delayed_call_handler) {
					allowed_delayed_call_handler = false; // cb can be only called 1 time
					if (retv === false) _cancel_urlchange();
					if (typeof cb == "function") cb(retv);
				}
			}
		}
	}

	function _call_handlers(handlers, hash, i, behaviour, cb) {
		if (hash in handlers) {
			if (i < handlers[hash].length) {
				_call_handler(handlers[hash][i], hash, behaviour, function(retv) {
					if (retv === false) {
						if (behaviour === URLJS_BEHAVIOUR_ONCANCEL_RETRY) {
							setTimeout(function() {
								_call_handlers(handlers, hash, i, behaviour, cb);
							}, URLJS_BEHAVIOUR_ONCANCEL_RETRY_TIME);
						} else { // behaviour === URLJS_BEHAVIOUR_ONCANCEL_RETURN || URLJS_BEHAVIOUR_CANNOT_DELAY
							if (typeof cb == "function") cb(false, hash);
						}
					} else {
						_call_handlers(handlers, hash, i + 1, behaviour, cb);
					}
				});
			} else {
				if (URLJS_WILDCARD_ONLY_IF_NOT_HANDLER) {
					if (typeof cb == "function") cb(true, hash);
				} else {
					_call_handlers_step2(handlers, hash, 0, behaviour, cb);
				}
			}
		} else {
			_call_handlers_step2(handlers, hash, 0, behaviour, cb);
		}
	}
	function _call_handlers_step2(handlers, hash, i, behaviour, cb) {
		if (URLJS_WILDCARD in handlers) {
			if (i < handlers[URLJS_WILDCARD].length) {
				_call_handler(handlers[URLJS_WILDCARD][i], hash, behaviour, function(retv) {
					if (retv === false) {
						if (behaviour === URLJS_BEHAVIOUR_ONCANCEL_RETRY) {
							setTimeout(function() {
								_call_handlers(handlers, hash, i, behaviour, cb);
							}, URLJS_BEHAVIOUR_ONCANCEL_RETRY_TIME);
						} else { // behaviour === URLJS_BEHAVIOUR_ONCANCEL_RETURN || URLJS_BEHAVIOUR_CANNOT_DELAY
							if (typeof cb == "function") cb(false, hash);
						}
					} else {
						_call_handlers_step2(handlers, hash, i + 1, behaviour, cb);
					}
				});
			} else {
				if (typeof cb == "function") cb(true, hash);
			}
		} else {
			if (typeof cb == "function") cb(true, hash);
		}
	}

	function _filter_hash(location_hash) {
		return location_hash.substr(0, 1) == "#" ? location_hash.substr(1) : location_hash;
	}
	function _change_hash(previous_hash, next_hash, cb) {
		var next_filtered_hash = _filter_hash(next_hash);
		if (_previous_hash !== null) {
			_call_handlers(_exit_handlers, _filter_hash(_previous_hash), 0, URLJS_BEHAVIOUR_ONCANCEL_RETURN, function(retv, previous_filtered_hash) {
				if (retv === false) {
					if (typeof cb == "function") cb(retv, previous_filtered_hash, next_filtered_hash);
				} else {
					_change_hash_step2(previous_filtered_hash, next_filtered_hash, cb);
				}
			});
		} else {
			_change_hash_step2(null, next_filtered_hash, cb);
		}
	}
	function _change_hash_step2(previous_filtered_hash, next_filtered_hash, cb) {
		_call_handlers(_enter_handlers, next_filtered_hash, 0, URLJS_BEHAVIOUR_ONCANCEL_RETURN, function(retv, next_filtered_hash) {
			//console.log("_change_hash_step2", retv);
			if (retv === false) {
				if (typeof cb == "function") cb(retv, previous_filtered_hash, next_filtered_hash);
			} else {
				_call_handlers(_ready_handlers, next_filtered_hash, 0, URLJS_BEHAVIOUR_ONCANCEL_RETRY, function(retv, next_filtered_hash) {
					//console.log("_change_hash_step2", retv);
					if (typeof cb == "function") cb(retv, previous_filtered_hash, next_filtered_hash);
				});
			}
		});
	}

	function onload(e) {
		console.log("onload", e);
	}
	function onbeforeunload(e) {
		console.log("onbeforeunload", e);
		var askforconfirmation = false;
		//console.log("onbeforeunload _previous_hash = ", _previous_hash);
		if (_previous_hash !== null) {
			_call_handlers(_exit_handlers, _filter_hash(_previous_hash), 0, URLJS_BEHAVIOUR_CANNOT_DELAY, function(retv, previous_filtered_hash) {
				if (retv === false) {
					askforconfirmation = true;
				}
			});
		}
		if (askforconfirmation) {
			e['returnValue'] = URLJS_ONBEFOREUNLOAD_RETURNVALUE;
			return URLJS_ONBEFOREUNLOAD_RETURN;
		} else {
			delete e['returnValue'];
		}
		//_previous_hash = null;
	}
	function onunload(e) {
		console.log("onunload", e);
	}
	function onhashchange(e) {
		console.log("onhashchange", window.location.hash, e);
		var location_hash = window.location.hash;
		var timestamp = new Date().getTime();
		//if ((timestamp > _cancel_urlchange_until) || (_cancel_urlchange_url == location_hash)) {
		if (timestamp > _cancel_urlchange_until) {
			_update_previous_history_length = true;
			var previous_history_length = _get_history_len();
			_change_hash(_previous_hash, location_hash);
			if (_update_previous_history_length) _previous_history_length = previous_history_length;
		}
		_nonull_previous_hash = _previous_hash = location_hash;
	}
	function emu_onhashchange() {
		var location_hash = window.location.hash;
		if (location_hash != _previous_hash) {
			onhashchange();
		}
	}

	window.addEventListener("load", onload);
	window.addEventListener("beforeunload", onbeforeunload);
	//window.addEventListener("unload", onunload);
	window.addEventListener("hashchange", onhashchange);
	_emuinterval = setInterval(emu_onhashchange, URLJS_EMULATION_MS);
	window.$url = $url;
	if (URLJS_DEBUG) console.log("url.js: libstatus init done");
})();
