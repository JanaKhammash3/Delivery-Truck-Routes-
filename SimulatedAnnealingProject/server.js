const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const distance = (point1, point2) => {
  if (!point1 || !point2) {
    console.error(
      "Invalid points provided for distance calculation:",
      point1,
      point2
    );
    throw new Error("Invalid points provided for distance calculation");
  }
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getTotalDistance = (solution, points, distanceMatrix) => {
  let totalDistance = 0;
  solution.forEach((route) => {
    for (let i = 0; i < route.length - 1; i++) {
      const point1 = points.find((p) => p.id === route[i]);
      const point2 = points.find((p) => p.id === route[i + 1]);
      if (!point1 || !point2) {
        console.error("Point not found:", route[i], route[i + 1]);
        continue;
      }
      const link = distanceMatrix.find(
        (d) =>
          (d.source === route[i] && d.target === route[i + 1]) ||
          (d.source === route[i + 1] && d.target === route[i])
      );
      if (link) {
        totalDistance += link.distance;
      } else {
        totalDistance += distance(point1, point2);
      }
    }
  });
  return totalDistance;
};

const initializeSolution = (points, numTrucks) => {
  const solution = Array.from({ length: numTrucks }, () => [10]);

  const weightedPoints = points.filter((point) => point.weight > 0);
  let truckIndex = 0;

  weightedPoints.forEach((point) => {
    solution[truckIndex].splice(-1, 0, point.id);
    truckIndex = (truckIndex + 1) % numTrucks;
  });

  solution.forEach((route) => route.push(10));

  return solution;
};

const generateNeighbor = (currentSolution, points, distanceMatrix) => {
  let newSolution = JSON.parse(JSON.stringify(currentSolution));
  const truckIndex = Math.floor(Math.random() * newSolution.length);

  if (newSolution[truckIndex].length > 2) {
    const swapIndex1 =
      Math.floor(Math.random() * (newSolution[truckIndex].length - 2)) + 1;
    const swapIndex2 =
      Math.floor(Math.random() * (newSolution[truckIndex].length - 2)) + 1;

    const temp = newSolution[truckIndex][swapIndex1];
    newSolution[truckIndex][swapIndex1] = newSolution[truckIndex][swapIndex2];
    newSolution[truckIndex][swapIndex2] = temp;

    for (let i = 0; i < newSolution[truckIndex].length - 1; i++) {
      const point1 = points.find((p) => p.id === newSolution[truckIndex][i]);
      const point2 = points.find(
        (p) => p.id === newSolution[truckIndex][i + 1]
      );

      if (!point1 || !point2) {
        console.error(
          "Point not found during neighbor generation:",
          point1,
          point2
        );
        continue;
      }

      const link = distanceMatrix.find(
        (d) =>
          (d.source === newSolution[truckIndex][i] &&
            d.target === newSolution[truckIndex][i + 1]) ||
          (d.source === newSolution[truckIndex][i + 1] &&
            d.target === newSolution[truckIndex][i])
      );
      if (!link) {
        const nearestNeighbor = points.find(
          (p) =>
            p.id !== newSolution[truckIndex][i] &&
            distance(point1, p) < distance(point2, point1)
        );
        if (!nearestNeighbor) {
          console.error("No nearest neighbor found for point:", point1);
          throw new Error("No nearest neighbor found for point");
        }
        newSolution[truckIndex].splice(i + 1, 0, nearestNeighbor.id);
      }
    }
  }

  return newSolution;
};

const simulatedAnnealing = (
  points,
  distanceMatrix,
  numTrucks,
  initialTemperature = 1000,
  coolingRate = 0.003
) => {
  let currentSolution = initializeSolution(points, numTrucks);

  console.log("Initial Solution:", currentSolution);
  console.log(
    "Initial Total Distance:",
    getTotalDistance(currentSolution, points, distanceMatrix)
  );

  let bestSolution = JSON.parse(JSON.stringify(currentSolution));
  let bestDistance = getTotalDistance(bestSolution, points, distanceMatrix);

  let temperature = initialTemperature;

  while (temperature > 1) {
    let newSolution = generateNeighbor(currentSolution, points, distanceMatrix);
    const currentDistance = getTotalDistance(
      currentSolution,
      points,
      distanceMatrix
    );
    const newDistance = getTotalDistance(newSolution, points, distanceMatrix);

    if (
      newDistance < currentDistance ||
      Math.exp((currentDistance - newDistance) / temperature) > Math.random()
    ) {
      currentSolution = newSolution;
    }

    if (newDistance < bestDistance) {
      bestSolution = newSolution;
      bestDistance = newDistance;
    }

    temperature *= 1 - coolingRate;

    console.log("Neighbor Solution:", newSolution);
    console.log("Total Distance:", newDistance);
  }

  console.log("Final Solution:", bestSolution);
  console.log("Final Distance:", bestDistance);

  return { solution: bestSolution, distance: bestDistance };
};

app.post("/calculate-route", (req, res) => {
  try {
    const { points, weights, distanceMatrix, numTrucks } = req.body;

    console.log("Received request with data:", {
      points,
      weights,
      distanceMatrix,
      numTrucks,
    });

    const result = simulatedAnnealing(points, distanceMatrix, numTrucks);

    const formattedSolution = result.solution.map((route) => ({
      nodes: route,
      distance: getTotalDistance([route], points, distanceMatrix),
    }));

    console.log("Formatted Solution:", formattedSolution);
    console.log("Total Distance:", result.distance);

    res.json({ solution: formattedSolution, distance: result.distance });
  } catch (error) {
    console.error("Error calculating route:", error);
    res
      .status(500)
      .json({ error: "An error occurred while calculating the route" });
  }
});

app.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});
