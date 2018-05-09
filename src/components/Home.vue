<template>
  <div>
    <h1>Without CRDT</h1>
    <div id="editor"></div>
  </div>
</template>

<script>
  import autobahn from 'autobahn'

  export default {
    mounted () {
      this.editor = ace.edit("editor");
      // this.editor.setOption("maxLines", 1);
      this.editor.$blockScrolling = Infinity;
      this.editor.setTheme("ace/theme/monokai");
      this.editor.setShowPrintMargin(false);
      this.editor.session.setMode("ace/mode/javascript");
      this.editor.setValue("console.log('HAT')");
      this.editor.clearSelection();

      this.connection = new autobahn.Connection({
        url: "ws://localhost:8080/ws",
        realm: "realm1"
      });

      this.connection.onopen = function (session, details) {
        try {
          console.log("WAMP Connected : ", details);


          session.call('getDoc').then(
            function (res) {
              console.log("Fetching initial doc...");
              this.updateEditor(args);
          }.bind(this)).catch(function (res) {
              console.log("Creating doc...");
              session.register('getDoc', (args) => {
                return this.editor.getValue();
              });
          }.bind(this));

          this.editor.getSession().on('change', function(e) {
            if (this.editor.curOp && this.editor.curOp.command.name) {
              console.log("current_user change: ", e);

              setTimeout(() => {
                session.publish('collab.change', [e]);
              }, 5000);

            } else {
              console.log("peer change")
            }
          }.bind(this));

          this.editor.getSession().selection.on('changeSelection', function(e) {
              if (this.editor.curOp && this.editor.curOp.command.name) {
                console.log("current_user changeSelection", e);
                session.publish('collab.changeSelection', [ e, this.editor.getSelectionRange() ]);
              } else {
                console.log("peer changeSelection");
              }
          }.bind(this));

          this.editor.getSession().selection.on('changeCursor', function(e) {
            if (this.editor.curOp && this.editor.curOp.command.name) {
              console.log("current_user changeCursor", this.editor.getCursorPosition());
              session.publish('collab.changeCursor', [ this.editor.getCursorPosition() ]);
            } else {
              console.log("peer changeCursor");
            }
          }.bind(this));

          this.subscriptions = {
            'collab.change': function (args) {
              console.log("received change: ", args, this);
              try {
                this.editor.getSession().getDocument().applyDeltas(args);
              } catch (e) {
                console.log(e);
              }
            }.bind(this),
            'collab.changeSelection' : function (args) {
               console.log("received changeSelection: ", args);
               // this.editor.clearSelection();
               this.editor.selection.addRange(args[1]); // true
            }.bind(this),
            'collab.changeCursor' : function (args) {
               console.log("received changeCursor: ", args[0].row, args[0].column);
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
      updateEditor (str) {
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