#!/bin/bash

curr_dir=`pwd`
this_script_dir=$(cd `dirname $0`; pwd)
proj_dir=${this_script_dir}
red_color="\033[0;31m"
cyan_color="\033[0;36m"
green_color="\033[0;32m"
reset_color="\033[0m"
third_party_dir="${proj_dir}/third_party"
output_dir=""
libwebp_dir="${third_party_dir}/libwebp"
libwebp_git="https://github.com/webmproject/libwebp"
libwebp_tag="v1.2.4"

BUILD_MODE_OPTIONS=("debug" "install" "release" "example")
build_mode=$1


function prepare_params() {
    if [[ -z "${build_mode}" ]]; then
        build_mode="debug"
    fi

    if [[ ! " ${BUILD_MODE_OPTIONS[*]} " =~ " ${build_mode} " ]]; then
        echo "${red_color}Illegal build mode input: ${build_mode}! ${reset_color}. "
        echo "Only support: debug, release, install."
        exit 1
    fi

    echo "${cyan_color}Build mode: ${build_mode} ${reset_color}"

    if [[ "${build_mode}" = "example" ]]; then
        output_dir="${proj_dir}/example"
        mkdir -p "${output_dir}"
    else
        output_dir="${proj_dir}/out"
    fi
}

function install_third_party() {
    if [[ -d ${libwebp_dir} ]]; then
        echo "${cyan_color}libwebp has been installed.${reset_color}"
        return 0
    fi

    mkdir -p ${third_party_dir}
    echo "${cyan_color} Download libwebp code ... ${reset_color}"
    git clone ${libwebp_git} ${libwebp_dir}
    cd ${libwebp_dir}
    git checkout ${libwebp_tag}
    cd ${curr_dir}
    echo "${cyan_color} Done. ${reset_color}"
}

