+++
title = 'Selenium使用時にChromeDriverを自動更新する方法'
date = 2026-03-04T00:00:00+09:00
draft = false
description = 'ChromeDriverを自動取得するPythonツール get-chrome-driver の開発のきっかけ、処理ごとの動き、利用方法'
tags = ['Python','Selenium','ChromeDriver','自動化','スクレイピング']
categories = ['プロジェクト']
+++


## 開発のきっかけ

Selenium でスクレイピングを走らせていると、Chrome が自動更新された直後に ChromeDriver とのバージョン不一致が頻発します。ある日突然テストが落ち、ログを開くと次のようなメッセージが並んでいました。

```
SessionNotCreatedException
This version of ChromeDriver only supports Chrome version XX
Current browser version is YY
```


Selenium でブラウザを操作するには、Chrome 本体と一致する ChromeDriver を用意し続ける必要があります。しかし Chrome は自動更新されるため、毎回 ZIP を探して展開し、テスト端末へ配る作業がすぐにボトルネックになりました。

追い打ちをかけるように 2023 年以降は配布元が **Chrome for Testing (CfT) API** に集約され、従来の URL では最新バージョンが手に入らないケースも出てきます。現場で必要だったのは、次の 3 ステップを自動でつないでくれる仕組みでした。 (chromeの自動アップデートを止めることでも対処できるがそれはセキュリティ上良くない(？)ので以下のプログラムを書きました。)

## Selenium実行前にChromeDriverのバージョン不一致エラーを自動解決する

1. Selenium実行前に端末にインストールされている Chrome のバージョンを検出する
2. CfT API から一致する ChromeDriver をダウンロードし、検証済みの場所( `C:\Users\<ユーザー名>\.get-chrome-driver`)へ保存する

このフローをワンコマンドで実現するために `get-chrome-driver` を作成し、この記事で処理内容を掘り下げています。


## 処理の流れ

### 1. インストール済み Chrome のバージョン検出

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

Windows ではまずレジストリ (`BLBeacon`, `Uninstall`) を走査し、取得できなければ同関数の後半で `chrome.exe` の `ProductVersion` を PowerShell から読む実装です。macOS も `--version` の標準出力を解析し、Linux は `google-chrome` / `chromium-browser` など複数コマンドをリトライして一番最初に成功したもののバージョンを返します。

### 2. プラットフォーム文字列の決定

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

CfT の JSON に合わせたプラットフォーム名をここで決めています。特に Windows は Python が 64bit かで `win64`/`win32` を出し分け、後続の API コールが一意の URL を得られるようにしています。

### 3. CfT API からドライバーアーカイブを検索

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

まず `known-good` を参照し、それで見つからなければ `last-known-good` の `versions` → `channels` を順に探して Stable/Beta/Dev/Canary からリンクを決定します。メジャーバージョンの一致だけを条件にしているため、Chrome の細かなビルド番号が異なっても同系列のドライバーを拾えるようになっています。

### 4. 既存ドライバーとの突き合わせ

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

インストーラは保存済みドライバーのメジャー番号と Chrome 側の番号を比較し、同じであればダウンロードを省略します。互換性が崩れたタイミングだけ更新メッセージを出し、後続のダウンロード処理に進みます。

### 5. アーカイブのダウンロードと安全な展開

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

ZIP 内のパスに `..` や絶対パスが含まれる場合はスキップし、`chromedriver(.exe)` に一致したファイルだけを展開しています。展開後は macOS/Linux で実行権限を与え、Windows でも `~/.get-chrome-driver/`（実際はユーザーのホームディレクトリ）内に常に最新をそろえる形です。

### 6. Selenium での動作検証

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

上記を `GetChromeDriver.validate()` が実行し、Google まで到達できれば「接続成功」として True を返します。`main.py` 側の `--no-validate` フラグを立てればこの Selenium チェックをスキップでき、ネットワークに制限がある CI や配布先でも柔軟に運用できます。

## 使用方法

### 前提

- Python 3.8 以上
- Chrome とネットワークにアクセスできる環境

### セットアップ手順

```powershell
# リポジトリを取得
cd C:\workspace\projects
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r get-chrome-driver\requirements.txt
```

### 基本的なコマンド

```powershell
# ChromeDriver を取得しヘッドレスで動作検証
python main.py

# 端末に入っている Chrome のバージョンだけ確認
python main.py --check

# ドライバー取得だけ行い、Selenium 検証を省略
python main.py --no-validate
```

`~/.get-chrome-driver/`（Windows の場合は `C:\Users\<ユーザー名>\.get-chrome-driver`）に `chromedriver.exe` が保存されます。PATH を通す必要はなく、Selenium からは `driver_path` を明示的に渡せば利用できます。

### モジュールとして Selenium スクリプトに組み込む

CLI での単発実行だけでなく、Selenium のテストコード側に `GetChromeDriver` を import して毎回ドライバーを揃えるのが手堅いやり方です。

```python
from get_chrome_driver.core import GetChromeDriver
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

installer = GetChromeDriver()
driver_path = installer.install()
service = Service(executable_path=driver_path)
driver = webdriver.Chrome(service=service)
# 以降 Selenium の操作
```

テスト実行時に上記を呼び出しておけば、Chrome が自動更新された直後でも必ずマッチした ChromeDriver を取得でき、毎回のダウンロード結果も `~/.get-chrome-driver/` にキャッシュされます。

## さいごに

ChromeDriver の取得ルールは今後も変わる可能性があるため、CfT API の応答仕様が変わった際は `api.py` のパースロジックだけを差し替えれば再利用できる構成にしてあります。バージョン突き合わせから検証までを自動化しておけば、リグレッションテストの前準備にかかっていた時間を別の作業に割り当てられるはずです。
