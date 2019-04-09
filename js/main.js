/*Stylesheet by Timothy Prestby 2019*/
(function(){ 
//Pseudo global variables 
var attrArray = ['Passenger Traffic of Highways(10000 persons)','Freight Traffic of Highways(10000 tons)','Average Wage of Employed Persons in Urban Units(US dollars)','Total Value of Technical Market(100 million US dollars)',"Total Value of Imports of Foreign-funded Enterprises(1000 US dollars)","Total Value of Exports of Foreign-funded Enterprises(1000 US dollars)",'Rate of Loss Due to Bad Quality of Manufactured Products(%)'];
var csvData;
//Set initial attribute
var expressed = attrArray[0]

//Set chart dimensions
var chartWidth = window.innerWidth * 0.475,
    chartHeight = 473;
    leftPadding = 60,
    rightPadding = 20,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

var yScale;
var chart;

//Function: set up choropleth map
function setMap(){
    //Assign map frame dimensions
    var width = window.innerWidth * 0.475,
        height = 460;

    //Create new SVG container for the map 
    var map = d3.select('body')
        .append('svg')
        .attr('class','map')
        .attr('width',width)
        .attr('height',height);
    
    //Create Albers equal area conic projection centered on China
    var projection = d3.geoAlbers()
        .center([125.00, 25.60])
        .rotate([-7.18, 43.64, 0])
        .parallels([3, 45.94])
        .scale(1000)
        .translate([width / 2, height / 2]);

    //Create path generator
    var path = d3.geoPath()
        .projection(projection);

    //Assign new variable as array to hold data to be loaded
    var promises = [];
    //Load CSV attributes
    promises.push(d3.csv('data/AllData.csv'));
    //Load background Continent data
    promises.push(d3.json('data/asia.topojson'));
    //Load choropleth data
    promises.push(d3.json('data/provinces.topojson'));
    //Conduct multiple AJAX calls at the same time
    Promise.all(promises).then(callback);

    //Callback function to format data as array for csv and object for topojson
    function callback(data,csvData,asia,china){
        //Assign variables to data
        csvData = data[0];
        asia = data[1];
        china = data[2];
        //Place graticule on map
        setGraticule(map, path);
        //Translate TopoJSON into JSON
        var asiaCountries = topojson.feature(asia, asia.objects.asia),
            chinaRegions = topojson.feature(china, china.objects.provinces).features;
        //Add Asian countries to map
        var countries = map.append('path')
            //Assign datum to countries path
            .datum(asiaCountries)
            //Assign class as countries
            .attr('class','countries')
            //Assign d attribute to path generator which defines the shape
            .attr('d', path);

       
        //Join CSV data to GeoJSON enumeration units
        chinaRegions=joinData(chinaRegions, csvData)
        //Create color scale
        var colorScale = makeColorScale(csvData);
        //Add enumeration units to the map
        setEnumerationUnits(chinaRegions, map, path, colorScale);
        //Add dropdown menu to map
        createDropDown(csvData);
        //Add coordinated visualization to map
        setChart(csvData,colorScale);

    };
};

//Function: set enumeration units//
function setEnumerationUnits(chinaRegions, map, path, colorScale){
    //Add China provinces to map 
    var regions = map.selectAll('.regions')
    //Add data ass array
    .data(chinaRegions)
    //Identifies elements that need to be added to DOM
    .enter()
    //Append path element to map/DOM
    .append('path')
    //Assign unique class name for each enumeration unit
    .attr('class', function(d){
        return 'regions ' + d.properties.name;
    })
    //Return colors
    .attr('d', path)
    .style('fill', function (d){
        return choropleth(d.properties, colorScale);
    })
    //Create event listener to pass properties object into anonymous function
    .on('mouseover',function(d){
        highlight(d.properties);
    })
    //Create event listener that controls dehighlighting
    .on('mouseout',function(d){
        dehighlight(d.properties);
    })
    //Create event listener that controls label
    .on("mousemove", moveLabel);

    //Set default style for once region is dehighlighted 
	var desc = regions.append("desc")
        .text('{"stroke": "#000", "stroke-width": "2px"}');

};

//Function: set graticule//
function setGraticule(map, path){
    //Create graticule generator
    var graticule = d3.geoGraticule()
    //Determine the degrees of latitude and longitude increments
    .step([5,5]);
    //Create graticule lines
    var gratLines = map.selectAll('gratLines')
    //Bind graticule lines to each element to be created
    .data(graticule.lines())
    .enter()
    .append('path')
    .attr('class','gratLines')
    .attr('d',path);
};

//Function: join data from CSV to topojson//
function joinData(chinaRegions, csvData){
    //Loop through csv to assign csv attributes to geojson region 
    for (var i=0; i<csvData.length; i++){
        //The current region in loop index
        var csvRegion = csvData[i];
        //Create key for CSV file
        var csvKey = csvRegion.name;
        //Loop Through CSV 
        for (var a=0; a<chinaRegions.length; a++){
            //Get current properties of the indexed region
            var geojsonProps=chinaRegions[a].properties;
            //Get the name of the indexed region
            var geojsonKey=geojsonProps.name
            //If the keys match, transfer the CSV data to geojson properties object
            if (geojsonKey ==csvKey){
                //Assign all attributes and values using each attr item in the array
                attrArray.forEach(function(attr){
                    //Get CSV value as float
                    var val = parseFloat(csvRegion[attr]);
                    //Assign attribute and change string to float to geojson properties
                    geojsonProps[attr] = val
                });
            };
        };
    };
    return chinaRegions;
};

//Function: create color scale generator
function makeColorScale(data){
    var colorClasses = [
        '#eff3ff',
        '#bdd7e7',
        '#6baed6',
        '#3182bd',
        '#08519c'
    ];
    //Create color scale generator 
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);
    //Build array of all values of given attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        //Append val to array
        domainArray.push(val);
    };
    //Cluster data using ckmeans clustering to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //Reset domain array to cluster minimum values
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //Remove first value from domain array to create class breakpoints
    domainArray.shift();
    //Assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);
    return colorScale;
};

