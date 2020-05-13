cmake_minimum_required(VERSION 3.4.1)

set(silklib silk)

add_definitions( " -O1 -Wall ")

aux_source_directory(src silksrc)

add_library(${silklib}
  STATIC
  ${silksrc}
  )


target_include_directories(${silklib}
  PRIVATE
  src
  interface
  )

add_executable(silk_wasm
vad.c
vad.h
silk_wasm.c)

#set_target_properties(silk_code PROPERTIES COMPILE_FLAGS " -O1 " )
#set_target_properties(${encode} PROPERTIES LINK_FLAGS  " --bind ")

#20M的内存
set_target_properties(silk_wasm PROPERTIES LINK_FLAGS  "  -s TOTAL_MEMORY=20971520  ")

target_include_directories(silk_wasm
  PRIVATE
  src
  interface
  )

target_link_libraries(silk_wasm ${silklib} m)
