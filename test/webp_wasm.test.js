(function () {

    function getDPR() {
        return Math.max(
            window.devicePixelRatio
            || (window.screen && (window.screen).deviceXDPI / (window.screen).logicalXDPI)
            || 1, 1
        );
    }

    function initAnimationFramesTest(webpModule) {

        function prepareImageData(cb) {
            var canvasEl = document.getElementById('animation-frames-test');
            var styleWidth = canvasEl.clientWidth;
            var styleHeight = canvasEl.clientHeight;
            var dpr = getDPR();
            var canvasWidth = canvasEl.width = styleWidth * dpr;
            var canvasHeight = canvasEl.height = styleHeight * dpr;

            var ctx = canvasEl.getContext('2d', {
                willReadFrequently: true
            });
            var animationImage = new Image();
            animationImage.src = '../test/assets/fox_frames.png';
            animationImage.onload = function () {

                ctx.drawImage(animationImage, 0, 0, canvasWidth, canvasHeight);

                var imageDataFrames = [];
                var countX = 4;
                var countY = 5;
                var frameWidth = Math.floor(canvasWidth / countX);
                var frameHeight = Math.floor(canvasHeight / countY);

                for (var i = 0; i < countX; ++i) {
                    for (var j = 0; j < countY; ++j) {
                        var currX = i * frameWidth;
                        var currY = j * frameHeight;
                        var imageData = ctx.getImageData(currX, currY, frameWidth, frameHeight, {colorSpace: 'srgb'});
                        imageDataFrames.push(imageData.data);
                    }
                }

                var imageDataBufferByteSize = frameWidth * frameHeight * 4;
                cb(imageDataFrames, imageDataBufferByteSize);
            };
        }

        /// imageDataFrames: Uint8ClampedArray
        prepareImageData(function (imageDataFrames, imageDataBufferByteSize) {
            var bufferViewList = webpModule.createBufferList(imageDataFrames.length, imageDataBufferByteSize);
            for (var i = 0; i < bufferViewList.length; i++) {
                bufferViewList[i].set(imageDataFrames[i]);
            }

            // console.log(imageDataFrames);
            console.log(bufferViewList);
        });
    }

    function run(webpModule) {
        var libwebpVersion = webpModule.ccall('libwebp_version', 'number', []);
        console.log('[libwebp version]: ' + libwebpVersion);

        initAnimationFramesTest(webpModule);
    }

    function waitForWASMRuntime() {
        if (typeof webpWASM === 'undefined') {
            setTimeout(waitForWASMRuntime, 100);
            return;
        }
        webpWASM().then(function (webpModule) {
            console.log('webp_wasm.wasm ready: ', webpModule);
            run(webpModule);
        });
    }

    waitForWASMRuntime();

})();
