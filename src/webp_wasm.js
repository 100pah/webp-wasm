/// post-js
(function () {

    var exportMethods = {};

    var PTR_BTYE_LENGTH = 8;
    var PTR_IR_TYPE = 'i64';

    /**
     * Create buffers on WASM linear memory.
     * The buffers can be visited both from JS and C.
     *
     * @param {number} bufferListSize The number of buffers.
     * @param {number} bufferByteSize The byte size of each buffer.
     * @return {Array.<Unit8Array>} bufferViewList
     */
    exportMethods.createBufferList = function (bufferListSize, bufferByteSize) {
        console.log('prepareBufferList');

        var outBufferPtrListPtr = Module._malloc(PTR_BTYE_LENGTH);

        if (!Module.ccall(
            'create_buffer_list',
            'number',
            ['pointer', 'pointer', 'number', 'number'],
            [outBufferPtrListPtr, bufferListSize, bufferByteSize]
        )) {
            throw new Error('Create buffer failed.');
        }

        var bufferPtrListPtr = Module.getValue(outBufferPtrListPtr, PTR_IR_TYPE);

        var bufferViewList = [];
        for (var i = 0; i < bufferListSize; i++) {
            var bufferPtr = Module.getValue(bufferPtrListPtr + i * PTR_BTYE_LENGTH, PTR_IR_TYPE);
            var bufferView = Module.HEAPU8.subarray(bufferPtr, bufferPtr + bufferByteSize);
            bufferViewList.push(bufferView);
        }

        Module._free(outBufferPtrListPtr);

        return bufferViewList;
    };

    /**
     * @param {Array.<Unit8Array>} bufferList
     * @param {number} width
     * @param {number} height
     * @param {number} quality 0~100
     * @return {string} animated-webp dataURL
     */
    exportMethods.encodeAnimation = function (
        bufferList, width, height, quality
    ) {
        var outBufferPtr = Module._malloc(PTR_BTYE_LENGTH);
        var outBufferSize = Module._malloc(PTR_BTYE_LENGTH);

        if (!Module.ccall(
            'create_buffer_list',
            'number',
            ['pointer', 'pointer', 'number', 'number'],
            [outBufferPtrListPtr, bufferListSize, bufferByteSize]
        )) {
            throw new Error('Create out buffer failed.');
        }

    };

    function doExportMethods() {
        for (var key in exportMethods) {
            if (exportMethods.hasOwnProperty(key)) {
                // perform name confliction checking
                if (Module[key]) {
                    throw new Error('key exists:' + key);
                }
                Module[key] = exportMethods[key];
            }
        }
    }

    doExportMethods();

})();
