// --- Global Variables & Initial Setup ---
let allData = [];
let uniqueGenres = [];
let selectedGenres = [];

const mentalHealthAspects = ['Anxiety', 'Depression', 'Insomnia', 'OCD'];
const ageBinThresholds = [10, 18, 25, 35, 45, 55, 65, 75];
const generalMargin = { top: 50, right: 30, bottom: 70, left: 70 };
const transitionDuration = 750; // milliseconds for animations

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

    // Initialize chart structures once
    initializeChartContainers();

    populateGenreChecklist(uniqueGenres);
    populateYAxisMetricSelect();
    updateVisualizations();
}).catch(error => {
    console.error("Error loading or parsing data:", error);
    d3.select("body").append("div")
      .attr("class", "load-error-message") // Added a class
      .style("color", "red").style("background-color", "#ffe0e0")
      .style("border", "1px solid red").style("padding", "20px")
      .style("margin", "20px auto").style("width", "80%").style("text-align", "center")
      .html("<h2>Error Loading Data</h2><p>Could not load <code>mxmh_survey_results.csv</code>. Check path and console.</p>");
});

// --- Initialize Chart Containers (SVG structure) ---
function initializeChartContainers() {
    // Pie Chart SVG setup
    const pieContainer = d3.select("#pie-chart-container");
    pieContainer.append("svg").append("g").attr("class", "chart-area");
    pieContainer.select("svg").append("text").attr("class", "chart-title")
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold");

    // Scatter Plot SVG setup
    const scatterContainer = d3.select("#scatter-plot-container");
    const scatterSvg = scatterContainer.append("svg");
    scatterSvg.append("g").attr("class", "chart-area");
    scatterSvg.append("g").attr("class", "x-axis");
    scatterSvg.append("g").attr("class", "y-axis");
    scatterSvg.append("text").attr("class", "x-axis-label")
        .style("text-anchor", "middle").style("font-size", "12px");
    scatterSvg.append("text").attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)").style("text-anchor", "middle").style("font-size", "12px");
    scatterSvg.append("text").attr("class", "chart-title")
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold");

    // Stream Graph SVG setup
    const streamContainer = d3.select("#stream-graph-container");
    const streamSvg = streamContainer.append("svg");
    streamSvg.append("defs").append("clipPath").attr("id", "clipStream").append("rect"); // Clip path
    streamSvg.append("g").attr("class", "chart-area").attr("clip-path", "url(#clipStream)"); // Area for layers
    streamSvg.append("g").attr("class", "x-axis");
    streamSvg.append("g").attr("class", "y-axis");
    streamSvg.append("text").attr("class", "x-axis-label")
        .style("text-anchor", "middle").style("font-size", "12px");
    streamSvg.append("text").attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)").style("text-anchor", "middle").style("font-size", "12px");
    streamSvg.append("text").attr("class", "chart-title")
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold");
    streamSvg.append("g").attr("class", "stream-legend"); // Legend group
}


