(function () {
  const KANJI_RANKS = {
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
  };

  const PIECE_LABELS = {
    FU: "歩",
    KY: "香",
    KE: "桂",
    GI: "銀",
    KI: "金",
    KA: "角",
    HI: "飛",
    OU: "玉",
    TO: "と",
    NY: "成香",
    NK: "成桂",
    NG: "成銀",
    UM: "馬",
    RY: "龍",
  };

  const KIF_TO_CODE = {
    "歩": "FU",
    "香": "KY",
    "桂": "KE",
    "銀": "GI",
    "金": "KI",
    "角": "KA",
    "飛": "HI",
    "玉": "OU",
    "王": "OU",
    "と": "TO",
    "成香": "NY",
    "成桂": "NK",
    "成銀": "NG",
    "馬": "UM",
    "龍": "RY",
    "竜": "RY",
  };

  const HAND_ORDER = ["HI", "KA", "KI", "GI", "KE", "KY", "FU"];
  const PROMOTE_MAP = {
    FU: "TO",
    KY: "NY",
    KE: "NK",
    GI: "NG",
    KA: "UM",
    HI: "RY",
  };

  function initialState() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(null));
    const put = (file, rank, side, piece) => {
      board[rank - 1][9 - file] = { side, piece };
    };

    const top = "white";
    const bottom = "black";

    put(9, 1, top, "KY");
    put(8, 1, top, "KE");
    put(7, 1, top, "GI");
    put(6, 1, top, "KI");
    put(5, 1, top, "OU");
    put(4, 1, top, "KI");
    put(3, 1, top, "GI");
    put(2, 1, top, "KE");
    put(1, 1, top, "KY");
    put(8, 2, top, "HI");
    put(2, 2, top, "KA");
    for (let file = 1; file <= 9; file += 1) put(file, 3, top, "FU");

    for (let file = 1; file <= 9; file += 1) put(file, 7, bottom, "FU");
    put(8, 8, bottom, "KA");
    put(2, 8, bottom, "HI");
    put(9, 9, bottom, "KY");
    put(8, 9, bottom, "KE");
    put(7, 9, bottom, "GI");
    put(6, 9, bottom, "KI");
    put(5, 9, bottom, "OU");
    put(4, 9, bottom, "KI");
    put(3, 9, bottom, "GI");
    put(2, 9, bottom, "KE");
    put(1, 9, bottom, "KY");

    return {
      board,
      hands: {
        black: {},
        white: {},
      },
      sideToMove: "black",
      moveNumber: 0,
      lastMove: null,
    };
  }

  function cloneState(state) {
    return {
      board: state.board.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
      hands: {
        black: { ...state.hands.black },
        white: { ...state.hands.white },
      },
      sideToMove: state.sideToMove,
      moveNumber: state.moveNumber,
      lastMove: state.lastMove ? { ...state.lastMove } : null,
    };
  }

  function demotePiece(piece) {
    const demoted = {
      TO: "FU",
      NY: "KY",
      NK: "KE",
      NG: "GI",
      UM: "KA",
      RY: "HI",
    };
    return demoted[piece] || piece;
  }

  function parseKif(text) {
    const lines = text.split(/\r?\n/);
    const moves = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("先手") || trimmed.startsWith("後手") || trimmed.startsWith("手数")) {
        continue;
      }

      const dropMatch = trimmed.match(/^(\d+)\s+([1-9])([一二三四五六七八九])(歩|香|桂|銀|金|角|飛|玉|王|と|成香|成桂|成銀|馬|龍|竜)打$/);
      if (dropMatch) {
        moves.push({
          number: Number(dropMatch[1]),
          toFile: Number(dropMatch[2]),
          toRank: KANJI_RANKS[dropMatch[3]],
          piece: KIF_TO_CODE[dropMatch[4]],
          from: null,
          isDrop: true,
          notation: trimmed.replace(/^\d+\s+/, ""),
        });
        continue;
      }

      const moveMatch = trimmed.match(/^(\d+)\s+([1-9])([一二三四五六七八九])(歩|香|桂|銀|金|角|飛|玉|王|と|成香|成桂|成銀|馬|龍|竜)(成)?\((\d)(\d)\)$/);
      if (moveMatch) {
        const pieceCode = KIF_TO_CODE[moveMatch[4]];
        const promotedPiece = moveMatch[5] ? (PROMOTE_MAP[pieceCode] || pieceCode) : pieceCode;
        moves.push({
          number: Number(moveMatch[1]),
          toFile: Number(moveMatch[2]),
          toRank: KANJI_RANKS[moveMatch[3]],
          piece: promotedPiece,
          from: {
            file: Number(moveMatch[6]),
            rank: Number(moveMatch[7]),
          },
          isDrop: false,
          notation: trimmed.replace(/^\d+\s+/, ""),
        });
      }
    }

    return moves;
  }

  function fileToX(file) {
    return 9 - file;
  }

  function rankToY(rank) {
    return rank - 1;
  }

  function getCell(board, file, rank) {
    return board[rankToY(rank)][fileToX(file)];
  }

  function setCell(board, file, rank, value) {
    board[rankToY(rank)][fileToX(file)] = value;
  }

  function applyMove(state, move) {
    const next = cloneState(state);
    const side = state.sideToMove;
    const opponent = side === "black" ? "white" : "black";
    const destination = getCell(next.board, move.toFile, move.toRank);

    if (move.isDrop) {
      const current = next.hands[side][move.piece] || 0;
      if (current > 0) {
        next.hands[side][move.piece] = current - 1;
      }
      setCell(next.board, move.toFile, move.toRank, { side, piece: move.piece });
    } else {
      const source = getCell(next.board, move.from.file, move.from.rank);
      if (!source) {
        throw new Error(`source not found for move ${move.notation}`);
      }

      if (destination) {
        const captured = demotePiece(destination.piece);
        next.hands[side][captured] = (next.hands[side][captured] || 0) + 1;
      }

      setCell(next.board, move.from.file, move.from.rank, null);
      setCell(next.board, move.toFile, move.toRank, {
        side,
        piece: move.piece,
      });
    }

    next.sideToMove = opponent;
    next.moveNumber = move.number;
    next.lastMove = {
      from: move.from,
      to: { file: move.toFile, rank: move.toRank },
      notation: move.notation,
    };
    return next;
  }

  function buildStates(moves) {
    const states = [initialState()];
    for (const move of moves) {
      states.push(applyMove(states[states.length - 1], move));
    }
    return states;
  }

  function handText(hands, side) {
    const chunks = [];
    for (const piece of HAND_ORDER) {
      const count = hands[side][piece] || 0;
      if (count > 0) {
        chunks.push(`${PIECE_LABELS[piece]}${count > 1 ? count : ""}`);
      }
    }
    return chunks.length ? chunks.join(" ") : "なし";
  }

  function createViewer(root, title, kifText, labels) {
    const moves = parseKif(kifText);
    const states = buildStates(moves);

    root.innerHTML = `
      <div class="shogi-board-panel__toggle-row">
        <button type="button" class="shogi-board-panel__toggle" data-action="toggle">棋譜を表示</button>
      </div>
      <div class="shogi-board-panel__body">
      <div class="shogi-board-panel">
        <div class="shogi-board-panel__hands shogi-board-panel__hands--white"></div>
        <div class="shogi-board-panel__board"></div>
        <div class="shogi-board-panel__hands shogi-board-panel__hands--black"></div>
      </div>
      <div class="shogi-board-panel__controls">
        <button type="button" data-action="first">|&lt;</button>
        <button type="button" data-action="prev">&lt;</button>
        <button type="button" data-action="next">&gt;</button>
        <button type="button" data-action="last">&gt;|</button>
        <span class="shogi-board-panel__status"></span>
      </div>
      <div class="shogi-board-panel__moves"></div>
      </div>
    `;

    const bodyEl = root.querySelector(".shogi-board-panel__body");
    const boardEl = root.querySelector(".shogi-board-panel__board");
    const whiteHandsEl = root.querySelector(".shogi-board-panel__hands--white");
    const blackHandsEl = root.querySelector(".shogi-board-panel__hands--black");
    const statusEl = root.querySelector(".shogi-board-panel__status");
    const movesEl = root.querySelector(".shogi-board-panel__moves");
    const toggleEl = root.querySelector('[data-action="toggle"]');
    let currentIndex = 0;
    let collapsed = true;

    const fileHeader = document.createElement("div");
    fileHeader.className = "shogi-board__header";
    fileHeader.appendChild(document.createElement("span"));
    for (let file = 9; file >= 1; file -= 1) {
      const el = document.createElement("span");
      el.textContent = String(file);
      fileHeader.appendChild(el);
    }
    boardEl.appendChild(fileHeader);

    for (let rank = 1; rank <= 9; rank += 1) {
      const rowEl = document.createElement("div");
      rowEl.className = "shogi-board__row";

      const rankLabel = document.createElement("span");
      rankLabel.className = "shogi-board__rank";
      rankLabel.textContent = Object.keys(KANJI_RANKS).find((key) => KANJI_RANKS[key] === rank) || "";
      rowEl.appendChild(rankLabel);

      for (let file = 9; file >= 1; file -= 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "shogi-board__cell";
        cell.disabled = true;
        cell.dataset.file = String(file);
        cell.dataset.rank = String(rank);
        rowEl.appendChild(cell);
      }
      boardEl.appendChild(rowEl);
    }

    const moveButtons = moves.map((move, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shogi-board-panel__move";
      button.textContent = `${move.number}. ${move.notation}`;
      button.addEventListener("click", () => render(index + 1));
      movesEl.appendChild(button);
      return button;
    });

    function render(index) {
      currentIndex = Math.max(0, Math.min(index, states.length - 1));
      const state = states[currentIndex];

      for (const cell of boardEl.querySelectorAll(".shogi-board__cell")) {
        const file = Number(cell.dataset.file);
        const rank = Number(cell.dataset.rank);
        const piece = getCell(state.board, file, rank);
        cell.classList.remove("is-last-move");
        if (piece) {
          cell.textContent = PIECE_LABELS[piece.piece];
          cell.dataset.side = piece.side;
        } else {
          cell.textContent = "";
          cell.dataset.side = "";
        }

        if (state.lastMove && state.lastMove.to.file === file && state.lastMove.to.rank === rank) {
          cell.classList.add("is-last-move");
        }
      }

      whiteHandsEl.innerHTML = `<strong>${labels.white}の持ち駒</strong><span>${handText(state.hands, "white")}</span>`;
      blackHandsEl.innerHTML = `<strong>${labels.black}の持ち駒</strong><span>${handText(state.hands, "black")}</span>`;
      statusEl.textContent = currentIndex === 0
        ? `${title} | 初期局面`
        : `${title} | ${state.moveNumber}手目 ${state.lastMove.notation}`;

      moveButtons.forEach((button, idx) => {
        button.classList.toggle("is-active", idx + 1 === currentIndex);
      });
    }

    root.querySelector('[data-action="first"]').addEventListener("click", () => render(0));
    root.querySelector('[data-action="prev"]').addEventListener("click", () => render(currentIndex - 1));
    root.querySelector('[data-action="next"]').addEventListener("click", () => render(currentIndex + 1));
    root.querySelector('[data-action="last"]').addEventListener("click", () => render(states.length - 1));
    bodyEl.hidden = collapsed;
    toggleEl.addEventListener("click", () => {
      collapsed = !collapsed;
      bodyEl.hidden = collapsed;
      toggleEl.textContent = collapsed ? "棋譜を表示" : "棋譜を隠す";
    });

    render(0);
  }

  function init() {
    document.querySelectorAll(".shogi-kifu-viewer").forEach((container) => {
      const dataEl = container.querySelector(".shogi-kifu-viewer__data");
      const appEl = container.querySelector(".shogi-kifu-viewer__app");
      const title = container.dataset.title || "将棋棋譜ビューア";
      const labels = {
        black: container.dataset.blackLabel || "先手",
        white: container.dataset.whiteLabel || "後手",
      };
      if (!dataEl || !appEl) return;
      const kifText = dataEl.textContent || "";
      try {
        createViewer(appEl, title, kifText, labels);
      } catch (error) {
        appEl.innerHTML = `<p class="shogi-kifu-viewer__error">棋譜の表示に失敗しました: ${String(error && error.message ? error.message : error)}</p>`;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
