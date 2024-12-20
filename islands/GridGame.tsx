import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { isDigit, isLowerCase, randomizeString } from "../utils/utils.ts";

export default function GridGame() {
	const gridSize = useSignal({ rows: 0, cols: 0 });
	const grid = useSignal<{ letter: string }[][]>([]);
	const letterBank = useSignal<string>("");
	const selectedCell = useSignal<{ row: number; col: number } | null>(null);
	const modifiableIndices = useSignal<{ row: number; col: number }[]>([]);
	const correctLetters = useSignal<Record<string, number>>({});
	const answerKey = useSignal<string[][]>([]);

	const fetchGridData = async () => {
		try {
			const res = await fetch("http://localhost:8000/api/get_daily_boilergram");
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
			letter_bank = letter_bank.toUpperCase();
			letter_bank = randomizeString(letter_bank, 42);
			letterBank.value = letter_bank;
			answerKey.value = answerGrid; // Save the correct answer key

		} catch (error) {
			console.error("Error fetching grid data:", error);
		}
	};

	useEffect(() => {
		fetchGridData();
	}, []);

	const handleKeyPress = (e: KeyboardEvent) => {
		if (selectedCell.value !== null) {
			const { row, col } = selectedCell.value;

			if (e.key.startsWith("Arrow")) {
				if (e.key === "ArrowUp") {
					for (let new_row = row - 1; new_row >= 0; new_row--) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === new_row && index.col === col
						);
						if (isModifiable) {
							selectedCell.value = { row: new_row, col };
							break;
						}
					}
				} else if (e.key === "ArrowDown") {
					for (let new_row = row + 1; new_row < gridSize.value.rows; new_row++) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === new_row && index.col === col
						);
						if (isModifiable) {
							selectedCell.value = { row: new_row, col };
							break;
						}
					}
				} else if (e.key === "ArrowLeft") {
					for (let new_col = col - 1; new_col >= 0; new_col--) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === row && index.col === new_col
						);
						if (isModifiable) {
							selectedCell.value = { row, col: new_col };
							break;
						}
					}
				} else if (e.key === "ArrowRight") {
					for (let new_col = col + 1; new_col < gridSize.value.cols; new_col++) {
						const isModifiable = modifiableIndices.value.some(
							(index) => index.row === row && index.col === new_col
						);
						if (isModifiable) {
							selectedCell.value = { row, col: new_col };
							break;
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
			alert("Congratulations! You completed the grid correctly.");
		} else {
			alert(`Some cells are incorrect. Number of mistakes: ${mistakes.length}. Keep trying!`);
		}
	};

	const correctLettersCopy = JSON.parse(JSON.stringify(correctLetters.value));

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
				{
				letterBank.value.split("").map((letter, index) => {
					let shouldStrikeThrough = false;
					if (correctLettersCopy[letter]) {
						shouldStrikeThrough = true;
						correctLettersCopy[letter]--;
					}

					return (
						<div
							class={`flex items-center justify-center border border-gray-400 bg-white text-black h-10 w-10 ${
								shouldStrikeThrough ? "line-through" : ""
							}`}
							key={index}
						>
							{letter}
						</div>
					);
				})}
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
						if (isSelected && isModifiable) {
							backgroundColor = "bg-yellow-200";
						} else if (isModifiable) {
							backgroundColor = "bg-gray-200";
						} else if (!isModifiable && cell.letter) {
							backgroundColor = "bg-gray-300";
						}

						return (
							<div
								class={`flex items-center justify-center border border-gray-400 text-black h-10 w-10 cursor-pointer ${backgroundColor}`}
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

			{/* Submit Button */}
			<button
				class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				onClick={handleSubmit}
			>
				Submit Grid
			</button>
		</div>
	);
}
