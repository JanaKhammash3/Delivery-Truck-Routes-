document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const truckCapacityField = document.getElementById("truck-capacity");
    const numTrucksField = document.getElementById("num-trucks");
    const weightField = document.getElementById("weight");
    const randomRoutesButton = document.getElementById("random-routes");
    const optimizeRoutesButton = document.getElementById("optimize-routes");
    const randomRouteDistanceLabel = document.getElementById("random-route-distance");
    const optimalRouteDistanceLabel = document.getElementById("optimal-route-distance");
    const deliveryPointList = document.getElementById("delivery-point-list");

    const depot = { x: 400, y: 300 };
    let deliveryPoints = [];
    let randomRoute = null;
    let bestRoute = null;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addDeliveryPoint(x, y);
    });

    randomRoutesButton.addEventListener("click", initializeRandomRoutes);
    optimizeRoutesButton.addEventListener("click", () => {
        const optimized = startSimulatedAnnealing(randomRoute);
        if (optimized.distance < calculateTotalDistance(randomRoute)) {
            randomRoute = optimized.route;
            optimalRouteDistanceLabel.textContent = `Optimal Route Distance: ${optimized.distance.toFixed(2)}`;
        } else {
            optimalRouteDistanceLabel.textContent = `Optimization failed to improve the route.`;
        }
        draw();
    });

    function addDeliveryPoint(x, y) {
        const weight = parseInt(weightField.value);
        deliveryPoints.push({ x, y, weight });
        const listItem = document.createElement("li");
        listItem.textContent = `Point (${x}, ${y}) - Weight: ${weight}`;
        deliveryPointList.appendChild(listItem);
        draw();
    }

    function initializeRandomRoutes() {
        const truckCapacity = parseInt(truckCapacityField.value);
        const numTrucks = parseInt(numTrucksField.value);

        const trucks = [];
        for (let i = 0; i < numTrucks; i++) {
            trucks.push({ capacity: truckCapacity, load: 0, route: [] });
        }

        const shuffledPoints = deliveryPoints.slice().sort(() => Math.random() - 0.5);
        let truckIndex = 0;

        shuffledPoints.forEach(dp => {
            let assigned = false;
            while (!assigned && truckIndex < trucks.length) {
                if (trucks[truckIndex].load + dp.weight <= trucks[truckIndex].capacity) {
                    trucks[truckIndex].route.push(dp);
                    trucks[truckIndex].load += dp.weight;
                    assigned = true;
                } else {
                    truckIndex++;
                    if (truckIndex >= trucks.length) {
                        truckIndex = 0;
                    }
                }
            }
        });

        randomRoute = trucks.filter(truck => truck.route.length > 0).map(truck => truck.route);

        const totalDistance = calculateTotalDistance(randomRoute);
        randomRouteDistanceLabel.textContent = `Random Route Distance: ${totalDistance.toFixed(2)}`;
        optimalRouteDistanceLabel.textContent = "Optimal Route Distance: 0";

        draw();
    }

    function startSimulatedAnnealing(route) {
        const initialTemperature = 10000;
        const coolingRate = 0.99;
        const absoluteTemperature = 0.01;

        let temp = initialTemperature;
        let bestRoute = JSON.parse(JSON.stringify(route));
        let bestDistance = calculateTotalDistance(bestRoute);

        while (temp > absoluteTemperature) {
            let newRoute = JSON.parse(JSON.stringify(bestRoute));

            const truckIndex1 = Math.floor(Math.random() * newRoute.length);
            const truckIndex2 = Math.floor(Math.random() * newRoute.length);

            if (truckIndex1 !== truckIndex2 && newRoute[truckIndex1].length > 0 && newRoute[truckIndex2].length > 0) {
                const pointIndex1 = Math.floor(Math.random() * newRoute[truckIndex1].length);
                const pointIndex2 = Math.floor(Math.random() * newRoute[truckIndex2].length);

                const dp1 = newRoute[truckIndex1][pointIndex1];
                const dp2 = newRoute[truckIndex2][pointIndex2];

                if ((getTruckLoad(newRoute[truckIndex1]) - dp1.weight + dp2.weight <= truckCapacityField.value) &&
                    (getTruckLoad(newRoute[truckIndex2]) - dp2.weight + dp1.weight <= truckCapacityField.value)) {
                    
                    newRoute[truckIndex1][pointIndex1] = dp2;
                    newRoute[truckIndex2][pointIndex2] = dp1;
                }
            }

            let newDistance = calculateTotalDistance(newRoute);
            let deltaE = newDistance - bestDistance;

            if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temp)) {
                bestRoute = newRoute;
                bestDistance = newDistance;
            }

            temp *= coolingRate;
        }

        return {
            route: bestRoute,
            distance: bestDistance
        };
    }

    function calculateTotalDistance(route) {
        let totalDistance = 0;

        route.forEach(truck => {
            let previous = depot;
            truck.forEach(dp => {
                totalDistance += distance(previous, dp);
                previous = dp;
            });
            totalDistance += distance(previous, depot);
        });

        return totalDistance;
    }

    function getTruckLoad(truckRoute) {
        return truckRoute.reduce((total, dp) => total + dp.weight, 0);
    }

    function distance(point1, point2) {
        return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(depot.x, depot.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "black";
        deliveryPoints.forEach(dp => {
            ctx.beginPath();
            ctx.arc(dp.x, dp.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        if (randomRoute) {
            const colors = ["blue", "green", "orange", "magenta", "cyan"];
            let colorIndex = 0;

            randomRoute.forEach(truck => {
                ctx.strokeStyle = colors[colorIndex++ % colors.length];
                ctx.beginPath();
                let previous = depot;
                truck.forEach(dp => {
                    ctx.moveTo(previous.x, previous.y);
                    ctx.lineTo(dp.x, dp.y);
                    previous = dp;
                });
                ctx.lineTo(previous.x, previous.y);
                ctx.lineTo(depot.x, depot.y);
                ctx.stroke();
            });
        }

        if (bestRoute) {
            const colors = ["blue", "green", "orange", "magenta", "cyan"];
            let colorIndex = 0;

            bestRoute.forEach(truck => {
                ctx.strokeStyle = colors[colorIndex++ % colors.length];
                ctx.beginPath();
                let previous = depot;
                truck.forEach(dp => {
                    ctx.moveTo(previous.x, previous.y);
                    ctx.lineTo(dp.x, dp.y);
                    previous = dp;
                });
                ctx.lineTo(previous.x, previous.y);
                ctx.lineTo(depot.x, depot.y);
                ctx.stroke();
            });
        }
    }
});
