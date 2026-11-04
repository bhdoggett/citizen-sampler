cmake_minimum_required(VERSION 3.22)
# Must be set before project(). Release builds also pass
# -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" for one universal download.
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Oldest macOS the app runs on")
project(CitizenSamplerEngine VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(CITIZEN_BUILD_TESTS "Build the engine core tests" ON)
option(CITIZEN_BUILD_JUCE "Build the JUCE app and plugin" OFF)

add_subdirectory(core)

if(CITIZEN_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

if(CITIZEN_BUILD_JUCE)
  add_subdirectory(juce)
endif()
