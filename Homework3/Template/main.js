/*
    Disclaimer: There was use of AI within the parameters stated in the Course Logistics. 
    I used it for understanding d3.js, d3.js animations, and brainstorm some ideas. All ideas are mine. 
    Also, I used it to help debug.
*/
// --- Global Variables & Initial Setup ---
let allData = [];
let uniqueGenres = [];
let selectedGenres = [];

const mentalHealthAspects = ['Anxiety', 'Depression', 'Insomnia', 'OCD'];
const ageBinThresholds = [10, 18, 25, 35, 45, 55, 65, 75];
const generalMargin = { top: 50, right: 30, bottom: 70, left: 70 };
const transitionDuration = 750;

// To store calculated dimensions for stability
let chartDimensions = {
    stream: { width: 0, height: 0, svgWidth: 0, svgHeight: 0 },
    scatter: { width: 0, height: 0, svgWidth: 0, svgHeight: 0 },
    pie: { width: 0, height: 0, svgWidth: 0, svgHeight: 0 }
};

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

    initializeChartContainers();
    calculateAndStoreChartDimensions();

    populateGenreChecklist(uniqueGenres);
    populateYAxisMetricSelect();
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


// --- Calculate and Store Chart Dimensions ---
function calculateAndStoreChartDimensions() {
    let container = d3.select("#stream-graph-container");
    let containerRect = container.node().getBoundingClientRect();
    chartDimensions.stream.svgWidth = containerRect.width;
    chartDimensions.stream.svgHeight = containerRect.height;
    chartDimensions.stream.width = containerRect.width - generalMargin.left - generalMargin.right;
    chartDimensions.stream.height = containerRect.height - generalMargin.top - generalMargin.bottom - 30; // for legend

    container = d3.select("#scatter-plot-container");
    containerRect = container.node().getBoundingClientRect();
    const controlHeight = d3.select(".scatter-controls").node()?.getBoundingClientRect().height || 0;
    chartDimensions.scatter.svgWidth = containerRect.width;
    chartDimensions.scatter.svgHeight = containerRect.height;
    chartDimensions.scatter.width = containerRect.width - generalMargin.left - generalMargin.right;
    chartDimensions.scatter.height = containerRect.height - generalMargin.top - generalMargin.bottom - controlHeight;

    container = d3.select("#pie-chart-container");
    containerRect = container.node().getBoundingClientRect();
    chartDimensions.pie.svgWidth = containerRect.width;
    chartDimensions.pie.svgHeight = containerRect.height;
}


// --- Initialize Chart Containers (SVG structure) ---
function initializeChartContainers() {
    const pieContainer = d3.select("#pie-chart-container");
    const pieSvg = pieContainer.append("svg");
    pieSvg.append("g").attr("class", "chart-area");
    pieSvg.append("text").attr("class", "chart-title")
        .attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold");
    pieSvg.append("text").attr("class", "no-data-svg-message")
        .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#777");

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
        scatterPlot(currentDataForScatter,
            chartDimensions.scatter.width, chartDimensions.scatter.height,
            chartDimensions.scatter.svgWidth, chartDimensions.scatter.svgHeight,
            false);
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
    if (selectedGenres.length === 0) {
        return [];
    }
    return allData.filter(d => d['Fav genre'] && selectedGenres.includes(d['Fav genre']));
}


// --- Master Update Function ---
function updateVisualizations(initialLoad = true) {
    const currentFilteredData = getCurrentFilteredData();

    streamGraph(currentFilteredData, mentalHealthAspects, ageBinThresholds,
        chartDimensions.stream.width, chartDimensions.stream.height,
        chartDimensions.stream.svgWidth, chartDimensions.stream.svgHeight,
        initialLoad);

    scatterPlot(currentFilteredData,
        chartDimensions.scatter.width, chartDimensions.scatter.height,
        chartDimensions.scatter.svgWidth, chartDimensions.scatter.svgHeight,
        initialLoad);

    pieChart(currentFilteredData,
        chartDimensions.pie.svgWidth, chartDimensions.pie.svgHeight,
        initialLoad);
}

// --- Chart Drawing Functions ---

