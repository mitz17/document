+++
title = 'MP3の音量がバラバラな問題、ffmpegで一発解決｜Python製ツールの使い方と仕組み'
date = 2026-03-02T00:00:00+09:00
lastmod = 2026-03-18T00:00:00+09:00
draft = false
description = 'MP3の音量バラつきを ffmpeg の loudnorm フィルタで一括正規化。Python 製 GUI／CLI ツール「mp3-normalizer」の使い方・セットアップ・実装ポイントを丸ごと解説します。'
tags = ['Python', 'ffmpeg', 'LUFS', 'MP3', '音声処理', '音量正規化']
categories = ['プロジェクト']
slug = 'mp3-normalizer-devlog'
aliases = ['/blog/mp3-lufs-normalizer-python/']
+++

GitHub: [mitz17/mp3-normalizer](https://github.com/mitz17/mp3-normalizer)

## MP3の音量がバラバラで困っていませんか？

昔作った MP3 を久しぶりに再生したら「あれ、音ちいさくない？」と感じたことはありませんか。ファイル自体は壊れていないのに、曲ごとに音量がまちまちで、再生のたびにボリュームを手動調整している──そんな悩みを **ffmpeg の `loudnorm` フィルタ** と **Python 製ツール「mp3-normalizer」** で丸ごと解決します。

このツールでできることを先にまとめます。

- フォルダ内の MP3 を **まとめて -14 LUFS に正規化**（業界標準値）
- **GUI でも CLI でも** 同じエンジンで処理できる
- ID3 タグ・歌詞・アートワークを保ったまま再エンコード
- 処理済み履歴を JSON で管理し、**二重処理・上書きを自動防止**

---

## ffmpeg の `loudnorm` とは？

`loudnorm` は ffmpeg に組み込まれた音量正規化フィルタです。波形のピーク値ではなく **LUFS（Loudness Units Full Scale）** という人間の聴感に近い指標を基準にするため、曲ごとの「うるさい・静かすぎる」問題を自然に解消できます。

パラメータや 1pass / 2pass の仕組みを先に把握したい場合は、[ffmpeg loudnorm 完全解説：LUFS正規化と2passノーマライズの仕組み](/blog/ffmpeg-loudnorm-guide/)にまとめています。

---

## 対象読者・前提環境

- 古い MP3 アーカイブを大切にしていて、**音量だけさっと手直ししたい**人
- `ffmpeg` のコマンドを覚えていないけど、まとめて処理したい人
- Python が書ける人で、実装の中身まで確認したい人

動作には **Python 3.11 以上** と **ffmpeg 6.x** が必要です。ffmpeg の導入は [この Qiita 記事](https://qiita.com/Tadataka_Takahashi/items/9dcb0cf308db6f5dc31b) を OS ごとに手順をたどれば OK です。正規化したい `.mp3` はフォルダにまとめておいてください（WAV など他形式は事前に変換するか、後述の拡張子設定で対応できます）。

---

## セットアップ

```bash
# 1. リポジトリを取得
git clone https://github.com/mitz17/mp3-normalizer

# 2. 仮想環境を作成・有効化
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1

# 3. 依存パッケージをインストール
pip install -r requirements.txt

# 4. 起動
python main.py                   # GUI モード
python main.py --cli ...         # CLI バッチ処理
```

---

## 使い方：GUI 編

1. **入力・出力ディレクトリを指定**すると、対象 MP3 がリストに表示されます。
2. **LUFS と True Peak を入力**。迷ったらデフォルト（-14 LUFS / -1 dBFS）のままで OK。
3. **再帰チェック**（サブフォルダを含むか）や**強制再エンコード**のトグルで挙動を調整。
4. 「**実行**」を押すと進捗ログがリアルタイムで流れ、完了後に結果を確認できます。

<p><img src="/images/mp3-normalizer-gui.png" alt="mp3-normalizer GUI" loading="lazy" style="border-radius:16px; box-shadow:0 8px 24px rgba(15,23,42,0.18);"></p>

> 入力/出力パス・ターゲット LUFS・対象ファイル一覧・ログを 1 画面で確認できます。

---

## 使い方：CLI 編

GUI なしでバッチ処理したいときはこちら。スクリプトやタスクスケジューラと組み合わせやすいです。

```bash
# 基本（入力・出力ディレクトリを指定）
python main.py --cli --input ./music_in --output ./music_out

# LUFS と True Peak を変更する場合
python main.py --cli --input ./music_in --output ./music_out --lufs -16 --tp -1.5

# 並列数を指定（デフォルトは CPU コア数）
python main.py --cli --input ./music_in --output ./music_out --workers 4

# 対象拡張子と出力形式を変更
python main.py --cli --input ./music_in --output ./music_out --ext flac --format aac
```

処理結果は `mp3_normalizer.log` に記録され、実行した ffmpeg コマンドごとの LUFS 値も残ります。

---

## 実装のポイント

### アーキテクチャ概要

```
main.py
├── gui.py        ─ Tkinter + ttk。別スレッドで ffmpeg を呼び出し UI フリーズを回避
├── processor.py  ─ GUI / CLI 共通エンジン。ファイル走査・重複回避・正規化を担当
└── utils.py      ─ パス生成・ログ整形などの汎用ユーティリティ
```

処理済みファイルは `processed_history.json` にサイズ・更新日時で記録され、再実行時に自動スキップされます。デフォルト（`force=False`）では既存ファイルへの上書きも行いません。

### ファイル走査と重複回避

`processor.py` の `AudioProcessor.process_directory` では、入力ディレクトリを走査して処理計画を立て、衝突しそうなファイル名に `_1`, `_2` のサフィックスを付加します（[GitHub の該当コード](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L180-L232)）。

```python
for index, entry in enumerate(plan.entries, start=1):
    destination = output_dir / entry.relative
    ensure_directory(destination.parent)
    destination = destination.with_suffix(".mp3")
    destination = generate_unique_output_path(destination)
    ...
    result = self.executor.normalize(
        input_file=entry.source,
        destination=destination,
        target_lufs=target_lufs,
        true_peak=true_peak,
    )
    results.append(result)
    if result.success:
        self.history_service.mark_processed(entry.relative, entry.size, entry.mtime)

self.history_service.save()
```

### ffmpeg コマンドの組み立て

実際に ffmpeg を叩くのは `FfmpegExecutor.normalize`（[コードはこちら](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L63-L111)）。コマンド全体をログに残すため、GUI からでも「裏で何をしているか」が一目でわかります。

```python
command = [
    self.ffmpeg_cmd, "-hide_banner", "-y",
    "-i", str(input_file),
    "-af", f"loudnorm=I={target_lufs}:TP={true_peak}:LRA=11",
    "-c:a", "libmp3lame", "-q:a", "2",
    "-map_metadata", "0",
    str(destination),
]
command_str = format_command(command)
self.logger.info("ffmpeg コマンド: %s", command_str)
completed = subprocess.run(command, check=False, capture_output=True, text=True)
```

`-map_metadata 0` で ID3 タグをそのまま引き継ぎ、mutagen ライブラリで歌詞タグを後から上書きコピーすることで、ffmpeg だけでは落ちてしまうタグも保持します。

---

## アップデート履歴

| 日付 | 内容 |
|------|------|
| 2026-03-04 | 直列処理 → 並列処理対応。145 件の処理が 670 秒 → 207 秒（約 3.2 倍高速化）。Windows での文字コード処理を堅牢化 |
| 2026-03-05 | mutagen を用いた歌詞タグのコピー処理を追加。正規化後も歌詞を保持可能に |
| 2026-03-08 | 静かなイントロでの音量増大を抑制。入力ビットレートを検出して同等ビットレートで出力。入力拡張子・出力形式（mp3 / aac / flac / wav / ogg）を選択可能に。アートワーク保持を二段構えで強化 |
| 2026-03-18 | **既知の不具合**：100 曲に 1 曲程度の割合でアーティストタグが消えるケースを確認。同一アルバム内でも再現条件が定まらず調査中。Issue を立てる予定。[修正に協力いただける方はこちら](https://github.com/mitz17/mp3-normalizer) |

---

## まとめ

- Tkinter × ffmpeg という素朴な構成でも、MP3 音量の正規化はかなり快適にできる
- GUI で直感操作・CLI でバッチ自動化、どちらでも同じ品質に揃えられる
- 古い MP3 をまだまだ活用したい人は、ぜひ `mp3-normalizer` をクローンしてみてください

---

## 関連記事

- [【コマンド例あり】ffmpeg loudnormの使い方｜LUFS正規化と2pass設定を解説](/blog/ffmpeg-loudnorm-guide/)
- [Ansysのバージョン選択ツールを作った理由｜古い解析ファイルを別バージョンで開くリスクを減らす](/blog/ansys-version-selector/)
