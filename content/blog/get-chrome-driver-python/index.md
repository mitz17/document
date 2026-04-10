+++
title = "SeleniumでChromeDriverを自動取得するPythonツールを作った"
date = 2026-03-04T00:00:00+09:00
draft = false
description = "Selenium 実行時に起きる Chrome と ChromeDriver のバージョン不一致を、インストール済み Chrome の検出と対応ドライバの自動取得で解消する Python ツールの紹介です。"
tags = ["Python", "Selenium", "ChromeDriver", "自動化", "スクレイピング"]
categories = ["プロジェクト"]
+++

GitHub: [mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

## 作った理由

Selenium でスクレイピングやブラウザ自動操作をしていると、Chrome の自動更新が原因で ChromeDriver とのバージョン不一致が突然起きることがあります。実際に次のようなエラーでテストが止まる場面が何度かありました。

```text
SessionNotCreatedException
This version of ChromeDriver only supports Chrome version XX
Current browser version is YY
```

Selenium で Chrome を操作するには、インストール済みの Chrome と互換性のある ChromeDriver が必要です。ただし Chrome は自動更新されるため、毎回対応する ZIP を探して展開し、実行環境へ配る運用はすぐに面倒になります。

さらに 2023 年以降は、ChromeDriver の配布が **Chrome for Testing (CfT) API** に集約され、過去の固定 URL を前提にした方法では最新の互換ドライバを安定して取れなくなりました。そこで、次の処理を自動化する `get-chrome-driver` を作りました。

## Selenium 実行前に ChromeDriver のバージョン不一致を自動解消する

1. 実行環境に入っている Chrome のバージョンを調べる
2. CfT API から一致する ChromeDriver を取得して保存する
3. 必要なら Selenium で実行確認まで行う

この記事では、その処理の流れと使い方をまとめます。

## 処理の流れ

### 1. インストール済み Chrome のバージョンを取得する

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

Windows ではまずレジストリを確認し、見つからなければ後続処理で `chrome.exe` の `ProductVersion` も参照します。Linux では `google-chrome` や `chromium-browser` など複数の候補コマンドを順番に試し、macOS では `--version` の出力を解析します。

### 2. CfT API 用のプラットフォーム名を決める

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

CfT API の JSON に合わせて、実行環境を `linux64` `mac-arm64` `mac-x64` `win64` `win32` のような識別子に変換します。Windows では Python が 64bit かどうかを基準に判定しています。

### 3. CfT API から対応するダウンロード URL を探す

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

まず `known-good-versions-with-downloads.json` を参照し、見つからなければ `last-known-good-versions-with-downloads.json` の `versions` と `channels` を順に確認します。完全一致ではなくメジャーバージョン一致で探すため、細かいビルド番号の差があっても実用上の互換ドライバを見つけやすくしています。

### 4. 既存のドライバが使えるかを先に判定する

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

すでに保存済みの ChromeDriver があり、メジャーバージョンが一致していれば再ダウンロードはしません。互換性が崩れたときだけ更新します。

### 5. ZIP を安全に展開して保存する

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

ZIP 内に `..` や絶対パスを含むエントリがあっても無視し、`chromedriver` または `chromedriver.exe` 本体だけを取り出します。macOS と Linux では展開後に実行権限も付けます。

### 6. Selenium で起動確認する

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

`GetChromeDriver.validate()` はこの確認を実行し、Chrome が起動して Google に到達できれば成功とみなします。CI や閉域環境のように検証を省きたい場合は、`main.py --no-validate` でスキップできます。

## 使い方

### 前提

- Python 3.8 以上
- Chrome がインストールされていること
- ネットワークに接続できること

### セットアップ

```powershell
# リポジトリを取得して仮想環境を作成
cd C:\workspace\projects
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r get-chrome-driver\requirements.txt
```

### 基本コマンド

```powershell
# ChromeDriver を取得し、ヘッドレス Selenium で動作確認する
python main.py

# 現在の Chrome バージョンだけ確認する
python main.py --check

# ドライバ取得だけ行い、Selenium 検証は省略する
python main.py --no-validate
```

取得した ChromeDriver は `~/.get-chrome-driver/` に保存されます。Windows では通常 `C:\Users\<username>\.get-chrome-driver\` です。`PATH` に追加しなくても、Selenium 側で `driver_path` を明示すれば使えます。

### Selenium スクリプトから直接使う

CLI を単発で使うだけでなく、テストコードの中で `GetChromeDriver` を呼ぶと、実行前に毎回ドライバをそろえられます。

```python
from get_chrome_driver.core import GetChromeDriver
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

installer = GetChromeDriver()
driver_path = installer.install()
service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service)
# ここから Selenium の処理を書く
```

Chrome が自動更新された直後でも、先にこの処理を通しておけば対応する ChromeDriver を取得できます。ダウンロード結果は `~/.get-chrome-driver/` にキャッシュされるので、毎回取り直す必要もありません。

## まとめ

`get-chrome-driver` を使うと、ChromeDriver のバージョン不一致を実行前に自動で解消できます。CfT API の仕様変更があっても、基本的には `api.py` の取得ロジックを追従すれば対応しやすい構成にしてあります。Selenium の準備作業を減らしたいときに便利な小さなツールです。
