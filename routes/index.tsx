import GridGame from "../islands/GridGame.tsx";

export default function Home() {
    return (
        <div style={{ backgroundColor: "white", color: "gold", minHeight: "100vh" }}>
            <header style={{ textAlign: "center", margin: "20px 0" }}>
                <h1 style={{ fontSize: "4rem", fontWeight: "bold", color: "#CFB87C" }}>BOILERGRAMS</h1>
            </header>
            <main style={{ userSelect: "none", outline: "none" }}>
                <GridGame />
            </main>
            <footer style={{ textAlign: "center", marginTop: "40px" }}>
                <p style={{ color: "black" }}>
                    Website made by{" "}
                    <a
                        href="https://github.com/RushilShaw"
                        target="_blank"
                        style={{ color: "#CFB87C", textDecoration: "none" }}
                    >
                        Rushil Shah
                    </a>
                </p>
                <p style={{ color: "black" }}>
                    This project is open-source! You can contribute or learn more{" "}
                    <a
                        href="https://github.com/Boilergrams/Boilergrams"
                        target="_blank"
                        style={{ color: "#CFB87C", textDecoration: "none" }}
                    >
                        here
                    </a>.
                </p>
            </footer>
        </div>
    );
}
