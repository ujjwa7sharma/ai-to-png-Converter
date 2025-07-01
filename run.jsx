// run.jsx

try {
    var exportScript = File($.fileName).parent + "/export.jsx";
    $.evalFile(exportScript);
} catch (e) {
    // optionally log to file
}


