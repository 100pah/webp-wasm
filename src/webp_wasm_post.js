/// post-js
(function () {

    var PTR_BTYE_LENGTH = 8;
    var PTR_IR_TYPE = 'i64';

    var WEBP_WASM_OK = 1;
    var WEBP_WASM_ERROR = 0;

    /**
     * [nativeAPI]:
     * Provide JS-frindly interface to business code.
     * The raw `Module` in emcc glue code should better not be used
     * directly in business code.
     */
    if (Module.nativeAPI) {
        throw new Error();
    }
    var nativeAPI = Module.nativeAPI = {};

    nativeAPI.libwebpVersion = function () {
        return Module['_libwebp_version']();
    };

    /**
     * @class BufferListWrap
     *
     * @param {number} bufferListSize The number of buffers.
     * @param {number} bufferByteSize The byte size of each buffer.
     */
    function BufferListWrap(bufferListSize, bufferByteSize) {
        var bufferListByteSize = bufferListSize * PTR_BTYE_LENGTH;

        /**
         * @private
         */
        this._bufPtrListPtr = allocWithThrow(bufferListByteSize);

        /**
         * @private
         */
        this._bufViewList = new Array(bufferListSize);

        for (var i = 0; i < bufferListSize; i++) {
            var bufferPtr = allocWithThrow(bufferByteSize);
            Module.setValue(this._bufPtrListPtr + i * PTR_BTYE_LENGTH, bufferPtr, PTR_IR_TYPE);
            this._bufViewList[i] = Module.HEAPU8.subarray(bufferPtr, bufferPtr + bufferByteSize);
        }
    }

    BufferListWrap.prototype.dispose = function () {
        for (var i = 0, len = this.size(); i < len; i++) {
            var bufPtr = Module.getValue(this._bufPtrListPtr + i * PTR_BTYE_LENGTH, PTR_IR_TYPE);
            Module._free(bufPtr);
        }

        Module._free(this._bufPtrListPtr);
        this._bufPtrListPtr = null;

        this._bufViewList = null;
    };

    BufferListWrap.prototype.size = function () {
        return this._bufViewList.length;
    };

    BufferListWrap.prototype.getView = function (i) {
        return this._bufViewList[i];
    };

    BufferListWrap.prototype.getBufferPtrListPtr = function () {
        return this._bufPtrListPtr;
    }

    /**
     * Create buffers on WASM linear memory.
     * The buffers can be visited both from JS and C.
     *
     * @param {number} bufferListSize The number of buffers.
     * @param {number} bufferByteSize The byte size of each buffer.
     * @return {BufferListWrap}
     */
    nativeAPI.createBufferListWrap = function (bufferListSize, bufferByteSize) {
        return new BufferListWrap(bufferListSize, bufferByteSize);
    };

    /**
     * @param {BufferListWrap} bufferListWrap
     * @param {number} width
     * @param {number} height
     * @param {number} frameDurationMs duration of each frame, in ms
     * @param {number} quality 0~100
     * @return {string} animated-webp dataURL
     */
    nativeAPI.encodeAnimation = function (
        bufferListWrap,
        width,
        height,
        frameDurationMs,
        quality
    ) {
        var outBufferPtrPtr = Module._malloc(PTR_BTYE_LENGTH);
        var outBufferByteSizePtr = Module._malloc(PTR_BTYE_LENGTH);

        if (Module['_encode_animation'](
            outBufferPtrPtr,
            outBufferByteSizePtr,
            bufferListWrap.getBufferPtrListPtr(),
            bufferListWrap.size(),
            width,
            height,
            frameDurationMs,
            quality
        ) !== WEBP_WASM_OK) {
            throw new Error('encode animation failed');
        }

        var bufferPtr = Module.getValue(outBufferPtrPtr, PTR_IR_TYPE);
        var bufferByteSize = Module.getValue(outBufferByteSizePtr, PTR_IR_TYPE);
        var bufferView = Module.HEAPU8.subarray(bufferPtr, bufferPtr + bufferByteSize);

        Module._free(bufferPtr);
        Module._free(outBufferPtrPtr);
        Module._free(outBufferByteSizePtr);

        return 'data:image/webp;base64,' + toBase64(bufferView);
    };

    function allocWithThrow(byteSize) {
        var ptr = Module._malloc(byteSize);
        // TODO: check failed detection correct?
        if (!ptr) {
            throw new Error('malloc failed');
        }
        return ptr;
    }

    // bufView: Uint8Array
    // TODO: performance?
    function toBase64(bufView) {
        var binary = '';
        for (var i = 0; i < bufView.length; i++) {
            binary += String.fromCharCode(bufView[i]);
        }
        return btoa(binary);
    }

})();
