import React, { useState, useEffect, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [numPoints, setNumPoints] = useState(50);
  const [numStations, setNumStations] = useState(10);
  const [maxStations] = useState(15);
  const [numTrucks, setNumTrucks] = useState(5);

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const distance = (a, b) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  const generateGraph = useCallback(() => {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      points.push({
        id: i.toString(),
        x: Math.random() * 780 + 10,
        y: Math.random() * 580 + 10,
        weight: 0,
      });
    }

    const edges = [];
    for (let i = 0; i < numPoints; i++) {
      for (let j = i + 1; j < numPoints; j++) {
        edges.push({
          source: i.toString(),
          target: j.toString(),
          weight: distance(points[i], points[j]),
        });
      }
    }

    edges.sort((a, b) => a.weight - b.weight);

    const parent = Array(numPoints)
      .fill(null)
      .map((_, idx) => idx);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (i, j) => {
      parent[find(i)] = find(j);
    };

    const links = [];
    for (const edge of edges) {
      if (find(parseInt(edge.source)) !== find(parseInt(edge.target))) {
        union(parseInt(edge.source), parseInt(edge.target));
        links.push({ source: edge.source, target: edge.target });
      }
    }

    points.forEach((point) => {
      const existingConnections = links.filter(
        (link) => link.source === point.id || link.target === point.id
      ).length;
      const additionalConnections = randomInt(1, 3) - existingConnections;

      if (additionalConnections > 0) {
        const potentialConnections = points.filter(
          (p) =>
            p.id !== point.id &&
            !links.find(
              (link) =>
                (link.source === point.id && link.target === p.id) ||
                (link.source === p.id && link.target === point.id)
            )
        );
        const nearestPoints = potentialConnections
          .map((p) => ({ ...p, dist: distance(point, p) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, additionalConnections);

        nearestPoints.forEach((nearestPoint) => {
          links.push({ source: point.id, target: nearestPoint.id });
        });
      }
    });

    const shuffledNodes = points;
    const stations = shuffledNodes.slice(0, numStations);
    const truckStation = shuffledNodes[numStations];

    stations.forEach((node) => {
      node.station = true;
      node.weight = 0;
    });
    if (truckStation) truckStation.truck = true;

    setGraphData({ nodes: points, links });
  }, [numPoints, numStations]);

  useEffect(() => {
    generateGraph();
  }, [generateGraph]);

  const handleGenerateClick = () => {
    generateGraph();
  };

  const handleCalculateClick = () => {
    const points = graphData.nodes.map((node) => ({
      id: node.id.toString(),
      x: node.x,
      y: node.y,
      weight: node.weight,
    }));

    const weights = points.map((point) => point.weight);

    console.log("Points:", points);

    const distanceMatrix = graphData.links
      .map((link) => {
        const point1 = points.find(
          (point) => point.id === link.source.id.toString()
        );
        const point2 = points.find(
          (point) => point.id === link.target.id.toString()
        );

        if (!point1 || !point2) {
          console.error("Point not found for link:", link);
          return null;
        }

        return {
          source: link.source.id.toString(),
          target: link.target.id.toString(),
          distance: distance(point1, point2),
        };
      })
      .filter((item) => item !== null);

    console.log("Distance Matrix:", distanceMatrix);

    fetch("http://localhost:5000/calculate-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ points, weights, distanceMatrix, numTrucks }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error("Backend error:", data.error);
          return;
        }

        console.log("Backend response:", data);

        const { solution, distance } = data;

        console.log("Solution:", solution);
        console.log("Total Distance:", distance);

        const coloredLinks = graphData.links.map((link) => {
          let color = "black";
          solution.forEach((route, idx) => {
            for (let i = 0; i < route.nodes.length - 1; i++) {
              if (
                (route.nodes[i] === link.source.id.toString() &&
                  route.nodes[i + 1] === link.target.id.toString()) ||
                (route.nodes[i] === link.target.id.toString() &&
                  route.nodes[i + 1] === link.source.id.toString())
              ) {
                color = `hsl(${idx * 60}, 100%, 50%)`;
                break;
              }
            }
          });
          return { ...link, color };
        });

        setGraphData((prevData) => ({
          ...prevData,
          links: coloredLinks,
        }));
      })
      .catch((error) => console.error("Error:", error));
  };

  const handleNodeClick = (nodeId) => {
    const node = graphData.nodes.find((n) => n.id === nodeId);
    if (node && node.station) {
      const weight = prompt(
        "Enter weight for this station:",
        node.weight || "0"
      );
      if (weight !== null) {
        node.weight = parseInt(weight, 10);
        setGraphData({ ...graphData });
      }
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Truck Station App</h1>
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="form-group">
            <label htmlFor="numPoints">Number of Points</label>
            <input
              type="number"
              className="form-control"
              id="numPoints"
              value={numPoints}
              onChange={(e) => setNumPoints(+e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="form-group">
            <label htmlFor="numStations">Number of Stations</label>
            <input
              type="number"
              className="form-control"
              id="numStations"
              value={numStations}
              onChange={(e) =>
                setNumStations(Math.min(+e.target.value, maxStations))
              }
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="form-group">
            <label htmlFor="numTrucks">Number of Trucks</label>
            <input
              type="number"
              className="form-control"
              id="numTrucks"
              value={numTrucks}
              onChange={(e) => setNumTrucks(+e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="text-center mb-4">
        <button className="btn btn-primary mr-2" onClick={handleGenerateClick}>
          Generate Points
        </button>
        <button className="btn btn-success mr-2" onClick={handleCalculateClick}>
          Calculate Route
        </button>
      </div>
      <div
        className="graph-container"
        style={{
          backgroundColor: "#e3f2fd",
          padding: "20px",
          borderRadius: "10px",
          overflow: "hidden",
          width: "100%",
          height: "600px",
        }}
      >
        <ForceGraph2D
          width={document.querySelector(".graph-container")?.clientWidth || 720}
          height={
            document.querySelector(".graph-container")?.clientHeight || 580
          }
          graphData={graphData}
          nodeAutoColorBy="id"
          linkDirectionalParticles={4}
          linkDirectionalParticleSpeed={(d) => d.value * 0.02}
          linkWidth={(d) => d.value * 4}
          linkColor={(d) => d.color || "black"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const size = 16;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.station
              ? "#ff5722"
              : node.truck
              ? "#2196f3"
              : "#333";
            ctx.fill();
            ctx.strokeStyle = node.station
              ? "#d84315"
              : node.truck
              ? "#1e88e5"
              : "#000";
            ctx.stroke();
            ctx.closePath();
            ctx.font = `${size / 1.5}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#fff";
            ctx.fillText(node.id, node.x, node.y);
          }}
          onNodeClick={(node) => handleNodeClick(node.id)}
          enableNodeDrag={false}
        />
      </div>
    </div>
  );
};

export default App;
