import { Component } from "preact";
import { isDigit, isLowerCase, randomizeString, seconds_to_display_string } from "../utils/utils.ts";

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
	grid: GridCell[][];
	letterBank: string;
	modifiableIndices: GridIndex[];
	answerKey: string[][];
	selectedCell: GridIndex | null;
	triesLeft: number;
	correctLetters: Record<string, number>;
	gameComplete: boolean;
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
		cols: number,
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
			const userGrid: GridCell[][] = Array.from({ length: rows }, () => Array(cols).fill(""));
			const answerKey: string[][] = Array.from({ length: rows }, () => Array(cols).fill(""));

			// Decode grid data
			const { modifiableIndices, letterBank: rawLetterBank } = this.decodeGridData(
				data.data,
				userGrid,
				answerKey,
				cols,
			);

			// Shuffle & uppercase letter bank
			let letterBank = rawLetterBank.toUpperCase();
			letterBank = randomizeString(letterBank, 42);

			// Initialize selected cell to the first modifiable spot
			const selectedCell = modifiableIndices.length > 0 ? modifiableIndices[0] : null;

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
		key: string,
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
					(idx) => idx.row === currRow && idx.col === currCol,
				)
			) {
				return { row: currRow, col: currCol };
			}
			currRow += dRow;
			currCol += dCol;
		}

		// no direct movement could be found so switching to secondary
		const directions: { [key: string]: { primary: Array<number>; secondary: Array<Array<number>> } } = {
			ArrowUp: {
				primary: [-1, 0],
				secondary: [
					[0, -1], // Up and Left
					[0, 1], // Up and Right
				],
			},
			ArrowDown: {
				primary: [1, 0],
				secondary: [
					[0, -1], // Down and Left
					[0, 1], // Down and Right
				],
			},
			ArrowLeft: {
				primary: [0, -1],
				secondary: [
					[-1, 0], // Left and Up
					[1, 0], // Left and Down
				],
			},
			ArrowRight: {
				primary: [0, 1],
				secondary: [
					[-1, 0], // Right and Up
					[1, 0], // Right and Down
				],
			},
		};

		const move = directions[key];
		if (!move) return null;

		for (let distance = 1; distance < Math.max(this.state.rows, this.state.cols); distance++) {
			for (const sec of move.secondary) {
				for (
					let secondaryDistance = 1;
					secondaryDistance < Math.max(this.state.rows, this.state.cols);
					secondaryDistance++
				) {
					const secondaryRow = row + move.primary[0] * distance + sec[0] * secondaryDistance;
					const secondaryCol = col + move.primary[1] * distance + sec[1] * secondaryDistance;

					if (
						secondaryRow >= 0 &&
						secondaryRow < this.state.rows &&
						secondaryCol >= 0 &&
						secondaryCol < this.state.cols
					) {
						const isSecondaryModifiable = this.state.modifiableIndices.some(
							(index) => index.row === secondaryRow && index.col === secondaryCol,
						);

						if (isSecondaryModifiable) {
							return { row: secondaryRow, col: secondaryCol };
						}
					}
				}
			}
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

	private checkGrid() {
		const mistakes: GridIndex[] = [];
		const correctUsage: Record<string, number> = {};

		for (let i = 0; i < this.state.modifiableIndices.length; i++) {
			const gridIdx: GridIndex = this.state.modifiableIndices[i];
			const userLetter = this.state.grid[gridIdx.row][gridIdx.col].letter;
			const correctLetter = this.state.answerKey[gridIdx.row][gridIdx.col];

			if (correctLetter === userLetter) {
				correctUsage[userLetter] = (correctUsage[userLetter] || 0) + 1;
			} else {
				mistakes.push({ row: gridIdx.row, col: gridIdx.col });
			}
		}

		return { mistakes, correctUsage };
	}

	/** Checks the user’s grid against the answer key, updates tries/correct usage. */
	private handleSubmit() {
		const { gameComplete, triesLeft, answerKey } = this.state;
		if (gameComplete) return;

		// Decrement tries left
		const newTriesLeft = triesLeft - 1;

		// Use checkGrid to evaluate the current grid
		const { mistakes, correctUsage } = this.checkGrid();

		// Check if puzzle is solved or out of tries
		if (mistakes.length === 0) {
			alert("Congratulations! You completed the grid correctly.");
			this.setState({ gameComplete: true, correctLetters: correctUsage });
		} else if (newTriesLeft === 0) {
			alert("No more tries left. Revealing the correct solution.");
			const revealedGrid = answerKey.map((row) => row.map((letter) => ({ letter })));
			this.setState({
				grid: revealedGrid,
				triesLeft: 0,
				gameComplete: true,
				correctLetters: correctUsage,
				selectedCell: null,
			});
		} else {
			alert(
				`Some cells are incorrect. Mistakes: ${mistakes.length}. Keep trying!`,
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
			<div class="flex flex-col items-center">
				{/* Letter Bank */}
				<div class="flex flex-wrap justify-center gap-1 px-4 mb-2">
					{letterBank.split("").map((letter, index) => {
						let shouldStrikeThrough = false;
						if (correctLettersCopy[letter]) {
							shouldStrikeThrough = true;
							correctLettersCopy[letter]--;
						}
						return (
							<div
								key={index}
								class={`flex items-center justify-center border border-gray-400 h-8 w-8 text-black ${
									shouldStrikeThrough ? "bg-gray-300 bg-opacity-50 line-through" : "bg-white"
								}`}
							>
								{letter}
							</div>
						);
					})}
				</div>

				{/* Main row: Stopwatch, Grid, Tries Left */}
				<div class="flex w-full items-center justify-center px-2">
					{/* Side panels container */}
					<div class="flex w-full justify-between">
						{/* Stopwatch */}
						<div class="flex flex-col items-center justify-center w-20">
							<p class="text-sm font-bold text-gray-800">Time</p>
							<p class="text-xl text-blue-600">
								{seconds_to_display_string(elapsedTime)}
							</p>
						</div>

						{/* Grid */}
						<div class="flex-grow flex justify-center items-center">
							<div
								class="
                  relative 
                  max-w-[65vh] 
                  max-h-[65vh]
                  aspect-square 
                  w-full 
                  h-full 
                  grid
                  gap-1
                "
								style={{
									gridTemplateColumns: `repeat(${cols}, 1fr)`,
									gridTemplateRows: `repeat(${rows}, 1fr)`,
								}}
							>
								{grid.map((row, rowIndex) =>
									row.map((cell, colIndex) => {
										const isSelected = selectedCell?.row === rowIndex &&
											selectedCell?.col === colIndex;
										const isModifiable = modifiableIndices.some(
											(idx) => idx.row === rowIndex && idx.col === colIndex,
										);

										let backgroundColor = "bg-white";
										if (isSelected && isModifiable) {
                      // selected and not preset
											backgroundColor = "bg-yellow-200";
										} else if (isModifiable) {
                      // is not a preset square
											backgroundColor = "bg-gray-200";
										} else if (!isModifiable && cell.letter) {
                      // is a preset square
											backgroundColor = "bg-gray-300";
										}

										return (
											<div
												key={`${rowIndex}-${colIndex}`}
												class={`flex items-center justify-center border border-gray-400 text-black cursor-pointer ${backgroundColor}`}
												onClick={() => {
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
						</div>

						{/* Tries Left Display */}
						<div class="flex flex-col items-center justify-center w-20">
							<p class="text-sm font-bold text-gray-800">Tries</p>
							<p class="text-xl text-red-600">{triesLeft}</p>
						</div>
					</div>
				</div>

				{/* Submit Button */}
				<button
					class="px-4 py-1 my-4 bg-blue-500 text-white rounded hover:bg-blue-600"
					onClick={this.handleSubmit}
				>
					Submit Grid
				</button>
			</div>
		);
	}
}
