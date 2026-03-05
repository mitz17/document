+++
title = 'MP3音量を自動調整するツールをPythonで作る LUFS正規化開発ログ'
date = 2026-03-02T00:00:00+09:00
draft = false
description = 'Tkinter/ffmpeg を束ねた LUFS 正規化ツール「mp3-normalizer」の開発背景と実装ポイントを解説'
tags = ['Python', 'Tkinter', 'ffmpeg', 'LUFS']
categories = ['プロジェクト']
+++

GitHub: [mitz17/mp3-normalizer](https://github.com/mitz17/mp3-normalizer)

## 背景

10 年くらい前に作った mp3 をふと再生したら「え、なんか音ちいさくない？」となりました。コピペの荒波に飲まれてビットレートが劣化したのかと疑ったものの、音質自体は悪くなっていない。つまりファイルそのものはまだ元気だけれど、音声レベルが不揃いなままだと今後も安心して使えない──そう実感したのがこのツールを作るきっかけでした。

## 対象読者

- 古い mp3 アーカイブを今も大切にしていて、音量だけさっと手直ししたい人
- `ffmpeg` の呪文を暗記していないけど、まとめて正規化したい人

## 前提（Python と mp3）

- Python 3.11 以上 + ffmpeg 6.x が動作する環境が存在していること。ffmpeg の導入は [この Qiita 記事](https://qiita.com/Tadataka_Takahashi/items/9dcb0cf308db6f5dc31b) を参考にして OS ごとの手順を順番にたどれば OK。
- 正規化したい `.mp3` をフォルダごと用意しておき、WAV などは事前に変換しておく。

## ffmpeg とは？

映像・音声を扱う OSS の名作で、CLI から形式変換やトリミング、ノーマライズを一気に処理できます。`mp3-normalizer` では ffmpeg の `loudnorm` フィルタを呼び出して LUFS を調整していますが、コマンド一発で WAV/MP3/MP4 などほぼすべてのメディアを扱える万能ツールです。GUI から触るときも裏側ではこのコマンドが動いており、パラメータを変えれば True Peak の上限やターゲット LUFS を柔軟に切り替えられます。

## 環境

- OS: Windows 11（PowerShell）で動作確認済み
- Python: 3.11.7（`python -m venv .venv` 推奨）
- ffmpeg: 6.1 系（`ffmpeg -version` で確認）
- GUI: Tkinter + ttk を素朴に使用

## ゴール

- OS を問わず、誰でも同じ LUFS 正規化フローを踏める
- GUI でも CLI でも結果が揃い、履歴とログで説明責任を果たせる
- 「入力フォルダを置き換えたら音が揃う」を日常運用に落とし込む

## プロジェクトの概要

- Python 3.11 + ffmpeg 6.x の軽量構成
- GUI/CLI 共通のエンジン (`processor.py`) と再利用しやすいユーティリティ (`utils.py`)
- `processed_history.json` で二重実行を抑止し、`mp3_normalizer.log` で証跡を残す
- `loudnorm` 1pass を使い、-14 LUFS / -1 dBFS をデフォルトターゲットに設定

## どんな課題を解いているのか

- 古いファイルでも音質は十分なので、音量だけ揃えればまだまだ使える
- `ffmpeg` のコマンドを忘れても GUI のプルダウンで完結する
- いつどのファイルを処理したかがログで追えるので、再録や差し戻しが怖くない

## セットアップの流れ

1. `git clone https://github.com/mitz17/mp3-normalizer` でソースを取得
2. `python -m venv .venv && source .venv/bin/activate`（Windows は `Activate.ps1`）
3. `pip install -r requirements.txt` で依存をインストール
4. `python main.py` で GUI、`python main.py --cli ...` でバッチ処理を実行
5. 出力ディレクトリに並んだ MP3 を聴き比べ、ログファイルで値を確認

## アーキテクチャと実装メモ

- `gui.py` は Tkinter の `Frame` を積み上げ、別スレッドで ffmpeg を呼び出し UI フリーズを回避
- `processor.py` は `Path.rglob('*.mp3')` で対象を探し、衝突しそうなファイルは `_1`, `_2` とサフィックスを付加
- `-map_metadata 0` で ID3 タグを保ったまま再エンコード
- ログはプレーンテキストに連ね、LUFS 値や実行コマンドを丸ごと保存

## コードのざっくり解説

`processor.py` の `AudioProcessor.process_directory` では、入力ディレクトリを走査して計画を立て、重複チェックと安全な出力名の生成を行っています（[GitHub の該当コード](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L180-L232) から抜粋）。

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

このループで `generate_unique_output_path` が既存ファイルを検知すると `_1`, `_2` …を末尾に付与するので、デフォルト (`force=False`) では上書きされません。さらに `HistoryService` が `processed_history.json` にサイズ・更新日時を記録し、同じファイルを再度見つけてもスキップします。まさに「上書きしない設定なので安心」という設計です。

実際に ffmpeg を叩くのは `FfmpegExecutor.normalize` で、コマンド全体を整形してログに残します（[コードはこちら](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L63-L111)）。

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

`subprocess.run` の戻り値で成功/失敗を判断しており、GUI のログ欄にも同じコマンド文字列が流れるため、裏で何をしているかが一目で分かります。

## GUI の操作感

1. 入力・出力ディレクトリを指定すると、対象 MP3 がリストでずらっと表示されます。
2. LUFS と True Peak を入力。迷ったらデフォルト（-14 / -1）のままで OK。
3. 再帰チェックや再エンコード強制のトグルで挙動を調整。
4. 「実行」を押すと進捗ログが流れ、完了すると結果をスクロールなしで確認できます。

<p><img src="/images/mp3-normalizer-gui.png" alt="mp3-normalizer GUI モックアップ" loading="lazy" style="border-radius:16px; box-shadow:0 8px 24px rgba(15,23,42,0.18);"></p>

> GUI 全体をざっくり再現したモック。入力/出力、ターゲット LUFS、対象ファイル、ログまで 1 画面で見渡せます。

## まとめ

- Tkinter × ffmpeg という素朴な構成でも、音量正規化の面倒くささはかなり解消できる
- 古い mp3 をまだまだ使いたい人は、ぜひ `mp3-normalizer` をクローンして遊んでみてください！

## 2026-03-04 修正追記

- `mp3-normalizer` を直列処理から並列処理対応に変更し、処理速度を大幅改善。
- 実測で 145 件の MP3 処理が 670 秒から 207.3 秒になり、約 3.23 倍高速化（約 69.1% 短縮）を確認。(4並列)
- 設定可能なCPU並列数の上限はお使いのCPUのコア数の上限としています。
- あわせて ffmpeg 出力の文字コード処理を堅牢化し、Windows 環境での文字化け由来の失敗を起こしにくくしました。

## 2026-03-05 修正追記

- 失敗点:
  - `ffmpeg` による正規化時、歌詞タグの埋め込み・維持ができないケースを確認
- 対応:
  - mutagenライブラリを用いて正規化後ファイルへ、元ファイルの歌詞タグをコピーする処理を追加
- 影響:
  - 正規化後も歌詞タグ情報を保持可能