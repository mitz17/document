+++
title = "How to Check the ChromeDriver Version and Fix Python/Selenium Mismatch Errors"
date = 2026-03-04T00:00:00+09:00
lastmod = 2026-07-14T00:00:00+09:00
draft = false
description = "Learn how to check the ChromeDriver version with chromedriver --version, fix Chrome version mismatches and PATH errors, use Selenium Manager, and download the correct Chrome driver with Python."
tags = ["Python", "Selenium", "ChromeDriver", "Automation", "Web Scraping"]
categories = ["Projects"]
+++

When Selenium cannot launch Chrome, the first thing to do is check the ChromeDriver version.

```bash
chromedriver --version
```

If ChromeDriver is found correctly, its version will be displayed as follows:

```text
ChromeDriver 150.0.xxxx.xx (...)
```

This article first explains **how to check the versions of ChromeDriver and Chrome** and how to fix `SessionNotCreatedException` and `chromedriver executable needs to be in PATH`. It then covers why I built a Python tool that automatically downloads the correct Chrome driver for the installed version of Chrome, along with an explanation of its implementation.

GitHub: [mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

## How to Check the ChromeDriver Version

### Windows, Linux, and macOS

If ChromeDriver is on your PATH, you can use the following command in PowerShell, Command Prompt, or a terminal:

```bash
chromedriver --version
```

The most important value is the major version shown at the beginning of the ChromeDriver version number. For example, the major version in the following output is `150`:

```text
ChromeDriver 150.0.xxxx.xx
```

### If `chromedriver` Cannot Be Found

If `chromedriver --version` is not recognized, first check where ChromeDriver is installed.

On Windows, use:

```powershell
where.exe chromedriver
```

On Linux or macOS, use either of the following:

```bash
which chromedriver
command -v chromedriver
```

If nothing is displayed, ChromeDriver is either not installed or its directory has not been added to PATH. If you know where the file is located, you can check its version by specifying the full path:

```powershell
# Windows example
& "C:\tools\chromedriver.exe" --version
```

```bash
# Linux or macOS example
/home/user/bin/chromedriver --version
```

If multiple paths are displayed, an older ChromeDriver may be taking precedence. Make sure that the path Selenium uses is the same as the path returned by the command.

## How to Check the Installed Chrome Version

In addition to the ChromeDriver version, you should check the version of Chrome that is actually installed.

The easiest method is to open the following URL in Chrome:

```text
chrome://settings/help
```

To check from the command line, use the appropriate method for your operating system.

### Windows

Check the Chrome user settings registry key:

```powershell
(Get-ItemProperty "HKCU:\Software\Google\Chrome\BLBeacon").version
```

If Chrome is installed for all users, you can also read the product version from the executable:

```powershell
(Get-Item "$env:ProgramFiles\Google\Chrome\Application\chrome.exe").VersionInfo.ProductVersion
```

### Ubuntu and Other Linux Distributions

The available command depends on how Chrome or Chromium was installed:

```bash
google-chrome --version
google-chrome-stable --version
chromium --version
chromium-browser --version
```

### macOS

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version
```

## How Closely Must the Chrome and ChromeDriver Versions Match?

First, check whether Chrome and ChromeDriver have the same major version.

| Chrome | ChromeDriver | Result |
| --- | --- | --- |
| `150.x.x.x` | `150.x.x.x` | Same major version |
| `150.x.x.x` | `149.x.x.x` | Mismatch; ChromeDriver must be updated |
| `149.x.x.x` | `150.x.x.x` | Mismatch; ChromeDriver must be updated |

However, **for Chrome 115 and later, checking only the major version is not always sufficient**.

Starting with Chrome 115, ChromeDriver releases were integrated into [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/). When you need to select a ChromeDriver version that precisely matches a regular Chrome installation, Google's [version selection guide](https://developer.chrome.com/docs/chromedriver/downloads/version-selection) recommends looking up the version corresponding to Chrome's `MAJOR.MINOR.BUILD` value in the `latest-patch-versions-per-build` JSON endpoint. If no matching data is available yet, fall back to `latest-versions-per-milestone`.

In practice, use the following process:

1. First, check for a major-version mismatch.
2. For an exact match with Chrome 115 or later, compare the `MAJOR.MINOR.BUILD` values.
3. Create an actual Selenium session to verify that Chrome launches successfully.

## Causes and Fixes for `SessionNotCreatedException`

If Chrome and ChromeDriver are incompatible, you may see an error like this:

```text
selenium.common.exceptions.SessionNotCreatedException
This version of ChromeDriver only supports Chrome version XX
Current browser version is YY
```

The following table lists common causes and solutions.

| Cause | How to check | Solution |
| --- | --- | --- |
| Chrome updated automatically, but ChromeDriver did not | Compare the Chrome and ChromeDriver versions | Update to a compatible ChromeDriver version |
| An old driver remains on PATH | Run `where.exe chromedriver` or `which chromedriver` | Delete the old file or correct the PATH order |
| The Python code specifies an outdated path | Check `Service(executable_path=...)` | Change it to the path of the new ChromeDriver |
| Selenium is outdated in the virtual environment | Run `python -m pip show selenium` | Update it with `python -m pip install -U selenium` |
| Automatic download fails because of a proxy or similar restriction | Check the Selenium Manager logs | Review the proxy settings or place the driver in advance |

One particularly easy mistake to overlook is updating ChromeDriver while another older copy on PATH is still being used. Running `where.exe` or `which` reveals the actual file being referenced and makes the problem easier to isolate.

## How to Fix `chromedriver executable needs to be in PATH`

Older versions of Selenium, or code that manages ChromeDriver manually, may produce the following error:

```text
WebDriverException: 'chromedriver' executable needs to be in PATH
```

There are two main ways to fix it.

### Method 1: Let Selenium Manager Handle the Driver

If you are using a recent version of Selenium, launch Chrome without specifying a ChromeDriver path.

```bash
python -m pip install -U selenium
```

```python
from selenium import webdriver

driver = webdriver.Chrome()
driver.get("https://example.com")
print(driver.title)
driver.quit()
```

When Selenium Manager bundled with Selenium is available, it automatically detects, downloads, and caches the required ChromeDriver.

### Method 2: Specify the ChromeDriver Path Explicitly

If you manage the driver yourself, pass the executable path to `Service`.

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

service = Service(executable_path=r"C:\tools\chromedriver.exe")
driver = webdriver.Chrome(service=service)
```

On Linux or macOS, you may also need to grant execute permission:

```bash
chmod +x /path/to/chromedriver
```

## Is Selenium Manager All You Need Today?

With current versions of Selenium, `webdriver.Chrome()` can automatically manage ChromeDriver in most cases. The [official Selenium documentation](https://www.selenium.dev/documentation/selenium_manager/) explains that Selenium Manager is bundled with the language bindings and manages the driver automatically when one is not specified.

Therefore, **if your only goal in a new Selenium project is to launch a browser, Selenium Manager is the easiest place to start**.

However, a custom driver-management process is still useful when you need to:

- Check the Chrome and ChromeDriver versions explicitly before launching Selenium
- Keep the downloaded ChromeDriver in a fixed location
- Separate the download process from the Selenium process
- Prepare the driver and validate browser startup before an automation job begins
- Distribute the tool as a single executable with PyInstaller
- Understand the Chrome for Testing API and how driver management works

The `get-chrome-driver` tool introduced here is not merely a way to launch Selenium. It is designed to treat **version detection, download, caching, and launch validation as explicit steps**.

## Why I Built a Python Tool to Download ChromeDriver Automatically

When I regularly used Selenium for web scraping and browser automation, tests would occasionally stop working immediately after Chrome updated itself. Manually checking the Chrome and ChromeDriver versions, finding the correct ZIP archive, and extracting it each time became tedious.

I therefore automated the following tasks with Python:

1. Detect the installed Chrome version.
2. Identify whether the system is running Windows, Linux, or macOS.
3. Find ChromeDriver through the Chrome for Testing JSON API.
4. Download and safely extract the ZIP archive.
5. Cache the driver locally.
6. Verify that Selenium can actually launch Chrome.

The source code is available on GitHub:

[mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

## Tool Setup and Usage

### Requirements

- Python 3.8 or later
- Google Chrome or Chromium installed
- Network access to the Chrome for Testing distribution server

### Setup

```powershell
git clone https://github.com/mitz17/get-chrome-driver.git
cd get-chrome-driver

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

On Linux or macOS, activate the virtual environment as follows:

```bash
source .venv/bin/activate
```

### Basic Commands

```bash
# Detect the installed Chrome version
python main.py --check

# Download ChromeDriver and verify that Selenium can launch Chrome
python main.py

# Download ChromeDriver without performing launch validation
python main.py --no-validate
```

The downloaded ChromeDriver is saved in `~/.get-chrome-driver/` under the user's home directory. On Windows, this is normally:

```text
C:\Users\<username>\.get-chrome-driver\
```

## Implementing Automatic ChromeDriver Downloads in Python

The following sections explain how the tool works internally.

### 1. Detect the Installed Chrome Version

On Windows, the tool checks the registry and the product version of `chrome.exe`. On Linux, it runs candidate commands for Chrome and Chromium in sequence.

```python
commands = [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
]

for command in commands:
    try:
        output = subprocess.check_output([command, "--version"]).decode().strip()
        match = re.search(r"[\d.]+", output)
        if match:
            version = match.group(0)
            break
    except (subprocess.CalledProcessError, FileNotFoundError):
        continue
```

By not hard-coding a single command, the tool can more easily support both Google Chrome and Chromium on Ubuntu.

### 2. Convert the OS and CPU to a Chrome for Testing Platform Name

The Chrome for Testing JSON data uses the identifiers `linux64`, `mac-arm64`, `mac-x64`, `win32`, and `win64`, depending on the operating system and CPU architecture.

```python
def get_platform_string():
    os_name = platform.system()
    arch = platform.machine()

    if os_name == "Linux":
        return "linux64"
    if os_name == "Darwin":
        return "mac-arm64" if arch == "arm64" else "mac-x64"
    if os_name == "Windows":
        return "win64" if sys.maxsize > 2**32 else "win32"
    return None
```

Official Chrome for Testing releases provide ChromeDriver for these five platforms.

### 3. Find the Download URL Through the Chrome for Testing API

The current implementation fetches `known-good-versions-with-downloads.json` and searches backward through the list for a candidate with the same major version as the installed Chrome browser.

```python
def _extract_from_versions(entries, major_version, platform_name):
    for entry in reversed(entries):
        version = entry.get("version", "")
        if not version.startswith(f"{major_version}."):
            continue

        downloads = entry.get("downloads", {}).get("chromedriver", [])
        for download in downloads:
            if download.get("platform") == platform_name:
                return version, download.get("url")

    return None, None
```

This implementation obtains the latest candidate within the same major version and assumes that Selenium launch validation will be performed after the download.

As explained earlier, an implementation that follows the official process more precisely for a regular Chrome installation version 115 or later should match `MAJOR.MINOR.BUILD` against `latest-patch-versions-per-build-with-downloads.json`, then fall back to `latest-versions-per-milestone-with-downloads.json` if no match is found. This is one area where the tool could be improved in the future.

### 4. Reuse a Cached ChromeDriver

Instead of downloading the driver every time, the tool checks for an existing ChromeDriver. In the current implementation, it reuses the driver when Chrome and ChromeDriver have the same major version and the file exists.

```python
existing_version = self._get_installed_driver_version()
target_major = version.split(".")[0]

if existing_version:
    existing_major = existing_version.split(".")[0]
    if existing_major == target_major and self.driver_path.exists():
        print(f"Existing ChromeDriver version {existing_version} is compatible.")
        return str(self.driver_path)
```

This acts as a cache that downloads a new ChromeDriver only when Chrome's major version changes.

### 5. Safely Extract Only the Executable from the ZIP Archive

Rather than extracting the entire downloaded ZIP archive without validation, the tool checks each path and extracts only `chromedriver` or `chromedriver.exe`.

```python
with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
    driver_member = None

    for member in archive.infolist():
        member_path = os.path.normpath(member.filename)
        if os.path.isabs(member_path) or member_path.startswith(".."):
            continue
        if os.path.basename(member_path) == self.driver_name:
            driver_member = member
            break

    with archive.open(driver_member) as source, open(self.driver_path, "wb") as target:
        shutil.copyfileobj(source, target)
```

On Linux and macOS, the tool also grants execute permission after extraction.

```python
if os.name != "nt":
    self.driver_path.chmod(0o755)
```

### 6. Validate the Driver by Launching Chrome with Selenium

Instead of assuming compatibility based only on version numbers, the tool launches headless Chrome as a final validation step.

```python
options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service, options=options)

try:
    driver.get("https://google.com")
    print(driver.title)
finally:
    driver.quit()
```

In CI systems, isolated networks, or other environments where validation against an external website is unnecessary, use `--no-validate` to skip this step. However, if ChromeDriver has not yet been cached, downloading the driver still requires a network connection.

## Use the Tool Directly from a Selenium Script

Call `GetChromeDriver` from Python and pass the returned path to `Service`.

```python
from get_chrome_driver.core import GetChromeDriver
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

installer = GetChromeDriver()
driver_path = installer.install()

service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service)

try:
    driver.get("https://example.com")
    print(driver.title)
finally:
    driver.quit()
```

Because the ChromeDriver location remains fixed, you can use it without adding it to PATH.

## Frequently Asked Questions

### How do I check the ChromeDriver version?

Run `chromedriver --version` in a terminal or PowerShell. This is the same command whether you search for “check ChromeDriver version,” “ChromeDriver version check,” or “how to check ChromeDriver version.” If ChromeDriver is not on PATH, specify the full path to the executable.

### How can I check the ChromeDriver version with Python?

Run `chromedriver --version` with `subprocess`:

```python
import subprocess

result = subprocess.run(
    ["chromedriver", "--version"],
    capture_output=True,
    text=True,
    check=True,
)
print(result.stdout.strip())
```

### Do I need to add ChromeDriver to PATH to use Selenium?

No. You can let Selenium Manager handle the Chrome driver for Selenium automatically, or specify its location with `Service(executable_path=...)`.

### Do I need to download ChromeDriver every time?

No. Both Selenium Manager and the Python ChromeDriver tool described in this article cache the downloaded driver. You only need to update it after Chrome changes or when a compatibility error occurs.

### Must the Chrome and ChromeDriver versions match exactly?

Start by checking that their major versions match. For a precise match with a regular Chrome installation version 115 or later, follow the official guidance and select the ChromeDriver corresponding to `MAJOR.MINOR.BUILD`.

## Conclusion

To check the ChromeDriver version, run:

```bash
chromedriver --version
```

If Selenium cannot launch Chrome, check the installed Chrome version, the ChromeDriver version, and the driver path actually being referenced, in that order. With a recent Selenium release, the easiest approach is to start with `webdriver.Chrome()` and let Selenium Manager handle the driver automatically.

If you need control over where ChromeDriver is downloaded and how it is updated, you can use the Chrome for Testing JSON API from Python. The `get-chrome-driver` tool introduced here automates Chrome detection, compatible-driver lookup, caching, safe extraction, and Selenium launch validation.

## References

- [Official Selenium Manager documentation](https://www.selenium.dev/documentation/selenium_manager/)
- [ChromeDriver version selection](https://developer.chrome.com/docs/chromedriver/downloads/version-selection)
- [Chrome for Testing JSON API](https://github.com/GoogleChromeLabs/chrome-for-testing)
- [get-chrome-driver source code](https://github.com/mitz17/get-chrome-driver)
