(function () {

    function getDPR() {
        return Math.max(
            window.devicePixelRatio
            || (window.screen && (window.screen).deviceXDPI / (window.screen).logicalXDPI)
            || 1, 1
        );
    }

    function initAnimationFramesTest(nativeAPI) {

        function prepareImageData(cb) {
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

        /// imageDataFrames: Uint8ClampedArray
        prepareImageData(function (opt) {
            var imageDataFrames = opt.imageDataFrames;
            var imageDataBufferByteSize = opt.imageDataBufferByteSize;

            var bufViewListWrap = nativeAPI.createBufferListWrap(imageDataFrames.length, imageDataBufferByteSize);

            for (var i = 0, len = bufViewListWrap.size(); i < len; i++) {
                bufViewListWrap.getView(i).set(imageDataFrames[i]);
            }

            console.log(bufViewListWrap);

            var webpDataURL = nativeAPI.encodeAnimation(
                bufViewListWrap, opt.frameWidth, opt.frameHeight, 80
            );
            console.log('result webpDataURL', webpDataURL);

            bufViewListWrap.dispose();
        });
    }

    function run(nativeAPI) {
        var libwebpVersion = nativeAPI.libwebpVersion();
        console.log('[libwebp version]: ' + libwebpVersion);

        initAnimationFramesTest(nativeAPI);
    }

    function waitForWASMRuntime() {
        if (typeof webpWASM === 'undefined') {
            setTimeout(waitForWASMRuntime, 100);
            return;
        }
        webpWASM().then(function (webpModule) {
            console.log('webp_wasm.wasm ready: ', webpModule);
            run(webpModule.nativeAPI);
        });
    }

    waitForWASMRuntime();

})();
