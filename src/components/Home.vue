<template>
  <div>
    <div id="editor"></div>

    <!-- <button id="btn1">my button</button> -->
  </div>
</template>

<style>
  #editor {
      margin: 0;
      width: 100%;
      height: 32em;
      margin-top: 5px;
      font-size: 14px;
  }
</style>

<script>
	import $ from 'jQuery'
  import autobahn from 'autobahn'

  $(document).ready(function () {
    var editor = window.editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.setShowPrintMargin(false);
    editor.session.setMode("ace/mode/javascript");
    editor.setValue("console.log('Hello World !')");
    editor.$blockScrolling = Infinity;
    editor.clearSelection();
  });

  var connection = window.connection = new autobahn.Connection({
    url: "ws://127.0.0.1:8080/ws",
    realm: "realm1"
  });

  connection.onopen = function (session, details) {
    console.log("Connected : ", details);

    $(document).ready(function () {

      // editor.getSession().on('change', function(e) {
      //     if(!window.editor._ignore_changes){
      //       console.log("editor change", e, e.data);
      //       session.publish('collab.change', [e]);
      //     }
      // });

      // editor.getSession().selection.on('changeSelection', function(e) {
          // console.log("editor changeSelection", e);
          // session.publish('collab.changeSelection', [ e, editor.getSelectionRange() ]);
      // });

      editor.getSession().selection.on('changeCursor', function(e) {
          console.log("editor changeCursor", e, editor.getCursorPosition());
          session.publish('collab.changeCursor', [ e, editor.getCursorPosition() ]);
      });
    });

    var subcriptions = {
      'collab.change' : onChange,
      'collab.changeSelection' : onChangeSelection,
      'collab.changeCursor' : onChangeCursor
    }

    for(var topic in subcriptions){
      session.subscribe(topic, subcriptions[topic]).then(function (sub) {
          console.log("subscribed to topic " + topic);
      }, function (err) {
          console.log("failed to subscribe to " + topic + " : " + err);
      });
    }
  }

  function onChange (args) {
     // var msg = args[0];
     console.log("received onChange: ", args);
     window.editor._ignore_changes = true;
     window.editor.getSession().getDocument().applyDeltas(args);
     window.editor._ignore_changes = false;
  }

  function onChangeSelection (args) {
     // var msg = args[0];
     console.log("received onChangeSelection: ", args);
     window.editor._ignore_changes = true;
     window.editor.clearSelection();
     window.editor.selection.addRange(args[1]); // true

     // window.editor.getSession().getDocument().applyDeltas(args);
     window.editor._ignore_changes = false;
  }

  function onChangeCursor (args) {
     // var msg = args[0];
     console.log("received onChangeCursor: ", args[1].row, args[1].column);
     // window.editor._ignore_changes = true;
     window.editor.getSession().getDocument().applyDeltas(args);
     // window.editor.selection.moveCursorTo(args[1].row, args[1].column);
     window.editor.gotoLine(args[1].row, args[1].column, true);
     window.editor.session.insert({row: 0, column: 0} , "hey");

     // window.editor._ignore_changes = false;
  }

  // fired when connection was lost (or could not be established)
  //
  connection.onclose = function (reason, details) {
    console.log("Connection lost: " + reason);
  }

  connection.open();

</script>