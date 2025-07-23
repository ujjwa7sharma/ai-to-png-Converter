// Configurations
var exportResolution = 2400;
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

// Folder paths
var aiFolder = Folder("C:/Users/UjjwalSharma/ai-to-png-converter/ai_files");
var flatOutputFolder = Folder("C:/Users/UjjwalSharma/ai-to-png-converter/Extracted");
var perFileFolderRoot = Folder("C:/Users/UjjwalSharma/ai-to-png-converter/png_images");
var logsFolder = new Folder("C:/Users/UjjwalSharma/ai-to-png-converter/logs");
var failedExportLog = new File(logsFolder.fsName + "/failed_exports.txt");
var skippedFilesLog = new File(logsFolder.fsName + "/skipped_files.log");

// Ensure folders exist
if (!flatOutputFolder.exists) flatOutputFolder.create();
if (!perFileFolderRoot.exists) perFileFolderRoot.create();
if (!logsFolder.exists) logsFolder.create();

// Delete bad folder if it exists
var processCSVPath = logsFolder.fsName + "/process_log.csv";
var possibleFolder = new Folder(processCSVPath);
if (possibleFolder.exists) {
    possibleFolder.remove();
}

// Create proper CSV file with header
var csvHeader = new File(processCSVPath);
csvHeader.open("w");
csvHeader.writeln("timestamp_utc,file_name,layer_name,group_name,status,message,log_type");
csvHeader.close();

// UTC timestamp utility
function getUTCTimestamp() {
    var now = new Date();
    function pad(n) { return n < 10 ? '0' + n : n; }
    return now.getUTCFullYear() + '-' +
           pad(now.getUTCMonth() + 1) + '-' +
           pad(now.getUTCDate()) + 'T' +
           pad(now.getUTCHours()) + ':' +
           pad(now.getUTCMinutes()) + ':' +
           pad(now.getUTCSeconds()) + 'Z';
}

