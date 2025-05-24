// --- Global Variables & Initial Setup ---
let allData = [];
let uniqueGenres = [];
let selectedGenres = [];

const mentalHealthAspects = ['Anxiety', 'Depression', 'Insomnia', 'OCD'];
const ageBinThresholds = [10, 18, 25, 35, 45, 55, 65, 75];
const generalMargin = { top: 50, right: 30, bottom: 70, left: 70 }; // Increased top/bottom for titles/axes

// --- Data Loading and Initial Processing ---
d3.csv("./data/mxmh_survey_results.csv").then(loadedData => {
    loadedData.forEach(d => {
        d.ID = +d.ID;
        d.Age = +d.Age;
        d['Hours per day'] = +d['Hours per day'];
        d.BPM = +d.BPM;
        mentalHealthAspects.forEach(aspect => {
            d[aspect] = parseFloat(d[aspect]);
            if (isNaN(d[aspect])) d[aspect] = null;
        });
        if (d['Fav genre']) d['Fav genre'] = d['Fav genre'].trim();
        if (d['Music effects']) d['Music effects'] = d['Music effects'].trim();
    });

    allData = loadedData;
    uniqueGenres = [...new Set(allData.map(d => d['Fav genre']))].filter(Boolean).sort();

    populateGenreChecklist(uniqueGenres);
    populateYAxisMetricSelect();
    updateVisualizations();
}).catch(error => {
    console.error("Error loading or parsing data:", error);
    d3.select("body").append("div").style("color", "red").style("padding", "20px")
      .html("<h2>Error Loading Data</h2><p>Could not load data. Check console and file path.</p>");
});

// --- Populate Dynamic Controls ---
function populateGenreChecklist(genres) {
    const checklistContainer = d3.select("#genre-checklist");
    checklistContainer.html("");
    genres.forEach(genre => {
        const label = checklistContainer.append("label");
        label.append("input").attr("type", "checkbox").attr("class", "genre-checkbox")
            .attr("value", genre).property("checked", true).on("change", handleGenreChange);
        label.append("span").text(genre);
    });
    selectedGenres = [...genres];
    d3.select("#select-all-genres").on("click", () => {
        d3.selectAll(".genre-checkbox").property("checked", true);
        selectedGenres = [...uniqueGenres];
        updateVisualizations();
    });
    d3.select("#deselect-all-genres").on("click", () => {
        d3.selectAll(".genre-checkbox").property("checked", false);
        selectedGenres = [];
        updateVisualizations();
    });
}

function populateYAxisMetricSelect() {
    const select = d3.select("#y-axis-metric-select");
    select.html("");
    mentalHealthAspects.forEach(metric => {
        select.append("option").attr("value", metric).text(metric);
    });
    select.on("change", () => {
        const currentDataForScatter = getCurrentFilteredData();
        createScatterPlot(currentDataForScatter);
    });
}

// --- Event Handlers ---
function handleGenreChange() {
    selectedGenres = [];
    d3.selectAll(".genre-checkbox:checked").each(function() { selectedGenres.push(this.value); });
    updateVisualizations();
}

// --- Utility function to get currently filtered data ---
function getCurrentFilteredData() {
    if (selectedGenres.length === 0) return allData; // Show all if no genres selected
    return allData.filter(d => d['Fav genre'] && selectedGenres.includes(d['Fav genre']));
}

// --- Master Update Function ---
function updateVisualizations() {
    const currentFilteredData = getCurrentFilteredData();
    createStreamGraph(currentFilteredData, mentalHealthAspects, ageBinThresholds);
    createScatterPlot(currentFilteredData);
    createPieChart(currentFilteredData);
}

// --- Chart Drawing Functions ---

