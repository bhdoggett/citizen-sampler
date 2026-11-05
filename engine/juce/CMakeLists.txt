# The desktop app and plugin: the engine core inside a JUCE processor, with
# the web UI in a WebView.
set(JUCE_DIR "$ENV{HOME}/code/JUCE" CACHE PATH "Path to a JUCE 8 checkout")
if(NOT EXISTS "${JUCE_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "JUCE not found at ${JUCE_DIR}. Pass -DJUCE_DIR=/path/to/JUCE")
endif()
add_subdirectory("${JUCE_DIR}" "${CMAKE_BINARY_DIR}/JUCE")

# The IDs below are stored in saved DAW sessions. Never change them after a
# release, or hosts stop finding the plugin in old projects.
juce_add_plugin(CitizenSampler
  VERSION ${PROJECT_VERSION}
  COMPANY_NAME "Doggett Systems"
  COMPANY_WEBSITE "https://citizensampler.com"
  BUNDLE_ID "com.doggettsystems.citizensampler"
  PRODUCT_NAME "Citizen Sampler"
  # Rendered from assets/app-icon.svg, which matches the web favicon
  ICON_BIG "${CMAKE_CURRENT_SOURCE_DIR}/assets/app-icon.png"
  PLUGIN_MANUFACTURER_CODE Dgsy
  PLUGIN_CODE CtSm
  AU_MAIN_TYPE kAudioUnitType_MusicDevice
  VST3_CATEGORIES Instrument Sampler
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

# The web UI. Release builds bundle frontend-next's static export
# (NEXT_OUTPUT=export pnpm build) by passing -DCITIZEN_UI_DIR=.../out. Without
# it the WebView loads CITIZEN_UI_URL, or the dev server on localhost:3000.
set(CITIZEN_UI_DIR "" CACHE PATH "frontend-next static export to bundle (its out/ folder)")
if(CITIZEN_UI_DIR)
  if(NOT EXISTS "${CITIZEN_UI_DIR}/index.html")
    message(FATAL_ERROR "No index.html in CITIZEN_UI_DIR (${CITIZEN_UI_DIR}). Run NEXT_OUTPUT=export pnpm build first.")
  endif()
  file(GLOB_RECURSE CITIZEN_UI_FILES RELATIVE "${CITIZEN_UI_DIR}" CONFIGURE_DEPENDS "${CITIZEN_UI_DIR}/*")
  list(TRANSFORM CITIZEN_UI_FILES PREPEND "${CITIZEN_UI_DIR}/" OUTPUT_VARIABLE CITIZEN_UI_PATHS)
  set(CITIZEN_UI_ZIP "${CMAKE_CURRENT_BINARY_DIR}/ui/ui.zip")
  add_custom_command(
    OUTPUT "${CITIZEN_UI_ZIP}"
    COMMAND ${CMAKE_COMMAND} -E make_directory "${CMAKE_CURRENT_BINARY_DIR}/ui"
    COMMAND ${CMAKE_COMMAND} -E tar cf "${CITIZEN_UI_ZIP}" --format=zip -- ${CITIZEN_UI_FILES}
    WORKING_DIRECTORY "${CITIZEN_UI_DIR}"
    DEPENDS ${CITIZEN_UI_PATHS}
    COMMENT "Zipping the web UI"
    VERBATIM)
  juce_add_binary_data(CitizenSamplerUi
    HEADER_NAME UiData.h
    NAMESPACE UiData
    SOURCES "${CITIZEN_UI_ZIP}")
  target_link_libraries(CitizenSampler PRIVATE CitizenSamplerUi)
  target_compile_definitions(CitizenSampler PRIVATE CITIZEN_BUNDLED_UI=1)
endif()

target_sources(CitizenSampler PRIVATE
  PluginProcessor.cpp
  PluginEditor.cpp
  SampleLoader.cpp
  UiBundle.cpp
  Wire.cpp
)

target_compile_definitions(CitizenSampler PUBLIC
  JUCE_WEB_BROWSER=1
  # WebView2 on Windows, linked statically; without it JUCE falls back to IE
  JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
  JUCE_USE_CURL=0
  JUCE_VST3_CAN_REPLACE_VST2=0
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

# Wire format and UI bundle tests, against juce_core only
if(CITIZEN_BUILD_TESTS)
  juce_add_console_app(CitizenWireTests PRODUCT_NAME "CitizenWireTests")
  target_sources(CitizenWireTests PRIVATE Wire.cpp UiBundle.cpp tests/WireTest.cpp tests/UiBundleTest.cpp)
  target_compile_definitions(CitizenWireTests PRIVATE JUCE_STANDALONE_APPLICATION=1)
  target_link_libraries(CitizenWireTests PRIVATE citizen_core juce::juce_core doctest::doctest
    juce::juce_recommended_config_flags)
endif()
