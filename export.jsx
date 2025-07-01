// Configuration
var exportResolution = 2400;
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

// Folder paths (adjusted to Desktop)
var aiFolder = Folder("~/Desktop/PUMA_DAC/ai_files");
var flatOutputFolder = Folder("~/Desktop/PUMA_DAC/Extracted");
var perFileFolderRoot = Folder("~/Desktop/PUMA_DAC/png_images");
var failedLogFile = new File("~/Desktop/PUMA_DAC/failed_exports.txt");

// Initial folder checks
if (!aiFolder.exists) {
    alert("'ai_files' folder not found on Desktop.");
    exit();
}
if (!flatOutputFolder.exists) flatOutputFolder.create();
if (!perFileFolderRoot.exists) perFileFolderRoot.create();

// Timestamp utility
function getTimeStamp() {
    var now = new Date();
    return now.toLocaleString();
}

// Start fresh log
failedLogFile.open("w");
failedLogFile.writeln("Failed or Skipped Exports (Empty Folders)");
failedLogFile.close();

var aiFiles = aiFolder.getFiles("*.ai");
if (aiFiles.length === 0) {
    alert("No .ai files found in 'ai_files'");
    exit();
}

// Helper functions
function safeTrim(value) {
    return (typeof value === "string") ? value.replace(/^\s+|\s+$/g, "") : "";
}

function layerAlreadyAdded(layer, list) {
    for (var i = 0; i < list.length; i++) {
        if (list[i] === layer) return true;
    }
    return false;
}

// Main processing loop
for (var f = 0; f < aiFiles.length; f++) {
    var aiFile = aiFiles[f];
    var doc;

    try {
        doc = app.open(aiFile);
    } catch (e) {
        $.writeln("Failed to open: " + aiFile.name);
        continue;
    }

    var fileNameNoExt = aiFile.name.replace(/\.[^\.]+$/, "");
    var perFileFolder = new Folder(perFileFolderRoot.fsName + "/" + fileNameNoExt);
    if (!perFileFolder.exists) perFileFolder.create();

    var selectedLayers = [];

    // Step 1: Exact 6-digit layer names
    for (var l = 0; l < doc.layers.length; l++) {
        var lname = safeTrim(doc.layers[l].name);
        if (/^\d{6}$/.test(lname)) {
            selectedLayers.push(doc.layers[l]);
        }
    }

    // Step 2: Layers containing 6-digit IDs
    for (var l = 0; l < doc.layers.length; l++) {
        var lname = safeTrim(doc.layers[l].name);
        if (!layerAlreadyAdded(doc.layers[l], selectedLayers) && /\d{6}/.test(lname)) {
            selectedLayers.push(doc.layers[l]);
        }
    }

    // Step 3: Fallback to 'techpack' layer
    if (selectedLayers.length === 0) {
        try {
            var techpackLayer = doc.layers.getByName("techpack");
            selectedLayers.push(techpackLayer);
        } catch (e) {
            $.writeln("Skipped (no valid layers): " + aiFile.name);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            continue;
        }
    }

    try {
        var exportedCount = 0;

        for (var l = 0; l < selectedLayers.length; l++) {
            var layer = selectedLayers[l];
            var layerName = safeTrim(layer.name);
            var sixDigitMatch = layerName.match(/\d{6}/);
            if (!sixDigitMatch) continue;
            var layerID = sixDigitMatch[0];

            for (var i = 0; i < layer.pageItems.length; i++) {
                var item = layer.pageItems[i];
                if (item.typename !== "GroupItem") continue;

                var groupName = safeTrim(item.name);
                if (!groupName) continue;

                var finalName = (groupName.indexOf(layerID) === 0)
                    ? groupName
                    : layerID + "_" + groupName;

                var bounds = item.visibleBounds;
                var groupWidth = bounds[2] - bounds[0];
                var groupHeight = bounds[1] - bounds[3];

                if (groupWidth < 50 || groupHeight < 50) {
                    $.writeln("Skipped small group: " + finalName + " (" + groupWidth + "x" + groupHeight + ")");
                    continue;
                }

                var newDoc = app.documents.add(DocumentColorSpace.RGB, groupWidth, groupHeight);
                var duplicatedGroup = item.duplicate(newDoc.layers[0], ElementPlacement.PLACEATBEGINNING);
                duplicatedGroup.left = 0;
                duplicatedGroup.top = groupHeight;

                var exportOptions = new ExportOptionsPNG24();
                exportOptions.artBoardClipping = true;
                exportOptions.antiAliasing = true;
                exportOptions.transparency = true;
                exportOptions.horizontalScale = 1000;
                exportOptions.verticalScale = 1000;
                exportOptions.resolution = exportResolution;

                var fileName = finalName + ".png";
                var file1 = new File(perFileFolder.fsName + "/" + fileName);
                var file2 = new File(flatOutputFolder.fsName + "/" + fileName);

                newDoc.exportFile(file1, ExportType.PNG24, exportOptions);
                file1.copy(file2);

                newDoc.close(SaveOptions.DONOTSAVECHANGES);
                exportedCount++;
                $.writeln("Exported: " + finalName);
            }
        }

        doc.close(SaveOptions.DONOTSAVECHANGES);
        $.writeln("Finished file: " + aiFile.name);

    } catch (e) {
        $.writeln("Error processing " + aiFile.name + ": " + e.message);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}

// Check for empty export folders
var subfolders = perFileFolderRoot.getFiles(function (f) {
    return f instanceof Folder;
});

var failedList = [];

for (var i = 0; i < subfolders.length; i++) {
    var pngs = subfolders[i].getFiles("*.png");
    if (pngs.length === 0) {
        failedList.push(subfolders[i].name);
    }
}

if (failedList.length > 0) {
    failedLogFile.open("a");
    failedLogFile.writeln("\nFailed on: " + getTimeStamp());
    for (var j = 0; j < failedList.length; j++) {
        failedLogFile.writeln(failedList[j]);
    }
    failedLogFile.close();
    alert("Export finished with some skipped folders. Check 'failed_exports.txt'");
} else {
    alert("All PNGs exported successfully.");
}

app.quit();