function createPieChart(data) {
    const container = d3.select("#pie-chart-container");
    container.html("");

    if (!data || data.length === 0) {
        container.append("p").style("text-align", "center").style("padding-top", "20px")
            .text("No data for Pie Chart based on current filters.");
        return;
    }

    const effectsCounts = d3.rollup(data, v => v.length, d => d['Music effects']);
    const pieData = Array.from(effectsCounts, ([key, value]) => ({ key, value }))
                        .filter(d => d.key && d.value > 0); // Ensure key exists and value is positive

    if (pieData.length === 0) {
        container.append("p").style("text-align", "center").style("padding-top", "20px")
            .text("No 'Music effects' data for selected genres.");
        return;
    }

    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    const radius = Math.min(width, height) / 2.5; // Adjusted radius for legend and title

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 + 10})`); // Center pie, leave space for title

    const color = d3.scaleOrdinal(d3.schemePastel1).domain(pieData.map(d => d.key));
    const pie = d3.pie().sort(null).value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.7).outerRadius(radius * 0.7);

    const total = d3.sum(pieData, d => d.value);

    const g = svg.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc");

    g.append("path")
        .attr("d", arc)
        .style("fill", d => color(d.data.key))
        .style("stroke", "#fff")
        .style("stroke-width", "2px");

    g.append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text(d => `${d.data.key} (${((d.data.value / total) * 100).toFixed(1)}%)`);

    container.select("svg").append("text") // Add title to the SVG
        .attr("x", width / 2)
        .attr("y", generalMargin.top / 2) // Position title at the top
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Music's Impact on Mental Health");
}


function createScatterPlot(data) {
    const container = d3.select("#scatter-plot-container");
    container.select("svg").remove(); // Clear previous SVG, keeping controls

    if (!data || data.length === 0) {
        container.append("p").attr("class","temp-message").style("text-align", "center").style("padding-top", "20px")
            .text("No data for Scatter Plot based on current filters.");
        return;
    }
    container.select(".temp-message").remove();


    const containerRect = container.node().getBoundingClientRect();
    // Subtract space for controls if they are inside the container affecting height
    const controlHeight = d3.select(".scatter-controls").node()?.getBoundingClientRect().height || 0;
    const width = containerRect.width - generalMargin.left - generalMargin.right;
    const height = containerRect.height - generalMargin.top - generalMargin.bottom - controlHeight;

    if (width <= 0 || height <= 0) return; // Not enough space

    const svg = container.append("svg")
        .attr("width", containerRect.width)
        .attr("height", containerRect.height)
        .append("g")
        .attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight})`);

    const selectedYMetric = d3.select("#y-axis-metric-select").property("value");
    const genresForXAxis = selectedGenres.length > 0 ? selectedGenres : uniqueGenres;

    const xScale = d3.scalePoint().domain(genresForXAxis).range([0, width]).padding(0.5);
    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d[selectedYMetric])).nice()
        .range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(genresForXAxis);

    svg.append("g").attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));

    const jitterWidth = xScale.step() * 0.4; // Jitter within 40% of the step width

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svg.selectAll(".dot")
        .data(data.filter(d => d['Fav genre'] && genresForXAxis.includes(d['Fav genre']) && d[selectedYMetric] !== null))
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d['Fav genre']) + (Math.random() - 0.5) * jitterWidth)
        .attr("cy", d => yScale(d[selectedYMetric]))
        .attr("r", 4)
        .style("fill", d => colorScale(d['Fav genre']))
        .style("opacity", 0.7)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Genre: ${d['Fav genre']}<br/>${selectedYMetric}: ${d[selectedYMetric]}<br/>Age: ${d.Age}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    svg.append("text") // X-axis label
        .attr("transform", `translate(${width / 2}, ${height + generalMargin.bottom - 15})`)
        .style("text-anchor", "middle").style("font-size", "12px")
        .text("Favorite Genre");

    svg.append("text") // Y-axis label
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - generalMargin.left + 15)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em").style("text-anchor", "middle").style("font-size", "12px")
        .text(selectedYMetric);

    svg.append("text") // Chart title
        .attr("x", width / 2)
        .attr("y", 0 - (generalMargin.top / 2) - (controlHeight > 0 ? 5 : 0))
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold")
        .text(`Genre vs. ${selectedYMetric}`);
}