// --- Populate Dynamic Controls ---
function populateGenreChecklist(genres) { /* ... (no change from previous) ... */
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

function populateYAxisMetricSelect() { /* ... (no change from previous other than calling createScatterPlot directly) ... */
    const select = d3.select("#y-axis-metric-select");
    select.html("");
    mentalHealthAspects.forEach(metric => {
        select.append("option").attr("value", metric).text(metric);
    });
    select.on("change", () => {
        const currentDataForScatter = getCurrentFilteredData();
        createScatterPlot(currentDataForScatter, false); // Pass false for initialLoad to skip some transitions
    });
}

// --- Event Handlers ---
function handleGenreChange() { /* ... (no change from previous) ... */
    selectedGenres = [];
    d3.selectAll(".genre-checkbox:checked").each(function() { selectedGenres.push(this.value); });
    updateVisualizations();
}

// --- Utility function to get currently filtered data ---
function getCurrentFilteredData() { /* ... (no change from previous) ... */
    if (selectedGenres.length === 0) {
        return [];
    }
    return allData.filter(d => d['Fav genre'] && selectedGenres.includes(d['Fav genre']));
}


// --- Master Update Function ---
function updateVisualizations(initialLoad = true) {
    const currentFilteredData = getCurrentFilteredData();
    createStreamGraph(currentFilteredData, mentalHealthAspects, ageBinThresholds, initialLoad);
    createScatterPlot(currentFilteredData, initialLoad);
    createPieChart(currentFilteredData, initialLoad);
}

// --- Chart Drawing Functions ---

function createPieChart(data, initialLoad = true) {
    const container = d3.select("#pie-chart-container");
    const svg = container.select("svg");
    const chartArea = svg.select("g.chart-area");
    const title = svg.select("text.chart-title");

    // Clear previous "no data" message if any
    container.select(".no-data-message").remove();

    if (!data || data.length === 0) {
        chartArea.selectAll("*").remove(); // Clear chart elements
        title.text(""); // Clear title
        container.append("p").attr("class", "no-data-message").style("text-align", "center").style("padding-top", "20px")
            .text("No genres selected or no data for Pie Chart.");
        return;
    }

    const effectsCounts = d3.rollup(data, v => v.length, d => d['Music effects']);
    const pieData = Array.from(effectsCounts, ([key, value]) => ({ key, value }))
                        .filter(d => d.key && d.value > 0);

    if (pieData.length === 0) {
        chartArea.selectAll("*").remove();
        title.text("");
        container.append("p").attr("class", "no-data-message").style("text-align", "center").style("padding-top", "20px")
            .text("No 'Music effects' data for the selected genres.");
        return;
    }

    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    const radius = Math.min(width, height) / 2.5;

    svg.attr("width", width).attr("height", height);
    chartArea.attr("transform", `translate(${width / 2}, ${height / 2 + 10})`);
    title.attr("x", width / 2).attr("y", generalMargin.top / 2)
         .text("Music's Impact on Mental Health");


    const effectColorMap = {
        "Improve": "#CDEAC5", // Green
        "Worsen": "#FAB5AE",  // Red
        "No effect": "#B3CDE3", // Blue
    };
    const defaultEffectColor = "#6c757d";

    const pie = d3.pie().sort(null).value(d => d.value);
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.7).outerRadius(radius * 0.7);
    const total = d3.sum(pieData, d => d.value);

    const arcs = chartArea.selectAll(".arc")
        .data(pie(pieData), d => d.data.key); // Key function for object constancy

    // Exit - remove old slices
    arcs.exit()
        .transition().duration(transitionDuration)
        .attrTween("d", function(d) {
            const i = d3.interpolate(d, { startAngle: d.startAngle, endAngle: d.startAngle }); // Shrink to nothing
            return t => arcGenerator(i(t));
        })
        .remove();
    arcs.selectAll("text").exit().transition().duration(transitionDuration).style("opacity", 0).remove();


    // Enter - add new slices
    const newArcs = arcs.enter().append("g").attr("class", "arc");

    newArcs.append("path")
        .style("fill", d => effectColorMap[d.data.key] || defaultEffectColor)
        .style("stroke", "#fff").style("stroke-width", "2px")
        .attr("d", arcGenerator) // Initial drawing, then transition
        .each(function(d) { this._current = d; }) // Store initial angles for transition
        .transition().duration(transitionDuration)
        .attrTween("d", function(d) {
            const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
            this._current = i(0); // Store for update
            return t => arcGenerator(i(t));
        });


    newArcs.append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("dy", "0.35em").attr("text-anchor", "middle")
        .style("font-size", "10px").style("opacity", 0)
        .style("fill", d => (effectColorMap[d.data.key] === "#007bff" || effectColorMap[d.data.key] === "#dc3545" || effectColorMap[d.data.key] === "#28a745") ? "white" : "black")
        .text(d => total === 0 ? "" : `${d.data.key} (${((d.data.value / total) * 100).toFixed(1)}%)`)
        .transition().duration(transitionDuration)
        .style("opacity", 1);

    // Update - transition existing slices
    arcs.select("path")
        .transition().duration(transitionDuration)
        .attrTween("d", function(d) {
            const i = d3.interpolate(this._current, d);
            this._current = i(0);
            return t => arcGenerator(i(t));
        });

    arcs.select("text")
        .transition().duration(transitionDuration)
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .text(d => total === 0 ? "" : `${d.data.key} (${((d.data.value / total) * 100).toFixed(1)}%)`)
        .style("opacity", 1);
}


