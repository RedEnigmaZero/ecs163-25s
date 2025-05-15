let abFilter = 25;
const width = window.innerWidth - 40;
const height = window.innerHeight - 80;

// Scatter plot Dimensions
let scatterLeft = 50, scatterTop = 20;
let scatterMargin = {top: 50, right: 30, bottom: 100, left: 70},
    scatterWidth = 450 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 400 - scatterMargin.top - scatterMargin.bottom;

// Bar Chart Dimensions
let distrLeft = 500, distrTop = 20;
let distrMargin = {top: 50, right: 30, bottom: 100, left: 70},
    distrWidth = 450 - distrMargin.left - distrMargin.right,
    distrHeight = 400 - distrMargin.top - distrMargin.bottom;

// Stream graph dimensions
let streamLeft = 0, streamTop = 375;
let streamMargin = {top: 20, right: 30, bottom: 30, left: 80},
    streamWidth = width - streamMargin.left - streamMargin.right,
    streamHeight = height - streamTop - streamMargin.top - streamMargin.bottom;

function dashboard() {

    
    const defultMargin = {top: 50, right: 30, bottom: 100, left: 70};

    // plots
    d3.csv("survey 605.csv").then(rawData =>{
        console.log("rawData", rawData);

        rawData.forEach(function(d){
            // Convert data as needed
            d.Age = d["What is your age?"];
            d.Gender = d["What is your gender?"];
            d.Exercise = d["How often do you exercise in a week?"];
            d.WearableUsage = d["How frequently do you use your fitness wearable?"];
            d.WearableImpact = d["How has the fitness wearable impacted your fitness routine?"];
            d.GoalAchievement = d["How has the fitness wearable helped you achieve your fitness goals?"];
            d.MotivationLevel = d["Has the fitness wearable helped you stay motivated to exercise?"];
        });

        console.log("processedData", rawData);

        //plot 1: Scatter Plot
        scatter(rawData, defultMargin);

        //plot 2: Bar Chart for impact of wearable by age
        bar(rawData, defultMargin);

        // plot 3: Stream graph for frequency by age and gender
        stream(rawData, defultMargin);

        }).catch(function(error){
        console.log(error);
    });
}

