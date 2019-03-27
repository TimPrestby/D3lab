/*Stylesheet by Timothy Prestby 2019*/

function setMap(){
    //Assign map frame dimensions
    var width = 560,
        height = 460;
    //Create new SVG container for the map 
    var map = d3.select('body')
        .append('svg')
        .attr('class','map')
        .attr('width',width)
        .attr('height',height);
    //Create Albers equal area conic projection centered on China
    var projection = d3.geoAlbers()
        .center([105.00, 45.60])
        .rotate([-7.18, 43.64, 0])
        .parallels([3, 45.94])
        .scale(1500.28)
        .translate([width / 2, height / 2]);
    //Create path generator
    var path = d3.geoPath()
        .projection(projection);

    //Assign new variable as array to hold data to be loaded
    var promises = [];
    //Load CSV attributes
    promises.push(d3.csv('data/AllData.csv'));
    //Load background Continent data
    promises.push(d3.json('data/asia.json'));
    //Load choropleth data
    promises.push(d3.json('data/provinces.json'));
    //Conduct multiple AJAX calls at the same time
    Promise.all(promises).then(callback);
    //Callback function to format data as array for csv and object for topojson
    function callback(data){
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

        //Assign variables to data
        csvData = data[0];
        asia = data[1];
        china = data[2];
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
            .attr('d', path);
    };
};

window.onload = setMap();
