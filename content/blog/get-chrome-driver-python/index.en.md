+++
title = "A Program to Automatically Resolve ChromeDriver and Chrome Version Mismatch Errors"
date = 2026-03-04T00:00:00+09:00
lastmod = 2026-07-31T00:00:00+09:00
draft = false
description = "A Python tool that solves the problem of Selenium stopping after Chrome updates automatically by automatically obtaining the driver from the Chrome for Testing API."
tags = ["Python", "Selenium", "ChromeDriver", "Automation", "Web Scraping"]
categories = ["Projects"]
+++

## The problem to solve: Jobs do not run when Chrome updates automatically

When Selenium does not start, 99% of the cause is a version mismatch between Chrome and ChromeDriver.  
Chrome updates automatically on its own. And the frequency is surprisingly high.  
ChromeDriver does not update. As a result, a program that worked until the previous day has stopped the next morning with the following error.

```text
selenium.common.exceptions.SessionNotCreatedException:
Message: session not created:
This version of ChromeDriver only supports Chrome version 149
Current browser version is 150.0.xxxx.xx
```

To fix it manually, check the Chrome version, download the corresponding ChromeDriver from [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/), and replace the existing file.  
Even though this is only necessary when the major version is updated, it is extremely troublesome.

Some people deal with this problem by forcibly stopping Chrome's automatic updates.  
([How to stop Google Chrome from updating automatically](https://funcref.com/chrome-auto-update-disable-windows/))

With current Selenium (4.6.0 and later), it will automatically download a driver that matches the installed Chrome version. (I learned about this feature after making the tool. You should have told me! If it could do that, you know!)  
First, I want you to try the following.  
Reference: ([Selenium 4.6 prepares the driver, and 4.11 even prepares the browser](https://gammasoft.jp/support/selenium-with-batteries-included/))

```python
from selenium import webdriver

driver = webdriver.Chrome()  # Do not specify the driver path
driver.get("https://mitz17.com")
time.sleep(5)
driver.quit()
```

If this works, you do not need to read this article.

On the other hand, you need to manage the driver yourself in cases such as the following:

- You want to explicitly check the Chrome and ChromeDriver versions before starting Selenium
- You want to fix the driver's storage location
- You have no choice but to use an old version of Selenium

For such unusual people, I created a tool that automatically obtains the driver.  
Supported OS: Windows, Ubuntu, macOS

The full source is uploaded to GitHub: [mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

※ This article's information is current as of July 2026.

## Implementation: Automating driver retrieval (a simple explanation of the code)

The process has five stages: “Chrome detection → API query → cache check → extraction → startup verification.”

### 1. Detect the version of the installed Chrome

On Windows, it checks the registry (`HKCU:\Software\Google\Chrome\BLBeacon`) and the product version of `chrome.exe`. On Linux and macOS, it runs candidate commands in order.

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

### 2. Find the download URL from the Chrome for Testing API

It obtains `known-good-versions-with-downloads.json` and searches backward from the end for an entry with the same major version as Chrome. In the JSON, the OS and CPU are identified by five types: `linux64`, `mac-arm64`, `mac-x64`, `win32`, and `win64`. It builds the applicable string from `platform.system()` and `platform.machine()`, then checks against it.

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

### 3. Reuse the saved driver

If the major version of the saved driver matches Chrome, use it as-is.

```python
existing_version = self._get_installed_driver_version()
target_major = version.split(".")[0]

if existing_version:
    existing_major = existing_version.split(".")[0]
    if existing_major == target_major and self.driver_path.exists():
        print(f"Existing ChromeDriver version {existing_version} is compatible.")
        return str(self.driver_path)
```

The save location is set to `~/.get-chrome-driver/`.

### 4. Extract only the executable file from the ZIP

If the downloaded ZIP is fully extracted with `extractall()`, and paths inside the archive contain `../` or absolute paths, it may write to an unintended location. This is the so-called Zip Slip.  
Therefore, inspect each entry's path and stream-copy only one file named `chromedriver` (or `chromedriver.exe`).

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

On Linux and macOS, it also grants execute permission.

```python
if os.name != "nt":
    self.driver_path.chmod(0o755)
```

The default save locations for each OS are as follows.

| OS | File name | Save location |
| --- | --- | --- |
| Windows | `chromedriver.exe` | `C:\Users\<username>\.get-chrome-driver\` |
| Ubuntu / macOS | `chromedriver` | `/home/<username>/.get-chrome-driver/` |

### 5. Verify whether it can actually start

Finally, start headless Chrome and confirm that a session can be created.

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

## How to use

### 0. Things to prepare

- Python 3.8 or later
- Google Chrome
- git

### 1. Download

```bash
git clone https://github.com/mitz17/get-chrome-driver.git
cd get-chrome-driver
```

Run up to `cd), and work inside this folder from then on.

### 2. Create a virtual environment

A virtual environment (venv) is a mechanism for isolating this tool's libraries in a place separate from the entire PC. It works even if you do not create one, but it is better to create one because it prevents library version conflicts with other Python projects.

```bash
python -m venv .venv
```

After creating it, “activate” it. The command differs by OS.

```powershell
# Windows (PowerShell)
.\\.venv\\Scripts\\Activate.ps1
```
```bash
# macOS / Linux
source .venv/bin/activate
```

When activation succeeds, `(.venv)` appears at the beginning of the prompt. This is the sign. It becomes inactive when you close the terminal, so activate it again the next time you work.

### 3. Install the necessary libraries

```bash
python -m pip install -r requirements.txt
```

The libraries written in `requirements.txt` (including Selenium) are installed all together.

### 4. Call it from your own script

This is the main point. When you call `install()`, it completes detection, retrieval, caching, and startup verification, then returns the ChromeDriver path. Pass that to `Service`.

```python
from get_chrome_driver.core import GetChromeDriver
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

# Prepare ChromeDriver and receive its path
installer = GetChromeDriver()
driver_path = installer.install()

service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service)

try:
    driver.get("https://mitz17.com")
    print(driver.title)
    # Write the process you want to automate here
finally:
    driver.quit()  # Be sure to close it
```

On the first run, ChromeDriver corresponding to the Chrome version is downloaded and saved.

![Behavior of downloading ChromeDriver on the first run](chrome-driver-first-download.png)

From the second run onward, the saved ChromeDriver is used, so no download occurs.

![Behavior of reusing the saved ChromeDriver from the second run onward](chrome-driver-cache-reuse.png)

It is important to wrap the code in `try`/`finally` and put `driver.quit()` in `finally`. If an error occurs partway through and `quit()` is not called, the Chrome process remains without terminating. In a periodically executed script, this accumulates and can cause it to consume all memory.

Because the ChromeDriver storage location is fixed, adding it to PATH is unnecessary.

## Finally

I sincerely hope that everyone's QOSL will improve.

