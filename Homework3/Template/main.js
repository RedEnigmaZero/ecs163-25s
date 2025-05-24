// --- Global Variables & Initial Setup ---
let allData = [];
let uniqueGenres = [];
let selectedGenres = [];

const mentalHealthAspects = ['Anxiety', 'Depression', 'Insomnia', 'OCD'];
const ageBinThresholds = [10, 18, 25, 35, 45, 55, 65, 75];
const generalMargin = { top: 50, right: 30, bottom: 70, left: 70 };
const transitionDuration = 750;
let updateCount = 0; // DEBUG

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

    initializeChartContainers(); // Call this first

    populateGenreChecklist(uniqueGenres);
    populateYAxisMetricSelect();
    console.log("Initial data load complete. Calling first updateVisualizations.");
    updateVisualizations(true);
}).catch(error => {
    console.error("Error loading or parsing data:", error);
    d3.select("body").append("div")
      .attr("class", "load-error-message")
      .style("color", "red").style("background-color", "#ffe0e0")
      .style("border", "1px solid red").style("padding", "20px")
      .style("margin", "20px auto").style("width", "80%").style("text-align", "center")
      .html("<h2>Error Loading Data</h2><p>Could not load <code>mxmh_survey_results.csv</code>. Check path and console.</p>");
});

// --- Initialize Chart Containers (SVG structure) ---
function initializeChartContainers() {
    console.log("DEBUG: Initializing chart containers");
    // Pie Chart SVG setup
    const pieContainer = d3.select("#pie-chart-container");
    const pieSvg = pieContainer.append("svg");
    pieSvg.append("g").attr("class", "chart-area");
    pieSvg.append("text").attr("class", "chart-title")
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold");
    pieSvg.append("text").attr("class", "no-data-svg-message") 
        .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#777");

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
    scatterSvg.append("text").attr("class", "no-data-svg-message") 
        .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#777");


    // Stream Graph SVG setup
    const streamContainer = d3.select("#stream-graph-container");
    const streamSvg = streamContainer.append("svg");
    streamSvg.append("defs").append("clipPath").attr("id", "clipStream").append("rect");
    streamSvg.append("g").attr("class", "chart-area").attr("clip-path", "url(#clipStream)");
    streamSvg.append("g").attr("class", "x-axis");
    streamSvg.append("g").attr("class", "y-axis");
    streamSvg.append("text").attr("class", "x-axis-label")
        .style("text-anchor", "middle").style("font-size", "12px");
    streamSvg.append("text").attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)").style("text-anchor", "middle").style("font-size", "12px");
    streamSvg.append("text").attr("class", "chart-title")
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold");
    streamSvg.append("text").attr("class", "no-data-svg-message") 
        .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#777");
    streamSvg.append("g").attr("class", "stream-legend");
}


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
        console.log("DEBUG: Select All clicked");
        d3.selectAll(".genre-checkbox").property("checked", true);
        selectedGenres = [...uniqueGenres];
        updateVisualizations();
    });
    d3.select("#deselect-all-genres").on("click", () => {
        console.log("DEBUG: Deselect All clicked");
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
        console.log("DEBUG: Y-axis metric changed");
        const currentDataForScatter = getCurrentFilteredData();
        createScatterPlot(currentDataForScatter, false);
    });
}

// --- Event Handlers ---
function handleGenreChange() { 
    console.log("DEBUG: Genre selection changed");
    selectedGenres = [];
    d3.selectAll(".genre-checkbox:checked").each(function() { selectedGenres.push(this.value); });
    updateVisualizations();
}

// --- Utility function to get currently filtered data ---
function getCurrentFilteredData() { 
    if (selectedGenres.length === 0) {
        return [];
    }
    return allData.filter(d => d['Fav genre'] && selectedGenres.includes(d['Fav genre']));
}


