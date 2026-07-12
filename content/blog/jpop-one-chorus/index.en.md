+++
title = 'Building a Local Music App That Plays Just One Chorus of J-Pop'
slug = 'jpop-one-chorus'
date = 2026-07-12T00:00:00+09:00
draft = false
description = 'I am building a local music app that automatically plays J-Pop tracks through the first chorus, so more songs can be enjoyed while driving. This article defines the requirements and introduces three chorus-detection approaches to test.'
tags = ['J-Pop', 'music app', 'Python', 'music structure analysis', 'chorus detection']
categories = ['development']
+++

I wanted to listen to more J-Pop while driving.

It is great to listen to a favorite song all the way through. But when I want to play a large collection, finishing every track means I can only hear a limited number of songs during a drive. Skipping manually is an option, but I do not want to operate a music player while driving.

So I decided to build a local music app that automatically plays each track from the beginning through the end of its first chorus—what is commonly called a “one chorus” listen in Japan—then moves on to the next song. This article lays out the initial requirements and the approaches I will test for finding the chorus.

## The Experience I Want

The intended experience is simple: choose an MP3, listen through one chorus, and let the app automatically move to the next track.

The premise is that listening through the first chorus is enough to enjoy a song’s mood and memories, while allowing many more songs to be heard than full-track playback. It is also important that users can correct the playback end point when it does not feel right.

## Requirements

### What the App Will Do

- Accept an MP3 file and analyze its musical structure
- Use section information such as intro, verse, pre-chorus, and chorus to find the first complete chorus
- Use the end time of that chorus as the playback end point
- Play the track from the beginning through that end point
- Save the analysis result as a JSON file for each track so it can be reused without reanalyzing the song

The app will not modify the MP3 itself. It stores analysis results separately, so the original music file is never altered or damaged.

### Input and Supporting Information

The initial target is MP3 files stored locally. If lyrics are embedded in ID3 tags, the app will read them as supporting information for detecting the chorus. The app must still be able to analyze a track from audio alone when no lyrics are available.

Playing tracks directly from streaming services and obtaining lyrics from external services are out of scope for now. The first version will focus on a PC app that safely works with an existing local music library.

### Do Not Over-Automate the Decision

J-Pop song structures vary widely: some tracks have long intros, some begin with the chorus, and some repeat it. Automatic detection will not always be correct.

For that reason, the app will show the detected chorus start and end times so users can review them. Results that are not reliable enough should be marked as needing confirmation, and the playback end point must be editable by hand. The goal is to reduce work through automation while making it easy to correct mistakes.

### Operations Needed in the First Screen

The first PC version needs to support the following flow:

1. Choose an MP3 file.
2. Choose an analysis method.
3. Start the analysis.
4. Review the detected chorus start and end times.
5. Adjust the playback end point if needed.
6. Play the track from the beginning through one chorus.

Batch analysis of multiple songs and an Android version will come after evaluating accuracy and usability. The immediate goal is to reliably analyze, review, and play one track at a time.

## How to Find the Chorus

The hardest part of this app is determining the end of the first complete chorus from audio. A lightweight approach may be inaccurate for some songs, while a more accurate model may take longer to run and be harder to set up.

To compare speed, ease of setup, and accuracy, I will prepare these three approaches:

- **Simple analysis**: a lightweight method with few dependencies that returns a result in seconds. It will also serve as a fallback when the other methods are unavailable.
- **SongFormer**: a Transformer model for music structure analysis. I will test whether it recognizes song sections more accurately.
- **All-In-One**: a model that combines source separation and music structure analysis. I will test whether using information such as vocals improves the result.

| Method | Characteristic | Expected processing time | Best use |
| --- | --- | --- | --- |
| Simple analysis | Lightweight analysis with few dependencies | A few seconds | Quickly checking a result or using a fallback |
| SongFormer | Transformer-based music structure analysis | Around tens of seconds | Comparing how well song structure is recognized |
| All-In-One | Combines source separation and structure analysis | Around tens of seconds | Testing detection that also uses vocal information |

Processing time varies with PC performance, track length, and whether model files or caches must be downloaded or created for the first run.

The GUI will make it possible to switch methods and compare results and processing times for the same track. The Git repository is still private, but I plan to publish it once testing has progressed. First, I will try these three approaches.
