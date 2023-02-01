(function () {

    var _btnConvertInJSThread = document.getElementById('convert_to_awebp_in_js_thread');
    var _btnConvertInWebWorker = document.getElementById('convert_to_awebp_in_web_worker');
    var _commonUtils = createCommonUtils();
    var _webWorker;

    function initSampleAnimationFrames(cb) {
        var canvasEl = document.getElementById('animation-frames-test');
        var styleWidth = canvasEl.clientWidth;
        var styleHeight = canvasEl.clientHeight;
        var dpr = getDPR();
        var canvasWidth = canvasEl.width = styleWidth * dpr;
        var canvasHeight = canvasEl.height = styleHeight * dpr;
        var countX = 4;
        var countY = 5;
        var frameWidth = Math.floor(canvasWidth / countX);
        var frameHeight = Math.floor(canvasHeight / countY);

        var ctx = canvasEl.getContext('2d', {
            willReadFrequently: true
        });
        var animationImage = new Image();
        animationImage.src = '../test/assets/fox_frames.png';
        animationImage.onload = function () {

            ctx.drawImage(animationImage, 0, 0, canvasWidth, canvasHeight);

            var imageDataFrames = [];

            for (var i = 0; i < countX; ++i) {
                for (var j = 0; j < countY; ++j) {
                    var currX = i * frameWidth;
                    var currY = j * frameHeight;
                    var imageData = ctx.getImageData(currX, currY, frameWidth, frameHeight, {colorSpace: 'srgb'});
                    imageDataFrames.push(imageData.data);
                }
            }

            cb({
                frameWidth: frameWidth,
                frameHeight: frameHeight,
                imageDataFrames: imageDataFrames,
                imageDataBufferByteSize: frameWidth * frameHeight * 4,
            });
        };
    }

    function preapareControllers(nativeAPI, imageDataWrap) {

        _btnConvertInJSThread.addEventListener('click', function () {
            enableControllers(false);
            showWebp(false);
            printInfo('converting ...');
            // Delay for paint.
            _commonUtils.afterBrowserRendered(function () {
                var startTime = +(new Date());
                var webpDataURL = _commonUtils.convertToAnimatedWebp(nativeAPI, imageDataWrap);
                showWebp(webpDataURL);
                enableControllers(true);
                var costTime = +(new Date()) - startTime;
                printInfo('cost ' + costTime + ' ms');
            });
        });

        _btnConvertInWebWorker.addEventListener('click', function () {
            enableControllers(false);
            showWebp(false);
            printInfo('converting ...');
            function onMessage(event) {
                var costTime = +(new Date()) - startTime;
                printInfo('cost ' + costTime + ' ms');
                _webWorker.removeEventListener('click', onMessage);
                enableControllers(true);
                var webpDataURL = event.data;
                showWebp(webpDataURL);
            };
            _webWorker.addEventListener('message', onMessage);
            var startTime = +(new Date());
            _webWorker.postMessage(imageDataWrap);
        });

        enableControllers(true);
    }

    function enableControllers(enable) {
        if (enable) {
            _btnConvertInJSThread.removeAttribute('disabled');
            _btnConvertInWebWorker.removeAttribute('disabled');
        }
        else {
            _btnConvertInJSThread.setAttribute('disabled', 'disabled');
            _btnConvertInWebWorker.setAttribute('disabled', 'disabled');
        }
    }

    function initJankBall() {
        var ballEl = document.getElementById('jank_ball');
        var xStep = 1;
        var currSign = 1;
        function next() {
            requestAnimationFrame(function () {
                var currX = parseInt(ballEl.style.left, 10) || 0;
                if (
                    (currX > 300 && currSign > 0)
                    || (currX < 0 && currSign < 0)
                ) {
                    currSign = -currSign;
                }

                ballEl.style.left = (currX + currSign * xStep) + 'px';

                next();
            });
        }
        next();
    }

    function printInfo(msg) {
        var resultInfoEl = document.getElementById('result_info');
        resultInfoEl.innerHTML = '[Info]: ' + _commonUtils.encodeHTML(msg);
    }

    function showWebp(dataURL) {
        var resultImgContainer = document.getElementById('result_image');
        resultImgContainer.innerHTML = '';

        if (!dataURL) {
            return;
        }

        var imgEl = document.createElement('img');
        imgEl.src = dataURL;
        imgEl.style.cssText = [
            'width: 500px;'
        ].join(' ');
        resultImgContainer.appendChild(imgEl);
    }

    function getDPR() {
        return Math.max(
            window.devicePixelRatio
            || (window.screen && (window.screen).deviceXDPI / (window.screen).logicalXDPI)
            || 1, 1
        );
    }

    function initWorker() {
        if (_webWorker) {
            return;
        }
        var commonUtilsCode = '(' + createCommonUtils.toString() + ')()';
        var urlBaseCode = JSON.stringify(location.href.replace(/\/webp_wasm[.]html/, ''));
        var code = '(' + webWorkerScript.toString() + ')(' + commonUtilsCode + ', ' + urlBaseCode + ')';
        var blob = new Blob([code], {type: 'application/javascript;charset=utf8'});
        var blobURL = URL.createObjectURL(blob);
        _webWorker = new Worker(blobURL);
    }

    enableControllers(false);
    initJankBall();
    initWorker();

    _commonUtils.waitForWASMRuntime(function (nativeAPI) {
        var libwebpVersion = nativeAPI.libwebpVersion();
        console.log('[libwebp version]: ' + libwebpVersion);

        initSampleAnimationFrames(function (imageDataWrap) {
            preapareControllers(nativeAPI, imageDataWrap);
        });
    });


    /// ------------------------------------------------
    /// Common utils for both WebWorker and main script
    /// Must not use variables in closure.
    /// ------------------------------------------------

    function createCommonUtils() {
        /// imageDataFrames: Uint8ClampedArray
        function convertToAnimatedWebp(nativeAPI, imageDataWrap) {
            var imageDataFrames = imageDataWrap.imageDataFrames;
            var imageDataBufferByteSize = imageDataWrap.imageDataBufferByteSize;

            var bufViewListWrap = nativeAPI.createBufferListWrap(imageDataFrames.length, imageDataBufferByteSize);

            for (var i = 0, len = bufViewListWrap.size(); i < len; i++) {
                bufViewListWrap.getView(i).set(imageDataFrames[i]);
            }

            console.log(bufViewListWrap);

            var webpDataURL = nativeAPI.encodeAnimation(
                bufViewListWrap,
                imageDataWrap.frameWidth,
                imageDataWrap.frameHeight,
                20,
                80
            );
            console.log('result webpDataURL', webpDataURL);

            bufViewListWrap.dispose();

            return webpDataURL;
        }

        function waitForWASMRuntime(onWASMReady) {
            if (typeof webpWASM === 'undefined') {
                setTimeout(waitForWASMRuntime, 100);
                return;
            }
            webpWASM().then(function (webpModule) {
                console.log('webp_wasm.wasm ready: ', webpModule);
                onWASMReady(webpModule.nativeAPI);
            });
        }

        const replaceReg = /([&<>"'])/g;
        const replaceMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;'
        };
        function encodeHTML(source) {
            return source == null
                ? ''
                : (source + '').replace(replaceReg, function (str, c) {
                    return replaceMap[c];
                });
        }

        function afterBrowserRendered(cb) {
            // In spec rAF call before layout & paint each frame. So use two rAF.
            requestAnimationFrame(function () {
                requestAnimationFrame(cb);
            });
        }

        return {
            convertToAnimatedWebp: convertToAnimatedWebp,
            waitForWASMRuntime: waitForWASMRuntime,
            encodeHTML: encodeHTML,
            afterBrowserRendered: afterBrowserRendered
        };
    }

    /// --------------------------------------
    /// WebWorker code, only run in WebWorker
    /// Must not use variables in closure.
    /// --------------------------------------

    function webWorkerScript(_commonUtils, _urlBase) {
        var _pendingData = [];
        var _nativeAPI;

        // Used in Module.locateFile
        self.__URL_BASE__ = _urlBase;

        importScripts(_urlBase + '/webp_wasm.js');

        self.onmessage = function (event) {
            log('Message received from main script');
            var data = event.data;
            if (!_nativeAPI) {
                _pendingData.push(data);
            }
            else {
                doConvert(data);
            }
        };

        function log() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[worker]');
            console.log.apply(console, args);
        }

        function doConvert(data) {
            var webpDataURL = _commonUtils.convertToAnimatedWebp(_nativeAPI, data);
            self.postMessage(webpDataURL);
        }

        _commonUtils.waitForWASMRuntime(function (nativeAPI) {
            _nativeAPI = nativeAPI;
            log('webp_wasm.wasm ready in Web Worker');

            if (_pendingData.length) {
                for (var i = 0; i < _pendingData.length; i++) {
                    doConvert(_pendingData[i]);
                }
                _pendingData.length = 0;
            }
        });
    }

})();