function pieChart(data, svgWidth, svgHeight, initialLoad = true) {
    const container = d3.select("#pie-chart-container");
    const svg = container.select("svg");
    const chartArea = svg.select("g.chart-area");
    const title = svg.select("text.chart-title");
    const noDataSvgMessage = svg.select("text.no-data-svg-message");

    svg.attr("width", svgWidth).attr("height", svgHeight);
    noDataSvgMessage.attr("x", svgWidth / 2).attr("y", svgHeight / 2).text("");

    if (!data || data.length === 0) {
        chartArea.selectAll("*").remove();
        title.text("");
        noDataSvgMessage.text("No genres selected or no data for Pie Chart.");
        return;
    }
    const effectsCounts = d3.rollup(data, v => v.length, d => d['Music effects']);
    const pieData = Array.from(effectsCounts, ([key, value]) => ({ key, value }))
                        .filter(d => d.key && d.value > 0);
    if (pieData.length === 0) {
        chartArea.selectAll("*").remove();
        title.text("");
        noDataSvgMessage.text("No 'Music effects' data for the selected genres.");
        return;
    }
    noDataSvgMessage.text("");

    const radius = Math.min(svgWidth, svgHeight) / 2.5;
    chartArea.attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2 + 10})`);
    title.attr("x", svgWidth / 2).attr("y", generalMargin.top / 2)
         .text("Music's Impact on Mental Health");

    const effectColorMap = { "Improve": "#CDEAC5", "Worsen": "#FAB5AE", "No effect": "#B3CDE3" };
    const defaultEffectColor = "#6c757d";
    const pie = d3.pie().sort(null).value(d => d.value);
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.7).outerRadius(radius * 0.7);
    const total = d3.sum(pieData, d => d.value);
    const arcs = chartArea.selectAll(".arc").data(pie(pieData), d => d.data.key);
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
}

function scatterPlot(data, chartWidth, chartHeight, svgWidth, svgHeight, initialLoad = true) {
    const container = d3.select("#scatter-plot-container");
    const svgElement = container.select("svg");
    const chartArea = svgElement.select("g.chart-area");
    const xAxisGroup = svgElement.select("g.x-axis");
    const yAxisGroup = svgElement.select("g.y-axis");
    const xAxisLabel = svgElement.select("text.x-axis-label");
    const yAxisLabel = svgElement.select("text.y-axis-label");
    const title = svgElement.select("text.chart-title");
    const noDataSvgMessage = svgElement.select("text.no-data-svg-message");

    svgElement.attr("width", svgWidth).attr("height", svgHeight);
    noDataSvgMessage.attr("x", svgWidth / 2).attr("y", svgHeight / 2).text("");

    if (!data || data.length === 0) {
        chartArea.selectAll("*").remove();
        xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        xAxisLabel.text(""); yAxisLabel.text(""); title.text("");
        noDataSvgMessage.text("No genres selected or no data for Scatter Plot.");
        return;
    }
    noDataSvgMessage.text("");

    const controlHeight = d3.select(".scatter-controls").node()?.getBoundingClientRect().height || 0;
    if (chartWidth <= 0 || chartHeight <= 0) {
        return;
    }
    chartArea.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight})`);

    const selectedYMetric = d3.select("#y-axis-metric-select").property("value");
    const genresForXAxis = selectedGenres.length > 0 ? selectedGenres : uniqueGenres;
    const xScale = d3.scalePoint().domain(genresForXAxis).range([0, chartWidth]).padding(0.5);
    const yScale = d3.scaleLinear().domain(d3.extent(data, d => d[selectedYMetric])).nice().range([chartHeight, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(genresForXAxis);

    xAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + controlHeight + chartHeight})`)
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
    xAxisLabel.attr("transform", `translate(${generalMargin.left + chartWidth / 2}, ${generalMargin.top + controlHeight + chartHeight + generalMargin.bottom - 15})`)
        .text("Favorite Genre");
    yAxisLabel.attr("transform", "rotate(-90)")
        .attr("y", generalMargin.left - 45).attr("x", 0 - (generalMargin.top + controlHeight + chartHeight / 2))
        .attr("dy", "1em").text(selectedYMetric);
    title.attr("x", generalMargin.left + chartWidth / 2).attr("y", generalMargin.top / 2 + (controlHeight > 0 ? controlHeight / 2 : 0))
        .text(`Genre vs. ${selectedYMetric}`);
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

function streamGraph(data, layers, xBinThresholds, chartWidth, chartHeight, svgWidth, svgHeight, initialLoad = true) {
    const container = d3.select("#stream-graph-container");
    const chartSvgElement = container.select("svg");
    const svgGroup = chartSvgElement.select("g.chart-area");
    const xAxisGroup = chartSvgElement.select("g.x-axis");
    const yAxisGroup = chartSvgElement.select("g.y-axis");
    const clipRect = chartSvgElement.select("#clipStream rect");
    const legendGroup = chartSvgElement.select("g.stream-legend");
    const title = chartSvgElement.select("text.chart-title");
    const xAxisLabelText = chartSvgElement.select("text.x-axis-label");
    const yAxisLabelText = chartSvgElement.select("text.y-axis-label");
    const noDataSvgMessage = chartSvgElement.select("text.no-data-svg-message");

    chartSvgElement.attr("width", svgWidth).attr("height", svgHeight);
    noDataSvgMessage.attr("x", svgWidth / 2).attr("y", svgHeight / 2).text("");

    if (!data || data.length === 0) {
        svgGroup.selectAll("*").remove(); xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        legendGroup.selectAll("*").remove(); title.text(""); xAxisLabelText.text(""); yAxisLabelText.text("");
        noDataSvgMessage.text("No genres selected or no data for Stream Graph.");
        return;
    }
    const streamData = processDataForRefinedStream(data, layers, xBinThresholds);
    if (!streamData || streamData.length < 2) {
        svgGroup.selectAll("*").remove(); xAxisGroup.selectAll("*").remove(); yAxisGroup.selectAll("*").remove();
        legendGroup.selectAll("*").remove(); title.text(""); xAxisLabelText.text(""); yAxisLabelText.text("");
        noDataSvgMessage.text("Not enough data to draw Stream Graph for selected genres.");
        return;
    }
    noDataSvgMessage.text("");

    if (chartWidth <= 0 || chartHeight <= 0) {
        return;
    }
    svgGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`);
    clipRect.attr("width", chartWidth).attr("height", chartHeight);

    const stack = d3.stack().keys(layers).offset(d3.stackOffsetSilhouette);
    const stackedData = stack(streamData);
    const initialXScale = d3.scaleLinear().domain(d3.extent(streamData, d => d.xValue) || [0,0]).range([0, chartWidth]);
    let currentXScale = chartSvgElement.property("__zoom") ? chartSvgElement.property("__zoom").rescaleX(initialXScale) : initialXScale.copy();
    const yMin = d3.min(stackedData, series => d3.min(series, d => d[0])) || 0;
    const yMax = d3.max(stackedData, series => d3.max(series, d => d[1])) || 0;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).nice().range([chartHeight, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeSet2).domain(layers);
    const areaGenerator = d3.area()
        .x(d => currentXScale(d.data.xValue)).y0(d => yScale(d[0])).y1(d => yScale(d[1])).curve(d3.curveBasis);
    const xAxis = d3.axisBottom(currentXScale).tickFormat(d3.format("d")).ticks(Math.min(streamData.length, chartWidth / 80 || 10));
    xAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top + chartHeight})`)
        .transition().duration(transitionDuration).call(xAxis);
    yAxisGroup.attr("transform", `translate(${generalMargin.left}, ${generalMargin.top})`)
        .transition().duration(transitionDuration).call(d3.axisLeft(yScale).ticks(5));
    const streamLayers = svgGroup.selectAll(".layer").data(stackedData, d => d.key);
    streamLayers.exit().transition().duration(transitionDuration)
        .attr("d", d => areaGenerator(d.map(p => ({ ...p, data: { ...p.data, [d.key]: 0 } }))))
        .style("opacity", 0).remove();
    streamLayers.enter().append("path").attr("class", "layer")
        .style("fill", d => colorScale(d.key)).attr("d", areaGenerator).style("opacity", 0)
        .merge(streamLayers).transition().duration(transitionDuration)
        .style("opacity", 1).attr("d", areaGenerator);
    title.attr("x", generalMargin.left + chartWidth / 2).attr("y", generalMargin.top / 2)
        .text("Mental Health Score Trends by Age");
    xAxisLabelText.attr("transform", `translate(${generalMargin.left + chartWidth / 2}, ${generalMargin.top + chartHeight + generalMargin.bottom - 25})`)
        .text("Age Group Midpoint");
    yAxisLabelText.attr("transform", "rotate(-90)")
        .attr("y", generalMargin.left - 45).attr("x", 0 - (generalMargin.top + chartHeight / 2))
        .attr("dy", "1em").text("Average Mental Health Score (Stacked)");
    legendGroup.attr("transform", `translate(${generalMargin.left + chartWidth - 100}, ${generalMargin.top - 20})`);
    legendGroup.selectAll("*").remove();
    layers.forEach((layer, i) => {
        const legendRow = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendRow.append("rect").attr("width", 15).attr("height", 15).attr("fill", colorScale(layer));
        legendRow.append("text").attr("x", 20).attr("y", 12).style("font-size", "10px").text(layer);
    });
    function zoomed(event) {
        currentXScale = event.transform.rescaleX(initialXScale);
        chartSvgElement.property("__zoom", event.transform);
        xAxisGroup.call(xAxis.scale(currentXScale));
        svgGroup.selectAll(".layer").attr("d", areaGenerator);
    }
    const zoomBehavior = d3.zoom().scaleExtent([1, 8])
        .translateExtent([[0, 0], [chartWidth, chartHeight]])
        .extent([[0, 0], [chartWidth, chartHeight]]).on("zoom", zoomed);
    chartSvgElement.call(zoomBehavior);
    if (initialLoad) {
        chartSvgElement.call(zoomBehavior.transform, d3.zoomIdentity);
        chartSvgElement.property("__zoom", d3.zoomIdentity);
    }
}


// --- Window Resize Handling ---
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        calculateAndStoreChartDimensions();
        updateVisualizations(false);
    }, 250);
});

