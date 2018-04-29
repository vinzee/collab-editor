<template>
  <div>
    <h1>CRDT implementation</h1>
    <p>Mode: {{editorMode}}</p>
    <div id="editor"></div>
  </div>
</template>

<script>
	// import $ from 'jQuery'
  import autobahn from 'autobahn'
  import Automerge from 'automerge'
  import {Event} from '../utils/event.js'

  window.Event = Event;
  window.Automerge = Automerge;

  export default {
    data () {
      return {
        editorMode: ''
      }
    },
    mounted () {
      const self = this

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
        window.session = session;

      console.log("WAMP Connected : ", details);

      session.call('getDoc').then(
        function (res) {
          console.log("Initializing doc...");
          window.doc = Automerge.load(res);
      }).catch(function (res) {
          console.log("Error:", res);
          window.doc = Automerge.init();
          window.doc = Automerge.change(window.doc, doc => {
            doc.text = new Automerge.Text()
            doc.text.insertAt(0, ...self.editor.getValue().split(''));
          });

          session.register('getDoc', (args) => {
            return Automerge.save(window.doc);
          });
      });

        self.editor.getSession().on('change', function(e) {
          if (self.editor.curOp && self.editor.curOp.command.name) {
            console.log("current_user change: ", e);

            let newDoc = Automerge.change(window.doc, doc => {
                if (e.action === 'insert') {
                  doc.text.insertAt(e.start.column, e.lines[0]);
                } else if (e.action === 'delete') {
                  doc.text.deleteAt(e.start.column);
                }
            })

            let changes = Automerge.getChanges(window.doc, newDoc)

            session.publish('collab.change', [JSON.stringify(changes)]);
            // setTimeout(() => {
              // session.publish('collab.change', [JSON.stringify(changes)]);
            // }, 10000);

            window.doc = newDoc;


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

        Event.$on('collab.change', (args) => {
            try {
              // FIXME - this.editor does not work here
              // window.editor.getSession().getDocument().applyDeltas(args);
              console.log("before change ", window.doc.text);

              window.doc = Automerge.applyChanges(window.doc, JSON.parse(args[0]));

              console.log("after change ", window.doc.text);

              // Automerge.getHistory(window.doc)
              // .map(state => console.log(state));

              window.editor.setValue(window.doc.text.join(''));
            } catch (e) {
              console.log(e);
            }
        });

        self.subscriptions = {
          'collab.change': (args) => {
            console.log("received change: ", args);
            window.Event.$emit('collab.change', args);
          },
          'collab.changeSelection' : (args) => {
             console.log("received changeSelection: ", args);
             // window.editor.clearSelection();
             window.editor.selection.addRange(args[1]); // true
          },
          'collab.changeCursor' : (args) => {
             console.log("received changeCursor: ", args[0].row, args[0].column);
             window.editor.selection.moveCursorTo(args[0].row, args[0].column);
          }

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