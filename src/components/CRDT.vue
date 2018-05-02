<template>
  <div>
    <h1>With CRDT</h1>
    <div id="editor"></div>
  </div>
</template>

<script>
  import $ from 'jQuery'
  import autobahn from 'autobahn'
  import Automerge from 'automerge'

  export default {
    mounted () {
      this.editor = ace.edit("editor");
      // this.editor.setOption("maxLines", 1);
      this.editor.$blockScrolling = Infinity;
      this.editor.setTheme("ace/theme/monokai");
      this.editor.setShowPrintMargin(false);
      this.editor.session.setMode("ace/mode/javascript");
      this.editor.setValue("console.log('HAT')");
      this.editor.$blockScrolling = Infinity;
      this.editor.clearSelection();

      this.connection = new autobahn.Connection({
        url: "ws://localhost:8080/ws",
        realm: "realm1"
      });

      this.connection.onopen = function (session, details) {
        try {
          console.log("WAMP Connected : ", details);

          // Automerge.getHistory(this.doc)
          // .map(state => console.log(state));

          session.call('getDoc').then(
            function (res) {
              console.log("Fetching initial doc...");
              this.doc = Automerge.load(res);
              this.updateEditor();
          }.bind(this)).catch(function (res) {
              console.log("Error:", res);
              this.doc = Automerge.init();
              this.doc = Automerge.change(this.doc, doc => {
                doc.text = []
                doc.text.push(new Automerge.Text())
                doc.text[0].insertAt(0, ...this.editor.getValue().split(''));
              });
              console.log("Creating doc...");

              session.register('getDoc', (args) => {
                return Automerge.save(this.doc);
              });
          }.bind(this));

          this.editor.getSession().on('change', function(e) {
            if (this.editor.curOp && this.editor.curOp.command.name) {
              console.log("current_user change: ", e);

              let newDoc = Automerge.change(this.doc, doc => {
                  if (e.action === 'insert') {
                    if (doc.text[e.start.row] === undefined){
                      doc.text.splice[e.start.row];
                      doc.text.push(new Automerge.Text());
                    }

                    doc.text[e.start.row].insertAt(e.start.column, e.lines[0]);
                  } else if (e.action === 'remove') {
                    doc.text[e.start.row].deleteAt(e.start.column);

                    if(doc.text[e.start.row].length == 0){
                      doc.text.splice[e.start.row];
                    }
                  } else {
                    console.error("unhandled editor action", e);
                  }
              })

              let changes = Automerge.getChanges(this.doc, newDoc)

              // setTimeout(() => {
                session.publish('collab.change', [changes]);
              // }, 5000);

              this.doc = newDoc;

            } else {
              console.log("peer change")
            }
          }.bind(this));

          this.editor.getSession().selection.on('changeSelection', function(e) {
              if (this.editor.curOp && this.editor.curOp.command.name) {
                // console.log("current_user changeSelection", e);
                session.publish('collab.changeSelection', [ e, this.editor.getSelectionRange() ]);
              } else {
                // console.log("peer changeSelection");
              }
          }.bind(this));

          this.editor.getSession().selection.on('changeCursor', function(e) {
            if (this.editor.curOp && this.editor.curOp.command.name) {
              // console.log("current_user changeCursor", this.editor.getCursorPosition());
              session.publish('collab.changeCursor', [ this.editor.getCursorPosition() ]);
            } else {
              // console.log("peer changeCursor");
            }
          }.bind(this));

          this.subscriptions = {
            'collab.change': function (args) {
              console.log("received change: ", args, this);
              try {
                this.doc = Automerge.applyChanges(this.doc, args[0]);
                this.updateEditor();
              } catch (e) {
                console.log(e);
              }
            }.bind(this),
            'collab.changeSelection' : function (args) {
               // console.log("received changeSelection: ", args);
               // this.editor.clearSelection();
               this.editor.selection.addRange(args[1]); // true
            }.bind(this),
            'collab.changeCursor' : function (args) {
               // console.log("received changeCursor: ", args[0].row, args[0].column);
               this.editor.selection.moveCursorTo(args[0].row, args[0].column);
            }.bind(this)
          }

          for(let topic in this.subscriptions){
            session.subscribe(topic, this.subscriptions[topic]).then(function (sub) {
                console.log("subscribed to topic " + topic);
            }, function (err) {
                console.error("Failed to subscribe to " + topic + " : " + err);
            });
          }
        } catch (e) {
          console.log(e);
        }
      }.bind(this);

      // fired when connection was lost (or could not be established)
      this.connection.onclose = function (reason, details) {
        console.log("WAMP Connection lost: " + reason);
      }

      this.connection.open();
    },
    methods: {
      updateEditor () {
        let str = "";

        for(let i = 0; i < this.doc.text.length; i++) {
          str += this.doc.text[i].join('') + "\n";
        }
        this.editor.setValue(str);
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