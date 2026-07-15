+++
title = 'Easy-Switch対応マウスをUbuntuとWindowsで切り替える｜Bluetooth自動再接続のラグを解消する方法'
date = 2026-07-16T00:00:00+09:00
draft = false
description = 'Easy-Switch対応のロジクールマウス（MX ERGO Sなど）を、Windows は Logi Bolt、Ubuntu は Bluetooth で接続し、切り替えボタンを押した瞬間にラグなく繋がるようにする方法をまとめました。BlueZの自動再接続が不安定になる原因と、systemdユーザーサービスによる解決手順を解説します。'
tags = ['Ubuntu', 'Bluetooth', 'Easy-Switch', 'BlueZ', 'Logicool']
categories = ['プロジェクト']
+++

## この記事でやること

Easy-Switch対応のロジクールマウス（今回は `MX ERGO S`）を Windows と Ubuntu の 2 台で共有し、本体の切り替えボタンで行き来する構成をまとめます。Windows は Logi Bolt レシーバー、Ubuntu は Bluetooth接続という組み合わせです。目指したのは、**切り替えた瞬間にラグなく繋がること**でした。ところが Ubuntu 側だけ、切り替え後になかなか繋がらない・繋がるまで 5 秒ほどかかる、という症状が出ていました。この記事はその原因と解決方法についてです。

MX ERGO S 固有の話ではなく、Easy-Switch でマウスやキーボードを複数台の PC 間で切り替えて使っている人であれば、同じ症状に心当たりがあるはずです。

自分自身の備忘録も兼ねて、試行錯誤の過程も含めて残しておきます。

## 結論だけ読みたい人はこちら

