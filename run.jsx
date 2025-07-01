// @target illustrator

alert("✅ JSX script is running inside Illustrator!");

try {
    var exportScript = File($.fileName).parent + "/export.jsx";
    $.evalFile(exportScript);
    alert("✅ export.jsx finished");
} catch (e) {
    alert("❌ Error in run.jsx: " + e.message);
}

// Optional: Pause to keep Illustrator open
// $.sleep(5000); // OR use final alert to pause script
alert("✅ Script complete. Close this dialog to finish.");