// Reliable CSV logging
function logToCSV(fileName, layerName, groupName, status, message, logType) {
    var logFile = new File(processCSVPath);
    if (logFile.open("a")) {
        logFile.writeln([
            getUTCTimestamp(),
            '"' + fileName + '"',
            '"' + layerName + '"',
            '"' + groupName + '"',
            status,
            '"' + message.replace(/"/g, '""') + '"',
            logType
        ].join(","));
        logFile.close();
    } else {
        $.writeln(" Failed to write to CSV log.");
    }
}

function safeTrim(value) {
    return (typeof value === "string") ? value.replace(/^\s+|\s+$/g, "") : "";
}

// ✅ Modified: Collect direct GroupItems from a layer
function collectGroupItems(layer) {
    var groups = [];
    for (var i = 0; i < layer.pageItems.length; i++) {
        var item = layer.pageItems[i];
        if (item.typename === "GroupItem") {
            groups.push(item);
        }
    }
    return groups;
}

// ✅ Updated to include 6-digit base + *_BV layers
function findRelevantLayers(doc) {
    var validLayers = [];
    for (var i = 0; i < doc.layers.length; i++) {
        var lname = safeTrim(doc.layers[i].name).toLowerCase();
        if (
            /^\d{6}$/.test(lname) ||                       // 629623
            /^(\d{6})_\d{2}_bv$/.test(lname) ||            // 629623_29_BV
            /^(\d{6})_\d{2}_bv$/.test(lname) ||            // 629623_87_BV
            lname === "techpack" || lname === "sketch"
        ) {
            validLayers.push(doc.layers[i]);
        }
    }
    return validLayers;
}

// Reset logs
failedExportLog.open("w");
failedExportLog.writeln(" Failed or Skipped Exports (Empty Folders)");
failedExportLog.close();

skippedFilesLog.open("w");
skippedFilesLog.writeln(" Files Illustrator could not open:");
skippedFilesLog.close();

// Start processing
var aiFiles = aiFolder.getFiles("*.ai");
if (aiFiles.length === 0) {
    alert("No .ai files found.");
    exit();
}

for (var f = 0; f < aiFiles.length; f++) {
    var aiFile = aiFiles[f];
    var doc = null;

    try {
        doc = app.open(aiFile);
    } catch (e) {
        skippedFilesLog.open('a');
        skippedFilesLog.writeln(aiFile.fsName + " -- " + e.message);
        skippedFilesLog.close();
        logToCSV(aiFile.name, "", "", "SKIPPED", "Illustrator could not open the file.", "FILE");
        continue;
    }

    var fileNameNoExt = aiFile.name.replace(/\.[^\.]+$/, "");
    var perFileFolder = new Folder(perFileFolderRoot.fsName + "/" + fileNameNoExt);
    if (!perFileFolder.exists) perFileFolder.create();

    var selectedLayers = findRelevantLayers(doc);

    if (selectedLayers.length === 0) {
        logToCSV(aiFile.name, "", "", "SKIPPED", "No valid layers found.", "FILE");
        doc.close(SaveOptions.DONOTSAVECHANGES);
        continue;
    }

    try {
        var exportedCount = 0;
        var totalGroups = 0;

        for (var l = 0; l < selectedLayers.length; l++) {
            var layer = selectedLayers[l];
            var layerName = safeTrim(layer.name);
            var articleLayerID = layerName.match(/^\d{6}/);
            articleLayerID = articleLayerID ? articleLayerID[0] : layerName;

            var groupItems = collectGroupItems(layer);
            totalGroups += groupItems.length;

            for (var i = 0; i < groupItems.length; i++) {
                var item = groupItems[i];
                var groupName = safeTrim(item.name);
                if (!groupName) {
                    logToCSV(aiFile.name, layerName, "", "SKIPPED", "Unnamed group.", "GROUP");
                    continue;
                }

                var finalName = (groupName.indexOf(articleLayerID) === 0)
                    ? groupName
                    : articleLayerID + "_" + groupName;

                var bounds = item.visibleBounds;
                var width = bounds[2] - bounds[0];
                var height = bounds[1] - bounds[3];

                if (width < 50 || height < 50) {
                    logToCSV(aiFile.name, layerName, groupName, "SKIPPED", "Group too small (< 50px).", "GROUP");
                    continue;
                }

                var newDoc = app.documents.add(DocumentColorSpace.RGB, width, height);
                var dup = item.duplicate(newDoc.layers[0], ElementPlacement.PLACEATBEGINNING);
                dup.left = 0;
                dup.top = height;

                var options = new ExportOptionsPNG24();
                options.artBoardClipping = true;
                options.antiAliasing = true;
                options.transparency = true;
                options.horizontalScale = 1000;
                options.verticalScale = 1000;
                options.resolution = exportResolution;

                var pngName = finalName + ".png";
                var file1 = new File(perFileFolder.fsName + "/" + pngName);
                var file2 = new File(flatOutputFolder.fsName + "/" + pngName);

                newDoc.exportFile(file1, ExportType.PNG24, options);
                file1.copy(file2);
                newDoc.close(SaveOptions.DONOTSAVECHANGES);

                logToCSV(aiFile.name, layerName, groupName, "EXPORTED", "Export successful.", "GROUP");
                exportedCount++;
            }
        }

        doc.close(SaveOptions.DONOTSAVECHANGES);

        var status = "EXPORTED";
        var msg = "All groups exported.";
        if (exportedCount === 0) {
            status = "SKIPPED";
            msg = "No valid groups exported.";
        } else if (exportedCount < totalGroups) {
            status = "PARTIAL";
            msg = "Some groups were skipped.";
        }

        logToCSV(aiFile.name, "", "", status, msg, "FILE");

    } catch (e) {
        logToCSV(aiFile.name, "", "", "ERROR", e.message, "FILE");
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}

// Post-check: empty folders?
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
    failedExportLog.open("a");
    failedExportLog.writeln("\n Checked at: " + getUTCTimestamp());
    for (var j = 0; j < failedList.length; j++) {
        failedExportLog.writeln(failedList[j]);
        logToCSV(failedList[j], "", "", "FAILED_FOLDER", "Empty PNG export folder.", "FILE");
    }
    failedExportLog.close();
    alert(" Export complete with skipped folders. See 'failed_exports.txt'");
} else {
    alert(" All PNGs exported successfully.");
}

app.quit();
