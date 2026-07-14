+++
title = "ChromeDriverのバージョン確認方法｜Python・Seleniumの不一致エラーを解決"
date = 2026-03-04T00:00:00+09:00
lastmod = 2026-07-14T00:00:00+09:00
draft = false
description = "ChromeDriverのバージョンは chromedriver --version で確認できます。Chromeとの不一致、PATHエラー、Selenium Managerによる自動管理、Pythonで対応ドライバを取得する方法まで解説します。"
tags = ["Python", "Selenium", "ChromeDriver", "自動化", "スクレイピング"]
categories = ["プロジェクト"]
+++

SeleniumでChromeを起動できないときは、最初にChromeDriverのバージョンを確認する。

```bash
chromedriver --version
```

正常に見つかれば、次のようにバージョンが表示される。

```text
ChromeDriver 150.0.xxxx.xx (...)
```

この記事では、**ChromeDriverとChromeのバージョン確認方法**、`SessionNotCreatedException`や`chromedriver executable needs to be in PATH`の解決方法を先に示す。その後、Chromeに対応するドライバを自動取得するPythonツールを作った理由と実装を解説する。

GitHub: [mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

## ChromeDriverのバージョンを確認する方法

### Windows・Linux・macOS共通

ChromeDriverへPATHが通っている場合は、PowerShell、コマンドプロンプト、ターミナルのいずれでも次のコマンドを使える。

```bash
chromedriver --version
```

重要なのは、ChromeDriverの先頭に表示されるメジャーバージョンだ。たとえば次の結果なら、メジャーバージョンは`150`になる。

```text
ChromeDriver 150.0.xxxx.xx
```

### `chromedriver`が見つからない場合

`chromedriver --version`を実行しても認識されない場合は、まずChromeDriverがどこにあるか確認する。

Windowsでは次のコマンドを使う。

```powershell
where.exe chromedriver
```

LinuxまたはmacOSでは、次のどちらかを使う。

```bash
which chromedriver
command -v chromedriver
```

何も表示されなければ、ChromeDriverがインストールされていないか、保存先がPATHに登録されていない。ファイルの場所が分かっている場合は、フルパスを指定して確認できる。

```powershell
# Windowsの例
& "C:\tools\chromedriver.exe" --version
```

```bash
# Linux・macOSの例
/home/user/bin/chromedriver --version
```

複数のパスが表示された場合は、古いChromeDriverが先に参照されている可能性がある。Seleniumで指定しているパスと、コマンドで見つかったパスが同じか確認する。

## Chrome本体のバージョンを確認する方法

ChromeDriverだけでなく、実際にインストールされているChromeのバージョンも確認する。

最も簡単なのは、Chromeで次のURLを開く方法だ。

```text
chrome://settings/help
```

コマンドから調べる場合は、OSごとに次の方法を使う。

### Windows

Chromeのユーザー設定用レジストリから確認する。

```powershell
(Get-ItemProperty "HKCU:\Software\Google\Chrome\BLBeacon").version
```

Chromeが全ユーザー向けにインストールされている場合は、実行ファイルの製品バージョンからも確認できる。

```powershell
(Get-Item "$env:ProgramFiles\Google\Chrome\Application\chrome.exe").VersionInfo.ProductVersion
```

### Ubuntu・その他のLinux

インストール方法に応じて、利用できるコマンドが異なる。

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

## ChromeとChromeDriverはどこまで一致させるべきか

まず、ChromeとChromeDriverのメジャーバージョンが一致しているかを見る。

| Chrome | ChromeDriver | 判定 |
| --- | --- | --- |
| `150.x.x.x` | `150.x.x.x` | 同じメジャーバージョン |
| `150.x.x.x` | `149.x.x.x` | 不一致。更新が必要 |
| `149.x.x.x` | `150.x.x.x` | 不一致。更新が必要 |

ただし、**Chrome 115以降はメジャーバージョンだけを見れば常に十分、というわけではない**。

Chrome 115以降では、ChromeDriverのリリースが[Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)へ統合された。通常版Chromeに対応するChromeDriverを厳密に選ぶ場合、Googleの[バージョン選択ガイド](https://developer.chrome.com/docs/chromedriver/downloads/version-selection)では、Chromeの`MAJOR.MINOR.BUILD`に対応するバージョンを`latest-patch-versions-per-build`のJSONから探す方法が案内されている。該当データがまだない場合は、`latest-versions-per-milestone`へフォールバックする。

したがって、確認の考え方は次のようになる。

1. まずメジャーバージョンの不一致を確認する
2. Chrome 115以降で厳密に合わせる場合は`MAJOR.MINOR.BUILD`まで確認する
3. 実際にSeleniumでセッションを作成し、起動できるか検証する

## `SessionNotCreatedException`が出る原因と直し方

ChromeとChromeDriverが合っていないと、次のようなエラーが発生する。

```text
selenium.common.exceptions.SessionNotCreatedException
This version of ChromeDriver only supports Chrome version XX
Current browser version is YY
```

よくある原因と対処方法は次のとおりだ。

| 原因 | 確認方法 | 対処 |
| --- | --- | --- |
| Chromeだけ自動更新された | ChromeとChromeDriverのバージョンを比較 | 対応するChromeDriverへ更新する |
| PATH上に古いドライバが残っている | `where.exe chromedriver`または`which chromedriver` | 古いファイルを削除するかPATHの順序を直す |
| Pythonコードが古いパスを指定している | `Service(executable_path=...)`を確認 | 新しいChromeDriverのパスへ変更する |
| 仮想環境のSeleniumが古い | `python -m pip show selenium` | `python -m pip install -U selenium`で更新する |
| 自動取得がプロキシなどで失敗する | Selenium Managerのログを確認 | プロキシ設定または事前配置を見直す |

とくに見落としやすいのが、ChromeDriverを更新したつもりでも、PATH上の別の古いファイルが使われているケースだ。`where.exe`や`which`で実際に参照される場所を確認すると切り分けやすい。

## `chromedriver executable needs to be in PATH`の解決方法

古いSeleniumや、ChromeDriverを手動管理するコードでは、次のエラーが出ることがある。

```text
WebDriverException: 'chromedriver' executable needs to be in PATH
```

解決方法は主に2つある。

### 方法1：現在のSelenium Managerに任せる

新しいSeleniumを使っている場合は、ChromeDriverのパスを指定せずに起動する。

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

Seleniumに同梱されるSelenium Managerが利用できれば、必要なChromeDriverの検出・取得・キャッシュが自動で行われる。

### 方法2：ChromeDriverのパスを明示する

ドライバを自分で管理する場合は、`Service`へ実行ファイルのパスを渡す。

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

service = Service(executable_path=r"C:\tools\chromedriver.exe")
driver = webdriver.Chrome(service=service)
```

LinuxまたはmacOSで実行権限がない場合は、次の設定も必要になる。

```bash
chmod +x /path/to/chromedriver
```

## 現在はSelenium Managerだけでよいのか

現在のSeleniumでは、多くの場合`webdriver.Chrome()`だけでChromeDriverを自動管理できる。[Selenium公式ドキュメント](https://www.selenium.dev/documentation/selenium_manager/)でも、Selenium Managerは各言語バインディングに同梱され、ドライバを指定しなかった場合に自動管理を行う仕組みとして説明されている。

したがって、**新しいSeleniumプロジェクトでブラウザを起動したいだけなら、まずSelenium Managerを使うのが簡単**だ。

一方、次のような用途では、自前の管理処理にも意味がある。

- Seleniumを起動する前にChromeとChromeDriverのバージョンを明示的に確認したい
- 取得したChromeDriverの保存場所を固定したい
- 取得処理とSeleniumの処理を分離したい
- 自動化ジョブの開始前にドライバの準備と起動確認を済ませたい
- PyInstallerで単一の実行ファイルとして配布したい
- Chrome for Testing APIの動作やドライバ管理の仕組みを理解したい

今回作った`get-chrome-driver`は、単にSeleniumを起動するためだけではなく、**バージョン検出・取得・キャッシュ・起動確認を明示的な処理として扱うためのツール**という位置づけだ。

## ChromeDriverを自動取得するPythonツールを作った理由

Seleniumでスクレイピングやブラウザ自動操作を続けていると、Chromeの自動更新後に突然テストが止まることがあった。そのたびにChromeとChromeDriverのバージョンを確認し、対応するZIPを探して展開するのは面倒だった。

そこで、次の処理をPythonで自動化した。

1. インストール済みChromeのバージョンを検出する
2. Windows・Linux・macOSを判定する
3. Chrome for TestingのJSON APIからChromeDriverを探す
4. ZIPをダウンロードして安全に展開する
5. ローカルへキャッシュする
6. Seleniumで実際に起動できるか確認する

ツールのソースコードはGitHubで公開している。

[mitz17/get-chrome-driver](https://github.com/mitz17/get-chrome-driver)

## ツールのセットアップと使い方

### 前提環境

- Python 3.8以上
- Google ChromeまたはChromiumがインストールされていること
- Chrome for Testingの配布先へ接続できること

### セットアップ

```powershell
git clone https://github.com/mitz17/get-chrome-driver.git
cd get-chrome-driver

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

LinuxまたはmacOSでは、仮想環境を次のように有効化する。

```bash
source .venv/bin/activate
```

### 基本コマンド

```bash
# Chromeのバージョンを検出する
python main.py --check

# ChromeDriverを取得し、Seleniumで起動確認する
python main.py

# ChromeDriverの取得だけ行い、起動確認を省略する
python main.py --no-validate
```

取得したChromeDriverは、ユーザーのホームディレクトリにある`~/.get-chrome-driver/`へ保存される。Windowsでは通常、次の場所になる。

```text
C:\Users\<ユーザー名>\.get-chrome-driver\
```

## PythonによるChromeDriver自動取得の実装

ここからは、ツール内部の処理を順番に見ていく。

### 1. インストール済みChromeのバージョンを検出する

Windowsではレジストリと`chrome.exe`の製品バージョンを確認する。Linuxでは、ChromeやChromiumの候補コマンドを順番に実行する。

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

候補を1つに決め打ちしないことで、Ubuntu上のGoogle ChromeとChromiumの両方に対応しやすくしている。

### 2. Chrome for Testing用のプラットフォーム名へ変換する

Chrome for TestingのJSONでは、OSとCPUに応じて`linux64`、`mac-arm64`、`mac-x64`、`win32`、`win64`という識別子が使われる。

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

公式のChrome for Testingでは、ChromeDriverについてこの5種類のプラットフォームが提供されている。

### 3. Chrome for Testing APIからダウンロードURLを探す

現在の実装では、`known-good-versions-with-downloads.json`を取得し、インストール済みChromeと同じメジャーバージョンの候補を末尾から探索する。

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

この方法は同じメジャーバージョンの最新候補を得るための実装であり、取得後にSeleniumの起動確認を行う前提としている。

なお、Chrome 115以降の通常版Chromeへ公式手順どおり厳密に合わせるなら、前述のとおり`latest-patch-versions-per-build-with-downloads.json`で`MAJOR.MINOR.BUILD`を照合し、見つからない場合に`latest-versions-per-milestone-with-downloads.json`へフォールバックする実装がより適切だ。これは今後改善できる点でもある。

### 4. 保存済みChromeDriverを再利用する

毎回ダウンロードするのではなく、保存済みのChromeDriverを確認する。現在の実装では、ChromeとChromeDriverのメジャーバージョンが同じで、ファイルも存在していれば再利用する。

```python
existing_version = self._get_installed_driver_version()
target_major = version.split(".")[0]

if existing_version:
    existing_major = existing_version.split(".")[0]
    if existing_major == target_major and self.driver_path.exists():
        print(f"Existing ChromeDriver version {existing_version} is compatible.")
        return str(self.driver_path)
```

Chromeのメジャーバージョンが変わったときだけ、ChromeDriverを取り直すためのキャッシュとして機能する。

### 5. ZIPから実行ファイルだけを安全に展開する

ダウンロードしたZIP全体を無条件に展開せず、パスを検査して`chromedriver`または`chromedriver.exe`だけを取り出す。

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

LinuxとmacOSでは、展開後に実行権限も付与する。

```python
if os.name != "nt":
    self.driver_path.chmod(0o755)
```

### 6. Seleniumで起動できるか検証する

バージョン番号だけで互換性を断定せず、最後にヘッドレスChromeを起動して確認する。

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

CIや閉域環境など、外部サイトへ接続する検証が不要な場合は、`--no-validate`でスキップできる。ただし、ChromeDriverがまだキャッシュされていない場合、ドライバのダウンロードにはネットワーク接続が必要になる。

## Seleniumスクリプトから直接使う

`GetChromeDriver`をPythonコードから呼び出し、戻り値を`Service`へ渡す。

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

ChromeDriverの保存場所が一定になるため、PATHへ追加せずに利用できる。

## よくある質問

### How to check ChromeDriver version?

英語で「ChromeDriver version check」や「How to check ChromeDriver version」と検索した場合も、確認コマンドは同じだ。ターミナルまたはPowerShellで`chromedriver --version`を実行する。PATHが通っていない場合は、ChromeDriverのフルパスを指定する。

### PythonからChromeDriverのバージョンを確認できる？

`subprocess`で`chromedriver --version`を実行すれば確認できる。

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

### ChromeDriverをPATHに追加しないとSeleniumは使えない？

必須ではない。現在のSelenium Managerに自動管理を任せるか、`Service(executable_path=...)`でChromeDriverの場所を指定すればよい。

### ChromeDriverは毎回ダウンロードする必要がある？

ない。Selenium Managerも今回のツールも取得したChromeDriverをキャッシュする。Chromeの更新後や、互換性エラーが出たときに更新すればよい。

### ChromeDriverとChromeのバージョンは完全一致が必要？

まずメジャーバージョンの一致を確認する。Chrome 115以降の通常版Chromeへ厳密に合わせる場合は、公式案内に従って`MAJOR.MINOR.BUILD`に対応するChromeDriverを選ぶ。

## まとめ

ChromeDriverのバージョンは、次のコマンドで確認できる。

```bash
chromedriver --version
```

Seleniumが起動しない場合は、Chrome本体のバージョン、ChromeDriverのバージョン、実際に参照されているドライバのパスを順番に確認する。新しいSeleniumであれば、まず`webdriver.Chrome()`でSelenium Managerに自動管理を任せるのが簡単だ。

一方、ChromeDriverの取得場所や更新処理を自分で管理したい場合は、Chrome for TestingのJSON APIをPythonから利用できる。今回作った`get-chrome-driver`では、Chromeの検出、対応候補の取得、キャッシュ、安全な展開、Seleniumによる起動確認までを自動化した。

## 参考資料

- [Selenium Manager公式ドキュメント](https://www.selenium.dev/documentation/selenium_manager/)
- [ChromeDriverのバージョン選択](https://developer.chrome.com/docs/chromedriver/downloads/version-selection)
- [Chrome for Testing JSON API](https://github.com/GoogleChromeLabs/chrome-for-testing)
- [get-chrome-driverのソースコード](https://github.com/mitz17/get-chrome-driver)
