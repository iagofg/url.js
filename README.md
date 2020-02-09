# hash.js
light-weight javascript library for managing url hash changes for mono-page (or multi-page) apps.

## Usage

Once loaded hash.js file you can use following API calls:

### $hash.onexit(hash, listener)

Setup a event listener which will be called whenever another hash has been pushed into the url, before any onenter or onready listener is called. Also will be called if the page is unloading, for example the beforeunload or unload browser events were detected.

This event will report you, usually, that the screen is going to change. In this

Parameters:

 * _hash_ the hash for which the listener will be called, or "\*" if listener must be called always, whichever the hash value.
 * _listener_ a function which will be called when the hash is detected.
 
The listener function will receive the following arguments:
 * _hash_ will be the hash for which the listener was invoked, usesful when the same listener is used for various or all the possible hash values.
 * _delayedcb_ will be a delayed return callback function. This argument will be null/undefined/false sometimes, when listener cannot delay the return value, for example if the events were triggered from beforeunload browser event.
 * RETURN VALUE: listener must return true|false|delayedcb. true when the change is accepted, false when the change is not accepted or delayedcb function reference when delayedcb will be used to return true|false, for example this will return true if cannot be delayed or will call to otherfunction and use it async return value to feedback about if the change is allowed or not:

```javascript
     function listener(hash, delayedcb) {
       ...
       if (delayedcb) {
         otherfunction(function(toreturnvalue) {
           delayedcb(toreturnvalue);
         });
         return delayedcb;
       } else {
         return true;
       }
       ...
     }
```

### $hash.onenter(hash, listener)

Setup a event listener which will be called whenever a new hash is pushed into the url. Parameters and listener use the same format than $hash.onexit.

### $hash.onready(hash, listener)

Setup a event listener which will be called whenever a new hash is pushed into the url and all the onenter callbacks has been called. Same parameters and listener than $hash.onexit.

### $hash.go(url)

Navigate to the specified url. Whenever you can use this function as long as it reports the hash.js core trazability about the navigation made. However of course you can use <a href="url">...</a>, form or window.location = url classic navigation methods.

### $hash.back(delta)

Equivalent to window.history.back, however it reports the hash.js core trazability about the navigation made.

### $hash.replace(url)

Similar to $hash.go, however it does not add a navigation history entry... it swaps the current page url only. It is equivalent to window.history.replaceState.


