// hash.js

(function() {
	var HASHJS_DEBUG = true;
	if (HASHJS_DEBUG) console.log("hash.js: libstatus init begin");
	var HASHJS_EMULATION_MS = 333;
	var HASHJS_WILDCARD = "*";
	var HASHJS_WILDCARD_ONLY_IF_NOT_HANDLER = false;
	var HASHJS_BEHAVIOUR_ONCANCEL_RETRY = 1;
	var HASHJS_BEHAVIOUR_ONCANCEL_RETRY_WAIT_TIME = 500;
	var HASHJS_BEHAVIOUR_ONCANCEL_RETURN = 2;
	var HASHJS_BEHAVIOUR_CANNOT_DELAY = 3;
	var HASHJS_ONBEFOREUNLOAD_RETURNVALUE = "Changes will be lost";
	var HASHJS_ONBEFOREUNLOAD_RETURN = HASHJS_ONBEFOREUNLOAD_RETURNVALUE;
	var $hash = {};
	var _exit_handlers = {};
	var _enter_handlers = {};
	var _ready_handlers = {};
	var _emuinterval = null;
	var _previous_hash = null;
	var _previous_hash_triggered_exit = false;
	
	
	function _add_handler(handlers, hash, callback) {
		if (!(hash in handlers)) {
			handlers[hash] = [];
		}
		handlers[hash].push(callback);
	}

	function onexit(hash, callback) {
		return _add_handler(_exit_handlers, hash, callback);
	}
	$hash.onexit = onexit;

	function onenter(hash, callback) {
		return _add_handler(_enter_handlers, hash, callback);
	}
	$hash.onenter = onenter;

	function onready(hash, callback) {
		return _add_handler(_ready_handlers, hash, callback);
	}
	$hash.onready = onready;
	
	function go(url) {
		window.location = url;
	}
	$hash.go = go;

	function back(ammount) {
		window.history.back(ammount);
	}
	$hash.back = back;

	function replace(url) {
		back(-1);
		go(url);
	}
	$hash.replace = replace;

	function _call_handler(handler, hash, behaviour, cb) {
		if (typeof handler == "function") {
			var allowed_delayed_call_handler = true;
			var local_delayed_call_handler = null;
			if (behaviour !== HASHJS_BEHAVIOUR_CANNOT_DELAY) {
				local_delayed_call_handler = function(retv) {
					if (allowed_delayed_call_handler) {
						allowed_delayed_call_handler = false; // cb can be only called 1 time
						if (typeof cb == "function") cb(retv);
					}
				}
			}
			var retv = handler(hash, local_delayed_call_handler);
			if (behaviour !== HASHJS_BEHAVIOUR_CANNOT_DELAY && retv === local_delayed_call_handler) {
				// wait for local_delayed_call_handler call
			} else { // retv === true || false
				//console.log("_call_handler non delayed cb, allowed_delayed_call_handler = ", allowed_delayed_call_handler);
				if (allowed_delayed_call_handler) {
					allowed_delayed_call_handler = false; // cb can be only called 1 time
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
						if (behaviour === HASHJS_BEHAVIOUR_ONCANCEL_RETRY) {
							setTimeout(function() {
								_call_handlers(handlers, hash, i, behaviour, cb);
							}, HASHJS_BEHAVIOUR_ONCANCEL_RETRY_TIME);
						} else { // behaviour === HASHJS_BEHAVIOUR_ONCANCEL_RETURN || HASHJS_BEHAVIOUR_CANNOT_DELAY
							if (typeof cb == "function") cb(false, hash);
						}
					} else {
						_call_handlers(handlers, hash, i + 1, behaviour, cb);
					}
				});
			} else {
				if (HASHJS_WILDCARD_ONLY_IF_NOT_HANDLER) {
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
		if (HASHJS_WILDCARD in handlers) {
			if (i < handlers[HASHJS_WILDCARD].length) {
				_call_handler(handlers[HASHJS_WILDCARD][i], hash, behaviour, function(retv) {
					if (retv === false) {
						if (behaviour === HASHJS_BEHAVIOUR_ONCANCEL_RETRY) {
							setTimeout(function() {
								_call_handlers(handlers, hash, i, behaviour, cb);
							}, HASHJS_BEHAVIOUR_ONCANCEL_RETRY_TIME);
						} else { // behaviour === HASHJS_BEHAVIOUR_ONCANCEL_RETURN || HASHJS_BEHAVIOUR_CANNOT_DELAY
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
			_call_handlers(_exit_handlers, _filter_hash(_previous_hash), 0, HASHJS_BEHAVIOUR_ONCANCEL_RETURN, function(retv, previous_filtered_hash) {
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
		_call_handlers(_enter_handlers, next_filtered_hash, 0, HASHJS_BEHAVIOUR_ONCANCEL_RETURN, function(retv, next_filtered_hash) {
			//console.log("_change_hash_step2", retv);
			if (retv === false) {
				if (typeof cb == "function") cb(retv, previous_filtered_hash, next_filtered_hash);
			} else {
				_call_handlers(_ready_handlers, next_filtered_hash, 0, HASHJS_BEHAVIOUR_ONCANCEL_RETRY, function(retv, next_filtered_hash) {
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
			_call_handlers(_exit_handlers, _filter_hash(_previous_hash), 0, HASHJS_BEHAVIOUR_CANNOT_DELAY, function(retv, previous_filtered_hash) {
				if (retv === false) {
					askforconfirmation = true;
				}
			});
		}
		if (askforconfirmation) {
			e['returnValue'] = HASHJS_ONBEFOREUNLOAD_RETURNVALUE;
			return HASHJS_ONBEFOREUNLOAD_RETURN;
		} else {
			delete e['returnValue'];
		}
	}
	function onunload(e) {
		console.log("onunload", e);
	}
	function onhashchange(e) {
		console.log("onhashchange", window.location.hash, e);
		var location_hash = window.location.hash;
		_change_hash(_previous_hash, location_hash);
		_previous_hash = location_hash;
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
	_emuinterval = setInterval(emu_onhashchange, HASHJS_EMULATION_MS);
	window.$hash = $hash;
	if (HASHJS_DEBUG) console.log("hash.js: libstatus init done");
})();