function build_wasm() {
    # Or:
    # "${libwebp_dir}/src"/**/*.c \
    # "${libwebp_dir}/sharpyuv"/*.c \
    libwebp_src_list=(

        ### srcDir sharpyuv
        "${libwebp_dir}/sharpyuv/sharpyuv.c"
        "${libwebp_dir}/sharpyuv/sharpyuv_csp.c"
        "${libwebp_dir}/sharpyuv/sharpyuv_dsp.c"
        "${libwebp_dir}/sharpyuv/sharpyuv_gamma.c"
        # "${libwebp_dir}/sharpyuv/sharpyuv_neon.c"
        # "${libwebp_dir}/sharpyuv/sharpyuv_sse2.c"

        ### srcDir src/dec
        "${libwebp_dir}/src/dec/alpha_dec.c"
        "${libwebp_dir}/src/dec/buffer_dec.c"
        "${libwebp_dir}/src/dec/frame_dec.c"
        "${libwebp_dir}/src/dec/idec_dec.c"
        "${libwebp_dir}/src/dec/io_dec.c"
        "${libwebp_dir}/src/dec/quant_dec.c"
        "${libwebp_dir}/src/dec/tree_dec.c"
        "${libwebp_dir}/src/dec/vp8_dec.c"
        "${libwebp_dir}/src/dec/vp8l_dec.c"
        "${libwebp_dir}/src/dec/webp_dec.c"

        ### srcDir src/dsp
        "${libwebp_dir}/src/dsp/alpha_processing.c"
        # "${libwebp_dir}/src/dsp/alpha_processing_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/alpha_processing_neon.$NEON"
        # "${libwebp_dir}/src/dsp/alpha_processing_sse2.c"
        # "${libwebp_dir}/src/dsp/alpha_processing_sse41.c"
        "${libwebp_dir}/src/dsp/cpu.c"
        "${libwebp_dir}/src/dsp/dec.c"
        "${libwebp_dir}/src/dsp/dec_clip_tables.c"
        # "${libwebp_dir}/src/dsp/dec_mips32.c"
        # "${libwebp_dir}/src/dsp/dec_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/dec_msa.c"
        # "${libwebp_dir}/src/dsp/dec_neon.$NEON"
        # "${libwebp_dir}/src/dsp/dec_sse2.c"
        # "${libwebp_dir}/src/dsp/dec_sse41.c"
        "${libwebp_dir}/src/dsp/filters.c"
        # "${libwebp_dir}/src/dsp/filters_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/filters_msa.c"
        # "${libwebp_dir}/src/dsp/filters_neon.$NEON"
        # "${libwebp_dir}/src/dsp/filters_sse2.c"
        "${libwebp_dir}/src/dsp/lossless.c"
        # "${libwebp_dir}/src/dsp/lossless_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/lossless_msa.c"
        # "${libwebp_dir}/src/dsp/lossless_neon.$NEON"
        # "${libwebp_dir}/src/dsp/lossless_sse2.c"
        # "${libwebp_dir}/src/dsp/lossless_sse41.c"
        "${libwebp_dir}/src/dsp/rescaler.c"
        # "${libwebp_dir}/src/dsp/rescaler_mips32.c"
        # "${libwebp_dir}/src/dsp/rescaler_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/rescaler_msa.c"
        # "${libwebp_dir}/src/dsp/rescaler_neon.$NEON"
        # "${libwebp_dir}/src/dsp/rescaler_sse2.c"
        "${libwebp_dir}/src/dsp/upsampling.c"
        # "${libwebp_dir}/src/dsp/upsampling_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/upsampling_msa.c"
        # "${libwebp_dir}/src/dsp/upsampling_neon.$NEON"
        # "${libwebp_dir}/src/dsp/upsampling_sse2.c"
        # "${libwebp_dir}/src/dsp/upsampling_sse41.c"
        "${libwebp_dir}/src/dsp/yuv.c"
        # "${libwebp_dir}/src/dsp/yuv_mips32.c"
        # "${libwebp_dir}/src/dsp/yuv_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/yuv_neon.$NEON"
        # "${libwebp_dir}/src/dsp/yuv_sse2.c"
        # "${libwebp_dir}/src/dsp/yuv_sse41.c"

        ### srcDir srcDir "src/utils"
        "${libwebp_dir}/src/utils/bit_reader_utils.c"
        "${libwebp_dir}/src/utils/color_cache_utils.c"
        "${libwebp_dir}/src/utils/filters_utils.c"
        "${libwebp_dir}/src/utils/huffman_utils.c"
        "${libwebp_dir}/src/utils/quant_levels_dec_utils.c"
        "${libwebp_dir}/src/utils/random_utils.c"
        "${libwebp_dir}/src/utils/rescaler_utils.c"
        "${libwebp_dir}/src/utils/thread_utils.c"
        "${libwebp_dir}/src/utils/utils.c"

        ### srcDir "src/dsp"
        "${libwebp_dir}/src/dsp/cost.c"
        # "${libwebp_dir}/src/dsp/cost_mips32.c"
        # "${libwebp_dir}/src/dsp/cost_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/cost_neon.$NEON"
        # "${libwebp_dir}/src/dsp/cost_sse2.c"
        "${libwebp_dir}/src/dsp/enc.c"
        # "${libwebp_dir}/src/dsp/enc_mips32.c"
        # "${libwebp_dir}/src/dsp/enc_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/enc_msa.c"
        # "${libwebp_dir}/src/dsp/enc_neon.$NEON"
        # "${libwebp_dir}/src/dsp/enc_sse2.c"
        # "${libwebp_dir}/src/dsp/enc_sse41.c"
        "${libwebp_dir}/src/dsp/lossless_enc.c"
        # "${libwebp_dir}/src/dsp/lossless_enc_mips32.c"
        # "${libwebp_dir}/src/dsp/lossless_enc_mips_dsp_r2.c"
        # "${libwebp_dir}/src/dsp/lossless_enc_msa.c"
        # "${libwebp_dir}/src/dsp/lossless_enc_neon.$NEON"
        # "${libwebp_dir}/src/dsp/lossless_enc_sse2.c"
        # "${libwebp_dir}/src/dsp/lossless_enc_sse41.c"
        "${libwebp_dir}/src/dsp/ssim.c"
        # "${libwebp_dir}/src/dsp/ssim_sse2.c"

        ### srcDir "src/enc"
        "${libwebp_dir}/src/enc/alpha_enc.c"
        "${libwebp_dir}/src/enc/analysis_enc.c"
        "${libwebp_dir}/src/enc/backward_references_cost_enc.c"
        "${libwebp_dir}/src/enc/backward_references_enc.c"
        "${libwebp_dir}/src/enc/config_enc.c"
        "${libwebp_dir}/src/enc/cost_enc.c"
        "${libwebp_dir}/src/enc/filter_enc.c"
        "${libwebp_dir}/src/enc/frame_enc.c"
        "${libwebp_dir}/src/enc/histogram_enc.c"
        "${libwebp_dir}/src/enc/iterator_enc.c"
        "${libwebp_dir}/src/enc/near_lossless_enc.c"
        "${libwebp_dir}/src/enc/picture_enc.c"
        "${libwebp_dir}/src/enc/picture_csp_enc.c"
        "${libwebp_dir}/src/enc/picture_psnr_enc.c"
        "${libwebp_dir}/src/enc/picture_rescale_enc.c"
        "${libwebp_dir}/src/enc/picture_tools_enc.c"
        "${libwebp_dir}/src/enc/predictor_enc.c"
        "${libwebp_dir}/src/enc/quant_enc.c"
        "${libwebp_dir}/src/enc/syntax_enc.c"
        "${libwebp_dir}/src/enc/token_enc.c"
        "${libwebp_dir}/src/enc/tree_enc.c"
        "${libwebp_dir}/src/enc/vp8l_enc.c"
        "${libwebp_dir}/src/enc/webp_enc.c"

        ### srcDir "src/utils"
        "${libwebp_dir}/src/utils/bit_writer_utils.c"
        "${libwebp_dir}/src/utils/huffman_encode_utils.c"
        "${libwebp_dir}/src/utils/quant_levels_utils.c"

        ### srcDir "src/mux"
        "${libwebp_dir}/src/mux/anim_encode.c"
        "${libwebp_dir}/src/mux/muxedit.c"
        "${libwebp_dir}/src/mux/muxinternal.c"
        "${libwebp_dir}/src/mux/muxread.c"
    )

    mkdir -p "${proj_dir}/out"

    extra_options=""
    if [[ "${build_mode}" = "debug" ]]; then
        extra_options="-g"
    else
        extra_options="-Os"
        # extra_options="-Oz"
        # extra_options="-O3"
    fi

    emcc -o "${output_dir}/webp_wasm.html" \
        --shell-file "${proj_dir}/test/webp_wasm.tpl.html" \
        --pre-js "${proj_dir}/src/webp_wasm_pre.js" \
        --post-js "${proj_dir}/src/webp_wasm_post.js" \
        ${extra_options} \
        -s"EXPORTED_RUNTIME_METHODS=['getValue', 'setValue']" \
        -s"EXPORTED_FUNCTIONS=['_free', '_malloc']" \
        -s"ALLOW_MEMORY_GROWTH=1" \
        -s"MODULARIZE" \
        -s"EXPORT_NAME=webpWASM" \
        -I"${libwebp_dir}" \
        `echo "${libwebp_src_list[@]}"` \
        "${proj_dir}/src/webp_wasm.c"
}

prepare_params
install_third_party
build_wasm

echo "${green_color}Build done.${reset_color} Files generated:"
ls -alF ${output_dir}
