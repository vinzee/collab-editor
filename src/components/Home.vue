<template>
  <div>
    <h1>CRDT implementation</h1>
    <p>Mode: Javascript</p>
    <div id="editor"></div>
  </div>
</template>

<script>
	import $ from 'jQuery'
  import autobahn from 'autobahn'
  import Automerge from 'automerge'

  let editor,
      doc = Automerge.init();

  $(document).ready(function () {
    editor = window.editor = ace.edit("editor");
    editor.$blockScrolling = Infinity;
    editor.setTheme("ace/theme/monokai");
    editor.setShowPrintMargin(false);
    editor.session.setMode("ace/mode/javascript");
    editor.setValue("console.log('Hello World !')");
    editor.$blockScrolling = Infinity;
    editor.clearSelection();
  });

  const connection = window.connection = new autobahn.Connection({
    url: "ws://localhost:8080/ws",
    realm: "realm1"
  });

  connection.onopen = function (session, details) {
    console.log("Connected : ", details);

    // $(document).ready(function () {

      editor.getSession().on('change', function(e) {
          if(!window.editor._ignore_changes){
            console.log("editor change", e, e.data);

            doc = Automerge.change(doc, 'Initialize card list', doc => {
              doc.cards = []
            })

            session.publish('collab.change', [e]);
          }
      });

      // editor.getSession().selection.on('changeSelection', function(e) {
      //     console.log("editor changeSelection", e);
      //     session.publish('collab.changeSelection', [ e, editor.getSelectionRange() ]);
      // });

      editor.getSession().selection.on('changeCursor', function(e) {
          if(!window.editor._ignore_cursor_changes){
            console.log("editor changeCursor", e, editor.getCursorPosition());
            session.publish('collab.changeCursor', [ e, editor.getCursorPosition() ]);
          }
      });

    // }); $ready

    const subcriptions = {
      'collab.change' : change,
      // 'collab.changeSelection' : changeSelection,
      'collab.changeCursor' : changeCursor
    }

    for(var topic in subcriptions){
      console.log(topic)
      session.subscribe(topic, subcriptions[topic]).then(function (sub) {
          console.log("subscribed to topic " + topic);
      }, function (err) {
          console.log("failed to subscribe to " + topic + " : " + err);
      });
    }
  }

  function change (args) {
     // var msg = args[0];
     console.log("received change: ", args);
     editor._ignore_changes = true;
     editor.getSession().getDocument().applyDeltas(args);
     editor._ignore_changes = false;
  }

  function changeSelection (args) {
     // var msg = args[0];
     console.log("received changeSelection: ", args);
     editor._ignore_changes = true;
     editor.clearSelection();
     editor.selection.addRange(args[1]); // true

     // editor.getSession().getDocument().applyDeltas(args);
     editor._ignore_changes = false;
  }

  function changeCursor (args) {
     // var msg = args[0];
     console.log("received changeCursor: ", args[1].row, args[1].column);
     editor._ignore_cursor_changes = true;
     editor.selection.moveCursorTo(args[1].row, args[1].column);

     editor._ignore_cursor_changes = false;
  }

  // fired when connection was lost (or could not be established)
  //
  connection.onclose = function (reason, details) {
    console.log("Connection lost: " + reason);
  }

  connection.open();

</script>

<style>
  #editor {
      margin: 0;
      width: 100%;
      height: 32em;
      margin-top: 5px;
      font-size: 14px;
  }
</style>
