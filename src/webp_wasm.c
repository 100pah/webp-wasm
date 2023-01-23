#include <stdlib.h>
#include <stdio.h>
#include <emscripten/emscripten.h>
#include "src/webp/encode.h"


/// [C vs Cpp]
/// The size of generated wasm have a significant difference.
/// e.g, only link libwebp, with emcc option -Oz,
/// generated wasm from C: 6945k, wasm from Cpp: 144529k)
/// So we use C rather than Cpp here.
/// But the downside is that embind can not be used and we have to
/// write lots of pointer operations

/// @return 1: success. 2: fail.

typedef uint64_t PointerValue;

EMSCRIPTEN_KEEPALIVE
int libwebp_version() {
    return WebPGetEncoderVersion();
}

void free_buffer_list(PointerValue* buffer_ptr_list, size_t allocated_count) {
    for (size_t i = 0; i < allocated_count; ++i) {
        free((void*)buffer_ptr_list[allocated_count]);
    }
    free((void*)buffer_ptr_list);
}

EMSCRIPTEN_KEEPALIVE
int create_buffer_list(
        PointerValue* out_buffer_ptr_list_ptr,
        size_t buffer_list_size,
        size_t buffer_byte_size) {

    fprintf(stderr, "ooooooooooooooooooooooooooooo");
    fprintf(stdout, "oooooooooooooooooooooooo");

    PointerValue* buffer_ptr_list = (PointerValue*)malloc(buffer_list_size * sizeof(PointerValue));
    if (!buffer_ptr_list) {
        goto Error;
    }
    *out_buffer_ptr_list_ptr = (PointerValue)buffer_ptr_list;

    size_t allocated_idx = 0;
    for (; allocated_idx < buffer_list_size; ++allocated_idx) {
        void* buffer_ptr = malloc(buffer_byte_size);
        if (!buffer_ptr) {
            goto Error;
        }
        buffer_ptr_list[allocated_idx] = (PointerValue)buffer_ptr;
    }

  Error:
    free_buffer_list(buffer_ptr_list, allocated_idx);
    return 1;
}

EMSCRIPTEN_KEEPALIVE
void dispose_buffer_list(PointerValue* buffer_ptr_list, size_t buffer_list_size) {
    free_buffer_list(buffer_ptr_list, buffer_list_size);
}

// EMSCRIPTEN_KEEPALIVE
// int encode_animation(
//         PointerValue* out_buffer_ptr,
//         size_t* out_buffer_size,
//         PointerValue* frame_buffer_ptr_list,
//         size_t frame_buffer_list_size,
//         int width,
//         int height,
//         // 0 ~ 100
//         float quality) {

//     uint8_t* out_image;
//     int stride = width * 4;
//     // size_t out_size = WebPEncodeRGBA(in_image, width, height, width * 4, quality, &out_image);

//     WebPAnimEncoderOptions enc_options;
//     WebPAnimEncoderOptionsInit(&enc_options);
//     // ... (Tune 'enc_options' as needed).
//     WebPAnimEncoder* enc = WebPAnimEncoderNew(width, height, &enc_options);

//     // Setup a config, starting form a preset and tuning some additional
//     // parameters
//     WebPConfig webp_config;
//     WebPConfigInit(&webp_config);
//     // ... (Tune 'config' as needed).
//     if (!WebPConfigPreset(&config, WEBP_PRESET_PHOTO, quality)) {
//         goto Error; // version error
//     }
//     // ... additional tuning
//     config.sns_strength = 90;
//     config.filter_sharpness = 6;
//     int config_ok = WebPValidateConfig(&config); // not mandatory, but useful
//     if (!config_ok) {
//         goto Error;
//     }

//     WebPPicture frame_pic[frame_buffer_list_size]; // ???

//     for (size_t i = 0; i < frame_buffer_list_size; ++i) {
//         int duration_ms = 16;
//         uint8_t* frame_buffer_ptr = (uint8_t*)frame_buffer_ptr_list[i];

//         WebPPicture frame_pic;
//         if (!WebPPictureInit(&frame_pic)) {
//             goto Error; // version error
//         }
//         frame_pic->width = width;
//         frame_pic->height = height;
//         if (!WebPPictureImportRGBA(frame_pic, frame_buffer_ptr, stride)) {
//             goto Error; // memory error
//         }

//         WebPAnimEncoderAdd(enc, frame_pic, duration_ms, &config);
//     }

//     WebPAnimEncoderAssemble(enc, webp_data);
//     WebPAnimEncoderDelete(enc);
//     // ... (Write the 'webp_data' to a file, or re-mux it further).

//     *out_buffer_ptr = (PointerValue)out_image;

//   Error:
//     WebPPictureFree(&webp_picture);
//     return 0;
// }
