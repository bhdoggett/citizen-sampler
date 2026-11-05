#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "../Wire.h"

using namespace citizen;

namespace {
juce::var parse(const char* json) { return juce::JSON::parse(json); }
} // namespace

TEST_CASE("setPad carries the pad's url, settings and events") {
    // The shape SampleTypeFE takes on the web side
    auto command = wire::parseCommand(parse(R"({
      "type": "setPad", "padId": "pad-3",
      "pad": {
        "url": "https://example.com/a.wav",
        "settings": {
          "mute": false, "solo": true, "reverse": true, "oneShot": false,
          "quantize": true, "quantVal": "8t", "start": 0.25, "end": null,
          "volume": -6, "pan": 0.5, "pitch": 0.2, "attack": 0.01, "release": 0.3,
          "baseNote": "C4", "highpass": [120, "highpass"], "lowpass": [8000, "lowpass"],
          "ui": {"zoom": 0, "seekTo": 0}
        },
        "events": {
          "A": [{"startTime": 96, "duration": 0.5, "note": "D4", "velocity": 0.75}],
          "B": [{"startTime": null, "duration": null, "note": "C4", "velocity": 1}],
          "C": [], "D": []
        }
      }
    })"));
    REQUIRE(command);
    auto* setPad = std::get_if<cmd::SetPad>(&*command);
    REQUIRE(setPad);
    CHECK(setPad->padId == "pad-3");
    const auto& pad = setPad->pad;
    CHECK(pad.url == "https://example.com/a.wav");
    CHECK(pad.settings.solo);
    CHECK(pad.settings.reverse);
    CHECK(pad.settings.quantize);
    CHECK(pad.settings.quantVal == "8t");
    CHECK(pad.settings.start == doctest::Approx(0.25));
    CHECK_FALSE(pad.settings.end.has_value());
    CHECK(pad.settings.volume == doctest::Approx(-6));
    CHECK(pad.settings.highpass == doctest::Approx(120));
    CHECK(pad.settings.lowpass == doctest::Approx(8000));
    REQUIRE(pad.events[0].size() == 1);
    CHECK(*pad.events[0][0].startTicks == doctest::Approx(96));
    CHECK(pad.events[0][0].note == "D4");
    CHECK(pad.events[0][0].velocity == doctest::Approx(0.75));
    REQUIRE(pad.events[1].size() == 1);
    CHECK_FALSE(pad.events[1][0].startTicks.has_value());
    CHECK_FALSE(pad.events[1][0].duration.has_value());
}

TEST_CASE("pad settings without baseNote default to C4") {
    auto command = wire::parseCommand(
        parse(R"({"type":"setPad","padId":"p","pad":{"url":"a.wav","settings":{}}})"));
    REQUIRE(command);
    auto* setPad = std::get_if<cmd::SetPad>(&*command);
    REQUIRE(setPad);
    CHECK(setPad->pad.settings.baseNote == "C4");
}

TEST_CASE("pad settings read baseNote") {
    auto command = wire::parseCommand(parse(
        R"({"type":"setPad","padId":"p","pad":{"url":"a.wav","settings":{"baseNote":"A3"}}})"));
    REQUIRE(command);
    auto* setPad = std::get_if<cmd::SetPad>(&*command);
    REQUIRE(setPad);
    CHECK(setPad->pad.settings.baseNote == "A3");

    // Anything unparseable keeps the default
    for (const char* bad : {R"(440)", R"("nope")"}) {
        auto c = wire::parseCommand(parse(
            (juce::String(R"({"type":"setPad","padId":"p","pad":{"url":"a.wav","settings":{"baseNote":)") + bad + "}}}").toRawUTF8()));
        REQUIRE(c);
        CHECK(std::get<cmd::SetPad>(*c).pad.settings.baseNote == "C4");
    }
}

TEST_CASE("setLoops keeps set loops and leaves null ones unset") {
    auto command = wire::parseCommand(parse(R"({
      "type": "setLoops",
      "loops": {
        "A": {"beats": 3, "bars": 4, "bpm": 90, "swing": 0.4, "isInitialized": true},
        "B": null, "C": null, "D": null
      }
    })"));
    auto* setLoops = std::get_if<cmd::SetLoops>(&*command);
    REQUIRE(setLoops);
    REQUIRE(setLoops->loops[0]);
    CHECK(setLoops->loops[0]->timing.beats == 3);
    CHECK(setLoops->loops[0]->timing.bars == 4);
    CHECK(setLoops->loops[0]->timing.bpm == doctest::Approx(90));
    CHECK(setLoops->loops[0]->swing == doctest::Approx(0.4));
    CHECK_FALSE(setLoops->loops[1]);
}

