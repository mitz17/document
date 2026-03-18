+++
title = "Ansysのバージョン選択ツールを作った理由｜古い解析ファイルを別バージョンで開くリスクを減らす"
date = 2026-03-18T11:00:00+09:00
draft = false
description = "Ansysを複数バージョン運用している環境で、意図しない版で解析ファイルを開くリスクを減らすために作った非公式のバージョン選択ツールを紹介します。Fluent・SpaceClaim・Workbenchに対応し、起動前に版を明示的に選べます。"
tags = ["Ansys", "Fluent", "Workbench", "SpaceClaim", "Python"]
categories = ["プロジェクト"]
slug = "ansys-version-selector"
+++

GitHub: [mitz17/ANSYS_Version_Selector](https://github.com/mitz17/ANSYS_Version_Selector)

このツールは GitHub で公開しています。興味があればコードや README もそのまま確認できます。
この記事で紹介するツールは個人が作成した非公式ツールであり、Ansys の公式製品・公式サポートとは関係ありません。

## 作った理由

自分の環境では、Ansys® Fluent、Ansys SpaceClaim、Ansys Workbench を複数バージョン入れていると、「どのバージョンで開くか」を毎回きちんと制御しづらいことがありました。

手元では、バージョン選択が素直に動かず、`2025 R2` を押したのに `2025 R1` が開いてしまうことがありました。  
しかも、既定のアプリを新しいバージョンに設定していると、古い解析ファイルをうっかり新しいバージョンで開いてしまうことがあります。

この状態で何も考えず保存すると、今度は古いバージョンで開けなくなることがあります。  
実際の運用ではこれがかなり厄介で、「どのバージョンで開くか」を毎回明示的に選べる仕組みが欲しくなりました。

もちろん、Ansys 製品そのものは解析機能として非常に強力で、実務でも頼る場面が多いです。  
今回作ったのはその代替ではなく、複数バージョン運用時の起動まわりを少し安全にするための補助ツールです。

そこで作ったのが、`Fluent`、`SpaceClaim`、`Workbench` 向けのバージョン選択ツールです。

## 何をするツールか

このツールは、Windows 上で Ansys 製品の起動前にバージョンを選ぶための小さな GUI ランチャーです。

対象は次の 3 つです。

- Fluent
- SpaceClaim
- Workbench

やっていること自体はシンプルで、インストール済みの実行ファイルをバージョンごとに登録しておき、開きたいファイルに対して「どの版で起動するか」を選べるようにしています。

これにより、次のようなリスクを減らしやすくなります。

- 古い解析ファイルを新しい版で開いてしまう
- 複数バージョン環境で意図しない版が起動する
- 実行ファイルの場所を毎回手で探す

## 対応しているもの

### Fluent

対応拡張子は以下です。

- `.msh`
- `.msh.h5`
- `.cas`
- `.cas.h5`
- `.dat`
- `.dat.h5`

Fluent については、単に EXE を起動するだけではなく、読ませるファイルに応じて一時 `.jou` ファイルを生成して自動読込するようにしています。  
これは、`.msh`、`.cas`、`.dat` で読み込み手順が異なるためで、起動後に毎回手作業で読み込みコマンドを入れなくて済むようにするためです。

さらに、次のような指定にも対応しています。

- ソルバ / メッシング切り替え
- 2D / 3D
- Double Precision
- 並列数指定

![Fluent バージョン選択ツールの画面](Fluent.png)

Fluent 向けの画面では、バージョン選択に加えて、製品モード、次元、精度、並列数までまとめて指定できます。  
単に「どの版を開くか」だけでなく、起動条件までワンステップで決められるようにしました。

### SpaceClaim

対応拡張子は以下です。

- `.scdoc`
- `.step`
- `.stp`
- `.iges`
- `.igs`

こちらは比較的単純で、選択したバージョンの `SpaceClaim.exe` に対象ファイルをそのまま渡して起動します。

![SpaceClaim バージョン選択ツールの画面](SCDM.png)

SpaceClaim は起動引数が比較的単純なので、画面もかなりミニマルです。  
対応ファイルを選んで、どのバージョンで開くかを決めることに役割を絞っています。

### Workbench

対応拡張子は以下です。

- `.wbpj`

Workbench は、選択した実行ファイルに対して `-F <filepath>` を付けて起動します。

![Workbench バージョン選択ツールの画面](WB.png)

Workbench も基本はシンプルで、`.wbpj` を選び、開く版を選んで起動する構成です。  
古い案件をどの版で開くかを明示できるだけでも、うっかり事故はかなり減らせます。

## 共通インターフェース

各ランチャーは個別スクリプトですが、設定保存やバージョン管理 UI は共通化しています。  
その共通処理をまとめているのが `launcher_common.py` です。

共通化している処理の中でも特に大きいのが、設定ファイルの保存と、バージョン一覧を編集するためのダイアログです。  
その設定情報は JSON で保存します。  
保存されるのは「バージョン名」と「そのバージョンで使う実行ファイルの絶対パス」の対応です。

たとえば Fluent なら、こんなイメージです。

```json
{
  "versions": {
    "v252": "C:\\Program Files\\ANSYS Inc\\v252\\fluent\\ntbin\\win64\\fluent.exe"
  }
}
```

この形式にしておくと、人間が見ても分かりやすく、あとから手修正もしやすいです。

![バージョン設定ダイアログ](version_set.png)

設定画面では、検出したバージョンを一覧で管理できます。  
追加・更新・削除だけでなく、`上へ` / `下へ` ボタンで並び順も変更できるようにしてあり、よく使う版を上に寄せておけます。  
自動検出した結果をそのまま使うだけでなく、現場の運用に合わせて順番を整えられるようにしました。

## 実装方針

GUI は `tkinter` で作っています。  
理由は単純で、Windows 上で配ることを考えたときに依存を増やしたくなかったからです。

このツール全体の設計では、次の方針を優先しました。

- Windows 専用前提で割り切る
- 依存を増やしすぎず、配布しやすくする
- 製品ごとの違いは吸収しつつ、責務は分ける
- 自動化しすぎるより、現場で直しやすい形を優先する

たとえば GUI を `tkinter` にしたのは、見た目の派手さよりも「Python 標準に近い構成でそのまま動く」ことを優先したからです。  
複数人に配る可能性や、あとから EXE 化することも考えると、追加依存が少ない方が扱いやすいと判断しました。

また、Fluent / SpaceClaim / Workbench を全部ひとつの巨大なランチャーにまとめるのではなく、製品ごとにスクリプトを分けています。  
これは、Fluent だけ起動オプションや読み込みロジックが明らかに重く、SpaceClaim や Workbench とは責務が違うからです。

そのうえで、

- 設定保存
- バージョン管理 UI
- 旧設定の移行

のような共通部分だけを `launcher_common.py` に寄せています。  
つまり、全部を抽象化するのではなく、「同じ処理だけ共通化し、違う処理は分ける」という方針です。

バージョン検出も同じ考え方で、何でも自動判定するより、典型的なインストール先をまず確実に拾い、ダメなら手で修正できる構成にしています。  
実際の現場では、検出ロジックが賢すぎることより、意図が読めて自分で直せることの方が重要だと感じたためです。

## コード上ではどう動いているか

ランチャー本体は 3 ファイルに分かれています。

- `Fluent_Launcher_from_md.py`
- `SpaceClaim_Launcher.py`
- `Workbench_Launcher.py`

共通部分は `launcher_common.py` に寄せています。

### 共通処理: 設定保存と設定ダイアログ

設定ファイルの保存場所は `launcher_common.py` の `config_base_dir()` で決めています。

```python
def config_base_dir() -> Path:
    base = app_base_dir()
    if not getattr(sys, "frozen", False):
        return base

    appdata = os.environ.get("APPDATA")
    if appdata:
        candidate = Path(appdata) / "AnsysLaunchers"
```

`.py` として実行する場合はスクリプト配置フォルダを使い、EXE 化後は `%APPDATA%\AnsysLaunchers` を優先します。  
この分岐を入れておくことで、開発中の扱いやすさと、配布後の設定保存先の安定性を両立しています。

設定画面そのものは `BaseSettingsDialog` として共通化してあり、各ランチャーは「何をスキャンするか」だけを差し替える形です。

```python
ttk.Button(btn_frm, text="追加/更新", command=self.add_update).pack(side="left")
ttk.Button(btn_frm, text="削除", command=self.delete_item).pack(side="left", padx=(5, 0))
ttk.Button(btn_frm, text="上へ", command=lambda: self.move_item(-1)).pack(side="left", padx=(5, 0))
ttk.Button(btn_frm, text="下へ", command=lambda: self.move_item(1)).pack(side="left", padx=(5, 0))
ttk.Button(btn_frm, text="スキャン", command=self.scan_versions).pack(side="left", padx=(20, 0))
```

`move_item()` で辞書順ではなく表示順を入れ替えて保存しているので、一覧の先頭に「よく使う版」を持ってきやすくしています。

### Fluent: ファイル種別ごとにジャーナルを作る

Fluent では、どの拡張子を開くかによって起動時の処理を変えています。  
その中核が `build_journal_for_file()` です。

```python
if base_ext in [".msh", ".msh.h5"]:
    cmds.append(f"/file/read-mesh \"{p}\"")
elif base_ext in [".cas", ".cas.h5"]:
    cmds.append(f"/file/read-case \"{p}\"")
elif base_ext in [".dat", ".dat.h5"]:
    cas_candidates = [
        filepath.with_name(f"{base_root}.cas"),
        filepath.with_name(f"{base_root}.cas.h5"),
    ]
```

ここで、

- `.msh` なら `read-mesh`
- `.cas` なら `read-case`
- `.dat` なら対応する `.cas` を探してから `read-data`

という流れを組み立てています。

その後 `launch_fluent()` で一時 `.jou` を作って `-i` 付きで Fluent に渡します。

```python
with tempfile.NamedTemporaryFile(
    "w",
    delete=False,
    prefix="ansys_launcher_",
    suffix=".jou",
    encoding="utf-8",
    newline="\n",
) as tf:
    tf.write(journal_text)
    journal_path = tf.name

cmd.extend(["-i", journal_path])
```

これで、GUI からバージョンを選ぶだけで、対象ファイルに応じた読込処理まで自動で流せるようにしています。

### Fluent: 2D/3D、DP、並列数も起動引数に反映

Fluent は版選択だけではなく、起動条件も GUI から変えられるようにしています。

```python
def resolve_mode(self) -> str:
    if self.product_var.get() == "meshing":
        return "3d"
    dim = self.dim_var.get()
    dp = self.dp_var.get()
    mode = dim
    if dp:
        mode += "dp"
    return mode
```

この返り値をそのまま起動引数に使い、さらに並列数も `-t` で付けています。

```python
if n_procs > 1:
    cmd.append("-t" + str(n_procs))
```

### SpaceClaim / Workbench: できるだけ単純に起動

SpaceClaim と Workbench は、Fluent のような追加ロジックを極力持たせていません。  
必要な引数だけ渡して、あとは選んだ版で開くことに責務を絞っています。

SpaceClaim はこうです。

```python
cmd = [exe]
if filepath:
    cmd.append(filepath)
```

Workbench は `.wbpj` を `-F` 付きで渡します。

```python
cmd = [exe]
if filepath:
    cmd.extend(["-F", filepath])
```

どちらも「起動する版を間違えない」ことが主目的なので、実装もその目的に対して必要最小限にしています。

## バージョン検出の考え方

完全自動で何でも見つけるより、まずは「よくあるインストール先を確実に拾う」方針にしています。

たとえば Fluent なら、次のような典型パスを見に行きます。

```text
C:\Program Files\ANSYS Inc\v252\fluent\ntbin\win64\fluent.exe
```

SpaceClaim や Workbench も同様に、典型的なインストール先を優先してスキャンします。  
見つからない場合は、設定ダイアログから手で実行ファイルを登録できるようにしています。

このあたりは「賢すぎる自動検出」より、「現場で確実に直せること」を優先しました。

実際の検出も、かなり素直です。  
たとえば Fluent は `v***\fluent\ntbin\win64\fluent.exe` を見ています。

```python
exe = vdir / "fluent" / "ntbin" / "win64" / "fluent.exe"
if exe.exists():
    found[vdir.name] = str(exe)
```

Workbench では `RunWB2.exe` や `ansyswb.exe` を探し、SpaceClaim では `SpaceClaim.exe` や `SCDM.exe` を見ています。  
見つからないときは設定画面から手で登録できるので、多少環境差があっても逃げ道を残しています。

## Fluent だけ少しロジックが重い

3 つの中でいちばん実装が厚いのは Fluent です。

理由は、単に EXE を開くだけでは済まず、読み込むファイルの種類によって処理を変える必要があるからです。

たとえば、

- `.msh` なら `read-mesh`
- `.cas` なら `read-case`
- `.dat` なら必要に応じて対応する `.cas` を先に探してから `read-data`

というように、起動時に流すジャーナルを変えています。

親プロセス側でジャーナルをすぐ消してしまうと、Fluent 側の読み込みタイミング次第で失敗する可能性があるため、一時 `.jou` は即削除しない設計にしました。  
代わりに、48 時間以上古いランチャー由来のジャーナルを次回起動時に掃除するようにしています。

このあたりは地味ですが、実際に安定して使うには必要な処理でした。

ジャーナルを即削除しない理由もコード側で明示してあります。  
親プロセスが先に消すと Fluent 側の読込タイミングと競合する可能性があるため、`cleanup_old_journals()` で次回起動時に古いものだけ掃除する方式にしました。

## 使い方

### Python スクリプトとして使う

各スクリプトは単体で起動できます。

```powershell
py -3 .\Fluent_Launcher_from_md.py
py -3 .\SpaceClaim_Launcher.py
py -3 .\Workbench_Launcher.py
```

ファイルを引数で渡して起動することもできます。

```powershell
py -3 .\Fluent_Launcher_from_md.py D:\work\sample.cas.h5
py -3 .\SpaceClaim_Launcher.py D:\cad\part.scdoc
py -3 .\Workbench_Launcher.py D:\project\model.wbpj
```

普段はこれを既定アプリや右クリックメニューと組み合わせて使う想定です。  
ダブルクリック直後に版を選べるようにしておけば、「そのまま新しい版で開いてしまった」をかなり防げます。

### 初回起動時の流れ

初回起動時に設定ファイルがなければ、典型的なインストール先をスキャンします。  
検出に成功すれば、その結果を JSON として保存します。

以後は、

- 登録済みバージョンを選ぶ
- 必要なら設定画面で追加・修正する
- ファイルを選んで起動する

という流れです。

## EXE 化の方法

このツールは PyInstaller による単一 EXE 化を前提にしています。

通常ビルド:

```powershell
.\build_all_exe.ps1
```

クリーンビルド:

```powershell
.\build_all_exe.ps1 -Clean
```

README にあるとおり、ビルドすると次の EXE を作る構成です。

- `FluentVersionSelector.exe`
- `SpaceClaimVersionSelector.exe`
- `WorkbenchVersionSelector.exe`

PyInstaller が見つからない場合だけ `python -m pip install pyinstaller` を実行する想定なので、毎回余計なことをしない構成になっています。

EXE 化した場合は設定保存先が `%APPDATA%\AnsysLaunchers` に切り替わるので、スクリプト直実行時と設定の置き場が混ざりにくいのも利点です。

ちなみに、各ランチャーに使っているアイコン画像は生成AIで作成したものです。  
ツールの機能自体は地味ですが、配布物として見たときに判別しやすいよう、Fluent / SpaceClaim / Workbench でそれぞれ見分けがつくようにしています。

## 設定保存まわり

スクリプトを `.py` のまま使う場合は、設定 JSON をスクリプトと同じフォルダに保存します。  
一方、PyInstaller で EXE 化した場合は `%APPDATA%\AnsysLaunchers` を優先して保存します。

これにより、

- 手元で Python スクリプトとして使う
- EXE にして配布する

の両方に対応しやすくしています。

また、旧配置に JSON がある場合は新しい保存先へ移行する処理も入れています。  
こういう移行処理は地味ですが、後から置き場を変えるときに効いてきます。

## EXE 化も前提にした

このツールは自分用に始めましたが、最初から「Windows 上でそのまま置いて使える」ことも意識していました。

そのため、PyInstaller で単一 EXE にできる構成にしてあります。

ビルドすると、次のような実行ファイルを作れます。

- `FluentVersionSelector.exe`
- `SpaceClaimVersionSelector.exe`
- `WorkbenchVersionSelector.exe`

Python が入っていない環境でも扱いやすくしたかったので、ここは早めに整えました。

## 使ってみて良かった点

この手のツールは派手ではありませんが、複数バージョンを触る現場だと地味に効きます。

特に良かったのは次の点です。

- 「どのバージョンで開くか」を毎回明示できる
- 古い案件を新しい版で誤って開くリスクを下げられる
- 実行ファイルの場所を覚えなくてよい
- Fluent だけ起動オプションが複雑、という差も吸収できる

Ansys 本体の大きな機能追加ではなく、運用上の誤操作や取り違えを減らすための小さな補助ツール、という立ち位置です。

## まとめ

このツールを作ったきっかけは、自分の環境で Ansys 製品のバージョン選択が期待通りに動かず、意図しないバージョンが開くことがあったからです。  
さらに、既定アプリを新しい版にしていると、古い解析ファイルをうっかり新しい版で開いて保存してしまい、後戻りしにくくなる問題もありました。

そこで、「起動前に必ず版を選ぶ」ための小さなランチャーを自作しました。

やっていることは地味ですが、複数バージョン運用ではかなり実用的です。  
同じように、Fluent や Workbench の版違いでヒヤッとしたことがあるなら、こういうワンクッションを入れるだけでもだいぶ楽になります。

## 関連記事

- [SeleniumでChromeDriverを自動取得する方法｜バージョン不一致対策](/blog/get-chrome-driver-python/)
- [Ryzen 7600＋RTX 4070 Superの自作PC構成例｜購入価格16.3万円の実例紹介](/blog/dev-pc-build-ryzen7600-rtx4070s/)

※ Ansys、Ansys Fluent、Ansys SpaceClaim、Ansys Workbench は Ansys, Inc. またはその関連会社の商標または登録商標です。本記事は第三者による非公式な紹介です。
