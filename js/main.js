/*Stylesheet by Timothy Prestby 2019*/
(function(){ 
//Pseudo global variables 
var attrArray = ['Passenger Traffic of Highways(10000 persons)','Freight Traffic of Highways(10000 tons)','Average Wage of Employed Persons in Urban Units(US dollars)','Total Value of Technical Market(100 million US dollars)',"Total Value of Imports of Foreign-funded Enterprises(1,000 US dollars)","Total Value of Exports of Foreign-funded Enterprises(1,000 US dollars)",'Rate of Loss Due to Bad Quality of Manufactured Products(%)'];
var csvData;
//Set initial attribute
var expressed = attrArray[0]
console.log(expressed)

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
    console.log(promises[0])

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
    .attr('d', path)
    .style('fill', function (d){
        return choropleth(d.properties, colorScale);
    });
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
    //Set chart dimensions
    var chartWidth = window.innerWidth * 0.475,
        chartHeight = 473;
        leftPadding = 50,
        rightPadding = 20,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    //Create a second svg element to hold the bar chart
    var chart = d3.select("body")
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
    //Create a scale to size bars proportionally
    var yScale = d3.scaleLinear()
        .range([463, 0])
        //Set to maximum attribute value
        .domain([0,120000]);
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
        //Ensure bars spread evenly across container by using datum index
        .attr('x', function(d, i){
            return i * (chartInnerWidth/csvData.length)+ leftPadding;
        })
        .attr('height', function(d){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr('y',function(d){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    //Create vertical Axis
    var yAxis = d3.axisLeft()
        .scale(yScale);
    //Place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    //Create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    //Create Dynamic Title
    var chartTitle = chart.append("text")
        .attr("x", 60)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text(expressed);
};


window.onload = setMap();

})(); 