#pragma once

#include <optional>
#include <string>
#include <variant>

#include "citizen/Types.h"

// Commands and events crossing the engine boundary. Mirrors
// frontend-next/src/lib/engine/protocol.ts; the JUCE layer converts them
// to and from JSON.
namespace citizen {

namespace cmd {
struct SetPad { std::string padId; PadState pad; };
struct RemovePad { std::string padId; };
struct SetLoops { AllLoopSettings loops; };
struct SetCurrentLoop { Loop loop; };
struct Play {};
struct Stop {};
struct SetRecording { bool on; };
struct SetMetronome { bool on; };
struct Press { std::string padId; std::string note; double velocity = 1.0; };
struct Release { std::string padId; std::string note; };
struct SetTunerPad { std::optional<std::string> padId; };
struct PreviewSample { std::string url; };
struct StopPreview {};
// The UI asks again for the hostContext it may have missed while loading
struct RequestHostContext {};
} // namespace cmd

using Command = std::variant<cmd::SetPad, cmd::RemovePad, cmd::SetLoops, cmd::SetCurrentLoop,
                             cmd::Play, cmd::Stop, cmd::SetRecording, cmd::SetMetronome,
                             cmd::Press, cmd::Release, cmd::SetTunerPad, cmd::PreviewSample,
                             cmd::StopPreview, cmd::RequestHostContext>;

namespace evt {
struct Transport {
    bool playing;
    bool recording;
    Loop loop;
    double position;     // seconds into the loop
    double loopDuration; // seconds
};
struct HostContext {
    bool isPlugin;
    PadLayout layout;
    std::optional<double> tempo; // the host's tempo, when it reports one
    bool hostPlaying;
};
struct VoiceStarted { std::string padId; std::string note; };
struct VoiceEnded { std::string padId; std::string note; };
struct HitRecorded { std::string padId; Loop loop; SampleEvent event; };
struct Loading { int pending; };
struct PadLoaded { std::string padId; double duration; };
struct PadLoadFailed { std::string padId; std::string message; };
struct Pitch { std::string padId; std::optional<double> frequency; };
struct PreviewStarted { std::string url; double duration; };
struct PreviewEnded { std::string url; };
} // namespace evt

using Event = std::variant<evt::Transport, evt::VoiceStarted, evt::VoiceEnded, evt::HitRecorded,
                           evt::Loading, evt::PadLoaded, evt::PadLoadFailed, evt::Pitch,
                           evt::PreviewStarted, evt::PreviewEnded, evt::HostContext>;

} // namespace citizen
