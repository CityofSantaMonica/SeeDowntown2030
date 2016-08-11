/* global google */

var mapConfig = {
    center: new google.maps.LatLng(34.0158384, -118.492639),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 16,
    styles: [
        {
            "featureType": "administrative",
            "stylers": [
                {"visibility": "off"}
            ]
        }, {
            "featureType": "poi",
            "stylers": [
                {"visibility": "off"}
            ]
        }, {
            "featureType": "road.highway",
            "stylers": [
                {"saturation": -100},
                {"lightness": 24}
            ]
        }
    ]
};

var potentialLayers = [];
var map;

google.charts.load('current', {'packages': ['corechart']});

google.charts.setOnLoadCallback(function () {
    map = new google.maps.Map(document.getElementById("map"), mapConfig);
    $.getJSON("https://cityofsantamonica.github.io/SeeDowntown2030/layers.json", function (data) {
        for (var i = 0; i < data.length; i++) {
            var group = data[i];
            var potential = group.potential;
            var area = group.area;
            var groupCheckbox = createGroupCheckbox("layerGroups", potential, area);
            var groupCheckboxList = groupCheckbox.parentElement.nextSibling;
            for (var j = 0; j < group.layers.length; j++) {
                var layer = group.layers[j];
                var path = layer.path;
                var title = layer.title;
                var description = layer.description;
                var source = layer.source;
                var color = layer.color;
                potentialLayers.push(loadPotentialLayer(path, color, 0.75, "#FFFFFF", 0.1, groupCheckbox, groupCheckboxList, title, description, source, true));
            }
            if (group.potential === "SITES CONSIDERED TO HAVE POTENTIAL FOR CHANGE") {
                loadPotentialLayer("https://cityofsantamonica.github.io/SeeDowntown2030/HistoricBuildings.geojson", "#FFFFFF", 0, "#FF0000", 1, groupCheckbox, groupCheckboxList, "Historic Buildings", "", "", false);
            }
        }
        loadParcelLayer("https://cityofsantamonica.github.io/SeeDowntown2030/Downtown.geojson", "#FFFFFF");
    });
});

function createGroupCheckbox(layerContainerId, potential, area) {
    var layerContainer = document.getElementById(layerContainerId);
    var header = document.createElement("h3");
    var headerText = document.createTextNode(potential);
    var checkbox = document.createElement("input");
    var list = document.createElement("ul");
    header.appendChild(headerText);
    layerContainer.appendChild(header);
    checkbox.type = "checkbox";
    checkbox.subCheckbox = [];
    checkbox.checked = true;
    header.insertBefore(checkbox, header.firstChild);
    checkbox.addEventListener("change", function (thisEvent) {
        for (var index = 0; index < thisEvent.target.subCheckbox.length; index++) {
            thisEvent.target.subCheckbox[index].checked = thisEvent.target.checked;
        }
        for (var index = 0; index < thisEvent.target.subCheckbox.length; index++) {
            thisEvent.target.subCheckbox[index].dispatchEvent(new Event("change"));
        }
        drawPieChart();
    });
    layerContainer.appendChild(list);
    return checkbox;
}

function loadPotentialLayer(url, fillColor, fillOpacity, strokeColor, strokeOpacity, groupCheckbox, groupList, title, description, sources, isParcel) {
    var potentialLayer = new google.maps.Data({map: map, style: {clickable: false, fillColor: fillColor, fillOpacity: fillOpacity, strokeColor: strokeColor, strokeOpacity: strokeOpacity, strokeWeight: 1, zIndex: isParcel ? -1 : 0}, title: title, color: fillColor, expanded: false});
    var li = document.createElement("li");
    var checkbox = document.createElement("input");
    var swatch = document.createElement("div");
    var label = document.createElement("label");
    var labelText = document.createTextNode(title);

    potentialLayer.assumption_title = title;
    potentialLayer.assumption = description;
    potentialLayer.assumption_sources = sources;
    groupList.style.webkitPaddingStart = "0";
    groupList.appendChild(li);
    checkbox.type = "checkbox";
    checkbox.checked = true;
    potentialLayer.checkbox = checkbox;
    li.style.listStyleType = "none";
    li.style.marginLeft = "2em";
    li.appendChild(checkbox);
    groupCheckbox.subCheckbox.push(checkbox);
    setGroupLayerCheckbox(groupCheckbox);
    swatch.style.backgroundColor = fillColor;
    swatch.style.outline = strokeColor + " 1px solid";
    swatch.style.width = "1em";
    swatch.style.height = "1em";
    swatch.style.display = "inline-block";
    swatch.style.marginLeft = "1ex";
    swatch.style.marginRight = "1ex";
    //li.appendChild(swatch);
    label.htmlFor = checkbox.id;
    label.appendChild(swatch);
    label.appendChild(labelText);
    label.style.cursor = "pointer";
    //label.innerText = title;
    //label.insertChild(swatch);
    li.appendChild(label);

    checkbox.addEventListener("change", function (thisEvent) {
        potentialLayer.forEach(function (feature) {
            potentialLayer.overrideStyle(feature, {visible: thisEvent.target.checked});
        });
        setGroupLayerCheckbox(groupCheckbox);
        if (isParcel)
            drawPieChart();
    });
    potentialLayer.loadGeoJson(url, null, function () {
        if (isParcel) {
            var area = 0;
            potentialLayer.forEach(function (feature) {
                var geometry = feature.getGeometry();
                switch (geometry.getType()) {
                    case "Polygon":
                        area += google.maps.geometry.spherical.computeArea(geometry.getAt(0).getArray());
                        break;
                    case "MultiPolygon":
                        var instances = geometry.getArray();
                        for (var instance in instances) {
                            area += google.maps.geometry.spherical.computeArea(instances[instance].getAt(0).getArray());
                        }
                        break;
                }
            });
            potentialLayer.area = area;
            drawPieChart();
        }
    });

    return potentialLayer;
}

