# The engine core: plain C++ with no dependencies, so it can also be built
# for WebAssembly later.
add_library(citizen_core STATIC
  src/Notes.cpp
  src/Rules.cpp
  src/Schedule.cpp
  src/Voice.cpp
  src/PitchShifter.cpp
  src/PadChannel.cpp
  src/LiveInput.cpp
  src/Engine.cpp
  src/Render.cpp
)
target_include_directories(citizen_core PUBLIC include)
target_compile_features(citizen_core PUBLIC cxx_std_20)
if(MSVC)
  target_compile_options(citizen_core PRIVATE /W4)
else()
  target_compile_options(citizen_core PRIVATE -Wall -Wextra -Wpedantic)
endif()
