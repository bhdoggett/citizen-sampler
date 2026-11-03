# The desktop app and plugin: the engine core inside a JUCE processor, with
# the web UI in a WebView.
set(JUCE_DIR "$ENV{HOME}/code/JUCE" CACHE PATH "Path to a JUCE 8 checkout")
if(NOT EXISTS "${JUCE_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "JUCE not found at ${JUCE_DIR}. Pass -DJUCE_DIR=/path/to/JUCE")
endif()
add_subdirectory("${JUCE_DIR}" "${CMAKE_BINARY_DIR}/JUCE")

juce_add_plugin(CitizenSampler
  COMPANY_NAME "Citizen Sampler"
  BUNDLE_ID "com.citizensampler.app"
  PRODUCT_NAME "Citizen Sampler"
  PLUGIN_MANUFACTURER_CODE Ctzn
  PLUGIN_CODE CtSm
  FORMATS Standalone AU VST3
  IS_SYNTH TRUE
  NEEDS_MIDI_INPUT TRUE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  NEEDS_WEB_BROWSER TRUE
  NEEDS_WEBVIEW2 TRUE
  COPY_PLUGIN_AFTER_BUILD FALSE
  # Lets the WebView load the dev server over plain http
  PLIST_TO_MERGE "<plist><dict><key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict></dict></plist>"
)

juce_add_binary_data(CitizenSamplerAssets
  HEADER_NAME BinaryData.h
  NAMESPACE BinaryData
  SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/../../frontend-next/public/samples/metronome/hi-block.wav"
    "${CMAKE_CURRENT_SOURCE_DIR}/../../frontend-next/public/samples/metronome/lo-block.wav"
)

target_sources(CitizenSampler PRIVATE
  PluginProcessor.cpp
  PluginEditor.cpp
  SampleLoader.cpp
  Wire.cpp
)

target_compile_definitions(CitizenSampler PUBLIC
  JUCE_WEB_BROWSER=1
  JUCE_USE_CURL=0
  JUCE_VST3_CAN_REPLACE_VST2=0
  JUCE_DISPLAY_SPLASH_SCREEN=0
)

target_link_libraries(CitizenSampler
  PRIVATE
    citizen_core
    CitizenSamplerAssets
    juce::juce_audio_utils
    juce::juce_gui_extra
  PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)

# Wire format tests, against juce_core only
juce_add_console_app(CitizenWireTests PRODUCT_NAME "CitizenWireTests")
target_sources(CitizenWireTests PRIVATE Wire.cpp tests/WireTest.cpp)
target_compile_definitions(CitizenWireTests PRIVATE JUCE_STANDALONE_APPLICATION=1)
target_link_libraries(CitizenWireTests PRIVATE citizen_core juce::juce_core doctest::doctest
  juce::juce_recommended_config_flags)
