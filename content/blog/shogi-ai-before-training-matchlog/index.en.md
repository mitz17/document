+++
title = 'Playing Against My Custom Python Shogi AI Before Training: Search Count Mattered a Lot'
date = 2026-03-20T12:00:00+09:00
draft = false
description = 'A development log about playing against my custom Python shogi AI before reinforcement learning. Even before training, the number of search iterations had a huge impact on move quality and overall strength.'
tags = ['Python', 'Shogi AI', 'MCTS', 'Evaluation Function', 'Development Log']
categories = ['Project']
+++

## Playing Against The Pre-Training AI

This article is the **second entry** in my "build a shogi AI from scratch" project.

Shogi is Japanese chess.

Here is the first article:

- [Shogi AI in Python: Why You Should Build a GUI First](/en/blog/shogi-GUI/)

This is the follow-up to the previous article about building the GUI first.

This time, I played actual games against the shogi AI before serious training.

At this stage, the engine is not a trained neural-network model yet.  
It is still a **handcrafted evaluation function + MCTS (Monte Carlo Tree Search)** style AI.  
MCTS is a search method that tries candidate moves and spends more time on promising lines.

The clearest takeaway was simple: **even with the same evaluation function, changing the search count changes the strength a lot**.

> Here, "search count" means how many times the search AI explores candidate moves before choosing one move. In the implementation, this corresponds to the `simulations` parameter.

## What The AI Looked Like At This Stage

In `ML-shogi`, the initial goal is not "make the strongest model immediately."  
The goal is to get a **playable evaluation-based AI** first.

The evaluation function starts from piece values and then adds a small number of shogi-specific bonuses and penalties.

| Piece | Value | Piece | Value |
| --- | ---: | --- | ---: |
| Pawn | `100` | Tokin | `600` |
| Lance | `300` | Promoted Lance | `450` |
| Knight | `350` | Promoted Knight | `500` |
| Silver | `550` | Promoted Silver | `550` |
| Gold | `600` |  |  |
| Bishop | `800` | Horse | `1200` |
| Rook | `1000` | Dragon | `1300` |

The king is not treated as an ordinary material value. It is handled separately through mate and terminal-state logic.

Main evaluation adjustments:

- pieces in hand are valued slightly higher than the same pieces on the board
- giving check gets `+200`, being in check gets `-200`
- silver, knight, and lance are slightly penalized if they are far from your own king
- bishops and rooks get bonuses for mobility and direct pressure on the enemy king
- horses also get a defensive bonus near your own king

The hand-piece bonus is fixed: rook `+100`, bishop `+80`, gold and silver `+50`, knight `+40`, lance `+30`.

Silver, knight, and lance also get a defense-oriented penalty if they drift too far from the king.  
The idea is simple: **those pieces are more valuable when they stay near the king and help with defense**.

Gold already acts as a natural defensive piece, so I did not add a position-based bonus for it.

For major pieces, I also score activity:

- bishop: `+8` per reachable square, plus `+80` if it has a direct line toward the enemy king
- rook: `+7` per reachable square, plus `+100` if it has direct file/rank pressure on the enemy king
- horse: `+100` within distance 2 of the king, `+40` within distance 3

The point was not to make the evaluation elegant.  
The point was to make something that does not collapse immediately once search is added.

## What The Games Looked Like

I used three example games here: **search count 32, 500, and 1024**.

{{< shogi-kifu src="shogi-ai-match-sim32.kif" title="Me as Black / AI as White (search count 32)" blackLabel="Black: Me" whiteLabel="White: AI" >}}

It suddenly looked like the AI was trying some kind of Pac-Man trap. Then it climbed onto the Pac-Man and did not actually do the Pac-Man thing.

{{< shogi-kifu src="shogi-ai-match-sim500-check-rush.kif" title="AI as Black / Me as White (search count 500, strange late-game checking spree)" blackLabel="Black: AI" whiteLabel="White: Me" >}}

I will keep it secret that I hung a dragon for free.  
From move 65 onward, the classic weird late-game AI checking spree started. It honestly made me happy because it felt very "yes, this is definitely an AI." The cause here is the check bonus in the evaluation.

{{< shogi-kifu src="shogi-ai-match-sim1024.kif" title="Me as Black / AI as White (search count 1024)" blackLabel="Black: Me" whiteLabel="White: AI" >}}

Even before training, the rules were clearly not broken.  
Captures, drops, and ordinary exchanges still looked like real shogi.

At the same time, with shallower search the engine still produced unnatural moves, so the number of plies it could effectively read mattered a lot.

## Search Count Mattered A Lot Before Training

At low search counts such as `32`, the engine still looked unstable:

- it often made superficially reasonable exchanges that did not hold up afterward
- it simply failed to defend

At `1024`, the difference was obvious:

- clear blunders happened less often
- it used rook and bishop pressure better

The evaluation function itself was the same.  
So at least in this pre-training phase, **search count was a major factor**.

## What I Learned From This

There is real value in playing against the pre-training AI directly.  
Some strange behavior is much easier to notice in an actual game than in logs or loss values.

It also made sense why training started to move only after I increased self-play search count from `8` to `128`.  
When you play the engine yourself, it becomes much easier to believe that shallow self-play produces weak training data.

The strange late-game checking spree was also informative.  
That behavior was not random. It was strongly tied to the fact that I gave a bonus for checking the king.

So the useful takeaways were:

- the evaluation-based AI was already at least playable
- changing the search count changed the strength a lot
- before training, the bottleneck was not only the evaluation function but also search quality

In other words, checking how far a handcrafted evaluation plus search can go was a useful step before moving into training.

## What Comes Next

Next is training.  
At least for this pre-training AI, search count turned out to matter a lot, so now I want to run self-play and training on top of this base and see how much the play style changes.

## Summary

Even before training, a handcrafted evaluation plus MCTS was enough to produce a playable shogi AI.  
But strength was not determined by the evaluation function alone. **Search count changed the engine dramatically.**

With the same evaluation, low search counts still produced very light moves, while higher search counts made the engine noticeably tougher.

The next step is to actually train on top of this base.

## Related Articles

- [Shogi AI in Python: Why You Should Build a GUI First](/en/blog/shogi-GUI/)
- [Automatically updating ChromeDriver for Selenium](/en/blog/get-chrome-driver-python/)
- [Building a Python tool to normalize MP3 loudness with LUFS](/en/blog/mp3-normalizer-devlog/)
