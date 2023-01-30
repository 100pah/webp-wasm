#include <stdlib.h>
#include <stdio.h>
#include <emscripten/emscripten.h>

#include "src/webp/encode.h"
#include "src/webp/mux.h"


/// [C vs Cpp]
/// The size of generated wasm have a significant difference.
/// e.g, only link libwebp, with emcc option -Oz,
/// generated wasm from C: 6945k, wasm from Cpp: 144529k)
/// So we use C rather than Cpp here.
/// But the downside is that embind can not be used and we have to
/// write lots of pointer operations


typedef uint64_t PointerValue;

/// return value of c functions in webp-wasm.
#define WEBP_WASM_OK 1
#define WEBP_WASM_ERROR 0


EMSCRIPTEN_KEEPALIVE
int libwebp_version() {
    return WebPGetEncoderVersion();
}

// void free_buffer_list(PointerValue* buffer_ptr_list, size_t allocated_count) {
//     for (size_t i = 0; i < allocated_count; ++i) {
//         free((void*)buffer_ptr_list[allocated_count]);
//     }
//     free((void*)buffer_ptr_list);
// }

// EMSCRIPTEN_KEEPALIVE
// int create_buffer_list(
//         PointerValue* out_buffer_ptr_list_ptr,
//         size_t buffer_list_size,
//         size_t buffer_byte_size) {

//     PointerValue* buffer_ptr_list = (PointerValue*)malloc(buffer_list_size * sizeof(PointerValue));
//     if (!buffer_ptr_list) {
//         goto Error;
//     }
//     *out_buffer_ptr_list_ptr = (PointerValue)buffer_ptr_list;

//     size_t allocated_idx = 0;
//     for (; allocated_idx < buffer_list_size; ++allocated_idx) {
//         void* buffer_ptr = malloc(buffer_byte_size);
//         if (!buffer_ptr) {
//             goto Error;
//         }
//         buffer_ptr_list[allocated_idx] = (PointerValue)buffer_ptr;
//     }

//     return WEBP_WASM_OK;

//   Error:
//     free_buffer_list(buffer_ptr_list, allocated_idx);
//     return WEBP_WASM_ERROR;
// }

// EMSCRIPTEN_KEEPALIVE
// void dispose_buffer_list(PointerValue* buffer_ptr_list, size_t buffer_list_size) {
//     free_buffer_list(buffer_ptr_list, buffer_list_size);
// }

EMSCRIPTEN_KEEPALIVE
int encode_animation(
        PointerValue* out_buffer_ptr_ptr,
        size_t* out_buffer_byte_size_ptr,
        const PointerValue* const frame_buffer_ptr_list,
        const size_t frame_buffer_list_size,
        const int width,
        const int height,
        // quality: 0 ~ 100
        const float quality
        ) {

    int ok = WEBP_WASM_ERROR;
    // PointerValue* out_image;
    const int stride = width * 4;
    // size_t out_size = WebPEncodeRGBA(in_image, width, height, width * 4, quality, &out_image);

    WebPAnimEncoderOptions enc_options;
    WebPAnimEncoderOptionsInit(&enc_options);
    // ... (Tune 'enc_options' as needed).
    WebPAnimEncoder* enc = WebPAnimEncoderNew(width, height, &enc_options);

    // Setup a config, starting form a preset and tuning some additional
    // parameters
    WebPConfig webp_config;
    WebPConfigInit(&webp_config);
    // ... (Tune 'config' as needed).
    if (!WebPConfigPreset(&webp_config, WEBP_PRESET_PHOTO, quality)) {
        goto Error; // version error
    }
    // ... additional tuning
    webp_config.sns_strength = 90;
    webp_config.filter_sharpness = 6;

    // not mandatory, but useful
    if (!WebPValidateConfig(&webp_config)) {
        goto Error;
    }

    const uint64_t duration_ms = 16; // FIXME: other numbers?
    uint64_t timestamp_ms = 0;

    WebPPicture frame_pic;
    if (!WebPPictureInit(&frame_pic)) {
        fprintf(stderr, "version error in WebPPictureInit");
        goto Error;
    }
    frame_pic.width = width;
    frame_pic.height = height;

    WebPData webp_data;

    for (size_t i = 0; i < frame_buffer_list_size; ++i, timestamp_ms += duration_ms) {
        uint8_t* frame_buffer_ptr = (uint8_t*)frame_buffer_ptr_list[i];

        if (!WebPPictureImportRGBA(&frame_pic, frame_buffer_ptr, stride)) {
            fprintf(stderr, "memory error in WebPPictureImportRGBA at frame %zu", i);
            goto Error;
        }
        if (!WebPAnimEncoderAdd(enc, &frame_pic, duration_ms, &webp_config)) {
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

    ok = WEBP_WASM_OK;

  Error:
    WebPAnimEncoderDelete(enc);
    WebPPictureFree(&frame_pic);
    return ok;
}
