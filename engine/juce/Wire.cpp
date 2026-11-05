#include "Wire.h"

#include "citizen/Notes.h"

namespace citizen::wire {

namespace {

double number(const juce::var& value, double fallback = 0.0) {
    return value.isInt() || value.isInt64() || value.isDouble() || value.isBool()
               ? static_cast<double>(value)
               : fallback;
}

std::optional<double> optionalNumber(const juce::var& value) {
    if (value.isVoid() || value.isUndefined()) return std::nullopt;
    if (value.isInt() || value.isInt64() || value.isDouble()) return static_cast<double>(value);
    return std::nullopt;
}

// Filters are saved as [frequency, "highpass"] tuples
double filterFrequency(const juce::var& value, double fallback) {
    if (auto* array = value.getArray(); array && !array->isEmpty()) return number(array->getFirst(), fallback);
    return number(value, fallback);
}

SampleSettings parseSettings(const juce::var& json) {
    SampleSettings s;
    s.mute = json["mute"];
    s.solo = json["solo"];
    s.reverse = json["reverse"];
    s.oneShot = json["oneShot"];
    s.quantize = json["quantize"];
    if (json["quantVal"].isString()) s.quantVal = json["quantVal"].toString().toStdString();
    s.start = number(json["start"]);
    s.end = optionalNumber(json["end"]);
    s.volume = number(json["volume"]);
    s.pan = number(json["pan"]);
    s.pitch = number(json["pitch"]);
    s.attack = number(json["attack"]);
    s.release = number(json["release"]);
    if (json["baseNote"].isString()) {
        const auto note = json["baseNote"].toString().toStdString();
        if (noteToMidi(note)) s.baseNote = note;
    }
    s.highpass = filterFrequency(json["highpass"], 0.0);
    s.lowpass = filterFrequency(json["lowpass"], 20000.0);
    return s;
}

SampleEvent parseEvent(const juce::var& json) {
    SampleEvent e;
    e.startTicks = optionalNumber(json["startTime"]);
    e.duration = optionalNumber(json["duration"]);
    e.note = json["note"].toString().toStdString();
    e.velocity = number(json["velocity"], 1.0);
    return e;
}

PadState parsePad(const juce::var& json) {
    PadState pad;
    pad.url = json["url"].toString().toStdString();
    pad.settings = parseSettings(json["settings"]);
    for (int i = 0; i < kLoopCount; ++i) {
        if (auto* events = json["events"][loopName(static_cast<Loop>(i)).toRawUTF8()].getArray()) {
            for (const auto& e : *events) pad.events[static_cast<size_t>(i)].push_back(parseEvent(e));
        }
    }
    return pad;
}

AllLoopSettings parseLoops(const juce::var& json) {
    AllLoopSettings loops{};
    for (int i = 0; i < kLoopCount; ++i) {
        const juce::var loop = json[loopName(static_cast<Loop>(i)).toRawUTF8()];
        if (!loop.isObject()) continue;
        LoopSettings settings;
        settings.timing.bpm = number(loop["bpm"], 120.0);
        settings.timing.beats = static_cast<int>(number(loop["beats"], 4.0));
        settings.timing.bars = static_cast<int>(number(loop["bars"], 2.0));
        settings.swing = number(loop["swing"]);
        settings.isInitialized = loop["isInitialized"];
        if (settings.timing.bpm > 0 && settings.timing.beats > 0 && settings.timing.bars > 0) {
            loops[static_cast<size_t>(i)] = settings;
        }
    }
    return loops;
}

juce::var object(std::initializer_list<std::pair<const char*, juce::var>> fields) {
    auto* obj = new juce::DynamicObject();
    for (const auto& [key, value] : fields) obj->setProperty(key, value);
    return juce::var(obj);
}

juce::var optional(const std::optional<double>& value) {
    return value ? juce::var(*value) : juce::var();
}

juce::String str(const std::string& s) { return juce::String(s); }

template <class... Ts>
struct Overloaded : Ts... {
    using Ts::operator()...;
};
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

} // namespace

std::optional<Loop> parseLoop(const juce::String& name) {
    if (name == "A") return Loop::A;
    if (name == "B") return Loop::B;
    if (name == "C") return Loop::C;
    if (name == "D") return Loop::D;
    return std::nullopt;
}

juce::String loopName(Loop loop) {
    static const char* names[] = {"A", "B", "C", "D"};
    return names[loopIndex(loop)];
}

std::optional<Command> parseCommand(const juce::var& json) {
    const juce::String type = json["type"].toString();
    const std::string padId = json["padId"].toString().toStdString();

    if (type == "setPad") return cmd::SetPad{padId, parsePad(json["pad"])};
    if (type == "removePad") return cmd::RemovePad{padId};
    if (type == "setLoops") return cmd::SetLoops{parseLoops(json["loops"])};
    if (type == "setCurrentLoop") {
        if (auto loop = parseLoop(json["loop"].toString())) return cmd::SetCurrentLoop{*loop};
        return std::nullopt;
    }
    if (type == "play") return cmd::Play{};
    if (type == "stop") return cmd::Stop{};
    if (type == "setRecording") return cmd::SetRecording{static_cast<bool>(json["on"])};
    if (type == "setMetronome") return cmd::SetMetronome{static_cast<bool>(json["on"])};
    if (type == "press") {
        return cmd::Press{padId, json["note"].toString().toStdString(), number(json["velocity"], 1.0)};
    }
    if (type == "release") return cmd::Release{padId, json["note"].toString().toStdString()};
    if (type == "setTunerPad") {
        if (json["padId"].isString()) return cmd::SetTunerPad{padId};
        return cmd::SetTunerPad{std::nullopt};
    }
    if (type == "previewSample") return cmd::PreviewSample{json["url"].toString().toStdString()};
    if (type == "stopPreview") return cmd::StopPreview{};
    return std::nullopt;
}

juce::var toJson(const Event& event) {
    return std::visit(
        Overloaded{
            [](const evt::Transport& e) {
                return object({{"type", "transport"},
                               {"playing", e.playing},
                               {"recording", e.recording},
                               {"loop", loopName(e.loop)},
                               {"position", e.position},
                               {"loopDuration", e.loopDuration}});
            },
            [](const evt::VoiceStarted& e) {
                return object({{"type", "voiceStarted"}, {"padId", str(e.padId)}, {"note", str(e.note)}});
            },
            [](const evt::VoiceEnded& e) {
                return object({{"type", "voiceEnded"}, {"padId", str(e.padId)}, {"note", str(e.note)}});
            },
            [](const evt::HitRecorded& e) {
                return object({{"type", "hitRecorded"},
                               {"padId", str(e.padId)},
                               {"loop", loopName(e.loop)},
                               {"event", object({{"startTime", optional(e.event.startTicks)},
                                                 {"duration", optional(e.event.duration)},
                                                 {"note", str(e.event.note)},
                                                 {"velocity", e.event.velocity}})}});
            },
            [](const evt::Loading& e) { return object({{"type", "loading"}, {"pending", e.pending}}); },
            [](const evt::PadLoaded& e) {
                return object({{"type", "padLoaded"}, {"padId", str(e.padId)}, {"duration", e.duration}});
            },
            [](const evt::PadLoadFailed& e) {
                return object({{"type", "padLoadFailed"}, {"padId", str(e.padId)}, {"message", str(e.message)}});
            },
            [](const evt::Pitch& e) {
                return object({{"type", "pitch"}, {"padId", str(e.padId)}, {"frequency", optional(e.frequency)}});
            },
            [](const evt::PreviewStarted& e) {
                return object({{"type", "previewStarted"}, {"url", str(e.url)}, {"duration", e.duration}});
            },
            [](const evt::PreviewEnded& e) {
                return object({{"type", "previewEnded"}, {"url", str(e.url)}});
            },
        },
        event);
}

juce::var toJson(const SampleBuffer& stem) {
    juce::Array<juce::var> channels;
    for (const auto& channel : stem.channels) {
        juce::Array<juce::var> samples;
        samples.ensureStorageAllocated(static_cast<int>(channel.size()));
        for (float s : channel) samples.add(s);
        channels.add(samples);
    }
    return object({{"sampleRate", stem.sampleRate}, {"channels", channels}});
}

juce::String sessionStateJson(const juce::DynamicObject& pads, const juce::var& loops) {
    auto* state = new juce::DynamicObject();
    // The var owns the copy; clone()'s unique_ptr must hand it over
    state->setProperty("pads", juce::var(pads.clone().release()));
    state->setProperty("loops", loops);
    return juce::JSON::toString(juce::var(state), true);
}

} // namespace citizen::wire
