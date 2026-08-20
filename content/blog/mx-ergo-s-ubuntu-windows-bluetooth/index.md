+++
title = 'Easy-Switch対応マウスをUbuntuとWindowsで切り替える｜Bluetooth自動再接続のラグを解消する方法'
date = 2026-07-15T20:00:00+09:00
draft = false
description = 'Easy-Switch対応のロジクールマウス（MX ERGO Sなど）を、Windows は Logi Bolt、Ubuntu は Bluetooth で接続し、切り替えボタンを押した瞬間にラグなく繋がるようにする方法を調査した。BlueZの自動再接続が不安定になる原因と、systemdユーザーサービスによる解決手順を解説する。'
tags = ['Ubuntu', 'Bluetooth', 'Easy-Switch', 'BlueZ', 'Logicool']
categories = ['プロジェクト']
+++

## この記事でやること

Easy-Switch対応のロジクールマウス（今回は `MX ERGO S`）を Windows と Ubuntu の 2 台で共有し、本体の切り替えボタンで行き来する構成をまとめる。  
Windows は Logi Bolt レシーバー、Ubuntu は Bluetooth接続とする。  
目指したのは、**切り替えた瞬間にラグなく繋がること**。  
ところが Ubuntu 側だけ、切り替え後になかなか繋がらない・繋がるまで 5 秒ほどかかる、という症状が出ていた。この記事ではその原因と解決方法を扱う。

MX ERGO S 固有の話ではなく、Easy-Switch でマウスやキーボードを複数台の PC 間で切り替えて使っている人であれば、同じ症状に心当たりがあるかもしれない。  

自分自身の備忘録も兼ねて、試行錯誤の過程も含めて残す。

## 結論だけ読みたい人はこちら

