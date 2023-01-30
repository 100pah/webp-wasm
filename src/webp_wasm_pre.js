/// pre-js
(function () {

    Module.printErr = function (text) {
        console.error('[c_stderr]', text);
    };

    Module.print = function (text) {
        console.log('[c_stdout]', text);
    };

})();
