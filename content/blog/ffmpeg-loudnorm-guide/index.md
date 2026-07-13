+++
title = 'ffmpeg loudnorm の使い方｜LUFS正規化と2pass設定をコマンド例で解説'
date = 2026-03-08T00:00:00+09:00
draft = false
description = 'ffmpeg の loudnorm フィルタで LUFS 正規化する方法を解説。1pass/2pass の違い、True Peak、LRA、再エンコード、メタデータ・アートワークの保持まで実例付きでまとめました。'
tags = ['ffmpeg', 'loudnorm', 'LUFS', 'MP3', '音量正規化']
categories = ['プロジェクト']
+++

## この記事でやること

`ffmpeg` の `loudnorm` フィルタを使って、音声ファイルの音量を LUFS ベースで揃える方法をまとめます。

「コマンドを貼って終わり」ではなく、次の点まで押さえます。

- `LUFS` とは何か
- `loudnorm` の主要パラメータの意味
- `1pass` と `2pass` の使い分け
- 正規化後に必要な再エンコードの考え方
- MP3 のタグやアートワークを落とさない方法

Python から ffmpeg を呼び出してまとめて処理する実装については、[音楽の音量を自動調整するツールをPythonで作る LUFS正規化開発ログ](/blog/mp3-lufs-normalizer-python/) を参照してください。

## 目次

