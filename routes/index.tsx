import GridGame from "../islands/GridGame.tsx";

export default function Home() {
	return (
		<div className="min-h-screen bg-white flex flex-col">
			<header className="text-center my-2">
				<h1 className="text-5xl font-bold text-[#CFB87C]">BOILERGRAMS</h1>
			</header>
			<main className="select-none outline-none flex-1">
				<GridGame />
			</main>
			<footer className="text-center mt-2">
				<p className="text-black">
					Website made by{" "}
					<a
						href="https://github.com/RushilShaw"
						target="_blank"
						className="text-[#CFB87C] no-underline"
					>
						Rushil Shah
					</a>{" "}
					and{" "}
					<a
						href="https://github.com/michaelyfu"
						target="_blank"
						className="text-[#CFB87C] no-underline"
					>
						Michael Fu
					</a>
					.
				</p>
				<p className="text-black">
					This project is open-source! You can contribute or learn more{" "}
					<a
						href="https://github.com/Boilergrams/Boilergrams"
						target="_blank"
						className="text-[#CFB87C] no-underline"
					>
						here
					</a>
					.
				</p>
			</footer>
		</div>
	);
}
