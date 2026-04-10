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

When you run Selenium-based scraping or browser automation, Chrome can auto-update and suddenly create a version mismatch with ChromeDriver. I ran into this more than once, with tests failing on errors like this:

```text
SessionNotCreatedException
This version of ChromeDriver only supports Chrome version XX
Current browser version is YY
```

To control Chrome through Selenium, you need a ChromeDriver version that matches the installed Chrome version. The problem is that Chrome updates automatically, so manually finding the right ZIP file, extracting it, and distributing it to each environment quickly becomes tedious.

Since 2023, ChromeDriver distribution has also been consolidated into the **Chrome for Testing (CfT) API**, so older fixed-download approaches are no longer reliable for getting the latest compatible driver. That is why I built `get-chrome-driver` to automate the following flow.

## Automatically Resolve ChromeDriver Version Mismatches Before Running Selenium

1. Detect the installed Chrome version in the current environment
2. Download and save the matching ChromeDriver from the CfT API
3. Optionally verify that Selenium can actually launch it

This article explains how that flow works and how to use the tool.

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

On Windows, the tool first checks the registry. If that does not work, a later part of the same function reads the `ProductVersion` from `chrome.exe`. On Linux, it retries multiple commands such as `google-chrome` and `chromium-browser`, and on macOS it parses the output of `--version`.

### 2. Decide the Platform String for the CfT API

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

This maps the local environment to the identifiers used in the CfT JSON, such as `linux64`, `mac-arm64`, `mac-x64`, `win64`, and `win32`. On Windows, the decision is based on whether Python itself is 64-bit.

### 3. Look Up the Download URL Through the CfT API

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
        print(f"CfT known-good lookup failed: {e}")

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
        print(f"CfT last-known-good lookup failed: {e}")

    return None
```

The tool checks `known-good-versions-with-downloads.json` first. If it cannot find a match there, it falls back to `last-known-good-versions-with-downloads.json` and searches both `versions` and `channels`. It matches on the major version, which is usually enough to stay within the correct compatibility line even if the full build number differs.

### 4. Reuse an Existing Driver When Possible

```python
# get_chrome_driver/core.py
existing_version = self._get_installed_driver_version()
target_major = version.split('.')[0]
if existing_version:
    existing_major = existing_version.split('.')[0]
    if existing_major == target_major and self.driver_path.exists():
        print(f"Existing ChromeDriver version {existing_version} is compatible.")
        return str(self.driver_path)
    else:
        print(f"Updating ChromeDriver: {existing_version} -> major {target_major}")
```

If a previously downloaded ChromeDriver already exists and its major version matches the installed Chrome version, the tool skips the download. It only updates the driver when compatibility is actually broken.

### 5. Download and Extract the ZIP Safely

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

If a ZIP entry contains `..` or an absolute path, it is ignored. Only the actual `chromedriver` or `chromedriver.exe` binary is extracted. On macOS and Linux, executable permissions are added after extraction.

### 6. Verify That Selenium Can Launch It

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

`GetChromeDriver.validate()` runs this check and treats it as success if Chrome starts and reaches Google. In CI or restricted network environments, you can skip this step with `main.py --no-validate`.

## How to Use It

### Requirements

- Python 3.8 or later
- Chrome installed on the machine
- Network access

### Setup

```powershell
# Clone the repository and create a virtual environment
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

The tool saves ChromeDriver under `~/.get-chrome-driver/`. On Windows, that is typically `C:\Users\<username>\.get-chrome-driver\`. You do not need to add it to `PATH` if you pass `driver_path` explicitly from Selenium.

### Use It Directly in a Selenium Script

Instead of using the CLI as a one-off command, you can call `GetChromeDriver` directly from your test code so that the driver is aligned before each run.

```python
from get_chrome_driver.core import GetChromeDriver
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

installer = GetChromeDriver()
driver_path = installer.install()
service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service)
# Continue with Selenium logic here
```

If Chrome auto-updates right before a test run, this flow still fetches the matching ChromeDriver first. The result is cached under `~/.get-chrome-driver/`, so it does not need to be downloaded every time.

## Final Notes

Using `get-chrome-driver`, you can resolve ChromeDriver version mismatches automatically before Selenium runs. Even if the CfT API changes again in the future, the structure keeps most of that impact isolated to the retrieval logic in `api.py`. It is a small utility, but it removes a recurring setup problem from Selenium workflows.
