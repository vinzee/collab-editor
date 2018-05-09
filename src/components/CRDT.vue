<template>
  <div>
    <h1>CRDT using websockets (WAMP)</h1>
    <div id="editor"></div>

    <h2>Changes</h2>
    <div ref="history"></div>
  </div>
</template>

<script>
  import _ from 'lodash'
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
      this.editor.setValue("HAT");
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

          session.call('getDoc').then((res) => {
              console.log("Fetching initial doc...");
              this.doc = Automerge.load(res);
              this.updateEditor();
              this.updateHistory();
          }).catch((res) => {
              console.log("Error:", res);
              this.doc = Automerge.init();
              this.doc = Automerge.change(this.doc, doc => {
                doc.text = []
                doc.text.push(new Automerge.Text())
                doc.text[0].insertAt(0, ...this.editor.getValue().split(''));
              });
              this.updateHistory();
              console.log("Creating doc...");

              session.register('getDoc', (args) => {
                return Automerge.save(this.doc);
              });
          });

          this.editor.getSession().on('change', (e) => {
            if (this.editor.curOp && this.editor.curOp.command.name) {
              console.log("current_user change: ", e);

              let newDoc = Automerge.change(this.doc, doc => {
                  if (e.action === 'insert') {
                    if (doc.text[e.start.row] === undefined){
                      // doc.text.splice[e.start.row];
                      doc.text.push(new Automerge.Text()); // create new row
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
              this.updateHistory();
            } else {
              console.log("peer change")
            }
          });

          this.editor.getSession().selection.on('changeSelection', (e) => {
              if (this.editor.curOp && this.editor.curOp.command.name) {
                // console.log("current_user changeSelection", e);
                session.publish('collab.changeSelection', [ e, this.editor.getSelectionRange() ]);
              } else {
                // console.log("peer changeSelection");
              }
          });

          this.editor.getSession().selection.on('changeCursor', (e) => {
            if (this.editor.curOp && this.editor.curOp.command.name) {
              // console.log("current_user changeCursor", this.editor.getCursorPosition());
              session.publish('collab.changeCursor', [ this.editor.getCursorPosition() ]);
            } else {
              // console.log("peer changeCursor");
            }
          });

          this.subscriptions = {
            'collab.change': (args) => {
              console.log("received change: ", args, this);
              try {
                this.doc = Automerge.applyChanges(this.doc, args[0]);
                this.updateEditor();
                this.updateHistory();
              } catch (e) {
                console.log(e);
              }
            },
            'collab.changeSelection' : (args) => {
               // console.log("received changeSelection: ", args);
               // this.editor.clearSelection();
               this.editor.selection.addRange(args[1]); // true
            },
            'collab.changeCursor' : (args) => {
               // console.log("received changeCursor: ", args[0].row, args[0].column);
               this.editor.selection.moveCursorTo(args[0].row, args[0].column);
            }
          }

          _.each(this.subscriptions, (callback, topic) => {
            console.log(topic);
            session.subscribe(topic, callback).then(function (sub) {
                console.log("subscribed to topic " + topic);
            }, function (err) {
                console.error("Failed to subscribe to " + topic + " : " + err);
            });
          });
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
      },
      updateHistory () {
        let innerHTML = '';
        let i = 0;
        Automerge.getHistory(this.doc).map(state => {
          _.each(state.change.ops, (op) => {
            innerHTML += ('<p><b>' + i++ + ')</b> ' + JSON.stringify(op) + '</p>');
          });
        });

        this.$refs.history.innerHTML = innerHTML;
      }
    }
  }
</script>

<style>
  #editor {
      margin: 0;
      width: 80%;
      height: 10em;
      margin-top: 5px;
      font-size: 14px;
  }
</style>