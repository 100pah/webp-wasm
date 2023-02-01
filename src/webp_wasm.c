#include <stdlib.h>
#include <stdio.h>
#include <emscripten/emscripten.h>

#include "src/webp/encode.h"
#include "src/webp/mux.h"


typedef uint64_t PointerValue;

/// return value of c functions in webp-wasm.
#define WEBP_WASM_OK 1
#define WEBP_WASM_ERROR 0


EMSCRIPTEN_KEEPALIVE
int libwebp_version() {
    return WebPGetEncoderVersion();
}

/**
 * Encode to animated webp in one time.
 * It probably takes a while.
 */
EMSCRIPTEN_KEEPALIVE
int encode_animation(
        PointerValue* const out_buffer_ptr_ptr,
        size_t* const out_buffer_byte_size_ptr,
        const PointerValue* const frame_buffer_ptr_list,
        const size_t frame_buffer_list_size,
        const int width,
        const int height,
        // duration of each frame
        const uint64_t frame_duration_ms,
        // quality: 0 ~ 100
        const float quality
        ) {

    int return_value = WEBP_WASM_ERROR;

    WebPAnimEncoderOptions enc_options;
    WebPAnimEncoderOptionsInit(&enc_options);
    // ... (Tune 'enc_options' as needed).

    WebPAnimEncoder* enc = WebPAnimEncoderNew(width, height, &enc_options);

    WebPConfig webp_config;
    WebPConfigInit(&webp_config);
    if (!WebPConfigPreset(&webp_config, WEBP_PRESET_PHOTO, quality)) {
        goto Error; // version error
    }
    // ... additional tuning
    // webp_config.sns_strength = 90;
    // webp_config.filter_sharpness = 6;

    // not mandatory, but useful
    if (!WebPValidateConfig(&webp_config)) {
        goto Error;
    }

    uint64_t timestamp_ms = 0;
    const int stride = width * 4;

    WebPPicture frame_pic;
    if (!WebPPictureInit(&frame_pic)) {
        fprintf(stderr, "version error in WebPPictureInit");
        goto Error;
    }
    frame_pic.width = width;
    frame_pic.height = height;

    WebPData webp_data;

    for (size_t i = 0; i < frame_buffer_list_size; ++i, timestamp_ms += frame_duration_ms) {
        uint8_t* frame_buffer_ptr = (uint8_t*)(frame_buffer_ptr_list[i]);

        if (!WebPPictureImportRGBA(&frame_pic, frame_buffer_ptr, stride)) {
            fprintf(stderr, "memory error in WebPPictureImportRGBA at frame %zu", i);
            goto Error;
        }
        // `WebPAnimEncoderAdd` probably takes long time (e.g., 70ms each time).
        // Mainly spent on alpha compression.
        if (!WebPAnimEncoderAdd(enc, &frame_pic, timestamp_ms, &webp_config)) {
            fprintf(stderr, "WebPAnimEncoderAdd error, error_code: %d", frame_pic.error_code);
            goto Error;
        }
    }
    // The last call to 'WebPAnimEncoderAdd' should be with frame = NULL, which
    // indicates that no more frames are to be added. This call is also used to
    // determine the duration of the last frame.
    WebPAnimEncoderAdd(enc, NULL, timestamp_ms, NULL);

    WebPAnimEncoderAssemble(enc, &webp_data);

    *out_buffer_ptr_ptr = (PointerValue)webp_data.bytes;
    *out_buffer_byte_size_ptr = webp_data.size;

    return_value = WEBP_WASM_OK;

  Error:
    WebPAnimEncoderDelete(enc);
    WebPPictureFree(&frame_pic);
    return return_value;
}
