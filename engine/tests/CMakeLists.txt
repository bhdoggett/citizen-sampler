include(FetchContent)
# doctest 2.4.11 asks for an older CMake than CMake 4 accepts
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)
FetchContent_Declare(
  doctest
  GIT_REPOSITORY https://github.com/doctest/doctest.git
  GIT_TAG v2.4.11
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(doctest)

add_executable(citizen_core_tests
  main.cpp
  NotesTest.cpp
  RulesTest.cpp
  ScheduleTest.cpp
  VoiceTest.cpp
  DspTest.cpp
  LiveInputTest.cpp
  EngineTest.cpp
  RenderTest.cpp
)
target_link_libraries(citizen_core_tests PRIVATE citizen_core doctest::doctest)
add_test(NAME citizen_core_tests COMMAND citizen_core_tests)