具体的な設定手順は「[最終的な解決方法](#最終的な解決方法)」の章にまとめています。急ぎの人はそこまで飛んでください。

## 目次

- [やりたいこと](#やりたいこと)
- [使用環境](#使用環境)
- [なぜBluetooth接続を選んだか](#なぜbluetooth接続を選んだか)
- [発生していた問題](#発生していた問題)
- [原因の切り分け](#原因の切り分け)
- [効果が不十分だった対処](#効果が不十分だった対処)
- [最終的な解決方法](#最終的な解決方法)
- [まとめ](#まとめ)

## やりたいこと

前提として実現したかったことは次のとおりです。

- Windows は Logi Bolt レシーバーで接続する
- Ubuntu は Bluetooth で接続する
- Easy-Switch ボタンで 2 台の PC を切り替える
- **切り替えた瞬間にラグなく、Ubuntu 側も自動で繋がるようにする**
- 追加の Logi Bolt レシーバーは買わず、今ある機器だけで実現する

ゴールは「安定して繋がる」ではなく、あくまで「切り替えたら即座に繋がる」ことです。

## 使用環境

| 項目 | 内容 |
| --- | --- |
| OS | Ubuntu 24.04 |
| Bluetooth 管理 | BlueZ（`5.72-0ubuntu5.5`） |
| マウス | Logicool MX ERGO S（Easy-Switch対応） |
| Ubuntu 側接続 | Bluetooth |
| Windows 側接続 | Logi Bolt |
| Ubuntu 側アドレス | `XX:XX:XX:XX:XX:3A` |

ペアリング自体は問題なく完了しており、登録状態は次のとおりでした。

```text
Paired: yes
Bonded: yes
Trusted: yes
Blocked: no
```

信頼設定まで含めて登録状態は正常で、「ペアリングが壊れている」わけではないことが出発点になります。

## なぜBluetooth接続を選んだか

Windows 側は Logi Bolt レシーバーで接続していますが、Ubuntu 側も同じようにレシーバーで二重化する、という選択肢は取りませんでした。

理由は、ロジクールの無線レシーバーには `Unifying`（旧世代の規格）と `Logi Bolt`（後継の新しい規格）があり、この2つには互換性がないためです。Unifying 対応の製品は Logi Bolt レシーバーに接続できず、その逆もできません。近年発売されるロジクールの新しいマウス・キーボードは Logi Bolt 対応へ順次切り替わっており、手元に古い Unifying レシーバーがあっても、そのままでは新しいマウスに転用できないケースが増えています。

つまり「昔のドングルが物理的に壊れた」というよりも、**マウス側の無線規格が新しくなったことで、手持ちの旧世代レシーバーが使えなくなった**という互換性の問題です。この影響で Windows 用に確保できる Logi Bolt レシーバーは 1 つだけとなり、Ubuntu 側は追加レシーバーを買わずに Bluetooth で対応する、という構成にしました。

なお、Logi Bolt レシーバーは単体でも販売されています。台数分を追加購入できる環境であれば、両方の PC を Logi Bolt レシーバーで統一するのが最も手っ取り早い解決策です。

- 型番：`LBUSB1`（USB-A）／ `LBUSBC`（USB-C）
- Amazon.co.jp 商品ページ：https://www.amazon.co.jp/dp/B09HSZKXNY

価格は変動するため、正確な実売価格は上記リンク先で確認してください。予算に余裕があるなら、この記事以降の Bluetooth まわりの調整はすべて不要になります。

## 発生していた問題

Windows から Ubuntu へ Easy-Switch で切り替えたとき、再接続の挙動が安定しませんでした。症状は次のとおりです。

- すぐ再接続されることもある
- 約 5 秒かかることもある
- 待っても再接続されないことがある
- 手動で接続すればつながる
- `bluetoothctl scan on` を実行するとつながることがある

さらに、`bluetoothctl connect` を連続実行すると次のエラーが出ました。

```text
Failed to connect: org.bluez.Error.Failed
Operation already in progress
```

もう 1 つの落とし穴として、以前メモしていた Bluetooth アドレスが古いままでした。実際に Ubuntu 側でペアリングされていたのは末尾 `3A` のアドレスで、末尾 `39` は過去のものです。

```text
古いアドレス： XX:XX:XX:XX:XX:39
現在のアドレス： XX:XX:XX:XX:XX:3A
```

## 原因の切り分け

「本体が壊れているのか」「Ubuntu 側の処理の問題なのか」を切り分けるため、順番に確認していきました。

### BlueZ のバージョンは最新だった

まずパッケージの更新不足を疑い、バージョンを確認しました。

```bash
apt policy bluez
```

```text
インストールされているバージョン: 5.72-0ubuntu5.5
候補: 5.72-0ubuntu5.5
```

Ubuntu 24.04 の更新済みバージョンで、単純な更新不足ではありませんでした。

### ペアリング状態は正常だった

次にデバイス情報を確認しました。

```bash
bluetoothctl info XX:XX:XX:XX:XX:3A
```

```text
Paired: yes
Bonded: yes
Trusted: yes
Connected: no
```

ペアリング情報や信頼設定に問題はなく、`Connected: no` になっているだけの状態です。

### 手動接続では必ずつながる

手動での接続を試すと、問題なく接続できました。

```bash
bluetoothctl connect XX:XX:XX:XX:XX:3A
```

つまりマウス本体やペアリング情報が壊れているのではなく、**Ubuntu 側の自動再接続処理**に問題があると判断できます。

### スキャンを回すと接続される

`bluetoothctl` 内でスキャンを開始すると、直後に自動接続されました。

```text
power on
scan on
```

```text
Connected: yes
ServicesResolved: yes
```

このことから、Ubuntu が MX ERGO S を**検出できたときには正常に接続できる**とわかります。裏を返すと、検出のきっかけがないと未接続のまま放置される、というのが問題の核心です。

なお、スキャン中に次の表示が出ることもありましたが、これは「すでにスキャン中」という意味で、異常ではありません。

```text
Failed to start discovery: org.bluez.Error.InProgress
```

## 効果が不十分だった対処

解決までに試した中で、単独では不十分だったものを整理します。

| 試したこと | 結果 |
| --- | --- |
| BlueZ の更新 | すでに最新で、更新では解決しなかった |
| `ScanIntervalAutoConnect` の短縮 | 多少改善するが、再接続のばらつきや未接続は残った |
| 常時 `scan on` のみ | 検出はできても接続されないことがあった |
| 古い Bluetooth アドレスへ接続 | 別アドレスのため `not available` エラー |
| `connect` の連続実行 | `Operation already in progress` エラー |

### スキャン間隔の調整だけでは直らない

`/etc/bluetooth/main.conf` の `[LE]` セクションにスキャン間隔を追加する案を試しました。

```ini
[LE]
ScanIntervalAutoConnect=16
ScanWindowAutoConnect=16
```

`16` は BlueZ LE の単位で 0.625 ミリ秒刻みのため、約 10 ミリ秒に相当します。ただしこれだけでは自動接続は安定せず、時間がかかる・つながらないケースが残りました。原因は間隔ではなく、**検出後に BlueZ が自動接続を実行しないことがある**点でした。

### スキャンと接続は別処理

常時スキャン用のサービスを作っても、検出するだけで接続されない場合がありました。`scan on` はあくまで「見つける」処理であり、「つなぐ」処理とは別です。ここを分けて考えることが解決の鍵になります。

### アドレス違いと連続実行のエラー

古いアドレス末尾 `39` へ接続しようとすると、当然ながら次のエラーになります。

```text
Device XX:XX:XX:XX:XX:39 not available
```

また、接続処理が終わる前に `connect` を重ねて実行すると `Operation already in progress` が出ます。後述のスクリプトでは、この対策として `timeout 5` を使い、接続処理が長時間残らないようにしています。

## 最終的な解決方法

方針は「常時スキャンで検出のきっかけを作りつつ、未接続なら明示的に `connect` を叩く」ことです。これを Ubuntu ログイン中に動き続ける systemd ユーザーサービスとして常駐させます。

### 1. 接続スクリプトを用意する

`~/.local/bin/mx-ergo-connect.sh` として次のスクリプトを保存します（MX ERGO S 以外のマウスでも、アドレスを置き換えれば同じ考え方で使えます）。

```bash
#!/bin/bash

DEVICE="XX:XX:XX:XX:XX:3A"  # ご自身の環境の Bluetooth アドレスに置き換えてください

bluetoothctl power on >/dev/null 2>&1
bluetoothctl scan on >/dev/null 2>&1

while true; do
    if ! bluetoothctl info "$DEVICE" 2>/dev/null | grep -q "Connected: yes"; then
        timeout 5 bluetoothctl connect "$DEVICE" >/dev/null 2>&1 || true
    fi

    sleep 1
done
```

実行権限を付けておきます。

```bash
chmod +x ~/.local/bin/mx-ergo-connect.sh
```

このスクリプトがやっていることは次の 5 ステップです。

1. Bluetooth を有効化し、スキャンを開始する
2. 1 秒ごとに MX ERGO S の接続状態を確認する
3. 未接続なら明示的に `bluetoothctl connect` を実行する
4. 接続処理が固まった場合は 5 秒で打ち切る
5. 再度接続を試行する

### 2. ユーザーサービスとして登録する

`~/.config/systemd/user/mx-ergo-scan.service` を作成します。

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

作成したら有効化します。

```bash
systemctl --user daemon-reload
systemctl --user enable --now mx-ergo-scan.service
```

状態を確認して `active (running)` になっていれば動作中です。

```bash
systemctl --user status mx-ergo-scan.service
```

```text
Active: active (running)
```

### 動作の流れ

まとめると、Ubuntu 側では常に次のループが回っている状態になります。

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

これにより BlueZ 標準の不安定な自動再接続に頼らず、MX ERGO S へ明示的に接続要求を出し続けられます。この構成にしてから、Windows から Ubuntu への切り替え時の再接続がほぼ即座になり、体感としては「切り替えた瞬間に繋がる」と言えるレベルになりました。

正確に言うと、仕組み上は 1 秒間隔のポーリングなので理論上のラグはゼロではありません。ただし実用上気になる遅延ではなく、以前の「5 秒かかる」「待っても繋がらない」という状態からは大きく改善しています。ポーリング間隔をさらに短くすれば理論上はより速くなりますが、CPU 負荷とのトレードオフになるため、まずは 1 秒間隔での運用をおすすめします。

現在の最終構成は次のとおりです。

| PC | 接続方法 | 補足 |
| --- | --- | --- |
| Windows | Logi Bolt | レシーバー接続 |
| Ubuntu | Bluetooth | 常時スキャン＋自動 connect サービスで補完 |

## まとめ

| ポイント | 内容 |
| --- | --- |
| 目指したゴール | 「安定接続」ではなく「切り替えた瞬間にラグなく繋がる」こと |
| 問題の本質 | ペアリングではなく、Ubuntu 側の自動再接続が不安定 |
| 切り分けの結論 | 検出できれば接続は成功する＝検出のきっかけ不足 |
| スキャンと接続 | `scan on` は「見つける」だけ。`connect` は別処理 |
| 有効な対処 | 常時スキャン＋未接続時に `connect` を明示実行 |
| 常駐方法 | systemd ユーザーサービスでログイン中に動かし続ける |
| 連続実行対策 | `timeout 5` で接続処理を長時間残さない |
| アドレス注意 | 現在ペアリング中のアドレス（末尾 `3A`）を使う |
| レシーバーの事情 | Logi Bolt と Unifying は非互換。新しいマウスはLogi Bolt移行が進んでいる |
| もっと手っ取り早い方法 | 予算があれば Logi Bolt レシーバーを追加購入して両PCとも統一するのが最速 |

追加のレシーバーを買わずとも、Ubuntu 側の自動接続をスクリプトで補うことで、Easy-Switch による切り替えをほぼラグなく運用できます。MX ERGO S に限らず、Easy-Switch対応のロジクール製マウス・キーボード全般で同じ考え方が応用できるはずです。