//Function: test for data value and return color//
function choropleth(props, colorScale){
    //Make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //If attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//Function: create chart//
function setChart(csvData, colorScale){
    yScale=d3.scaleLinear()
        .range([463,0])
        .domain([0, d3.max(csvData, function (d) {return parseFloat(d[expressed])*1.1;})]);
    //Create a second svg element to hold the bar chart
    chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart")
        .attr("transform", translate);
    //Create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    //Set bars for each province
    var bars = chart.selectAll('.bar')
        .data(csvData)
        .enter()
        .append('rect')
        //Sort bars in ascending order
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr('class',function(d){
            return 'bar ' + d.name;
        })
        //Ensure bars fill the container
        .attr('width', chartInnerWidth/csvData.length-1)
        //Create event listeners for highlighting and dehighlighting using mouse over
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);


    //Set default style for once region is dehighlighted 
	var desc = bars.append("desc")
        .text('{"stroke": "#000", "stroke-width": "2px"}');

    //Create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    //Create Dynamic Title
    var chartTitle = chart.append("text")
        .attr("x", 70)
        .attr("y", 40)
        .attr("class", "chartTitle")
    //Set bar positions heights, colors
    updateChart(bars, csvData.length, colorScale, csvData);
};


//Function: create dropdown menu to choose attribute//
function createDropDown(csvData){
    //Add select element to the body
    var dropdown = d3.select('body')
        .append('select')
        .attr('class','dropdown')
        //Listen for change in select element
        .on('change', function(){
            changeAttribute(this.value,csvData)
        });
    //Add initial option as an affordance text
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");
    //Add attribute name options
    var attrOptions = dropdown.selectAll('attrOptions')
        .data(attrArray)
        .enter()
        //Create one option element per attribute
        .append('option')
        //Assign value attribute that holds name of attribute
        .attr('value',function(d){return d})
        .text(function(d){return d});
};

