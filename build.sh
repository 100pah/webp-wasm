#!/bin/bash

curr_dir=`pwd`
this_script_dir=$(cd `dirname $0`; pwd)
proj_dir=${this_script_dir}
red_color="\033[0;31m"
cyan_color="\033[0;36m"
green_color="\033[0;32m"
reset_color="\033[0m"
output_dir="${proj_dir}/out"
third_party_dir="${proj_dir}/third_party"
libweb_dir="${third_party_dir}/libwebp"
libweb_git="https://github.com/webmproject/libwebp"
libwebp_tag="v1.2.4"
build_mode=$1


function check_build_mode() {
    if [[ -z "${build_mode}" ]]; then
        build_mode="debug"
    elif [[ "${build_mode}" != "release" && "${build_mode}" != "install" ]]; then
        echo "${red_color} Illegal build mode input: ${build_mode}! ${reset_color}. "
        echo "Only support: debug, release, install."
        exit 1
    fi

    echo "${cyan_color}Build mode: ${build_mode} ${reset_color}"
}

function install_third_party() {
    if [[ -d ${libweb_dir} ]]; then
        echo "${cyan_color}libwebp has been installed.${reset_color}"
        return 0
    fi

    mkdir -p ${third_party_dir}
    echo "${cyan_color} Download libwebp code ... ${reset_color}"
    git clone ${libweb_git} ${libweb_dir}
    cd ${libweb_dir}
    git checkout ${libwebp_tag}
    cd ${curr_dir}
    echo "${cyan_color} Done. ${reset_color}"
}

function build_wasm() {
    mkdir -p "${proj_dir}/out"

    extra_options=""
    if [[ "${build_mode}" = "debug" ]]; then
        extra_options=""
        # -g3 -gsource-map --source-map-base "http://localhost:8001/wasm-all/try/first_proj/embind_interop/" \
    else
        extra_options="-O3"
    fi

    emcc -o "${output_dir}/webp_wasm.html" \
        --shell-file "${proj_dir}/test/webp_wasm.tpl.html" \
        --post-js "${proj_dir}/src/webp_wasm.js" \
        ${extra_options} \
        -s"EXPORTED_RUNTIME_METHODS=['ccall', 'cwrap', 'getValue', 'setValue', 'stringToUTF8', 'UTF8ToString']" \
        -s"EXPORTED_FUNCTIONS=['_free', '_malloc']" \
        -s"ALLOW_MEMORY_GROWTH=1" \
        -s"MODULARIZE" \
        -s"EXPORT_NAME=webpWASM" \
        -I"${libweb_dir}" \
        "${proj_dir}/src/webp_wasm.c" \
        "${libweb_dir}/src/"**/*.c
}

check_build_mode
install_third_party
build_wasm

echo "${green_color}Build done.${reset_color} Files generated:"
ls -alF ${output_dir}