function scatter(data, margin) {
    const container = d3.select("#scatter-plot-container");
    container.selectAll("svg").remove();

    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;

    const scatterWidth = containerWidth - margin.left - margin.right;
    const scatterHeight = containerHeight - margin.top - margin.bottom;

    console.log("Scatter Container - Width:", containerWidth, "Height:", containerHeight);
    console.log("Scatter Plot Area - Width:", scatterWidth, "Height:", scatterHeight);

    if (scatterHeight < 0) scatterHeight = 0;


    const svg = container.append("svg")
        .attr("width", containerWidth + 5000)
        .attr("height", containerHeight);

        const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left + 50}, ${scatterMargin.top})`);

        // add title
        g1.append("text")
            .attr("x", scatterWidth / 2)
            .attr("y", -margin.top / 2 + 5)
            .attr("font-size", "16px")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text("Wearable Usage vs Exercise Frequency");

        const exerciseOrder = ["Less than once a week", "1-2 times a week", "3-4 times a week", "5 or more times a week"];
        const wearableOrder = ["Rarely", "1-2 times a week", "3-4 times a week", "Daily"];

        // X scale for wearable usage
        const x1 = d3.scalePoint()
        .domain(wearableOrder)
        .range([0, scatterWidth])
        .padding(0.5);

        // X label
        g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 80)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Usage Frequency");

        // Y scale for exercise frequency
        const y1 = d3.scalePoint()
        .domain(exerciseOrder)
        .range([scatterHeight, 0])
        .padding(0.5);

        // Y label
        g1.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("font-size", "12px")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text("Exercise Frequency");

        // X axis
        const xAxisCall = d3.axisBottom(x1);
        g1.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxisCall)
        .selectAll("text")
            .attr("y", "10")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

        // Y axis
        const yAxisCall = d3.axisLeft(y1);
        g1.append("g").call(yAxisCall);

        // Create color scale for gender
        const colorScale = d3.scaleOrdinal()
        .domain(["Male", "Female"])
        .range(["#1f77b4", "#d95555"]);

        // Compute count for each combination
        const combinationCounts = {};
        data.forEach(d => {
            const key = `${d.Exercise}-${d.WearableUsage}-${d.Gender}`;
            if (!combinationCounts[key]) {
                combinationCounts[key] = {
                    exercise: d.Exercise,
                    wearable: d.WearableUsage,
                    gender: d.Gender,
                    count: 0
                };
            }
            combinationCounts[key].count += 1;
        });

        // Convert to array
        const bubbleData = Object.values(combinationCounts);

        // Add circles for bubble chart
        g1.selectAll("circle")
        .data(bubbleData)
        .enter()
        .append("circle")
        .attr("cx", d => x1(d.wearable))
        .attr("cy", d => y1(d.exercise))
        .attr("r", d => Math.sqrt(d.count) * 5)
        .attr("fill", d => colorScale(d.gender))
        .attr("opacity", 0.7)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

        // Add legend for gender
        const legend1 = g1.append("g")
        .attr("transform", `translate(${scatterWidth - 115}, 0)`);

        const genderTypes = ["Male", "Female"];

        genderTypes.forEach((gender, i) => {
            const legendRow = legend1.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(gender));
            
            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 10)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text(gender);
        });

}

function bar(data, margin) {
    const container = d3.select("#bar-chart-container");
    container.selectAll("svg").remove();

    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;

    const distrWidth = containerWidth - margin.left - margin.right;
    const distrHeight = containerHeight - margin.top - margin.bottom;
    if (distrHeight < 0) distrHeight = 0;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight);

    const g2 = svg.append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`)
        // Add title
        g2.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", -5)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Wearable Impact by Age Group");

        // Process data for impact by age
        const ageGroups = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64"];
        const impactTypes = ["Positively impacted my fitness routine", "No impact on my fitness routine", "Negatively impacted my fitness routine", "I don't know"];
        
        // Count data by age and impact
        const ageImpactData = [];
        ageGroups.forEach(age => {
            const ageData = data.filter(d => d.Age === age);
            
            impactTypes.forEach(impact => {
                const count = ageData.filter(d => d.WearableImpact === impact).length;
                ageImpactData.push({
                    age: age,
                    impact: impact,
                    count: count
                });
            });
        });

        // X scale for age groups
        const x2 = d3.scaleBand()
        .domain(ageGroups)
        .range([0, distrWidth])
        .padding(0.2);

        // Y scale for counts
        const y2 = d3.scaleLinear()
        .domain([0, d3.max(ageImpactData, d => d.count)])
        .range([distrHeight, 0])
        .nice();

        // Create color scale for impact types
        const impactColorScale = d3.scaleOrdinal()
        .domain(impactTypes)
        .range(["#2ca02c", "#999999", "#d62728", "#f4ff29"]);

        // X label
        g2.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", distrHeight + 50)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Age Group");

        // Y label
        g2.append("text")
        .attr("x", -(distrHeight / 2))
        .attr("y", -40)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("font-weight", "bold")
        .text("Count");

        // X axis
        const xAxisCall2 = d3.axisBottom(x2);
        g2.append("g")
        .attr("transform", `translate(0, ${distrHeight})`)
        .call(xAxisCall2)
        .selectAll("text")
            .attr("y", "10")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

        // Y axis
        const yAxisCall2 = d3.axisLeft(y2);
        g2.append("g").call(yAxisCall2);

        // Create grouped bar chart
        g2.selectAll(".bar-group")
        .data(ageGroups)
        .enter()
        .append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(${x2(d)}, 0)`)
        .selectAll("rect")
        .data(d => {
            return impactTypes.map(impact => {
                const found = ageImpactData.find(item => item.age === d && item.impact === impact);
                return {
                    age: d,
                    impact: impact,
                    count: found ? found.count : 0
                };
            });
        })
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * (x2.bandwidth() / impactTypes.length))
        .attr("y", d => y2(d.count))
        .attr("width", x2.bandwidth() / impactTypes.length)
        .attr("height", d => distrHeight - y2(d.count))
        .attr("fill", d => impactColorScale(d.impact));

        // Add legend for impact types
        const legend2 = g2.append("g")
        .attr("transform", `translate(${distrWidth - 200}, 0)`);

        impactTypes.forEach((impact, i) => {
            const legendRow = legend2.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", impactColorScale(impact));
            
            legendRow.append("text")
                .attr("x", 15)
                .attr("y", 10)
                .attr("text-anchor", "start")
                .style("font-size", "10px")
                .text(impact);
        });
}

function stream(data, margin) {
    const container = d3.select("#stream-graph-container");
    container.selectAll("svg").remove();

    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;

    const streamWidth = containerWidth - margin.left - margin.right;
    const streamHeight = containerHeight + 80 - margin.top - margin.bottom;
    if (streamHeight < 0) streamHeight = 0;

    console.log("Stream Container - Width:", containerWidth, "Height:", containerHeight);
    console.log("Stream Graph Area - Width:", streamWidth, "Height:", streamHeight);

    if (streamHeight <= 0 || streamWidth <= 0) {
        console.error("Stream graph has NO DRAWING AREA. Height or Width is <= 0.");
        // Optionally, write this message to the container itself for visual feedback
        container.append("p").style("color", "red").text("Error: Stream graph has no drawing area.");
        return; // Exit if no space
    }

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight);

    const g3 = svg.append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`)

    g3.append("text")
        .attr("x", streamWidth / 2)
        .attr("y", -5)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Exercise Frequency by Age and Gender")

        // Process data for stream graph
        const exerciseFrequencies = ["Less than once a week", "1-2 times a week", "3-4 times a week", "5 or more times a week"];
        const genderTypes2 = ["Male", "Female", "Prefer not to say"];
        
        const ageGroups = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64"];

        const streamData = [];
        
        ageGroups.forEach(age => {
            const ageObject = {age: age};
            
            // For each gender and exercise frequency combination
            genderTypes2.forEach(gender => {
                exerciseFrequencies.forEach(freq => {
                    const key = `${gender}-${freq}`;
                    const count = data.filter(d => 
                        d.Age === age && 
                        d.Gender === gender && 
                        d.Exercise === freq
                    ).length;
                    
                    ageObject[key] = count;
                });
            });
            
            streamData.push(ageObject);
        });

        const keys = [];
        genderTypes2.forEach(gender => {
            exerciseFrequencies.forEach(freq => {
                keys.push(`${gender}-${freq}`);
            });
        });

    
        const stack = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetWiggle)
            .order(d3.stackOrderInsideOut);


        const stackedData = stack(streamData);

        // X scale for age groups
        const x3 = d3.scaleBand()
            .domain(ageGroups)
            .range([0, streamWidth])
            .padding(0.1);

        // Y scale for counts
        const y3 = d3.scaleLinear()
            .domain([
                d3.min(stackedData, layer => d3.min(layer, d => d[0])),
                d3.max(stackedData, layer => d3.max(layer, d => d[1]))
            ])
            .range([streamHeight, 0]);

        // Create a color scale for the stream layers
        const colorScale = d3.scaleOrdinal()
        .domain(["Male", "Female", "Prefer not to say"])
        .range(["#1f77b4", "#d95555", "#2ca02c"]);

        // Create the stream graph
        g3.selectAll("path")
            .data(stackedData)
            .enter()
            .append("path")
            .attr("d", d3.area()
                .x((d, i) => x3(d.data.age) + x3.bandwidth() / 2)
                .y0(d => y3(d[0]))
                .y1(d => y3(d[1]))
                .curve(d3.curveBasis)
            )
            .attr("fill", d => {
                const [gender] = d.key.split("-");
                return colorScale(gender);
            })
            .attr("opacity", 0.8)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5);

        // Add X axis
        const xAxisCall3 = d3.axisBottom(x3);
        g3.append("g")
            .attr("transform", `translate(0, ${streamHeight})`)
            .call(xAxisCall3);

        // X label
        g3.append("text")
            .attr("x", streamWidth / 2)
            .attr("y", streamHeight + 35)
            .attr("font-size", "14px")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text("Age Group");

        // Y label
        g3.append("text")
            .attr("x", -(streamHeight / 2))
            .attr("y", -45)
            .attr("font-size", "14px")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("font-weight", "bold")
            .text("Exercise Frequency Distribution");

        // Create legend for the stream graph
        const streamLegend = g3.append("g")
            .attr("transform", `translate(${streamWidth - 120}, 10)`);

        // Legend for gender
        genderTypes2.forEach((gender, i) => {
            const legendRow = streamLegend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(gender));
            
            legendRow.append("text")
                .attr("x", 15)
                .attr("y", 10)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text(gender);
        });

        // Add legend for exercise frequencies
        const freqLegend = g3.append("g")
            .attr("transform", `translate(${streamWidth - 320}, 10)`);

        freqLegend.append("text")
            .attr("x", 0)
            .attr("y", -5)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("Exercise Frequency:");

        exerciseFrequencies.forEach((freq, i) => {
            const legendRow = freqLegend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("text")
                .attr("x", 0)
                .attr("y", 10)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text(freq);
        });
}

dashboard();

window.addEventListener("resize", dashboard);