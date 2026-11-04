; The Windows installer: the standalone app into Program Files and the VST3
; plugin into the shared VST3 folder, each a checkbox in the installer.
; Built by .github/workflows/release-desktop.yml:
;   iscc /DVersion=0.1.0 /DArtefacts=<...>\CitizenSampler_artefacts\Release /DOutputDir=<...>\dist CitizenSampler.iss

#ifndef Version
  #error Pass /DVersion=x.y.z
#endif
#ifndef Artefacts
  #error Pass /DArtefacts=<path to CitizenSampler_artefacts\Release>
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist"
#endif

[Setup]
; Never change AppId: Windows uses it to find the installed copy to upgrade
AppId={{CD5D103E-C3F7-46D0-BEAD-6B2EA8B628A8}
AppName=Citizen Sampler
AppVersion={#Version}
AppPublisher=Doggett Systems LLC
AppPublisherURL=https://citizensampler.com
DefaultDirName={autopf}\Citizen Sampler
DefaultGroupName=Citizen Sampler
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=Citizen-Sampler-{#Version}-windows-setup
UninstallDisplayName=Citizen Sampler
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Types]
Name: "full"; Description: "App and VST3 plugin"
Name: "custom"; Description: "Choose"; Flags: iscustom

[Components]
Name: "app"; Description: "Standalone app"; Types: full custom
Name: "vst3"; Description: "VST3 plugin (Ableton Live, Cubase, Bitwig, Reaper, FL Studio...)"; Types: full custom

[Files]
Source: "{#Artefacts}\Standalone\Citizen Sampler.exe"; DestDir: "{app}"; Components: app; Flags: ignoreversion
Source: "{#Artefacts}\VST3\Citizen Sampler.vst3\*"; DestDir: "{commoncf64}\VST3\Citizen Sampler.vst3"; Components: vst3; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Citizen Sampler"; Filename: "{app}\Citizen Sampler.exe"; Components: app

[Run]
Filename: "{app}\Citizen Sampler.exe"; Description: "Open Citizen Sampler"; Flags: nowait postinstall skipifsilent; Components: app