// --- Master Update Function ---
function updateVisualizations(initialLoad = true) {
    updateCount++;
    console.log(`DEBUG: --- Update Visualizations Start (Cycle: ${updateCount}, InitialLoad: ${initialLoad}) ---`);
    const gridRect = d3.select(".dashborad-grid").node().getBoundingClientRect();
    console.log(`DEBUG: Grid Rect Before Charts: W=${gridRect.width.toFixed(2)}, H=${gridRect.height.toFixed(2)}`);

    const currentFilteredData = getCurrentFilteredData();
    console.log(`DEBUG: Filtered data count: ${currentFilteredData.length}`);

    createStreamGraph(currentFilteredData, mentalHealthAspects, ageBinThresholds, initialLoad);
    createScatterPlot(currentFilteredData, initialLoad);
    createPieChart(currentFilteredData, initialLoad);

    const gridRectAfter = d3.select(".dashborad-grid").node().getBoundingClientRect();
    console.log(`DEBUG: Grid Rect After Charts: W=${gridRectAfter.width.toFixed(2)}, H=${gridRectAfter.height.toFixed(2)}`);
    if (Math.abs(gridRectAfter.height - gridRect.height) > 0.5) { 
        console.warn(`DEBUG: GRID HEIGHT CHANGED! From ${gridRect.height.toFixed(2)} to ${gridRectAfter.height.toFixed(2)}`);
    }
    console.log(`DEBUG: --- Update Visualizations End (Cycle: ${updateCount}) ---`);
}

// --- Chart Drawing Functions ---

function createPieChart(data, initialLoad = true) {
    console.log(`DEBUG: createPieChart Start (Cycle: ${updateCount})`);
    const container = d3.select("#pie-chart-container");
    const containerRectBefore = container.node().getBoundingClientRect(); 
    console.log(`DEBUG: Pie Container Before: W=${containerRectBefore.width.toFixed(2)}, H=${containerRectBefore.height.toFixed(2)}`);

    const svg = container.select("svg");
    const chartArea = svg.select("g.chart-area");
    const title = svg.select("text.chart-title");
    const noDataSvgMessage = svg.select("text.no-data-svg-message"); 

  
    const width = containerRectBefore.width;
    const height = containerRectBefore.height;
    svg.attr("width", width).attr("height", height);
    console.log(`DEBUG: Pie SVG Attrs Set: W=${svg.attr("width")}, H=${svg.attr("height")}`);


    noDataSvgMessage.attr("x", width / 2).attr("y", height / 2).text("");


    if (!data || data.length === 0) {
        chartArea.selectAll("*").remove();
        title.text("");
        noDataSvgMessage.text("No genres selected or no data for Pie Chart."); 
        console.log(`DEBUG: createPieChart End (Empty Data) (Cycle: ${updateCount})`);
        return;
    }

    const effectsCounts = d3.rollup(data, v => v.length, d => d['Music effects']);
    const pieData = Array.from(effectsCounts, ([key, value]) => ({ key, value }))
                        .filter(d => d.key && d.value > 0);

    if (pieData.length === 0) {
        chartArea.selectAll("*").remove();
        title.text("");
        noDataSvgMessage.text("No 'Music effects' data for the selected genres."); 
        console.log(`DEBUG: createPieChart End (No Effects Data) (Cycle: ${updateCount})`);
        return;
    }

    noDataSvgMessage.text(""); 

    const radius = Math.min(width, height) / 2.5;
    chartArea.attr("transform", `translate(${width / 2}, ${height / 2 + 10})`);
    title.attr("x", width / 2).attr("y", generalMargin.top / 2)
         .text("Music's Impact on Mental Health");

    const effectColorMap = { "Improve": "#CDEAC5", "Worsen": "#FAB5AE", "No effect": "#B3CDE3" };
    const defaultEffectColor = "#6c757d";
    const pie = d3.pie().sort(null).value(d => d.value);
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.7).outerRadius(radius * 0.7);
    const total = d3.sum(pieData, d => d.value);

    const arcs = chartArea.selectAll(".arc")
        .data(pie(pieData), d => d.data.key);
    arcs.exit().transition().duration(transitionDuration)
        .attrTween("d", function(d_exit) { const i = d3.interpolate(this._current || d_exit, { startAngle: d_exit.startAngle, endAngle: d_exit.startAngle }); return t => arcGenerator(i(t)); })
        .remove();
    arcs.selectAll("text").exit().transition().duration(transitionDuration).style("opacity", 0).remove();
    const newArcs = arcs.enter().append("g").attr("class", "arc");
    newArcs.append("path")
        .style("fill", d => effectColorMap[d.data.key] || defaultEffectColor)
        .style("stroke", "#fff").style("stroke-width", "2px")
        .each(function(d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; })
        .transition().duration(transitionDuration)
        .attrTween("d", function(d_enter) { const i = d3.interpolate(this._current, d_enter); this._current = i(0); return t => arcGenerator(i(t)); });
    newArcs.append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("dy", "0.35em").attr("text-anchor", "middle")
        .style("font-size", "10px").style("opacity", 0)
        .style("fill", d => (effectColorMap[d.data.key] === "#007bff" || effectColorMap[d.data.key] === "#dc3545" || effectColorMap[d.data.key] === "#28a745") ? "white" : "black")
        .text(d => total === 0 ? "" : `${d.data.key} (${((d.data.value / total) * 100).toFixed(1)}%)`)
        .transition().duration(transitionDuration).style("opacity", 1);
    arcs.select("path").transition().duration(transitionDuration)
        .attrTween("d", function(d_update) { const i = d3.interpolate(this._current, d_update); this._current = i(0); return t => arcGenerator(i(t)); });
    arcs.select("text").transition().duration(transitionDuration)
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .text(d => total === 0 ? "" : `${d.data.key} (${((d.data.value / total) * 100).toFixed(1)}%)`)
        .style("opacity", 1);

    const containerRectAfter = container.node().getBoundingClientRect();
    console.log(`DEBUG: Pie Container After Draw: W=${containerRectAfter.width.toFixed(2)}, H=${containerRectAfter.height.toFixed(2)}`);
    if (Math.abs(containerRectAfter.height - containerRectBefore.height) > 0.5) {
        console.warn(`DEBUG: PIE CONTAINER HEIGHT CHANGED! From ${containerRectBefore.height.toFixed(2)} to ${containerRectAfter.height.toFixed(2)}`);
    }
    console.log(`DEBUG: createPieChart End (Cycle: ${updateCount})`);
}