function processDataForRefinedStream(dataToProcess, mentalHealthLayers, ageThresholds) {
    const validData = dataToProcess.filter(d =>
        d.Age != null && !isNaN(d.Age) &&
        mentalHealthLayers.every(layer => d[layer] != null && !isNaN(d[layer]))
    );

    const ageBinner = d3.bin()
        .value(d => +d.Age)
        .domain(d3.extent(validData, d => +d.Age))
        .thresholds(ageThresholds);
    const binnedByAge = ageBinner(validData);

    const finalStreamData = binnedByAge.map(bin => {
        const entry = { age_group_label: `${bin.x0}-${bin.x1}`, xValue: (bin.x0 + bin.x1) / 2 };
        if (bin.length === 0) {
            mentalHealthLayers.forEach(layer => entry[layer] = 0);
        } else {
            mentalHealthLayers.forEach(layer => {
                entry[layer] = d3.mean(bin, d => d[layer]);
            });
        }
        return entry;
    });
    return finalStreamData.filter(d => d.xValue !== undefined && !isNaN(d.xValue));
}

function createStreamGraph(data, layers, xBinThresholds) {
    const container = d3.select("#stream-graph-container");
    container.html("");

    if (!data || data.length === 0) {
        container.append("p").style("text-align", "center").style("padding-top", "20px")
            .text("No data for Stream Graph based on current filters.");
        return;
    }

    const streamData = processDataForRefinedStream(data, layers, xBinThresholds);

    if (!streamData || streamData.length < 2) { // Need at least 2 points for a stream
        container.append("p").style("text-align", "center").style("padding-top", "20px")
            .text("Not enough data points to draw Stream Graph after processing.");
        return;
    }

    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width - generalMargin.left - generalMargin.right;
    const height = containerRect.height - generalMargin.top - generalMargin.bottom - 30; // Extra space for legend

    if (width <= 0 || height <= 0) return;

    const svg = container.append("svg")
        .attr("width", containerRect.width)
        .attr("height", containerRect.height)
        .append("g")
        .attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`);

    const stack = d3.stack().keys(layers).offset(d3.stackOffsetSilhouette);
    const stackedData = stack(streamData);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(streamData, d => d.xValue))
        .range([0, width]);

    const yMin = d3.min(stackedData, series => d3.min(series, d => d[0]));
    const yMax = d3.max(stackedData, series => d3.max(series, d => d[1]));
    const yScale = d3.scaleLinear().domain([yMin, yMax]).nice().range([height, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeSet2).domain(layers);

    const area = d3.area()
        .x(d => xScale(d.data.xValue))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveBasis); // Smoother curve

    svg.selectAll(".layer")
        .data(stackedData)
        .enter().append("path")
        .attr("class", "layer")
        .attr("d", area)
        .style("fill", d => colorScale(d.key));

    svg.append("g").attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(Math.min(streamData.length, 10)));

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale).ticks(5));

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + generalMargin.bottom - 25})`)
        .style("text-anchor", "middle").style("font-size", "12px")
        .text("Age Group Midpoint");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - generalMargin.left + 15)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em").style("text-anchor", "middle").style("font-size", "12px")
        .text("Average Mental Health Score (Stacked)");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0 - (generalMargin.top / 2))
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold")
        .text("Mental Health Score Trends by Age");

    // Legend for Stream Graph
    const legend = svg.append("g")
        .attr("class", "stream-legend")
        .attr("transform", `translate(${width - 100}, ${-generalMargin.top / 2 + 10})`); // Position top-right

    layers.forEach((layer, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect")
            .attr("width", 15).attr("height", 15)
            .attr("fill", colorScale(layer));
        legendRow.append("text")
            .attr("x", 20).attr("y", 12) // Adjusted y for better alignment
            .style("font-size", "10px").text(layer);
    });
}

// --- Window Resize Handling ---
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateVisualizations();
    }, 250);
});

console.log("main.js loaded with D3 chart functions.");