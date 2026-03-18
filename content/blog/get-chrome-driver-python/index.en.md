+++
title = "How to Automatically Download the Right ChromeDriver for Selenium with Python"
date = 2026-03-04T00:00:00+09:00
draft = false
description = "A Python-based approach to fixing Chrome and ChromeDriver version mismatch in Selenium by detecting the installed Chrome version and automatically downloading the matching driver."
tags = ["python", "selenium", "chromedriver", "automation", "web-scraping"]
categories = ["project"]
+++

GitHub: [mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

## Why I Built It

When you run Selenium-based scraping or browser automation, Chrome can auto-update and suddenly create a version mismatch with ChromeDriver. One day my tests started failing out of nowhere, and the logs were full of messages like this:

```
SessionNotCreatedException
This version of ChromeDriver only supports Chrome version XX
Current browser version is YY
```

To control Chrome through Selenium, you need a ChromeDriver version that matches the installed Chrome version. The problem is that Chrome updates automatically, so manually finding the right ZIP file, extracting it, and distributing it to test machines quickly becomes a bottleneck.

On top of that, since 2023 the official distribution flow has been consolidated into the **Chrome for Testing (CfT) API**, which means older download URLs do not always provide the latest compatible version anymore. What I needed in practice was a tool that automates the following three steps. (Disabling Chrome auto-update is another possible workaround, but I did not want to rely on that for security reasons, so I wrote the program below.)

## Automatically Resolve ChromeDriver Version Mismatches Before Running Selenium

1. Detect the installed Chrome version before Selenium starts
2. Download the matching ChromeDriver from the CfT API and save it to a verified location (`C:\Users\<username>\.get-chrome-driver`)

I built `get-chrome-driver` to make this flow possible with a single command, and this article explains how it works.

## Processing Flow

### 1. Detect the Installed Chrome Version

```python
# get_chrome_driver/utils.py
def get_chrome_version():
    system = platform.system()
    if system == "Windows":
        import locale
        encoding = locale.getpreferredencoding()
        paths = [
            r'reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v version',
            r'reg query "HKEY_LOCAL_MACHINE\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Google Chrome" /v version'
        ]
        for cmd in paths:
            try:
                raw_output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL)
                try:
                    output = raw_output.decode(encoding)
                except UnicodeDecodeError:
                    output = raw_output.decode('cp932', errors='replace')
                match = re.search(r'version\s+REG_SZ\s+([\d\.]+)', output)
                if match:
                    version = match.group(1)
                    break
            except subprocess.CalledProcessError:
                continue
    elif system == "Linux":
        commands = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]
        for cmd in commands:
            try:
                output = subprocess.check_output([cmd, "--version"]).decode().strip()
                match = re.search(r'[\d\.]+', output)
                if match:
                    version = match.group(0)
                    break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
```

On Windows, the tool first checks the registry (`BLBeacon`, `Uninstall`). If that does not work, the later part of the same function reads `chrome.exe`'s `ProductVersion` via PowerShell. On macOS it parses the output of `--version`, and on Linux it retries several commands such as `google-chrome` and `chromium-browser` until one succeeds.

### 2. Decide the Platform String

```python
# get_chrome_driver/api.py
def get_platform_string():
    os_name = platform.system()
    arch = platform.machine()
    if os_name == "Linux":
        return "linux64"
    elif os_name == "Darwin":
        if arch == "arm64":
            return "mac-arm64"
        return "mac-x64"
    elif os_name == "Windows":
        if sys.maxsize > 2**32:
            return "win64"
        return "win32"
    return None
```

This converts the local environment into the platform names used by the CfT JSON. On Windows in particular, it chooses between `win64` and `win32` based on whether Python itself is 64-bit, so that the following API call can resolve to a single correct URL.

### 3. Look Up the Driver Archive Through the CfT API

```python
# get_chrome_driver/api.py
def get_driver_download_url(chrome_version, platform_name):
    major_version = chrome_version.split('.')[0]
    try:
        response = requests.get(KNOWN_GOOD_URL, timeout=30)
        response.raise_for_status()
        version, url = _extract_from_versions(response.json().get('versions', []), major_version, platform_name)
        if url:
            return url
    except Exception as e:
        print(f"CfT known-good 取得中にエラーが発生しました: {e}")

    try:
        response = requests.get(LAST_KNOWN_GOOD_URL, timeout=30)
        response.raise_for_status()
        payload = response.json()
        version, url = _extract_from_versions(payload.get('versions', []), major_version, platform_name)
        if url:
            return url
        version, url = _extract_from_channels(payload.get('channels', {}), major_version, platform_name)
        if url:
            return url
    except Exception as e:
        print(f"CfT last-known-good 取得中にエラーが発生しました: {e}")

    return None
```

The tool first checks `known-good`. If it cannot find a match there, it tries `last-known-good`, searching `versions` and then `channels` in order to resolve a link from Stable, Beta, Dev, or Canary. It only requires a matching major version, which makes it tolerant of minor build differences while still staying in the same compatibility line.

### 4. Compare With an Existing Driver

```python
# get_chrome_driver/core.py
existing_version = self._get_installed_driver_version()
target_major = version.split('.')[0]
if existing_version:
    existing_major = existing_version.split('.')[0]
    if existing_major == target_major and self.driver_path.exists():
        print(f"既存の ChromeDriver (バージョン {existing_version}) は互換性があります。")
        return str(self.driver_path)
    else:
        print(f"ChromeDriver を更新します: 現在 {existing_version} -> 目標メジャー {target_major}")
```

The installer compares the major version of the saved driver with the Chrome version. If the major versions match, it skips the download. It only enters the download flow when compatibility has actually broken.

### 5. Download and Extract the Archive Safely

```python
# get_chrome_driver/core.py
response = requests.get(url, timeout=30)
with zipfile.ZipFile(io.BytesIO(response.content)) as z:
    driver_member = None
    for member in z.infolist():
        member_path = os.path.normpath(member.filename)
        if os.path.isabs(member_path) or member_path.startswith(".."):
            continue
        if os.path.basename(member_path) == self.driver_name:
            driver_member = member
            break
    with z.open(driver_member) as source, open(self.driver_path, "wb") as target:
        shutil.copyfileobj(source, target)
if os.name != "nt":
    self.driver_path.chmod(0o755)
```

If a ZIP entry contains `..` or an absolute path, it is ignored. Only the actual `chromedriver` or `chromedriver.exe` binary is extracted. After extraction, executable permissions are set on macOS and Linux. On Windows, the tool keeps the latest driver under `~/.get-chrome-driver/`, which resolves to the user's home directory.

### 6. Verify That Selenium Actually Works

```python
# get_chrome_driver/core.py
options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service, options=options)
driver.get("https://google.com")
title = driver.title
driver.quit()
```

`GetChromeDriver.validate()` runs this check and returns `True` if it can launch Chrome and reach Google successfully. If you use the `--no-validate` flag in `main.py`, this Selenium check is skipped, which is useful in restricted CI environments or distribution targets with limited network access.

## How to Use It

### Requirements

- Python 3.8 or later
- An environment where Chrome and the network are accessible

### Setup

```powershell
# Clone the repository
cd C:\workspace\projects
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r get-chrome-driver\requirements.txt
```

### Basic Commands

```powershell
# Download ChromeDriver and validate it with a headless Selenium run
python main.py

# Check only the installed Chrome version
python main.py --check

# Download the driver only and skip Selenium validation
python main.py --no-validate
```

The tool saves `chromedriver.exe` under `~/.get-chrome-driver/` (on Windows, `C:\Users\<username>\.get-chrome-driver`). You do not need to add it to `PATH`; you can just pass `driver_path` explicitly from Selenium.

### Import It Into a Selenium Script

Instead of using the CLI only as a one-off tool, a safer pattern is to import `GetChromeDriver` directly in your Selenium tests so the driver is always aligned before execution.

```python
from get_chrome_driver.core import GetChromeDriver
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

installer = GetChromeDriver()
driver_path = installer.install()
service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service)
# Continue with Selenium operations
```

If you call this before each test run, you can reliably fetch a matching ChromeDriver even right after Chrome auto-updates. The downloaded result is also cached under `~/.get-chrome-driver/`.

## Final Notes

The ChromeDriver distribution rules may change again in the future, so the code is structured so that only the parsing logic in `api.py` should need to change if the CfT API response format changes. Once version detection, download, and validation are automated, the time previously spent on Selenium setup can be used for actual test work instead.