function createScatterPlot(data, initialLoad = true) {
    const container = d3.select("#scatter-plot-container");
    const svg = container.select("svg");
    const chartArea = svg.select("g.chart-area");
    const xAxisGroup = svg.select("g.x-axis");
    const yAxisGroup = svg.select("g.y-axis");
    const xAxisLabel = svg.select("text.x-axis-label");
    const yAxisLabel = svg.select("text.y-axis-label");
    const title = svg.select("text.chart-title");

    container.select(".temp-message").remove();

    if (!data || data.length === 0) {
        chartArea.selectAll("*").remove();
        xAxisGroup.selectAll("*").remove();
        yAxisGroup.selectAll("*").remove();
        xAxisLabel.text(""); yAxisLabel.text(""); title.text("");
        container.append("p").attr("class","temp-message").style("text-align", "center").style("padding-top", "20px")
            .text("No genres selected or no data for Scatter Plot.");
        return;
    }

    const containerRect = container.node().getBoundingClientRect();
    const controlHeight = d3.select(".scatter-controls").node()?.getBoundingClientRect().height || 0;
    const width = containerRect.width - generalMargin.left - generalMargin.right;
    const height = containerRect.height - generalMargin.top - generalMargin.bottom - controlHeight;

    if (width <= 0 || height <= 0) return;

    svg.attr("width", containerRect.width).attr("height", containerRect.height);
    chartArea.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight})`);

    const selectedYMetric = d3.select("#y-axis-metric-select").property("value");
    const genresForXAxis = selectedGenres.length > 0 ? selectedGenres : uniqueGenres; // Show all if none selected

    const xScale = d3.scalePoint().domain(genresForXAxis).range([0, width]).padding(0.5);
    const yScale = d3.scaleLinear().domain(d3.extent(data, d => d[selectedYMetric])).nice().range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(genresForXAxis);

    xAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight + height})`)
        .transition().duration(transitionDuration)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)").style("text-anchor", "end");

    yAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight})`)
        .transition().duration(transitionDuration)
        .call(d3.axisLeft(yScale));

    const jitterWidth = xScale.step() ? xScale.step() * 0.4 : 0;
    const tooltip = d3.select("body").select(".tooltip").node() ? d3.select(".tooltip") : d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    const dots = chartArea.selectAll(".dot")
        .data(data.filter(d => d['Fav genre'] && genresForXAxis.includes(d['Fav genre']) && d[selectedYMetric] !== null), d => d.ID); // Assuming d.ID is a unique identifier

    dots.exit()
        .transition().duration(transitionDuration)
        .attr("r", 0).style("opacity", 0)
        .remove();

    dots.enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d['Fav genre']) + (Math.random() - 0.5) * jitterWidth)
        .attr("cy", d => yScale(d[selectedYMetric]))
        .attr("r", 0).style("opacity", 0) // Start small and transparent
        .style("fill", d => colorScale(d['Fav genre']))
        .on("mouseover", (event, d) => { /* ... tooltip ... */ tooltip.transition().duration(200).style("opacity", .9); tooltip.html(`Genre: ${d['Fav genre']}<br/>${selectedYMetric}: ${d[selectedYMetric]}<br/>Age: ${d.Age}`).style("left", (event.pageX + 5) + "px").style("top", (event.pageY - 28) + "px");})
        .on("mouseout", () => { /* ... tooltip ... */ tooltip.transition().duration(500).style("opacity", 0);})
        .merge(dots) // Combine enter and update selections
        .transition().duration(transitionDuration)
        .attr("cx", d => xScale(d['Fav genre']) + (Math.random() - 0.5) * jitterWidth) // Re-apply jitter in case scale changed
        .attr("cy", d => yScale(d[selectedYMetric]))
        .attr("r", 4).style("opacity", 0.7);

    // Update labels and title
    xAxisLabel.attr("transform", `translate(${generalMargin.left + width / 2}, ${generalMargin.top + controlHeight + height + generalMargin.bottom - 15})`)
        .text("Favorite Genre");
    yAxisLabel.attr("transform", "rotate(-90)")
        .attr("y", generalMargin.left - 45).attr("x", 0 - (generalMargin.top + controlHeight + height / 2))
        .attr("dy", "1em").text(selectedYMetric);
    title.attr("x", generalMargin.left + width / 2)
        .attr("y", generalMargin.top / 2 + (controlHeight > 0 ? controlHeight / 2 : 0)) // Adjust title based on controls
        .text(`Genre vs. ${selectedYMetric}`);
}


function processDataForRefinedStream(dataToProcess, mentalHealthLayers, ageThresholds) { /* ... (no change from previous) ... */
    const validData = dataToProcess.filter(d =>
        d.Age != null && !isNaN(d.Age) &&
        mentalHealthLayers.every(layer => d[layer] != null && !isNaN(d[layer]))
    );
    if (validData.length === 0) return [];
    const ageBinner = d3.bin()
        .value(d => +d.Age)
        .domain(d3.extent(validData, d => +d.Age) || [0,0])
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

function createStreamGraph(data, layers, xBinThresholds, initialLoad = true) {
    const container = d3.select("#stream-graph-container");
    const chartSvg = container.select("svg"); // Use existing SVG
    const svg = chartSvg.select("g.chart-area");
    const xAxisGroup = chartSvg.select("g.x-axis");
    const yAxisGroup = chartSvg.select("g.y-axis");
    const clipRect = chartSvg.select("#clipStream rect");
    const legendGroup = chartSvg.select("g.stream-legend");
    const title = chartSvg.select("text.chart-title");
    const xAxisLabel = chartSvg.select("text.x-axis-label");
    const yAxisLabel = chartSvg.select("text.y-axis-label");


    container.select(".no-data-message").remove();

    if (!data || data.length === 0) {
        svg.selectAll("*").remove(); // Clear layers
        xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        legendGroup.selectAll("*").remove(); title.text("");
        xAxisLabel.text(""); yAxisLabel.text("");
        container.append("p").attr("class", "no-data-message").style("text-align", "center").style("padding-top", "20px")
            .text("No genres selected or no data for Stream Graph.");
        return;
    }

    const streamData = processDataForRefinedStream(data, layers, xBinThresholds);

    if (!streamData || streamData.length < 2) {
        svg.selectAll("*").remove(); xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        legendGroup.selectAll("*").remove(); title.text("");
        xAxisLabel.text(""); yAxisLabel.text("");
        container.append("p").attr("class", "no-data-message").style("text-align", "center").style("padding-top", "20px")
            .text("Not enough data to draw Stream Graph for selected genres.");
        return;
    }

    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width - generalMargin.left - generalMargin.right;
    const height = containerRect.height - generalMargin.top - generalMargin.bottom - 30; // For legend

    if (width <= 0 || height <= 0) return;

    chartSvg.attr("width", containerRect.width).attr("height", containerRect.height);
    svg.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`);
    clipRect.attr("width", width).attr("height", height);


    const stack = d3.stack().keys(layers).offset(d3.stackOffsetSilhouette); // Or d3.stackOffsetWiggle
    const stackedData = stack(streamData);

    const initialXScale = d3.scaleLinear().domain(d3.extent(streamData, d => d.xValue) || [0,0]).range([0, width]);
    let currentXScale = initialXScale.copy(); // For zoom
    const yMin = d3.min(stackedData, series => d3.min(series, d => d[0])) || 0;
    const yMax = d3.max(stackedData, series => d3.max(series, d => d[1])) || 0;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).nice().range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeSet2).domain(layers);

    const areaGenerator = d3.area()
        .x(d => currentXScale(d.data.xValue))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveBasis);

    // Update X and Y axes with transitions
    const xAxis = d3.axisBottom(currentXScale).tickFormat(d3.format("d")).ticks(Math.min(streamData.length, width / 80 || 10));
    xAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + height})`)
        .transition().duration(transitionDuration)
        .call(xAxis);

    yAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`)
        .transition().duration(transitionDuration)
        .call(d3.axisLeft(yScale).ticks(5));

    // Stream layers with transitions
    const streamLayers = svg.selectAll(".layer")
        .data(stackedData, d => d.key); // Key function by layer name

    streamLayers.exit()
        .transition().duration(transitionDuration)
        .attr("d", d => areaGenerator(d.map(p => ({ ...p, data: { ...p.data, [d.key]: 0 } })))) // Animate to zero height
        .style("opacity", 0)
        .remove();

    streamLayers.enter().append("path")
        .attr("class", "layer")
        .style("fill", d => colorScale(d.key))
        .attr("d", areaGenerator) // Draw initial state
        .style("opacity", 0)
        .merge(streamLayers) // Merge enter and update selections
        .transition().duration(transitionDuration)
        .style("opacity", 1)
        .attr("d", areaGenerator);


    // Update labels and title
    title.attr("x", generalMargin.left + width / 2).attr("y", generalMargin.top / 2)
        .text("Mental Health Score Trends by Age");
    xAxisLabel.attr("transform", `translate(${generalMargin.left + width / 2}, ${generalMargin.top + height + generalMargin.bottom - 25})`)
        .text("Age Group Midpoint");
    yAxisLabel.attr("transform", "rotate(-90)")
        .attr("y", generalMargin.left - 45).attr("x", 0 - (generalMargin.top + height / 2))
        .attr("dy", "1em").text("Average Mental Health Score (Stacked)");

    // Update Legend
    legendGroup.attr("transform", `translate(${generalMargin.left + width - 100}, ${generalMargin.top - 20})`);
    legendGroup.selectAll("*").remove(); // Simple clear and redraw for legend
    layers.forEach((layer, i) => {
        const legendRow = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect").attr("width", 15).attr("height", 15).attr("fill", colorScale(layer));
        legendRow.append("text").attr("x", 20).attr("y", 12).style("font-size", "10px").text(layer);
    });


    // --- Zoom Functionality ---
    // (Ensure this is set up correctly after elements are established)
    function zoomed(event) {
        currentXScale = event.transform.rescaleX(initialXScale);
        xAxisGroup.call(xAxis.scale(currentXScale)); // Update X-axis with new scale
        svg.selectAll(".layer").attr("d", areaGenerator); // Redraw stream paths
    }

    const zoomBehavior = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    chartSvg.call(zoomBehavior); // Apply zoom to the main SVG of the stream graph
     // Reset zoom transform on new data load if needed (to avoid weird zoom states)
    if (initialLoad) { // Or some other condition to reset
        chartSvg.call(zoomBehavior.transform, d3.zoomIdentity);
    }
}


// --- Window Resize Handling ---
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateVisualizations(false); // Pass false to indicate it's not the initial load
    }, 250);
});

console.log("main.js loaded with D3 chart functions, stream zoom, and transitions.");
