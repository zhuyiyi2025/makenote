// run-tests.js - Test suite for Mark Notes
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
const dom = new JSDOM(html, {
  url: "http://localhost:8765/index.html",
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
});

const window = dom.window;
const document = window.document;

// Stub alert
window.alert = function() {};
window.confirm = function() { return true; };

setTimeout(function() {
  var mk = window.__markNotes;
  if (!mk) {
    console.error("FAIL: window.__markNotes not found");
    // Try to get console errors
    console.log("Document title:", document.title);
    console.log("Note list HTML:", document.getElementById("note-list").innerHTML.slice(0, 200));
    process.exit(1);
  }

  var passed = 0, failed = 0, results = [];

  function assert(condition, msg, detail) {
    if (condition) { passed++; results.push({ pass: true, msg: msg, detail: detail || "" }); }
    else { failed++; results.push({ pass: false, msg: msg, detail: detail || "" }); }
  }
  function assertEqual(actual, expected, msg, detail) {
    assert(actual === expected, msg, (detail || "") + " | expected=" + JSON.stringify(expected) + " actual=" + JSON.stringify(actual));
  }
  function assertTruthy(actual, msg) { assert(!!actual, msg); }
  function assertFalsy(actual, msg) { assert(!actual, msg); }
  function assertLength(arr, len, msg) { assert(arr.length === len, msg, "expected=" + len + " got=" + arr.length); }

  // createNote
  (function() {
    var s = "createNote";
    var note = mk.createNote("Hello", "World content");
    assert(note.id && typeof note.id === "string", s + ": id is string");
    assertEqual(note.title, "Hello", s + ": title correct");
    assertEqual(note.content, "World content", s + ": content correct");
    assert(typeof note.updatedAt === "number", s + ": updatedAt is number");
    assert(typeof note.createdAt === "number", s + ": createdAt is number");
    assertEqual(note.updatedAt, note.createdAt, s + ": updatedAt eq createdAt");
    var n2 = mk.createNote("", "");
    assertEqual(n2.title, "", s + ": empty title stays empty");
    assertEqual(n2.content, "", s + ": empty content stays empty");
    var n3 = mk.createNote("  Trim me  ", "content");
    assertEqual(n3.title, "Trim me", s + ": title trimmed");
  })();

  // esc
  (function() {
    var s = "esc (HTML escaping)";
    assertEqual(mk.esc("hello"), "hello", s + ": plain text unchanged");
    assertEqual(mk.esc("a & b"), "a &amp; b", s + ": escape ampersand");
    assertEqual(mk.esc(""), "", s + ": empty string unchanged");
    assertEqual(mk.esc("<img src=x>"), "&lt;img src=x&gt;", s + ": escape img tag");
  })();

  // formatDate
  (function() {
    var s = "formatDate";
    var ts = new Date(2025, 0, 15, 9, 5).getTime();
    assertEqual(mk.formatDate(ts), "2025-01-15 09:05", s + ": standard format");
    var ts2 = new Date(2025, 11, 31, 23, 59).getTime();
    assertEqual(mk.formatDate(ts2), "2025-12-31 23:59", s + ": year end boundary");
  })();

  // CRUD
  (function() {
    var s = "CRUD";
    mk.setNotes([]);
    window.localStorage.removeItem("mark_notes_v1");
    mk.newNote();
    var notes = mk.getNotes();
    assertLength(notes, 1, s + ": newNote creates one note");
    var firstId = notes[0].id;
    assertTruthy(firstId, s + ": note has id");
    mk.selectNote(firstId);
    assertEqual(mk.getActiveId(), firstId, s + ": selectNote sets activeId");
    var ti = document.getElementById("note-title");
    var ca = document.getElementById("note-content");
    ti.value = "Updated Title";
    ca.value = "Updated content.";
    mk.saveCurrent();
    notes = mk.getNotes();
    assertEqual(notes[0].title, "Updated Title", s + ": save saves title");
    assertEqual(notes[0].content, "Updated content.", s + ": save saves content");
    mk.newNote();
    notes = mk.getNotes();
    assertLength(notes, 2, s + ": second note created");
    var secondId = notes[0].id;
    mk.deleteNote(firstId);
    notes = mk.getNotes();
    assertLength(notes, 1, s + ": delete leaves one");
    assertEqual(notes[0].id, secondId, s + ": remaining is second");
  })();

  // localStorage
  (function() {
    var s = "localStorage";
    var td = [{ id: "t1", title: "Persist", content: "Data", updatedAt: 1000, createdAt: 1000 }];
    mk.saveNotes(td);
    var raw = window.localStorage.getItem("mark_notes_v1");
    assertTruthy(raw, s + ": data in localStorage");
    var parsed = JSON.parse(raw);
    assertLength(parsed, 1, s + ": one note stored");
    assertEqual(parsed[0].title, "Persist", s + ": title correct");
    var loaded = mk.loadNotes();
    assertLength(loaded, 1, s + ": loadNotes reads correctly");
    assertEqual(loaded[0].content, "Data", s + ": content correct");
    window.localStorage.removeItem("mark_notes_v1");
  })();

  // renderList empty
  (function() {
    var s = "renderList (empty)";
    mk.setNotes([]);
    mk.renderList("");
    var list = document.getElementById("note-list");
    assertTruthy(list.innerHTML.indexOf("empty-list") !== -1, s + ": shows empty hint");
  })();

  // renderList with notes + sorting
  (function() {
    var s = "renderList (with notes)";
    mk.setNotes([
      { id: "r1", title: "Note A", content: "Content A", updatedAt: 2000, createdAt: 1000 },
      { id: "r2", title: "Note B", content: "Content B", updatedAt: 3000, createdAt: 1000 }
    ]);
    mk.renderList("");
    var list = document.getElementById("note-list");
    assertTruthy(list.innerHTML.indexOf("Note A") !== -1, s + ": Note A appears");
    assertTruthy(list.innerHTML.indexOf("Note B") !== -1, s + ": Note B appears");
    assert(list.innerHTML.indexOf("Note B") < list.innerHTML.indexOf("Note A"), s + ": sorted desc by updatedAt");
  })();

  // renderList search
  (function() {
    var s = "renderList (search)";
    mk.setNotes([
      { id: "s1", title: "JavaScript Tutorial", content: "Learn JS", updatedAt: 3000, createdAt: 1000 },
      { id: "s2", title: "Python Notes", content: "Learn Python", updatedAt: 2000, createdAt: 1000 },
      { id: "s3", title: "CSS Tips", content: "JS related CSS", updatedAt: 1000, createdAt: 1000 }
    ]);
    mk.renderList("JavaScript");
    var list = document.getElementById("note-list");
    assertTruthy(list.innerHTML.indexOf("JavaScript Tutorial") !== -1, s + ": title match");
    assertFalsy(list.innerHTML.indexOf("Python Notes") !== -1, s + ": non-matching filtered");
    mk.renderList("JS");
    assertTruthy(list.innerHTML.indexOf("CSS Tips") !== -1, s + ": content match");
    mk.renderList("nonexistent");
    assertTruthy(list.innerHTML.indexOf("empty-list") !== -1, s + ": no results shows empty");
  })();

  // renderList XSS
  (function() {
    var s = "renderList (XSS protection)";
    mk.setNotes([
      { id: "x1", title: "<img src=x onerror=alert(1)>", content: "safe text", updatedAt: 1000, createdAt: 1000 }
    ]);
    mk.renderList("");
    var list = document.getElementById("note-list");
    assertFalsy(list.innerHTML.indexOf("<img src=x onerror=") !== -1, s + ": title HTML escaped");
  })();

  // selectNote nonexistent
  (function() {
    var s = "selectNote (nonexistent safety)";
    mk.setNotes([]);
    mk.selectNote("nonexistent");
    assertEqual(mk.getActiveId(), "nonexistent", s + ": activeId set");
    // Reset editor state for this test
    document.getElementById("editor-area").style.display = "none";
    assertEqual(document.getElementById("editor-area").style.display, "none", s + ": editor hidden");
  })();

  // word count
  (function() {
    var s = "wordCount";
    var ca = document.getElementById("note-content");
    ca.value = "Hello World";
    ca.dispatchEvent(new window.Event("input"));
    var wc = document.getElementById("word-count");
    assertTruthy(wc.textContent.indexOf("11") !== -1, s + ": char count correct for \"Hello World\"");
    ca.value = "";
    ca.dispatchEvent(new window.Event("input"));
    assertTruthy(wc.textContent.indexOf("0") !== -1, s + ": empty shows 0");
  })();

  // deleteNote cancel
  (function() {
    var s = "deleteNote (cancel)";
    mk.setNotes([{ id: "d1", title: "Keep me", content: "Content", updatedAt: 1000, createdAt: 1000 }]);
    var origConfirm = window.confirm;
    window.confirm = function() { return false; };
    mk.deleteNote("d1");
    window.confirm = origConfirm;
    assertLength(mk.getNotes(), 1, s + ": cancel preserves note");
  })();

  // toast
  (function() {
    var s = "toast";
    var toast = document.getElementById("toast");
    toast.classList.remove("show");
    assertTruthy(toast, s + ": toast element exists");
    assertFalsy(toast.classList.contains("show"), s + ": initially hidden (no show class)");
  })();

  // print results
  console.log("\n========== Test Results ==========\n");
  var suite = "";
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var sname = r.msg.split(":")[0];
    if (sname !== suite) { suite = sname; console.log("\n[" + suite + "]"); }
    console.log("  " + (r.pass ? "PASS" : "FAIL") + " " + r.msg);
    if (!r.pass && r.detail) console.log("    " + r.detail);
  }
  console.log("\n==================================");
  console.log("Total: " + (passed + failed) + " | Pass: " + passed + " | Fail: " + failed);
  if (failed === 0) console.log("\nALL TESTS PASSED!");
  else console.log("\n" + failed + " TEST(S) FAILED!");
  process.exit(failed > 0 ? 1 : 0);
}, 3000);