TEST_CASE("simple commands") {
    CHECK(std::holds_alternative<cmd::Play>(*wire::parseCommand(parse(R"({"type":"play"})"))));
    CHECK(std::holds_alternative<cmd::Stop>(*wire::parseCommand(parse(R"({"type":"stop"})"))));
    CHECK(std::holds_alternative<cmd::RequestHostContext>(
        *wire::parseCommand(parse(R"({"type":"requestHostContext"})"))));

    auto press = wire::parseCommand(parse(R"({"type":"press","padId":"pad-1","note":"E4","velocity":0.5})"));
    auto* p = std::get_if<cmd::Press>(&*press);
    REQUIRE(p);
    CHECK(p->padId == "pad-1");
    CHECK(p->note == "E4");
    CHECK(p->velocity == doctest::Approx(0.5));

    auto loop = wire::parseCommand(parse(R"({"type":"setCurrentLoop","loop":"C"})"));
    CHECK(std::get<cmd::SetCurrentLoop>(*loop).loop == Loop::C);

    auto tuner = wire::parseCommand(parse(R"({"type":"setTunerPad","padId":null})"));
    CHECK_FALSE(std::get<cmd::SetTunerPad>(*tuner).padId.has_value());

    CHECK(std::get<cmd::SetRecording>(*wire::parseCommand(parse(R"({"type":"setRecording","on":true})"))).on);
}

TEST_CASE("unknown commands and loops are rejected") {
    CHECK_FALSE(wire::parseCommand(parse(R"({"type":"explode"})")));
    CHECK_FALSE(wire::parseCommand(parse(R"({"type":"setCurrentLoop","loop":"Z"})")));
}

TEST_CASE("events become the JSON the UI expects") {
    SampleEvent hit;
    hit.startTicks = 384;
    hit.duration = 0.25;
    hit.note = "C4";
    hit.velocity = 1;
    auto json = wire::toJson(Event{evt::HitRecorded{"pad-2", Loop::B, hit}});
    CHECK(json["type"].toString() == "hitRecorded");
    CHECK(json["padId"].toString() == "pad-2");
    CHECK(json["loop"].toString() == "B");
    CHECK(static_cast<double>(json["event"]["startTime"]) == doctest::Approx(384));
    CHECK(static_cast<double>(json["event"]["duration"]) == doctest::Approx(0.25));

    auto transport = wire::toJson(Event{evt::Transport{true, false, Loop::D, 1.5, 4.0}});
    CHECK(juce::JSON::toString(transport, true) ==
          R"({"type": "transport", "playing": true, "recording": false, "loop": "D", "position": 1.5, "loopDuration": 4.0})");

    auto host = wire::toJson(Event{evt::HostContext{true, PadLayout::MultiOut, 96.5, false}});
    CHECK(juce::JSON::toString(host, true) ==
          R"({"type": "hostContext", "isPlugin": true, "layout": "multiOut", "tempo": 96.5, "hostPlaying": false})");
    auto hostNoTempo = wire::toJson(Event{evt::HostContext{false, PadLayout::Kit, std::nullopt, true}});
    CHECK(hostNoTempo["tempo"].isVoid());
    CHECK(static_cast<juce::String>(hostNoTempo["layout"]) == "kit");

    auto pitch = wire::toJson(Event{evt::Pitch{"pad-1", std::nullopt}});
    CHECK(pitch["frequency"].isVoid());
}

TEST_CASE("a stem becomes sample rate plus channel arrays") {
    SampleBuffer stem;
    stem.sampleRate = 48000;
    stem.channels = {{0.0f, 0.5f}, {0.0f, -0.5f}};
    auto json = wire::toJson(stem);
    CHECK(static_cast<double>(json["sampleRate"]) == doctest::Approx(48000));
    REQUIRE(json["channels"].size() == 2);
    CHECK(static_cast<double>(json["channels"][1][1]) == doctest::Approx(-0.5));
}

TEST_CASE("session state keeps each pad's setPad and the loops") {
    juce::DynamicObject pads;
    pads.setProperty("pad-1", parse(R"({"type":"setPad","padId":"pad-1","pad":{"url":"a.wav"}})"));
    pads.setProperty("pad-2", parse(R"({"type":"setPad","padId":"pad-2","pad":{"url":"b.wav"}})"));
    const auto loops = parse(R"({"type":"setLoops","loops":{"A":null}})");

    const auto saved = juce::JSON::parse(wire::sessionStateJson(pads, loops));
    CHECK(saved["pads"]["pad-1"]["pad"]["url"].toString() == "a.wav");
    CHECK(saved["pads"]["pad-2"]["padId"].toString() == "pad-2");
    CHECK(saved["loops"]["type"].toString() == "setLoops");

    // The saved copy doesn't change with the live pads
    pads.removeProperty("pad-1");
    CHECK(juce::JSON::parse(wire::sessionStateJson(pads, loops))["pads"]["pad-1"].isVoid());
}
