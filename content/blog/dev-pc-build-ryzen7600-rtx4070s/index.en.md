+++
title = 'A Ryzen 5 7600 + RTX 4070 Super PC Build — A ¥163,000 Local-AI & Dev Machine'
slug = 'dev-pc-build-ryzen7600-rtx4070s'
date = 2026-03-05T00:00:00+09:00
draft = false
description = 'The parts and prices for a PC I built around a Ryzen 5 7600 and RTX 4070 Super — a real ¥163,000 build aimed at local AI and development.'
image = '購入パーツ一式.jpg'
tags = ['PC Build', 'Ryzen 5 7600', 'RTX 4070 Super', 'Ubuntu', 'Development Environment']
categories = ['Development Environment']
+++

This is the build I bought during the Black Friday sale in November 2024.  
It isn't the newest setup, but for balancing development and local-AI experiments I'm still very happy with it, so I'm sharing it as a real-world example.

Measured full-HD gaming benchmarks for this build are [here](/en/blog/pc-benchmark/).

## Contents

- [Main uses](#main-uses)
- [Why I upgraded](#why-i-upgraded)
- [Build and purchase price](#build-and-purchase-price)
- [Why I chose each part](#why-i-chose-each-part)
  - [Ryzen 5 7600](#ryzen-5-7600)
  - [RTX 4070 Super (VRAM 12GB)](#rtx-4070-super-vram-12gb)
  - [Memory: 32GB (16GB x2 DDR5)](#memory-32gb-16gb-x2-ddr5)
  - [OS](#os)
  - [Case (Antec CX200 RGB Elite, Micro-ATX mini tower)](#case-antec-cx200-rgb-elite-micro-atx-mini-tower)
  - [Power supply (650W, 80PLUS Bronze)](#power-supply-650w-80plus-bronze)
- [Wrapping up](#wrapping-up)
- [Related articles](#related-articles)

---

## Main uses

- Hobby-level development (building apps, local AI training, etc.)
- Local LLMs

## Why I upgraded

The GPU in my previous PC was a `GTX 760` (Kepler generation, CUDA 3.0, VRAM 2GB).  
Many recent versions of PyTorch and TensorFlow require CUDA 3.5 or higher, so it simply wouldn't run them.  
And even when something did run, 2GB of VRAM is a non-starter for AI work.  

For these reasons, I decided to upgrade. (Games ran fine as long as I turned the visual quality down.)

## Build and purchase price

{{< figure src="購入パーツ一式.jpg" alt="All the purchased parts" >}}

| Part | Model / Spec | Price | Store |
| --- | --- | ---: | --- |
| CPU + MB + RAM bundle | Ryzen 5 7600 / B650M Pro RS / DDR5 32GB | ¥49,800 | Sofmap |
| GPU | RTX 4070 Super (VRAM 12GB) | ¥93,500 | Dospara |
| SSD | M.2 NVMe 500GB | ¥5,590 | TSUKUMO |
| Case | Antec CX200 RGB Elite | ¥6,380 | PC Koubou |
| PSU | 650W 80PLUS Bronze | ¥7,645 | Joshin |

**Total: ¥162,915 (incl. tax)**

* All bought online. No OS license cost (Ubuntu).  
* I later added Windows as a dual boot because I wanted to game.
* HDD and secondary SSD are reused from before, so they aren't included above.

## Why I chose each part

### Ryzen 5 7600

For AI and gaming, the GPU is the star of the show, so I went cost-first on everything else.  
I considered cutting costs with a "core i5-14400" and DDR4 memory, but I settled on the Ryzen 5 7600 for the following reasons:

- The Sofmap bundle was cheap
- It's AM5, so if I ever find the CPU lacking, upgrading is relatively easy
- On AM5 the pins are on the motherboard side, so even if I drop the CPU there's no risk of bending its pins

### RTX 4070 Super (VRAM 12GB)

The GPU accounts for just under 60% of this build's total (¥162,915).  
When running AI locally, VRAM sets the ceiling on the model size you can load, so I prioritized it.  
Since I need CUDA, AMD is out of the question. (No hard feelings, AMD — still rooting for you.)

To run 7B–13B-parameter-class LLMs, you need roughly 14–26GB of VRAM in FP16, but with 4-bit quantization even 12GB can handle the 7B–13B class in practice.  
I chose it as the way to maximize VRAM within budget.

My case is white, so I wanted a white GPU to match, but going white would have added tens of thousands of yen, so I gave up on that.


### Memory: 32GB (16GB x2 DDR5)

For AI and gaming the GPU is the star, so anything goes here.  
At the time, RAM prices hadn't spiked yet and 16GB and 32GB cost about the same, so I went with 32GB.  
You can always add more RAM later, so 32GB is plenty to start with.

### OS

If you're not gaming, there's no reason not to use Ubuntu.

### Case (Antec CX200 RGB Elite, Micro-ATX mini tower)

My previous PC used a full-tower ATX case (Z9U3), which was huge and got in the way.  
I went with a microATX board and case to save space.

As reviews point out, the `Antec CX200 RGB Elite` is a bit fiddly to build in; interior space is limited, so cable management gets a little cramped.  
That said, the finished look is very satisfying, and overall it was a more-than-passable choice.  
I also like that, despite being compact, it has two 3.5-inch bays. (One of them shares space with a 2.5-inch bay.)

Later, when I tried to add an M.2 Wi-Fi adapter, the antenna cable running from the board to the rear slot had to take a long path, and routing it got quite tight.  
If you think you might add one later, I strongly recommend buying a slightly longer antenna cable.

### Power supply (650W, 80PLUS Bronze)

For AI and gaming the GPU is the star, so cost-first again. The PSU is the one part where, honestly, anything goes. (Very much my personal opinion.)  
650W is plenty for an RTX 4070 Super (TDP 220W) + Ryzen 5 7600 (65W).  
A fully modular PSU makes routing spare cables easier, but I put that price difference toward other parts and went with a non-modular unit.  
Will the day ever come when I can afford a fully modular PSU...?

## Wrapping up

I sincerely hope this improves everyone's QOJPCL.

## Related articles

- [Measuring the gaming performance of a Ryzen 5 7600 + RTX 4070 SUPER: main benchmarks at full HD](/en/blog/pc-benchmark/)
- [Why I built an Ansys version selector: reducing the risk of opening old analysis files in the wrong version](/en/blog/ansys-version-selector/)
- [Building an automatic volume-adjustment tool with Python and ffmpeg: a LUFS normalization dev log](/en/blog/mp3-normalizer-devlog/)
