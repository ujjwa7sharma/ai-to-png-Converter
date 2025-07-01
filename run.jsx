// @target illustrator

var logFile = new File("~/Desktop/illustrator_export_log.txt");
logFile.open("a");
logFile.writeln("=== run.jsx started at " + new Date());

try {
    var exportScript = File($.fileName).parent + "/export.jsx";
    logFile.writeln("⏳ Trying to load export.jsx from: " + exportScript.fsName);
    
    if (!exportScript.exists) {
        throw new Error("export.jsx not found at path: " + exportScript.fsName);
    }

    $.evalFile(exportScript);
    logFile.writeln("✅ export.jsx executed successfully");
} catch (e) {
    logFile.writeln("❌ Error in run.jsx: " + e.message);
}

logFile.writeln("=== run.jsx ended at " + new Date());
logFile.close();
