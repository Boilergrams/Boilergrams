/**
 * Example utilities that your code might be importing:
 *
 *   isDigit(letter: string) => boolean
 *   isLowerCase(letter: string) => boolean
 *   randomizeString(str: string, seed: number) => string
 *   seconds_to_display_string(seconds: number) => string
 */

import { Component } from "preact";
import {
  isDigit,
  isLowerCase,
  randomizeString,
  seconds_to_display_string,
} from "../utils/utils.ts";

interface GridCell {
  letter: string;
}

interface GridIndex {
  row: number;
  col: number;
}

interface GameState {
  rows: number;
  cols: number;
  // The 2D grid to display/edit
  grid: GridCell[][];
  // The scrambled set of letters that can be used to fill the grid
  letterBank: string;
  // A list of (row, col) that the user is allowed to modify
  modifiableIndices: GridIndex[];
  // The correct answer grid (same shape as `grid`, used for checking correctness)
  answerKey: string[][];
  // The user’s currently selected (row, col) in the grid
  selectedCell: GridIndex | null;
  // Number of tries left
  triesLeft: number;
  // Tracks how many times each letter in letterBank has been placed correctly
  correctLetters: Record<string, number>;
  // Whether the puzzle is complete
  gameComplete: boolean;
  // Elapsed time in seconds
  elapsedTime: number;
}

export default class GridGame extends Component<unknown, GameState> {
  // A reference for our timer so we can clear it on unmount
  private timerId: number | null = null;