//Function: dropdown change listener handler
function changeAttribute(attribute,csvData){
    //Change expressed value to this.value in the dropdown selection
    expressed=attribute;
    //Redo color scale
    var colorScale = makeColorScale(csvData);
    //Recolor enumeration units
    var regions = d3.selectAll('.regions')
        //Add Transition operator
        .transition()
        //Set duration of interaction in milliseconds
        .duration(2000)    
        .style('fill',function(d){
            return choropleth(d.properties,colorScale)
        });
    //Manipulate bar graph
    var bars = d3.selectAll('.bar')
        //Sort bars in ascending order
        
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        
        })
         //Add transition to bars
         .transition() 
         //Set delay function to delay the transition using anonymous function
         .delay(function(d, i){
             return i *50
         })
         .duration(1000);
    updateChart(bars, csvData.length, colorScale, csvData);
};

//Function: add position size and color bars in chart//
function updateChart(bars, n, colorScale, csvData){
    //Remove old Axes ticks
    d3.selectAll("g").remove();

    yScale
        .range([463,0])
        .domain([0, d3.max(csvData, function (d) {return parseFloat(d[expressed])*1.1;})])

    //Create vertical Axis
    var yAxis = d3.axisLeft()
        .scale(yScale);
    //Place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    //Position bars
    bars.attr("x", function(d, i){
        return i * (chartInnerWidth / n) + leftPadding;
    })
    //Resize bars
    .attr("height", function(d, i){
        return 463 - yScale(parseFloat(d[expressed]));
    })
    .attr("y", function(d, i){
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
    })
    //Color bars
    .style('fill',function(d){
        return choropleth(d,colorScale)
    })
    //Update chart title
    var chartTitle = d3.select(".chartTitle")
    .text(expressed);
    //Remove top tick
    d3.selectAll('.domain').attr('d','M-0,463.5H0.5V0.5H-0');

};

//Function: highlight enumeration units and bars
function highlight(props){
    //Change the stroke of the highlighted item by selecting the class
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "orange")
        .style("stroke-width", "3")
    setLabel(props);
};

//Function: dehighlight regions 
function dehighlight(props){
    var selected = d3.selectAll("." + props.name)
    //Restyle the stroke and stroke-width
        .style("stroke", function(){
            //Get the unique stroke element for current DOM element within the desc element
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
    });
    //Create function that gets the description text of an element
    function getStyle(element, styleName){
        //Select current DOM element
        var styleText = d3.select(element)
            .select("desc")
            //Return text content in desc
            .text();
        //Create JSON string
        var styleObject = JSON.parse(styleText);
        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

//Function: create dynamic labels
function setLabel(props){
    //Create label content as HTML string
    var labelAttribute = '<h1>' + props[expressed] + '</h1><i><b>' + expressed + '</i></b>';
    //Create detailed label in html page 
    var infolabel = d3.select('body')
        .append('div')
        //Define class, ID, and add it to HTML
        .attr('class','infolabel')
        .attr('id', props.name + '_label')
        .html(labelAttribute);
    //Create div that contains the name of the region
    var regionName = infolabel.append('div')
        .attr('class', 'labelname')
        .html('Province: ' + props.name);
};

//Function: move label where mouse moves
function moveLabel(){
    //Determine width of label
    var labelWidth = d3.select('.infolabel')
        //Use node() to get the first element in this selection
        .node()
        //Return an object containing the sie of the label
        .getBoundingClientRect()
        //Examine width to determine how much to shift the mouse over
        .width;

    //Use coordinates of mousemove event to set label coordinates with offsets from wherever event is
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        //Used to switch vertical sides
        y2 = d3.event.clientY + 25;
    //Test for overflow horizontally (If the event x coordinate is greater than the width of the window and label buffer)
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //Test for overflow vertically (Is the Y coordinate less than the distance between mouse and upper-left label)
    var y = d3.event.clientY < 75 ? y2 : y1; 
    //Select the infolabel currently mousing over
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

window.onload = setMap();

})(); 