- [前提](#前提)
- [LUFS とは](#lufs-とは)
- [まず試す：基本コマンド（1pass）](#まず試す基本コマンド1pass)
- [loudnorm の主要パラメータ](#loudnorm-の主要パラメータ)
- [1pass と 2pass の使い分け](#1pass-と-2pass-の使い分け)
- [loudnorm でイントロが大きくなる理由](#loudnorm-でイントロが大きくなる理由)
- [正規化後は再エンコードが必要](#正規化後は再エンコードが必要)
- [タグとアートワークを保持しやすくする基本設定](#タグとアートワークを保持しやすくする基本設定)
- [フィルタチェーンの考え方](#フィルタチェーンの考え方)
- [実用テンプレート](#実用テンプレート)
- [まとめ](#まとめ)
- [関連記事](#関連記事)

## 前提

- `ffmpeg` 6.x 系が利用できること（導入は [この Qiita 記事](https://qiita.com/Tadataka_Takahashi/items/9dcb0cf308db6f5dc31b) を参考に）
- 主な対象は MP3 だが、考え方は AAC / WAV / FLAC でもほぼ同じ
- コマンド例は PowerShell・bash どちらでも読み替えやすい形で記載

## LUFS とは

`LUFS（Loudness Units relative to Full Scale）` は、ITU-R BS.1770 をベースにした、人が感じる音の大きさ（ラウドネス）を表す単位です。値は通常負の数で表され、0 に近いほど音が大きいことを意味します。

なお、デジタル音声の最大振幅の基準は `0 dBFS` であり、LUFS はそれとは別の「知覚的なラウドネス」の指標です。`TP`（True Peak）の上限として `0 dBFS` を参照するのはそのためです。

プラットフォーム別の配信実務における目安は次のとおりです。厳密な規格値ではなく、実運用上よく使われる参考値です。

| プラットフォーム | 目安 LUFS |
| --- | --- |
| YouTube / Spotify | -14 LUFS 前後 |
| Podcast | -16 LUFS 前後 |
| TV 放送（EBU R 128） | -23 LUFS |

> **注記：** Spotify は再生時にラウドネス正規化を行いますが、設定によって基準値が異なる場合があります（Loud / Normal / Quiet モード）。YouTube も「-14 LUFS を目標に書き出すべき」と公式仕様として明示しているわけではありません。配信先の最新仕様は各プラットフォームの公式ドキュメントで確認してください。

{{< figure src="lufs-reference.png" alt="LUFS基準の目安。YouTube / Spotify は -14 LUFS 前後、Podcast は -16 LUFS 前後、TV放送は -23 LUFS を示すグラフ。" >}}

## まず試す：基本コマンド（1pass）

細かい説明の前に、すぐ使える形を示します。

```bash
ffmpeg -i input.mp3 \
  -map 0 -map_metadata 0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a libmp3lame -q:a 2 \
  output.mp3
```

各オプションの意味は以下のとおりです。

| オプション | 意味 |
| --- | --- |
| `-i input.mp3` | 入力ファイル |
| `-map 0` | 全ストリーム（音声・アートワークなど）を出力に引き継ぐ |
| `-map_metadata 0` | ID3 タグなどのメタデータをコピーする |
| `-c:v copy` | アルバムアートを再エンコードせずそのままコピーする |
| `-af "loudnorm=..."` | ラウドネス正規化フィルタを適用する |
| `-c:a libmp3lame` | MP3 として再エンコードする |
| `-q:a 2` | VBR 高品質（平均約 190 kbps） |

より正確に目標値へ合わせたいときは `2pass` を使います。次のセクションから順に見ていきます。

## loudnorm の主要パラメータ

`loudnorm` で押さえるべきパラメータは 5 系統です。

| パラメータ | 意味 |
| --- | --- |
| `I` | 目標 LUFS（Integrated Loudness） |
| `TP` | True Peak の上限 |
| `LRA` | Loudness Range の目標値 |
| `linear` | 線形補正を使うかどうか |
| `measured_*` | 2pass 用の測定結果を渡すパラメータ群 |

### I（目標 LUFS）

「最終的にどの LUFS へ寄せたいか」を決める中心パラメータです。用途に合わせて次の値を基準にしてください。

- `I=-14`：YouTube、Spotify
- `I=-16`：Podcast
- `I=-23`：TV など

### TP（True Peak の上限）

サンプル間ピークまで含めた実効ピーク値の上限を設定します。波形上ではクリップしていなくても、再生・変換の過程でピークが 0 dBFS を超えてノイズが発生することがあります。これを防ぐため、少し余裕を持たせるのが一般的です。

迷ったら `-1.5 dBTP` 前後から始めるのが安全です。

### LRA（Loudness Range）

曲の中の音量変動の広さを示します。値が大きいほど静かな部分と大きい部分の差が大きく、クラシックや映画音声では高くなりやすい傾向があります。

| ジャンル / 用途 | LRA の目安 |
| --- | --- |
| ポップス / ロック | 6〜10 |
| EDM / ダンス | 4〜8 |
| 一般的な音楽 | 6〜12 |
| クラシック / 映画音声 | 12〜20 |

まずは `I` と `TP` を固めることを優先し、`LRA` は素材のジャンルや用途が明確なときだけ調整するのが実務上の流れです。迷ったら `LRA=11` のままにしておいて問題ありません。

### linear

`linear=true` を指定すると、音声全体を同じ倍率で上げ下げする線形補正になります。曲の抑揚はそのままに、全体を一様にシフトするイメージです。

2pass で測定結果を渡すときによく使われます。1pass では線形補正が完全には効かない場合があります。

### measured_*

1 回目の測定で得た値を 2 回目に引き渡すためのパラメータ群です。対応関係は次のとおりです。

| measured_* | 1回目の出力値 |
| --- | --- |
| `measured_I` | `input_i` |
| `measured_TP` | `input_tp` |
| `measured_LRA` | `input_lra` |
| `measured_thresh` | `input_thresh` |
| `offset` | `target_offset` |

## 1pass と 2pass の使い分け

### 1pass

1 回の実行で解析と補正を同時に行います。シンプルで速いため、バッチ処理や手早い試行に向いています。

```bash
ffmpeg -i input.mp3 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a libmp3lame -q:a 2 \
  output.mp3
```

ただし、厳密に目標値へ合わせたい場面では 2pass よりブレが出やすくなります。

### 2pass

1 回目で測定し、その結果を 2 回目に渡して本番変換する方法です。目標ラウドネスへより安定して寄せられます。

**1 回目：測定のみ（ファイルを書き出さない）**

```bash
ffmpeg -i input.mp3 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" \
  -f null -
```

`-f null -` により出力ファイルを作らず、JSON だけを取得できます。出力から次の値を拾います。

- `input_i`
- `input_tp`
- `input_lra`
- `input_thresh`
- `target_offset`

**2 回目：測定値を渡して本番変換**

```bash
ffmpeg -i input.mp3 \
  -map 0 -map_metadata 0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I=-18.3:measured_TP=-0.7:measured_LRA=9.5:measured_thresh=-29.2:offset=-0.1" \
  -c:a libmp3lame -q:a 2 \
  output.mp3
```

ツールとして実装する場合は、測定フェーズと本番フェーズを分けて設計しておくと扱いやすくなります。

## loudnorm でイントロが大きくなる理由

`loudnorm` は**曲全体の Integrated Loudness** を見て補正量を決めます。静かなイントロだけを個別に判定しているわけではないため、次のような曲ではイントロが想定以上に持ち上がって聞こえることがあります。

- イントロだけ極端に静かで、途中から急に音圧が上がる曲
- もともとダイナミクスが広い音源

特に `linear=true` では全体を一様に上げ下げするため、サビに合わせて補正すると静かなイントロもまとめて大きくなります。`TP` はピークの上限を抑えるもので、体感音量が上がること自体は防げません。

対策として有効なのは次のとおりです。

- 1pass より 2pass でより安定した補正をかける
- 目標 LUFS を少し下げる
- 素材によっては前段の編集や別のダイナミクス処理を組み合わせる

## 正規化後は再エンコードが必要

`loudnorm` のような音声フィルタを使う場合、音声はデコード → 処理 → エンコードの流れが必要になります。ストリームコピー（`-c:a copy`）では済まないため、必ずコーデックを指定します。

```bash
-c:a libmp3lame -q:a 2
```

よく使う指定の考え方は次のとおりです。

| オプション | 説明 |
| --- | --- |
| `-c:a libmp3lame` | MP3 として再エンコードする |
| `-q:a 2` | VBR 品質指定。数値が低いほど高音質（0〜9） |
| `-b:a 192k` | CBR や ABR でビットレートを明示したいときに使う |

音質とサイズのバランスを取りたいなら、まずは `-q:a 2` か `-q:a 3` から始めるのが実用的です。

## タグとアートワークを保持しやすくする基本設定

MP3 には音声以外にも、メタデータ（ID3 タグ）とアルバムアート（画像ストリーム）が含まれています。オプションを省略すると「音は出るがジャケットが消えた」「タグが落ちた」という事故が起きやすくなります。

```bash
-map 0 -map_metadata 0 -c:v copy
```

| オプション | 意味 |
| --- | --- |
| `-map 0` | 入力の全ストリームを対象にする |
| `-map_metadata 0` | メタデータを入力からコピーする |
| `-c:v copy` | 画像ストリームを再エンコードせずコピーする |

MP3 の埋め込みジャケットは内部的に画像ストリームとして扱われます。音声だけを明示して出力すると、画像ストリームがマッピング対象から外れて消えます。アートワークを保持したいなら、この 3 つをセットで指定するのが基本です。

ただし、独自の ID3 フレームや埋め込み歌詞など、入力ファイルの構造によってはこの設定だけでは完全に保持されないケースもあります。変換後にタグの欠損が気になる場合は `id3v2` や `eyeD3` などの専用ツールで確認・修正するのが安全です。

## フィルタチェーンの考え方

`-af` を使うと、複数のフィルタをカンマでつないで順番に適用できます。

```bash
ffmpeg -i input.mp3 \
  -af "afftdn,agate,loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a libmp3lame -q:a 2 \
  output.mp3
```

よく使われるフィルタの役割は次のとおりです。

| フィルタ | 用途 |
| --- | --- |
| `loudnorm` | ラウドネス正規化 |
| `afftdn` | ノイズ除去 |
| `agate` | ノイズゲート |

ただし、ノイズ除去やゲートは素材によって効きすぎることがあります。まずは `loudnorm` 単独で正規化を安定させてから、必要であれば前処理を足すほうが安全です。

## 実用テンプレート

### まず試す：1pass

```bash
ffmpeg -i input.mp3 \
  -map 0 -map_metadata 0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a libmp3lame -q:a 2 \
  output.mp3
```

### 精度を上げる：2pass

**1 回目（測定）**

```bash
ffmpeg -hide_banner -i input.mp3 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" \
  -f null -
```

**2 回目（本番変換）**

```bash
ffmpeg -i input.mp3 \
  -map 0 -map_metadata 0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I=...:measured_TP=...:measured_LRA=...:measured_thresh=...:offset=..." \
  -c:a libmp3lame -q:a 2 \
  output.mp3
```

`...` の部分に 1 回目の JSON から拾った値を入れます。

## まとめ

| ポイント | 内容 |
| --- | --- |
| 目標値の決め方 | まず `I` を決め、`TP=-1.5`、`LRA=11` を基準に調整 |
| 1pass vs 2pass | 手軽さなら 1pass、精度重視なら 2pass |
| 再エンコード | フィルタ使用時は `-c:a libmp3lame -q:a 2` が必須 |
| タグ・アートワーク保持 | `-map 0 -map_metadata 0 -c:v copy` をセットで指定 |
| ツール化するなら | 測定フェーズ（`-f null -`）と本番フェーズを分けて設計 |

Python からまとめて処理したい場合や、CLI で自動化したい場合は [音楽の音量を自動調整するツールをPythonで作る LUFS正規化開発ログ](/blog/mp3-lufs-normalizer-python/) を参照してください。

## 関連記事

- [Pythonとffmpegで音量自動調整ツールを作る｜LUFS正規化の開発ログ](/blog/mp3-lufs-normalizer-python/)
- [Ryzen 7600＋RTX 4070 Superの自作PC構成例｜購入価格16.3万円の実例紹介](/blog/dev-pc-build-ryzen7600-rtx4070s/)