function loadParcelLayer(url, strokeColor) {
    var assumption_title = "";
    var assumption_description = "";
    var assumption_sources = "";
    var parcelLayer = new google.maps.Data({map: map, style: {clickable: true, fillOpacity: 0, strokeColor: strokeColor, strokeWeight: 1}});
    parcelLayer.addListener('click', function (thisEvent) {
        var latLng = thisEvent.latLng;
        var lat = latLng.lat();
        var lng = latLng.lng();
        for (var i = 0; i < potentialLayers.length; i++) {
            var potentialLayer = potentialLayers[i];
            potentialLayer.expanded = false;
            potentialLayer.forEach(function (feature) {
                var geometry = feature.getGeometry();
                switch (geometry.getType()) {
                    case "Polygon":
                        var polygon = new google.maps.Polygon({path: geometry.getAt(0).getArray()});
                        if (google.maps.geometry.poly.containsLocation(latLng, polygon)) {
                            potentialLayer.expanded = true;
                            assumption_title = potentialLayer.assumption_title;
                            assumption_description = potentialLayer.assumption;
                            assumption_sources = potentialLayer.assumption_sources;
                        }
                        break;
                    case "MultiPolygon":
                        var instances = geometry.getArray();
                        for (var instance in instances) {
                            var polygon = new google.maps.Polygon({path: instances[instance].getAt(0).getArray()});
                            if (google.maps.geometry.poly.containsLocation(latLng, polygon)) {
                                potentialLayer.expanded = true;
                                assumption_title = potentialLayer.assumption_title;
                                assumption_description = potentialLayer.assumption;
                                assumption_sources = potentialLayer.assumption_sources;
                            }
                        }
                        break;
                }
            });
        }
        parcelLayer.forEach(function (feature) {
            if (feature === thisEvent.feature) {
                parcelLayer.overrideStyle(feature, {strokeColor: "#FF0000", strokeWeight: 2});
            } else {
                parcelLayer.revertStyle(feature);
            }
        });
        var AIN = thisEvent.feature.getProperty("AIN");
        var SitusAddress = thisEvent.feature.getProperty("Situs Address");
        var YearBuilt = thisEvent.feature.getProperty("Year Built");
        var BuildingSquareFootage = thisEvent.feature.getProperty("Building Square Footage");
        var BuildingHeight = thisEvent.feature.getProperty("Building Height");
        var LotSquareFootage = thisEvent.feature.getProperty("Lot Square Footage");
        document.getElementById("AIN_value").innerText = AIN;
        document.getElementById("SitusAddress_value").innerText = SitusAddress;
        document.getElementById("YearBuilt_value").innerText = YearBuilt;
        document.getElementById("BuildingSquareFootage_value").innerText = BuildingSquareFootage;
        document.getElementById("BuildingHeight_value").innerText = BuildingHeight;
        document.getElementById("LotSquareFootage_value").innerText = LotSquareFootage;
        document.getElementById("Assumption_title").innerText = assumption_title;
        document.getElementById("Assumption_description").innerText = assumption_description;
        document.getElementById("Assumption_sources").innerText = assumption_sources;
        drawPieChart();
    });
    parcelLayer.loadGeoJson(url);
    return parcelLayer;
}

function drawPieChart() {
    var data = new google.visualization.DataTable();
    var slices = {};
    data.addColumn("string", "Name");
    data.addColumn("number", "Area");
    for (i = 0; i < potentialLayers.length; i++) {
        var layer = potentialLayers[i];
        if (layer.area === undefined) {
            return;
        }
        data.addRow([layer.title, layer.area]);
        slices[i] = {color: layer.checkbox.checked ? layer.color : "transparent", offset: layer.expanded ? 0.2 : 0};
    }
    var options = {
        chartArea: {height: "80%", width: "80%"},
        legend: {position: "none"},
        pieSliceText: "percentage",
        slices: slices,
        tooltip: {text: "percentage"},
        height: 300
    };
    chart = new google.visualization.PieChart(document.getElementById('piechart'));
    chart.draw(data, options);
}

function setGroupLayerCheckbox(checkbox) {
    checkbox.checked = true;
    for (var index = 0; index < checkbox.subCheckbox.length; index++) {
        if (!checkbox.subCheckbox[index].checked) {
            checkbox.checked = false;
            break;
        }
    }
}
