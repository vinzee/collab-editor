<template>
  <div>
    <h1>CRDT implementation</h1>
    <p>Mode: {{editorMode}}</p>
    <div id="editor"></div>
  </div>
</template>

<script>
	import $ from 'jQuery'
  import autobahn from 'autobahn'
  import Automerge from 'automerge'

  export default {
    data () {
      return {
        editorMode: ''
      }
    },
    mounted () {
      const self = this

      this.doc = Automerge.init();
      this.doc = Automerge.change(this.doc, doc => {
        doc.text = new Automerge.Text()
      });

      window.editor = this.editor = ace.edit("editor");
      this.editor.setOption("maxLines", 1);
      this.editor.$blockScrolling = Infinity;
      this.editor.setTheme("ace/theme/monokai");
      this.editor.setShowPrintMargin(false);
      this.editor.session.setMode("ace/mode/javascript");
      this.editorMode = this.editor.session.getMode().$id;
      this.editor.setValue("console.log('HAT')");
      this.editor.$blockScrolling = Infinity;
      this.editor.clearSelection();

      window.connection = this.connection = new autobahn.Connection({
        url: "ws://localhost:8080/ws",
        realm: "realm1"
      });

      this.connection.onopen = function (session, details) {
        console.log("WAMP Connected : ", details);

        self.editor.getSession().on('change', function(e) {
          if (self.editor.curOp && self.editor.curOp.command.name) {
            console.log("current_user change: ", e);

            // self.doc = Automerge.change(self.doc, doc => {
            //     if (e.action === 'insert') {
            //       doc.text.insertAt(e.start.column, e.lines[0]);
            //     } else if (e.action === 'delete') {
            //       doc.text.deleteAt(e.start.column);
            //     }
            //   // doc.text.insertAt(0, 'h', 'e', 'l', 'l', 'o')
            //   // doc.text.deleteAt(0)
            //   // doc.text.insertAt(0, 'H')
            // })

            setTimeout(() => {
              session.publish('collab.change', [e]);
            }, 10000);

          } else {
            console.log("peer change")
          }
        });

        self.editor.getSession().selection.on('changeSelection', function(e) {
            if (self.editor.curOp && self.editor.curOp.command.name) {
              console.log("current_user changeSelection", e);
              session.publish('collab.changeSelection', [ e, self.editor.getSelectionRange() ]);
            } else {
              console.log("peer changeSelection");
            }
        });

        self.editor.getSession().selection.on('changeCursor', function(e) {
          if (self.editor.curOp && self.editor.curOp.command.name) {
            console.log("current_user changeCursor", self.editor.getCursorPosition());
            session.publish('collab.changeCursor', [ self.editor.getCursorPosition() ]);
          } else {
            console.log("peer changeCursor");
          }
        });

        self.subscriptions = {
          'collab.change' : self.change,
          'collab.changeSelection' : self.changeSelection,
          'collab.changeCursor' : self.changeCursor
        }

        for(let topic in self.subscriptions){
          session.subscribe(topic, self.subscriptions[topic]).then(function (sub) {
              console.log("subscribed to topic " + topic);
          }, function (err) {
              console.error("Failed to subscribe to " + topic + " : " + err);
          });
        }
      }

      // fired when connection was lost (or could not be established)
      this.connection.onclose = function (reason, details) {
        console.log("WAMP Connection lost: " + reason);
      }

      this.connection.open();
    },

    methods: {
      change: (args) => {
         console.log("received change: ", args);
         // FIXME - this.editor does not work here
         window.editor.getSession().getDocument().applyDeltas(args);
      },
      changeSelection: (args) => {
         console.log("received changeSelection: ", args);
         // window.editor.clearSelection();
         window.editor.selection.addRange(args[1]); // true
      },
      changeCursor: (args) => {
         console.log("received changeCursor: ", args[0].row, args[0].column);
         window.editor.selection.moveCursorTo(args[0].row, args[0].column);
      }
    }
  }
</script>

<style>
  #editor {
      margin: 0;
      width: 100%;
      height: 40em;
      margin-top: 5px;
      font-size: 14px;
  }
</style>