「[最終的な解決方法](#最終的な解決方法)」

## 目次

- [やりたいこと](#やりたいこと)
- [使用環境](#使用環境)
- [なぜBluetooth接続を選んだか](#なぜbluetooth接続を選んだか)
- [発生していた問題](#発生していた問題)
- [原因の切り分け](#原因の切り分け)
- [効果が不十分だった対処](#効果が不十分だった対処)
- [最終的な解決方法](#最終的な解決方法)
- [さいごに](#さいごに)

## やりたいこと

前提として実現したかったことは次のとおりだ。

- Windows は Logi Bolt レシーバーで接続する
- Ubuntu は Bluetooth で接続する
- Easy-Switch ボタンで 2 台の PC を切り替える
- **切り替えた瞬間にラグなく、Ubuntu 側も自動で繋がるようにする**
- 追加の Logi Bolt レシーバーは買わず、今ある機器だけで実現する


## 使用環境

| 項目 | 内容 |
| --- | --- |
| OS | Ubuntu 24.04, Windows11 pro | 
| Bluetooth 管理 | BlueZ |
| マウス | Logicool MX ERGO S |
| Ubuntu 側接続 | Bluetooth |
| Windows 側接続 | Logi Bolt |

ペアリング自体は問題なく完了している。

## なぜBluetooth接続を選んだか

Windows 側は Logi Bolt レシーバーで接続しているが、Ubuntu 側も同じようにLogi Boltレシーバーで接続すればこんな面倒なことをする必要はない。

しかし、手元には1台のレシーバーしかないのだ。

というのも、ロジクールの無線レシーバーには `Unifying`（従来の規格）と `Logi Bolt`（後継の新しめ規格）があり、この2つには互換性がない。  
Unifying 対応の製品は Logi Bolt レシーバーに接続できず、その逆もできない。  
近年発売されるロジクールの新しいマウス・キーボードは Logi Bolt 対応へ順次切り替わっている。  
だからUnifying レシーバーは捨てるほどあるのだが、今回は使えない。  
したがって、Ubuntu 側はLogi BoltレシーバーではなくBluetooth接続にする。

なお、Logi Bolt レシーバーは単体でも1200円前後で販売されている(2026年6月確認時点)。  
価格は変動するため、正確な実売価格は下記リンク先で確認してほしい。

- 型番：`LBUSB1`（USB-A）／ `LBUSBC`（USB-C）
- Amazon.co.jp 商品ページ：(https://www.amazon.co.jp/dp/B09HSZKXNY)

価格は変動するため、正確な実売価格は上記リンク先で確認してほしい。

1200円なんてお金じゃないよ と思う方は、Logi Bolt レシーバーを追加購入することを強くおすすめしたい。

## 発生していた問題

Windows から Ubuntu へ Easy-Switch で切り替えたとき、再接続の挙動が安定しなかった。症状は次のとおりだ。

- Ubuntuへ接続が切り替わらない
- 手動で接続すればつながる
- すぐ再接続されることもある
- `bluetoothctl scan on` を実行するとつながることがある

さらに、`bluetoothctl connect` を連続実行すると次のエラーが出た。

```text
Failed to connect: org.bluez.Error.Failed
Operation already in progress
```


## 原因の切り分け

「本体が壊れているのか」「Ubuntu 側の処理の問題なのか」を切り分けるため、順番に確認した。

### BlueZ のバージョンは最新だった

まずパッケージの更新不足を疑い、バージョンを確認した。

```bash
apt policy bluez
```

```text
インストールされているバージョン: 5.72-0ubuntu5.5
候補: 5.72-0ubuntu5.5
```

Ubuntu 24.04 の更新済みバージョンで、単純な更新不足ではなかった。

### ペアリング状態は正常だった

次にデバイス情報を確認した。

```bash
bluetoothctl info XX:XX:XX:XX:XX:3A
```

```text
Paired: yes
Bonded: yes
Trusted: yes
Connected: no
```

ペアリング情報や信頼設定に問題はなく、`Connected: no` になっているだけの状態だ。

### 手動接続では必ずつながる

手動での接続を試すと、問題なく接続できた。

```bash
bluetoothctl connect XX:XX:XX:XX:XX:3A
```

つまりマウス本体やペアリング情報が壊れているのではなく、**Ubuntu 側の自動再接続処理**に問題があると判断できる。

### スキャンを回すと接続される

`bluetoothctl` 内でスキャンを開始すると、直後に自動接続された。

```text
power on
scan on
```

```text
Connected: yes
ServicesResolved: yes
```

このことから、Ubuntu が MX ERGO S を**検出できたときには正常に接続できる**とわかる。裏を返すと、検出のきっかけがないと未接続のまま放置される、という仮説がたつ。

なお、スキャン中に次の表示が出ることもあったが、これは「すでにスキャン中」という意味で、異常ではない。

```text
Failed to start discovery: org.bluez.Error.InProgress
```

### 常時スキャンさせても接続されないことが多かった

上の仮説どおりなら、常にスキャンを回しておけば検出のきっかけが途切れず、放置されることもなくなるはずだ。そこで次のコマンドでスキャンを回しっぱなしにしてみた。

```bash
exec bluetoothctl --timeout 0 scan on
```

ところが結果は期待どおりにならず、**検出はできていても接続されないことが多かった**。また、スキャン間隔を調整してもうまく行かなかった。
つまり「検出のきっかけがない」ことだけが原因ではなく、検出後に接続へ進む処理の側にも問題があるとわかる。スキャンを回すだけでは解決にならない。

## 効果が不十分だったこれまでのまとめ

解決までに試した中で、単独では不十分だったものを整理する。

| 試したこと | 結果 |
| --- | --- |
| BlueZ の更新 | すでに最新で、更新では解決しなかった |
| `ScanIntervalAutoConnect` の短縮 | 多少改善するが、再接続のばらつきや未接続は残った |
| 常時 `scan on` のみ | 検出はできても接続されないことが多かった |
| `connect` の連続実行 | `Operation already in progress` エラー |

## 最終的な解決方法

方針は「常時スキャンで検出のきっかけを作りつつ、未接続なら明示的に `connect` を叩く」ことだ。これを Ubuntu ログイン中に動き続ける systemd ユーザーサービスとして常駐させる。

### 1. 接続スクリプトを用意する

`~/.local/bin/mx-ergo-connect.sh` として次のスクリプトを保存する（MX ERGO S 以外のマウスでも、アドレスを置き換えれば同じ考え方で使える）。

```bash
#!/bin/bash

DEVICE="XX:XX:XX:XX:XX:3A"  # 使用環境の Bluetooth アドレスに置き換える

bluetoothctl power on >/dev/null 2>&1
bluetoothctl scan on >/dev/null 2>&1

while true; do
    if ! bluetoothctl info "$DEVICE" 2>/dev/null | grep -q "Connected: yes"; then
        timeout 5 bluetoothctl connect "$DEVICE" >/dev/null 2>&1 || true
    fi

    sleep 1
done
```

実行権限を付ける。

```bash
chmod +x ~/.local/bin/mx-ergo-connect.sh
```

このスクリプトが行う処理は次の 5 ステップだ。

1. Bluetooth を有効化し、スキャンを開始する
2. 1 秒ごとに MX ERGO S の接続状態を確認する
3. 未接続なら明示的に `bluetoothctl connect` を実行する
4. 接続処理が固まった場合は 5 秒で打ち切る
5. 再度接続を試行する

### 2. ユーザーサービスとして登録する

`~/.config/systemd/user/mx-ergo-scan.service` を作成する。

```ini
[Unit]
Description=MX ERGO S auto-connect
After=bluetooth.target

[Service]
ExecStart=%h/.local/bin/mx-ergo-connect.sh
Restart=always

[Install]
WantedBy=default.target
```

作成したら有効化する。

```bash
systemctl --user daemon-reload
systemctl --user enable --now mx-ergo-scan.service
```

状態を確認して `active (running)` になっていれば動作中だ。

```bash
systemctl --user status mx-ergo-scan.service
```

```text
Active: active (running)
```

### 動作の流れ

まとめると、Ubuntu 側では常に次のループが回っている状態となる。

```text
Bluetoothスキャンを継続
        ↓
接続状態を1秒ごとに確認
        ↓
未接続なら bluetoothctl connect を実行
        ↓
固まった場合は5秒で打ち切り
        ↓
再試行
```

これにより BlueZ 標準の不安定な自動再接続に頼らず、MX ERGO S へ明示的に接続要求を出し続けられる。  
この構成にしてから、Windows から Ubuntu への切り替え時の再接続がほぼ即座になり、体感としては「切り替えた瞬間に繋がる」と言えるレベルになった。

正確に言うと、仕組み上は 1 秒間隔のポーリングなので理論上のラグはゼロではない。  
ただし実用上気になる遅延ではなく、以前の「5 秒かかる」「待っても繋がらない」という状態からは大きく改善している。  
ポーリング間隔をさらに短くすれば理論上はより速くなるが、CPU 負荷とのトレードオフになるため、まずは 1 秒間隔での運用を勧める。

### この方法の副作用

対症療法である以上、代償はある。把握したうえで使ってほしい。

- 無線が混む  
スキャンを回し続けるということは、2.4GHz 帯にプローブを撒き続けるということだ。  
同じ帯域を使う Wi-Fi や、他の Bluetooth 機器と干渉する。特にイヤホンやヘッドセットを併用していると、音が途切れる・遅延が増えるといった形で表面化しやすい。

- 電力を食う  
Bluetooth アダプタがアイドルに落ちなくなるため、ノート PC ではバッテリーの持ちが目に見えて悪くなることがある。  
据え置き機なら気にならない程度だが、モバイル用途では無視できない。

- 他の Bluetooth 操作と競合する  
ディスカバリを占有するので、新しい機器をペアリングしようとしたときや、GNOME の設定パネルを開いたときに `org.bluez.Error.InProgress` や `Operation already in progress` が出る。  
ペアリング作業のときは、いったんサービスを止める必要がある。

- 切りたいときに切れない  
未接続を見つけたら接続しにいく仕組みなので、意図的に切断しても即座に繋ぎ直される。  
MX ERGO S は接続先を切り替えられるが、切り替えた先で使っている間も Ubuntu 側は接続を試み続けることになる。

それでも、BlueZ の設定値をいじる範囲でできることは試し尽くしたうえで残った手段がこれだった。  
副作用に我慢できないのであれば、Logi Bolt レシーバーを買って USB 接続に切り替えるのが確実だ。

## さいごに

皆様のQOESLが向上することを切に願う。

## 関連記事

- [Ryzen 5 7600＋RTX 4070 Superの自作PC構成例｜16.3万円の開発・AI実験向け実例](/blog/dev-pc-build-ryzen7600-rtx4070s/)
