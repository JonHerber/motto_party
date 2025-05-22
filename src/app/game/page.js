"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const GamePage = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Game constants
  const playerWidth = 30;
  const playerHeight = 50;
  const gravity = 0.5;
  const jumpStrength = -10;
  const playerSpeed = 5;
  const obstacleWidth = 50;
  const obstacleHeight = 50;
  const obstacleSpeed = 3;

  // Game state
  let playerX, playerY, playerVelocityY;
  let obstacles = [];
  let gameFrame = 0;

  // House backgrounds (simplified)
  const houseThemes = [
    { color: "bg-blue-300", motto: "Party Animals Only!" },
    { color: "bg-green-300", motto: "80s Throwback Bash" },
    { color: "bg-yellow-300", motto: "Superhero Soiree" },
    { color: "bg-red-300", motto: "Tropical Luau" },
    { color: "bg-indigo-300", motto: "Mystery Masquerade" },
  ];
  const [currentHouseIndex, setCurrentHouseIndex] = useState(0);

  function initializeGame() {
    const canvas = canvasRef.current;
    playerX = 50;
    playerY = canvas.height - playerHeight - 20; // Start on the "ground"
    playerVelocityY = 0;
    obstacles = [];
    setScore(0);
    setGameOver(false);
    gameFrame = 0;
    spawnInitialObstacles();
  }

  function spawnObstacle() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newObstacle = {
      x: canvas.width,
      y: canvas.height - obstacleHeight - 20, // Ground level
      width: obstacleWidth,
      height: obstacleHeight,
      color: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
    };
    obstacles.push(newObstacle);
  }

  function spawnInitialObstacles() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Spawn a few obstacles at the start, spaced out
    for (let i = 0; i < 3; i++) {
        const newObstacle = {
            x: canvas.width + i * (canvas.width / 2 + Math.random() * 100), // Spread them out
            y: canvas.height - obstacleHeight - 20,
            width: obstacleWidth,
            height: obstacleHeight,
            color: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
        };
        obstacles.push(newObstacle);
    }
  }


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth * 0.8;
    canvas.height = 400;

    initializeGame();

    const handleKeyDown = (e) => {
      if (e.code === "Space" && playerY >= canvas.height - playerHeight - 20 - 5) { // Allow jump only if on ground or very close
        playerVelocityY = jumpStrength;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    let animationFrameId;

    const gameLoop = () => {
      if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "40px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
        window.addEventListener('keydown', (e) => {
          if (e.key === 'r' || e.key === 'R') initializeGame();
        }, { once: true });
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background (cycling through houses)
      const currentHouse = houseThemes[currentHouseIndex];
      ctx.fillStyle = currentHouse.color.replace('bg-', '').replace('-300', ''); // Simplified color
      // A bit hacky to convert tailwind bg to canvas fillStyle, ideally use hex or rgb directly
      if (currentHouse.color === "bg-blue-300") ctx.fillStyle = "#93c5fd";
      if (currentHouse.color === "bg-green-300") ctx.fillStyle = "#86efac";
      if (currentHouse.color === "bg-yellow-300") ctx.fillStyle = "#fde047";
      if (currentHouse.color === "bg-red-300") ctx.fillStyle = "#fca5a5";
      if (currentHouse.color === "bg-indigo-300") ctx.fillStyle = "#a5b4fc";

      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(currentHouse.motto, canvas.width / 2, 30);


      // Player physics
      playerVelocityY += gravity;
      playerY += playerVelocityY;

      // Ground collision
      if (playerY > canvas.height - playerHeight - 20) {
        playerY = canvas.height - playerHeight - 20;
        playerVelocityY = 0;
      }

      // Draw player
      ctx.fillStyle = "purple";
      ctx.fillRect(playerX, playerY, playerWidth, playerHeight);

      // Obstacles
      if (gameFrame % 150 === 0 && Math.random() < 0.7) { // Spawn obstacles periodically
        spawnObstacle();
      }

      obstacles.forEach((obstacle, index) => {
        obstacle.x -= obstacleSpeed;
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        // Collision detection
        if (
          playerX < obstacle.x + obstacle.width &&
          playerX + playerWidth > obstacle.x &&
          playerY < obstacle.y + obstacle.height &&
          playerY + playerHeight > obstacle.y
        ) {
          setGameOver(true);
        }

        // Remove off-screen obstacles and increment score
        if (obstacle.x + obstacle.width < 0) {
          obstacles.splice(index, 1);
          setScore((s) => s + 1);
          // Change house theme when score increases by a certain amount
          if ((score + 1) % 5 === 0) {
            setCurrentHouseIndex((prevIndex) => (prevIndex + 1) % houseThemes.length);
          }
        }
      });
      
      // Draw score
      ctx.fillStyle = "black";
      ctx.font = "20px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${score}`, 20, 30);

      gameFrame++;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver]); // Re-run effect if gameOver state changes to handle restart

  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center p-4">
      <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Arcade Minigame</h1>
        <Link href="/" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors">
          Back to Mottos
        </Link>
      </nav>
      <canvas ref={canvasRef} className="border-2 border-gray-700 rounded-lg shadow-2xl mt-16"></canvas>
      {gameOver && (
        <button
          onClick={initializeGame}
          className="mt-8 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 transition-colors text-xl"
        >
          Restart Game
        </button>
      )}
       <p className="mt-4 text-lg">Press SPACE to Jump!</p>
    </div>
  );
};

export default GamePage;
