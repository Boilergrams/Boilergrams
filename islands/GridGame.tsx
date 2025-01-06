import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { isDigit, isLowerCase, randomizeString, seconds_to_display_string } from "../utils/utils.ts";

export default function GridGame() {
	const gridSize = useSignal({ rows: 0, cols: 0 });
	const grid = useSignal<{ letter: string }[][]>([]);
	const letterBank = useSignal<string>("");
	const selectedCell = useSignal<{ row: number; col: number } | null>(null);
	const modifiableIndices = useSignal<{ row: number; col: number }[]>([]);
	const correctLetters = useSignal<Record<string, number>>({});
	const answerKey = useSignal<string[][]>([]);
	const triesLeft = useSignal(6);
	const elapsedTime = useSignal(0);
	const gameComplete = useSignal(false);

	useEffect(() => {
        const preventScroll = (event: KeyboardEvent) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
            }
        };

        self.addEventListener("keydown", preventScroll);

        return () => {
            self.removeEventListener("keydown", preventScroll);
        };
    }, []);

	useEffect(() => { // makes this run every one second
		const timer = setInterval(() => {
			if (!gameComplete.value) {
				elapsedTime.value += 1;
			}
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const fetchGridData = async () => {
		try {
			const res = await fetch("/api/get_daily_boilergram");
			const data = await res.json();

			const dimensions = data.dimensions;
			gridSize.value = { rows: dimensions[0], cols: dimensions[1] };

			const tempGrid = Array(dimensions[0])
				.fill(null)
				.map(() => Array(dimensions[1]).fill({ letter: "" }));
			const answerGrid = Array(dimensions[0])
				.fill(null)
				.map(() => Array(dimensions[1]).fill("")); // For the correct grid

			const letters: string = data.data;
			let counter = 0;
			let letter_bank = "";
			const rows = dimensions[1];

			modifiableIndices.value = [];

			for (let i = 0; i < letters.length; i++) {
				const letter = letters[i];
				const rowIndex = Math.floor(counter / rows);
				const colIndex = counter % rows;

				if (isDigit(letter)) {
					counter += Number(letter);
				} else {
					if (isLowerCase(letter)) {
						letter_bank += letter;
						modifiableIndices.value.push({ row: rowIndex, col: colIndex });
						answerGrid[rowIndex][colIndex] = letter.toUpperCase(); // Add to answer key
						counter++;
					} else {
						tempGrid[rowIndex][colIndex] = { letter };
						answerGrid[rowIndex][colIndex] = letter; // Add to answer key
						counter++;
					}
				}
			}

			grid.value = tempGrid;
			selectedCell.value = modifiableIndices.value[0];
			letter_bank = letter_bank.toUpperCase();
			letter_bank = randomizeString(letter_bank, 42);
			letterBank.value = letter_bank;
			answerKey.value = answerGrid; // Save the correct answer key
		} catch (error) {
			console.error("Error fetching grid data:", error);
		}
	};

	useEffect(() => { // makes this run only once at the start
		fetchGridData();
	}, []);

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSubmit();
			return;
		}

		if (selectedCell.value !== null) {
			const { row, col } = selectedCell.value;

			if (e.key.startsWith("Arrow")) {
				if (e.key === "ArrowUp") {
					for (let new_row = row - 1; new_row >= 0; new_row--) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === new_row && index.col === col,
						);
						if (isModifiable) {
							selectedCell.value = { row: new_row, col };
							return;
						}
					}
				} else if (e.key === "ArrowDown") {
					for (let new_row = row + 1; new_row < gridSize.value.rows; new_row++) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === new_row && index.col === col,
						);
						if (isModifiable) {
							selectedCell.value = { row: new_row, col };
							return;
						}
					}
				} else if (e.key === "ArrowLeft") {
					for (let new_col = col - 1; new_col >= 0; new_col--) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === row && index.col === new_col,
						);
						if (isModifiable) {
							selectedCell.value = { row, col: new_col };
							return;
						}
					}
				} else if (e.key === "ArrowRight") {
					for (let new_col = col + 1; new_col < gridSize.value.cols; new_col++) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === row && index.col === new_col,
						);
						if (isModifiable) {
							selectedCell.value = { row, col: new_col };
							return;
						}
					}
				}

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

				const move = directions[e.key];
				if (move) {
					// Prioritize moving in the same direction regardless of distance
					const primaryTargets = modifiableIndices.value.filter(
						(index) =>
							(index.row - row) * move.primary[0] > 0 && (index.col - col) * move.primary[1] > 0 &&
							(index.row - row) * move.primary[1] === 0 && (index.col - col) * move.primary[0] === 0,
					);

					if (primaryTargets.length > 0) {
						const closestPrimary = primaryTargets.reduce((closest, current) => {
							const closestDistance = Math.abs(closest.row - row) + Math.abs(closest.col - col);
							const currentDistance = Math.abs(current.row - row) + Math.abs(current.col - col);
							return currentDistance < closestDistance ? current : closest;
						});
						selectedCell.value = { row: closestPrimary.row, col: closestPrimary.col };
						return;
					}

					// Check primary direction step by step
					for (let distance = 1; distance < Math.max(gridSize.value.rows, gridSize.value.cols); distance++) {
						const primaryRow = row + move.primary[0] * distance;
						const primaryCol = col + move.primary[1] * distance;

						if (
							primaryRow >= 0 &&
							primaryRow < gridSize.value.rows &&
							primaryCol >= 0 &&
							primaryCol < gridSize.value.cols
						) {
							const isPrimaryModifiable = modifiableIndices.value.some(
								(index) => index.row === primaryRow && index.col === primaryCol,
							);

							if (isPrimaryModifiable) {
								selectedCell.value = { row: primaryRow, col: primaryCol };
								return;
							}
						}

						// Check secondary directions if primary fails
						for (const sec of move.secondary) {
							for (
								let secondaryDistance = 1;
								secondaryDistance < Math.max(gridSize.value.rows, gridSize.value.cols);
								secondaryDistance++
							) {
								const secondaryRow = row + move.primary[0] * distance + sec[0] * secondaryDistance;
								const secondaryCol = col + move.primary[1] * distance + sec[1] * secondaryDistance;

								if (
									secondaryRow >= 0 &&
									secondaryRow < gridSize.value.rows &&
									secondaryCol >= 0 &&
									secondaryCol < gridSize.value.cols
								) {
									const isSecondaryModifiable = modifiableIndices.value.some(
										(index) => index.row === secondaryRow && index.col === secondaryCol,
									);

									if (isSecondaryModifiable) {
										selectedCell.value = { row: secondaryRow, col: secondaryCol };
										return;
									}
								}
							}
						}
					}
				}
				return;
			}

			const isModifiable = modifiableIndices.value.some(
				(index) => index.row === row && index.col === col,
			);

			if (isModifiable) {
				const updatedGrid = grid.value.map((r) => r.map((cell) => ({ ...cell })));
				if (e.key.length === 1 && e.key.match(/[A-Za-z]/)) {
					updatedGrid[row][col].letter = e.key.toUpperCase();
					grid.value = updatedGrid;
				}
				if (e.key === "Backspace") {
					updatedGrid[row][col].letter = "";
					grid.value = updatedGrid;
				}
			}
		}
	};

	const handleSubmit = () => {
		if (!gameComplete.value) {
			triesLeft.value--;
		}

		const currentGrid = grid.value.map((row) => row.map((cell) => cell.letter || ""));
		const mistakes: Array<{ row: number; col: number }> = [];
		const correctUsage: Record<string, number> = {}; // Track correct letter usage

		currentGrid.forEach((row, rowIndex) => {
			row.forEach((cell, colIndex) => {
				const correctLetter = answerKey.value[rowIndex][colIndex];
				const isModifiable = modifiableIndices.value.some(
					(index) => index.row === rowIndex && index.col === colIndex,
				);

				if (cell === correctLetter) {
					if (isModifiable) {
						correctUsage[cell] = (correctUsage[cell] || 0) + 1;
					}
				} else {
					mistakes.push({ row: rowIndex, col: colIndex });
				}
			});
		});

		// Update signal for correct letter usage
		correctLetters.value = correctUsage;

		if (mistakes.length === 0) {
			gameComplete.value = true;
			alert("Congratulations! You completed the grid correctly.");
		} else if (triesLeft.value == 0) {
			gameComplete.value = true;
			// modifiableIndices.value = [];
			selectedCell.value = null;
			grid.value = answerKey.value.map((row) => row.map((letter) => ({ letter })));
		} else {
			alert(`Some cells are incorrect. Number of mistakes: ${mistakes.length}. Keep trying!`);
		}
	};

	const correctLettersCopy = JSON.parse(JSON.stringify(correctLetters.value)); // this is needed for the Letter Bank

	return (
		<div
			class="flex flex-col items-center"
			tabIndex={0}
			onKeyDown={handleKeyPress}
		>
			{/* Letter Bank */}
			<div
				class="grid gap-1 mb-4"
				style={`
    grid-template-columns: repeat(${letterBank.value.length}, 1fr);
    grid-auto-flow: column;
    overflow-x: auto;
  `}
			>
				{letterBank.value.split("").map((letter, index) => {
					let shouldStrikeThrough = false;
					if (correctLettersCopy[letter]) {
						shouldStrikeThrough = true;
						correctLettersCopy[letter]--;
					}

					return (
						<div
							class={`flex items-center justify-center border border-gray-400 h-10 w-10 text-black ${
								shouldStrikeThrough ? "bg-gray-300 bg-opacity-50 line-through" : "bg-white"
							}`}
							key={index}
						>
							{letter}
						</div>
					);
				})}
			</div>

			{/* Stopwatch, Editable Grid, and Tries Left Display */}
			<div class="flex">
				{/* Stopwatch */}
				<div class="mr-4 flex flex-col items-center justify-center">
					<p class="text-lg font-bold text-gray-800">Elapsed Time</p>
					<p class="text-2xl text-blue-600">{seconds_to_display_string(elapsedTime.value)}</p>
				</div>

				{/* Editable Grid */}
				<div
					class="grid gap-1 mb-4"
					style={`grid-template-columns: repeat(${gridSize.value.cols}, 1fr)`}
				>
					{grid.value.map((row, rowIndex) =>
						row.map((cell, colIndex) => {
							const isSelected = selectedCell.value?.row === rowIndex &&
								selectedCell.value?.col === colIndex;

							const isModifiable = modifiableIndices.value.some(
								(index) => index.row === rowIndex && index.col === colIndex,
							);

							let backgroundColor = "bg-white";
							let borderStyle = "border-gray-100 border-2";

							if (isSelected && isModifiable) {
								backgroundColor = "bg-yellow-200";
								borderStyle = "border-gray-400 border-2";
							} else if (isModifiable) {
								backgroundColor = "bg-gray-200";
								borderStyle = "border-gray-400 border-2";
							} else if (!isModifiable && cell.letter) {
								backgroundColor = "bg-gray-200";
								borderStyle = "border-gray-200 border-2";
							}

							return (
								<div
									class={`flex items-center justify-center ${borderStyle} text-black h-10 w-10 cursor-pointer ${backgroundColor}`}
									key={`${rowIndex}-${colIndex}`}
									onClick={() => {
										selectedCell.value = { row: rowIndex, col: colIndex };
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
					<p class="text-2xl text-red-600">{triesLeft.value}</p>
				</div>
			</div>

			{/* Submit Button */}
			<button
				class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				onClick={handleSubmit}
				tabIndex={-1} // Prevent focus via Tab
			>
				Submit Grid
			</button>
		</div>
	);
}
