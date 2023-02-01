/// pre-js
(function () {

    Module.printErr = function (text) {
        console.error('[c_stderr]', text);
    };

    Module.print = function (text) {
        console.log('[c_stdout]', text);
    };

    // Used in glue code, for web worker load wasm
    Module.locateFile = function (path, scriptDirectory) {
        if (typeof __URL_BASE__ !== 'undefined') {
            return __URL_BASE__ + '/' + path;
        }
        return scriptDirectory + path;
    };

})();
