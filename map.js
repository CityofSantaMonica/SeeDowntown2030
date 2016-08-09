/// <reference path="//ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js" />
// <reference path="//maps.googleapis.com/maps/api/js" />

var mapConfig = {
    center: new google.maps.LatLng(34.016615, -118.492978),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    //scrollwheel: false,
    zoom: 16,
};

var layers = [];
var map;

google.charts.load('current', { 'packages': ['corechart'] });

google.charts.setOnLoadCallback(function () {
    map = new google.maps.Map(document.getElementById("map"), mapConfig);
    $.getJSON("layers.json", function (data) {
        $.each(data, function (i) {
            var group = data[i];
            var potential = group.potential;
            var area = group.area;
            var groupCheckbox = createGroupCheckbox("layerGroups", potential, area);
            var groupCheckboxList = groupCheckbox.parentElement.nextSibling;
            $.each(group.layers, function (j) {
                var layer = group.layers[j];
                var path = layer.path;
                var title = layer.title;
                var description = layer.description;
                var color = layer.color;
                layers.push(loadLayer(path, color, groupCheckbox, groupCheckboxList, title))
            });
        });
        var parcels = loadParcelLayer("Downtown.geojson", "#FFFFFF");
    });
});

function createGroupCheckbox(layerContainerId, potential, area) {
    var layerContainer = document.getElementById(layerContainerId);
    var header = document.createElement("h3");
    var headerText = document.createTextNode(potential)
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
function loadLayer(url, fillColor, groupCheckbox, groupList, labelValue) {
    var layer = new google.maps.Data({ map: map, style: { clickable: false, fillColor: fillColor, fillOpacity: 0.75, strokeColor: "#FFFFFF", strokeOpacity: 0.1, strokeWeight: 1, zIndex: -1 }, title: labelValue, color: fillColor, expanded: false });
    var li = document.createElement("li");
    var checkbox = document.createElement("input");
    var swatch = document.createElement("div");
    var label = document.createElement("label");
    var labelText = document.createTextNode(labelValue);
    var table = document.createElement("table");
    var tbody = document.createElement("tbody");

    groupList.appendChild(li);
    checkbox.type = "checkbox";
    checkbox.checked = true;
    layer.checkbox = checkbox;
    li.appendChild(checkbox)
    groupCheckbox.subCheckbox.push(checkbox);
    setGroupLayerCheckbox(groupCheckbox);
    swatch.style.backgroundColor = fillColor;
    swatch.style.outline = "#000000 1px solid";
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
    //label.innerText = labelValue;
    //label.insertChild(swatch);
    li.appendChild(label);
    //if (assumptions !== undefined) {
    //    for (var index = 0; index < assumptions.length; index++) {
    //        var assumption = assumptions[index];
    //        var row = document.createElement("tr");
    //        var titleCol = document.createElement("th");
    //        var descriptionCol = document.createElement("td");
    //        titleCol.innerText = assumption.title;
    //        titleCol.setAttribute("style", "margin: 0; padding: 5px; text-indent: 0; vertical-align: top; width: 25%");
    //        descriptionCol.innerText = assumption.description;
    //        descriptionCol.setAttribute("style", "margin: 0; padding: 5px; text-indent: 0; vertical-align: top; width: 50%");
    //        row.appendChild(titleCol);
    //        row.appendChild(descriptionCol);
    //        tbody.appendChild(row);
    //    }
    //    //table.setAttribute("border", "1");
    //    table.setAttribute("style", "margin-left: 10%; width: 80%");
    //    table.appendChild(tbody);
    //    li.appendChild(table);
    //}



    checkbox.addEventListener("change", function (thisEvent) {
        layer.forEach(function (feature) {
            layer.overrideStyle(feature, { visible: thisEvent.target.checked });
        });
        setGroupLayerCheckbox(groupCheckbox);
        drawPieChart();
    });
    layer.loadGeoJson(url, null, function () {
        var area = 0;
        layer.forEach(function (feature) {
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
        layer.area = area;
        drawPieChart();
    });
    return layer;
}

function loadParcelLayer(url, strokeColor) {
    layer = new google.maps.Data({ map: map, style: { clickable: true, fillOpacity: 0, strokeColor: strokeColor, strokeWeight: 1 } });
    layer.addListener('click', function (thisEvent) {
        var latLng = thisEvent.latLng;
        var lat = latLng.lat();
        var lng = latLng.lng();
        for(var layer of layers) {
            layer.expanded = false;
            layer.forEach(function (feature) {
                var geometry = feature.getGeometry();
                switch (geometry.getType()) {
                    case "Polygon":
                        var polygon = new google.maps.Polygon({ path: geometry.getAt(0).getArray() });
                        if (google.maps.geometry.poly.containsLocation(latLng, polygon)) {
                            layer.expanded = true;
                        }
                        break;
                    case "MultiPolygon":
                        var instances = geometry.getArray();
                        for (var instance in instances) {
                            var polygon = new google.maps.Polygon({ path: instances[instance].getAt(0).getArray() });
                            if (google.maps.geometry.poly.containsLocation(latLng, polygon)) {
                                layer.expanded = true;
                            }
                        }
                        break;
                }
            });
        }
        layer.forEach(function (feature) {
            if (feature == thisEvent.feature) {
                layer.overrideStyle(feature, { strokeColor: "#FF0000", strokeWeight: 2 })
            }
            else {
                layer.revertStyle(feature);
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
        //if (layerParcelAssumptions[AIN] !== undefined) {
        //    var assumption = layerParcelAssumptions[AIN];
        //    document.getElementById("Assumptions_value").innerText = assumption;
        //}
        //else {
        //    document.getElementById("Assumptions_value").innerText = "";
        //}
        drawPieChart();
    });
    layer.loadGeoJson(url);
    return layer;
}

function drawPieChart() {
    var data = new google.visualization.DataTable();
    var slices = {};
    data.addColumn("string", "Name");
    data.addColumn("number", "Area");
    for (index = 0; index < layers.length; index++) {
        var layer = layers[index];
        if (layer.area == undefined) {
            return;
        }
        data.addRow([layer.title, layer.area]);
        slices[index] = { color: layer.checkbox.checked ? layer.color : "transparent", offset: layers[index].expanded ? 0.2 : 0 };
    }
    var options = {
        chartArea: { height: "80%", width: "80%" },
        legend: { position: "none" },
        pieSliceText: "percentage",
        slices: slices,
        tooltip: { text: "percentage" },
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