  constructor(props: unknown) {
    super(props);

    this.state = {
      rows: 0,
      cols: 0,
      grid: [],
      letterBank: "",
      modifiableIndices: [],
      answerKey: [],
      selectedCell: null,
      triesLeft: 6,
      correctLetters: {},
      gameComplete: false,
      elapsedTime: 0,
    };

    // bind event handler methods
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  override async componentDidMount() {
    await this.fetchGridData();

    // Start a 1-second timer to track elapsed time
    this.timerId = globalThis.setInterval(() => {
      if (!this.state.gameComplete) {
        this.setState((prev) => ({ elapsedTime: prev.elapsedTime + 1 }));
      }
    }, 1000);

    // Attach keydown handler.
    // Note: You could also put `tabIndex={0}` on a wrapping <div> and use `onKeyDown` inline,
    // but sometimes it’s easier to attach a listener at the document level.
    document.addEventListener("keydown", this.handleKeyPress);
  }

  override componentWillUnmount() {
    // Cleanup the timer
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    // Cleanup event listener
    document.removeEventListener("keydown", this.handleKeyPress);
  }

  /**
   * Decodes a puzzle string into a grid, a set of modifiable indices,
   * and populates an answer key.
   */
  private decodeGridData(
    data: string,
    userGrid: GridCell[][],
    answerKey: string[][],
    cols: number
  ): { modifiableIndices: GridIndex[]; letterBank: string } {
    const modifiableIndices: GridIndex[] = [];
    let letterBank = "";
    let counter = 0;

    for (let i = 0; i < data.length; i++) {
      const letter = data[i];
      const rowIndex = Math.floor(counter / cols);
      const colIndex = counter % cols;

      if (isDigit(letter)) {
        // A digit means "skip this many empty cells in the grid"
        counter += Number(letter);
      } else if (isLowerCase(letter)) {
        // Lowercase means "user can fill in this letter"
        letterBank += letter;
        modifiableIndices.push({ row: rowIndex, col: colIndex });
        answerKey[rowIndex][colIndex] = letter.toUpperCase();
        counter++; // Move to next grid cell
      } else {
        // Otherwise, it's a fixed letter
        userGrid[rowIndex][colIndex] = { letter };
        answerKey[rowIndex][colIndex] = letter;
        counter++; // Move to next grid cell
      }
    }

    return { modifiableIndices, letterBank };
  }

  /**
   * Fetches daily puzzle data, sets up the grid, letter bank, and answer key.
   */
  private async fetchGridData() {
    try {
      const res = await fetch("/api/get_daily_boilergram");
      const data = await res.json();

      const [rows, cols] = data.dimensions;
      const userGrid: GridCell[][] = Array.from({ length: rows }, () =>
        Array(cols).fill("")
      );
      const answerKey: string[][] = Array.from({ length: rows }, () =>
        Array(cols).fill("")
      );

      // Decode grid data
      const { modifiableIndices, letterBank: rawLetterBank } =
        this.decodeGridData(data.data, userGrid, answerKey, cols);

      // Shuffle & uppercase letter bank
      let letterBank = rawLetterBank.toUpperCase();
      letterBank = randomizeString(letterBank, 42);

      // Initialize selected cell to the first modifiable spot
      const selectedCell =
        modifiableIndices.length > 0 ? modifiableIndices[0] : null;

      this.setState({
        rows,
        cols,
        grid: userGrid,
        letterBank,
        modifiableIndices,
        answerKey,
        selectedCell,
      });
    } catch (error) {
      console.error("Error fetching grid data:", error);
    }
  }

  private findNextArrow(
    row: number,
    col: number,
    key: string
  ): GridIndex | null {
    const dirs: Map<string, [number, number]> = new Map([
      ["ArrowUp", [-1, 0]],
      ["ArrowDown", [1, 0]],
      ["ArrowRight", [0, 1]],
      ["ArrowLeft", [0, -1]],
    ]);
    if (!key) {
      throw new Error("Key is empty in findNextArrow!");
    }

    const dir = dirs.get(key);
    if (!dir) return null;

    const [dRow, dCol] = dir;
    let currRow = row + dRow;
    let currCol = col + dCol;

    while (
      currRow >= 0 &&
      currRow < this.state.rows &&
      currCol >= 0 &&
      currCol < this.state.cols
    ) {
      if (
        this.state.modifiableIndices.some(
          (idx) => idx.row === currRow && idx.col === currCol
        )
      ) {
        return { row: currRow, col: currCol };
      }
      currRow += dRow;
      currCol += dCol;
    }

    return null;
  }

  private handleKeyPress(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.handleSubmit();
      return;
    }

    const { selectedCell, modifiableIndices, grid } = this.state;
    if (!selectedCell) return;

    const { row, col } = selectedCell;

    // 1) check for arrow movement
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();

      const nextCell: GridIndex | null = this.findNextArrow(row, col, e.key);
      if (nextCell) {
        this.setState({ selectedCell: nextCell });
      }
      return;
    }

    // 2) Handle letter input or deletion
    if (!modifiableIndices.some((idx) => idx.row === row && idx.col === col)) {
      return;
    }

    const updatedGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const isLetterKey = e.key.length === 1 && /[a-zA-Z]/.test(e.key);