function createScatterPlot(data, initialLoad = true) {
    console.log(`DEBUG: createScatterPlot Start (Cycle: ${updateCount})`);
    const container = d3.select("#scatter-plot-container");
    const containerRectBefore = container.node().getBoundingClientRect();
    console.log(`DEBUG: Scatter Container Before: W=${containerRectBefore.width.toFixed(2)}, H=${containerRectBefore.height.toFixed(2)}`);

    const svg = container.select("svg");
    const chartArea = svg.select("g.chart-area");
    const xAxisGroup = svg.select("g.x-axis");
    const yAxisGroup = svg.select("g.y-axis");
    const xAxisLabel = svg.select("text.x-axis-label");
    const yAxisLabel = svg.select("text.y-axis-label");
    const title = svg.select("text.chart-title");
    const noDataSvgMessage = svg.select("text.no-data-svg-message");

    const svgWidth = containerRectBefore.width;
    const svgHeight = containerRectBefore.height;
    svg.attr("width", svgWidth).attr("height", svgHeight);
    console.log(`DEBUG: Scatter SVG Attrs Set: W=${svg.attr("width")}, H=${svg.attr("height")}`);
    noDataSvgMessage.attr("x", svgWidth / 2).attr("y", svgHeight / 2).text("");

    if (!data || data.length === 0) {
        chartArea.selectAll("*").remove();
        xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        xAxisLabel.text(""); yAxisLabel.text(""); title.text("");
        noDataSvgMessage.text("No genres selected or no data for Scatter Plot.");
        console.log(`DEBUG: createScatterPlot End (Empty Data) (Cycle: ${updateCount})`);
        return;
    }
    noDataSvgMessage.text("");

    const controlHeight = d3.select(".scatter-controls").node()?.getBoundingClientRect().height || 0;
    const width = svgWidth - generalMargin.left - generalMargin.right;
    const height = svgHeight - generalMargin.top - generalMargin.bottom - controlHeight;
    console.log(`DEBUG: Scatter Plot Drawable Area: W=${width.toFixed(2)}, H=${height.toFixed(2)} (from container W=${svgWidth.toFixed(2)}, H=${svgHeight.toFixed(2)})`);

    if (width <= 0 || height <= 0) {
        console.warn(`DEBUG: Scatter plot calculated width or height is <= 0. W=${width}, H=${height}`);
        console.log(`DEBUG: createScatterPlot End (No Draw) (Cycle: ${updateCount})`);
        return;
    }
    chartArea.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight})`);

    const selectedYMetric = d3.select("#y-axis-metric-select").property("value");
    const genresForXAxis = selectedGenres.length > 0 ? selectedGenres : uniqueGenres;
    const xScale = d3.scalePoint().domain(genresForXAxis).range([0, width]).padding(0.5);
    const yScale = d3.scaleLinear().domain(d3.extent(data, d => d[selectedYMetric])).nice().range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(genresForXAxis);

    xAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight + height})`)
        .transition().duration(transitionDuration).call(d3.axisBottom(xScale))
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    yAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight})`)
        .transition().duration(transitionDuration).call(d3.axisLeft(yScale));

    const jitterWidth = xScale.step() ? xScale.step() * 0.4 : 0;
    const tooltip = d3.select("body").select(".tooltip").node() ? d3.select(".tooltip") : d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    const dots = chartArea.selectAll(".dot")
        .data(data.filter(d => d['Fav genre'] && genresForXAxis.includes(d['Fav genre']) && d[selectedYMetric] !== null), d => d.ID);
    dots.exit().transition().duration(transitionDuration).attr("r", 0).style("opacity", 0).remove();
    dots.enter().append("circle").attr("class", "dot")
        .attr("cx", d => xScale(d['Fav genre']) + (Math.random() - 0.5) * jitterWidth)
        .attr("cy", d => yScale(d[selectedYMetric]))
        .attr("r", 0).style("opacity", 0).style("fill", d => colorScale(d['Fav genre']))
        .on("mouseover", (event, d) => { tooltip.transition().duration(200).style("opacity", .9); tooltip.html(`Genre: ${d['Fav genre']}<br/>${selectedYMetric}: ${d[selectedYMetric]}<br/>Age: ${d.Age}`).style("left", (event.pageX + 5) + "px").style("top", (event.pageY - 28) + "px");})
        .on("mouseout", () => { tooltip.transition().duration(500).style("opacity", 0);})
        .merge(dots).transition().duration(transitionDuration)
        .attr("cx", d => xScale(d['Fav genre']) + (Math.random() - 0.5) * jitterWidth)
        .attr("cy", d => yScale(d[selectedYMetric]))
        .attr("r", 4).style("opacity", 0.7);
    xAxisLabel.attr("transform", `translate(${generalMargin.left + width / 2}, ${generalMargin.top + controlHeight + height + generalMargin.bottom - 15})`)
        .text("Favorite Genre");
    yAxisLabel.attr("transform", "rotate(-90)")
        .attr("y", generalMargin.left - 45).attr("x", 0 - (generalMargin.top + controlHeight + height / 2))
        .attr("dy", "1em").text(selectedYMetric);
    title.attr("x", generalMargin.left + width / 2).attr("y", generalMargin.top / 2 + (controlHeight > 0 ? controlHeight / 2 : 0))
        .text(`Genre vs. ${selectedYMetric}`);

    const containerRectAfter = container.node().getBoundingClientRect();
    console.log(`DEBUG: Scatter Container After Draw: W=${containerRectAfter.width.toFixed(2)}, H=${containerRectAfter.height.toFixed(2)}`);
    if (Math.abs(containerRectAfter.height - containerRectBefore.height) > 0.5) {
        console.warn(`DEBUG: SCATTER CONTAINER HEIGHT CHANGED! From ${containerRectBefore.height.toFixed(2)} to ${containerRectAfter.height.toFixed(2)}`);
    }
    console.log(`DEBUG: createScatterPlot End (Cycle: ${updateCount})`);
}


function processDataForRefinedStream(dataToProcess, mentalHealthLayers, ageThresholds) { 
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
    console.log(`DEBUG: createStreamGraph Start (Cycle: ${updateCount})`);
    const container = d3.select("#stream-graph-container");
    const containerRectBefore = container.node().getBoundingClientRect();
    console.log(`DEBUG: Stream Container Before: W=${containerRectBefore.width.toFixed(2)}, H=${containerRectBefore.height.toFixed(2)}`);

    const chartSvg = container.select("svg");
    const svg = chartSvg.select("g.chart-area");
    const xAxisGroup = chartSvg.select("g.x-axis");
    const yAxisGroup = chartSvg.select("g.y-axis");
    const clipRect = chartSvg.select("#clipStream rect");
    const legendGroup = chartSvg.select("g.stream-legend");
    const title = chartSvg.select("text.chart-title");
    const xAxisLabel = chartSvg.select("text.x-axis-label");
    const yAxisLabel = chartSvg.select("text.y-axis-label");
    const noDataSvgMessage = chartSvg.select("text.no-data-svg-message");

    const svgWidth = containerRectBefore.width;
    const svgHeight = containerRectBefore.height;
    chartSvg.attr("width", svgWidth).attr("height", svgHeight);
    console.log(`DEBUG: Stream SVG Attrs Set: W=${chartSvg.attr("width")}, H=${chartSvg.attr("height")}`);
    noDataSvgMessage.attr("x", svgWidth / 2).attr("y", svgHeight / 2).text("");


    if (!data || data.length === 0) {
        svg.selectAll("*").remove(); xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        legendGroup.selectAll("*").remove(); title.text("");
        xAxisLabel.text(""); yAxisLabel.text("");
        noDataSvgMessage.text("No genres selected or no data for Stream Graph.");
        console.log(`DEBUG: createStreamGraph End (Empty Data) (Cycle: ${updateCount})`);
        return;
    }

    const streamData = processDataForRefinedStream(data, layers, xBinThresholds);

    if (!streamData || streamData.length < 2) {
        svg.selectAll("*").remove(); xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        legendGroup.selectAll("*").remove(); title.text("");
        xAxisLabel.text(""); yAxisLabel.text("");
        noDataSvgMessage.text("Not enough data to draw Stream Graph for selected genres.");
        console.log(`DEBUG: createStreamGraph End (Not Enough Data) (Cycle: ${updateCount})`);
        return;
    }
    noDataSvgMessage.text("");

    const width = svgWidth - generalMargin.left - generalMargin.right;
    const height = svgHeight - generalMargin.top - generalMargin.bottom - 30;
    console.log(`DEBUG: Stream Graph Drawable Area: W=${width.toFixed(2)}, H=${height.toFixed(2)} (from container W=${svgWidth.toFixed(2)}, H=${svgHeight.toFixed(2)})`);

    if (width <= 0 || height <= 0) {
        console.warn(`DEBUG: Stream graph calculated width or height is <= 0. W=${width}, H=${height}`);
        console.log(`DEBUG: createStreamGraph End (No Draw) (Cycle: ${updateCount})`);
        return;
    }
    svg.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`);
    clipRect.attr("width", width).attr("height", height);

    const stack = d3.stack().keys(layers).offset(d3.stackOffsetSilhouette);
    const stackedData = stack(streamData);
    const initialXScale = d3.scaleLinear().domain(d3.extent(streamData, d => d.xValue) || [0,0]).range([0, width]);
    let currentXScale = chartSvg.property("__zoom") ? chartSvg.property("__zoom").rescaleX(initialXScale) : initialXScale.copy();
    const yMin = d3.min(stackedData, series => d3.min(series, d => d[0])) || 0;
    const yMax = d3.max(stackedData, series => d3.max(series, d => d[1])) || 0;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).nice().range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeSet2).domain(layers);
    const areaGenerator = d3.area()
        .x(d => currentXScale(d.data.xValue)).y0(d => yScale(d[0])).y1(d => yScale(d[1])).curve(d3.curveBasis);
    const xAxis = d3.axisBottom(currentXScale).tickFormat(d3.format("d")).ticks(Math.min(streamData.length, width / 80 || 10));
    xAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + height})`)
        .transition().duration(transitionDuration).call(xAxis);
    yAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`)
        .transition().duration(transitionDuration).call(d3.axisLeft(yScale).ticks(5));
    const streamLayers = svg.selectAll(".layer").data(stackedData, d => d.key);
    streamLayers.exit().transition().duration(transitionDuration)
        .attr("d", d => areaGenerator(d.map(p => ({ ...p, data: { ...p.data, [d.key]: 0 } }))))
        .style("opacity", 0).remove();
    streamLayers.enter().append("path").attr("class", "layer")
        .style("fill", d => colorScale(d.key)).attr("d", areaGenerator).style("opacity", 0)
        .merge(streamLayers).transition().duration(transitionDuration)
        .style("opacity", 1).attr("d", areaGenerator);
    title.attr("x", generalMargin.left + width / 2).attr("y", generalMargin.top / 2)
        .text("Mental Health Score Trends by Age");
    xAxisLabel.attr("transform", `translate(${generalMargin.left + width / 2}, ${generalMargin.top + height + generalMargin.bottom - 25})`)
        .text("Age Group Midpoint");
    yAxisLabel.attr("transform", "rotate(-90)")
        .attr("y", generalMargin.left - 45).attr("x", 0 - (generalMargin.top + height / 2))
        .attr("dy", "1em").text("Average Mental Health Score (Stacked)");
    legendGroup.attr("transform", `translate(${generalMargin.left + width - 100}, ${generalMargin.top - 20})`);
    legendGroup.selectAll("*").remove();
    layers.forEach((layer, i) => {
        const legendRow = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect").attr("width", 15).attr("height", 15).attr("fill", colorScale(layer));
        legendRow.append("text").attr("x", 20).attr("y", 12).style("font-size", "10px").text(layer);
    });
    function zoomed(event) {
        currentXScale = event.transform.rescaleX(initialXScale);
        chartSvg.property("__zoom", event.transform); // Store current transform
        xAxisGroup.call(xAxis.scale(currentXScale));
        svg.selectAll(".layer").attr("d", areaGenerator);
    }
    const zoomBehavior = d3.zoom().scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]]).extent([[0, 0], [width, height]]).on("zoom", zoomed);
    chartSvg.call(zoomBehavior);
    if (initialLoad) {
        chartSvg.call(zoomBehavior.transform, d3.zoomIdentity);
        chartSvg.property("__zoom", d3.zoomIdentity); // Store initial transform
    }

    const containerRectAfter = container.node().getBoundingClientRect();
    console.log(`DEBUG: Stream Container After Draw: W=${containerRectAfter.width.toFixed(2)}, H=${containerRectAfter.height.toFixed(2)}`);
    if (Math.abs(containerRectAfter.height - containerRectBefore.height) > 0.5) {
        console.warn(`DEBUG: STREAM CONTAINER HEIGHT CHANGED! From ${containerRectBefore.height.toFixed(2)} to ${containerRectAfter.height.toFixed(2)}`);
    }
    console.log(`DEBUG: createStreamGraph End (Cycle: ${updateCount})`);
}


// --- Window Resize Handling ---
let resizeTimeout;
window.addEventListener("resize", () => {
    console.log("DEBUG: --- Window Resize Event Triggered ---");
    const oldGridRect = d3.select(".dashborad-grid").node().getBoundingClientRect();
    console.log(`DEBUG: Grid Rect Before Resize Logic: W=${oldGridRect.width.toFixed(2)}, H=${oldGridRect.height.toFixed(2)}`);

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("DEBUG: --- Executing Debounced Resize Logic ---");
        updateVisualizations(false);
        const newGridRect = d3.select(".dashborad-grid").node().getBoundingClientRect();
        console.log(`DEBUG: Grid Rect After Resize Logic: W=${newGridRect.width.toFixed(2)}, H=${newGridRect.height.toFixed(2)}`);
    }, 250);
});

console.log("main.js loaded with D3 chart functions, stream zoom, and transitions. SVG No-Data Msg Version.");
