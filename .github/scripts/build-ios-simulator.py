"""Build a simulator app only; never import signing credentials or submit it."""
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[2]
ios = root / 'apps/mobile/ios'
workspaces = list(ios.glob('*.xcworkspace'))
if len(workspaces) != 1:
    raise RuntimeError('Expected exactly one generated Xcode workspace')
workspace = workspaces[0]
listing = subprocess.check_output(['xcodebuild', '-list', '-json', '-workspace', str(workspace)], text=True)
schemes = json.loads(listing)['workspace']['schemes']
# Expo's generated application scheme matches the workspace basename.
scheme = workspace.stem
if scheme not in schemes:
    raise RuntimeError('Generated application scheme was not found')
derived = ios / 'build/DerivedData'
subprocess.run(['xcodebuild', '-workspace', str(workspace), '-scheme', scheme,
                '-configuration', 'Release', '-sdk', 'iphonesimulator',
                '-destination', 'generic/platform=iOS Simulator',
                '-derivedDataPath', str(derived), '-jobs', '2',
                'CODE_SIGNING_ALLOWED=NO', 'build'], check=True)
apps = list((derived / 'Build/Products/Release-iphonesimulator').glob('*.app'))
if len(apps) != 1:
    raise RuntimeError('Expected exactly one compiled simulator application')
app = apps[0]
if not (app / 'Info.plist').is_file() or not (app / 'main.jsbundle').is_file():
    raise RuntimeError('Simulator application lacks metadata or embedded JavaScript bundle')
archive = ios / 'build/vox-ios-simulator.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for file in app.rglob('*'):
        if file.is_file():
            output.write(file, file.relative_to(app.parent))
print('Simulator application archived; this artifact cannot be installed on a physical iPhone.')