    if (isLetterKey || e.key === "Backspace") {
      updatedGrid[row][col].letter = isLetterKey ? e.key.toUpperCase() : "";
      this.setState({ grid: updatedGrid });
    }
  }

  /** Checks the user’s grid against the answer key, updates tries/correct usage. */
  private handleSubmit() {
    const { gameComplete, triesLeft, grid, answerKey, modifiableIndices } =
      this.state;
    if (gameComplete) return;

    // Decrement tries left
    const newTriesLeft = triesLeft - 1;

    // Evaluate the current grid vs. the answer key
    const mistakes: GridIndex[] = [];
    const correctUsage: Record<string, number> = {};

    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const correctLetter = answerKey[rowIndex][colIndex];
        const isModifiable = modifiableIndices.some(
          (idx) => idx.row === rowIndex && idx.col === colIndex
        );

        if (cell.letter === correctLetter) {
          if (isModifiable) {
            correctUsage[cell.letter] = (correctUsage[cell.letter] || 0) + 1;
          }
        } else {
          mistakes.push({ row: rowIndex, col: colIndex });
        }
      });
    });

    // Check if puzzle is solved or out of tries
    if (mistakes.length === 0) {
      // All correct => puzzle complete
      alert("Congratulations! You completed the grid correctly.");
      this.setState({ gameComplete: true, correctLetters: correctUsage });
    } else if (newTriesLeft === 0) {
      // Out of tries => show correct grid
      alert("No more tries left. Revealing the correct solution.");
      const revealedGrid = answerKey.map((row) =>
        row.map((letter) => ({ letter }))
      );
      this.setState({
        grid: revealedGrid,
        triesLeft: 0,
        gameComplete: true,
        correctLetters: correctUsage,
        selectedCell: null,
      });
    } else {
      alert(
        `Some cells are incorrect. Mistakes: ${mistakes.length}. Keep trying!`
      );
      this.setState({
        triesLeft: newTriesLeft,
        correctLetters: correctUsage,
      });
    }
  }

  render() {
    const {
      grid,
      letterBank,
      correctLetters,
      elapsedTime,
      rows,
      cols,
      selectedCell,
      modifiableIndices,
      triesLeft,
    } = this.state;

    // Make a shallow copy so we can “use up” letters for strikethrough logic
    const correctLettersCopy: Record<string, number> = { ...correctLetters };

    return (
      <div class="flex flex-col items-center" tabIndex={0}>
        {/* Letter Bank */}
        <div
          class="grid gap-1 mb-4"
          style={`
            grid-template-columns: repeat(${letterBank.length}, 1fr);
            grid-auto-flow: column;
            overflow-x: auto;
          `}
        >
          {letterBank.split("").map((letter, index) => {
            let shouldStrikeThrough = false;
            if (correctLettersCopy[letter]) {
              shouldStrikeThrough = true;
              correctLettersCopy[letter]--;
            }
            return (
              <div
                key={index}
                class={`flex items-center justify-center border border-gray-400 h-10 w-10 text-black ${
                  shouldStrikeThrough
                    ? "bg-gray-300 bg-opacity-50 line-through"
                    : "bg-white"
                }`}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* Main row: Stopwatch, Grid, Tries Left */}
        <div class="flex">
          {/* Stopwatch */}
          <div class="mr-4 flex flex-col items-center justify-center">
            <p class="text-lg font-bold text-gray-800">Elapsed Time</p>
            <p class="text-2xl text-blue-600">
              {seconds_to_display_string(elapsedTime)}
            </p>
          </div>

          {/* Editable Grid */}
          <div
            class="grid gap-1 mb-4"
            style={`grid-template-columns: repeat(${cols}, 1fr)`}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isSelected =
                  selectedCell?.row === rowIndex &&
                  selectedCell?.col === colIndex;
                const isModifiable = modifiableIndices.some(
                  (idx) => idx.row === rowIndex && idx.col === colIndex
                );

                let backgroundColor = "bg-white";
                if (isSelected && isModifiable) {
                  backgroundColor = "bg-yellow-200";
                } else if (isModifiable) {
                  backgroundColor = "bg-gray-200";
                } else if (!isModifiable && cell.letter) {
                  backgroundColor = "bg-gray-300";
                }

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    class={`flex items-center justify-center border border-gray-400 text-black h-10 w-10 cursor-pointer ${backgroundColor}`}
                    onClick={() => {
                      // Click to select the cell, if modifiable
                      if (isModifiable) {
                        this.setState({
                          selectedCell: { row: rowIndex, col: colIndex },
                        });
                      }
                    }}
                  >
                    {cell.letter}
                  </div>
                );
              })
            )}
          </div>

          {/* Tries Left Display */}
          <div class="ml-4 flex flex-col items-center justify-center">
            <p class="text-lg font-bold text-gray-800">Tries Left</p>
            <p class="text-2xl text-red-600">{triesLeft}</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={this.handleSubmit}
        >
          Submit Grid
        </button>
      </div>
    );
  }
}
