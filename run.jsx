// @target illustrator
try {
    var exportScript = File(Folder.current + "/export.jsx");
    $.evalFile(exportScript);
} catch (e) {
    alert("❌ Error: " + e.message);
}
