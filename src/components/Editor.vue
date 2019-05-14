<template>
  <div>
    <div class="md-layout md-alignment-top-center">
      <div class="md-layout-item md-size-25">
        <h2>{{editorID}}</h2>
      </div>
    </div>

    <div class="md-layout md-alignment-top-center">
      <div class="md-layout-item md-size-80">
        <div :id=editorID class="editor"></div>
      </div>
    </div>

    <h4>History</h4>
    <div ref="history" class="history"></div>
  </div>
</template>

<script>
  import Automerge from 'automerge'
  import EventBus from '@/utils/EventBus.js'

  const changeEventName = 'editor-change';
  export default {
    name: "Editor",
    data () {
      return {
        editorID: "editor" + this._uid
      };
    },
    props: {
      delay: {
        type: Number,
        default: 500
      }
    },
    mounted () {
      this.initEditor();
      this.initAutomerge();
      this.initEventBusListener();
      this.initEditorListener();
    },
    methods: {
      initEditor () {
        this.editor = ace.edit(this.editorID);
        // this.editor.setOption("maxLines", 1);
        this.editor.$blockScrolling = Infinity;
        this.editor.setTheme("ace/theme/monokai");
        this.editor.setShowPrintMargin(false);
        this.editor.session.setMode("ace/mode/javascript");
        this.editor.setValue("HAT");
        this.editor.clearSelection();
      },
      initAutomerge () {
        this.doc = Automerge.init();
        this.doc = Automerge.change(this.doc, doc => {
          doc.text = []
          doc.text.push(new Automerge.Text())
          doc.text[0].insertAt(0, ...this.editor.getValue().split(''));
        });
        this.updateHistory();
        console.log("Creating doc...");
        // session.register('getDoc', (args) => {
        //   return Automerge.save(this.doc);
        // });
      },
      updateEditor () {
        let str = '';

        for(let i = 0; i < this.doc.text.length; i++) {
          str += this.doc.text[i].join('') + '\n';
        }

        this.editor.setValue(str);
      },
      updateHistory () {
        let innerHTML = '';
        let i = 0;
        Automerge.getHistory(this.doc).map(state => {
          state.change.ops.forEach(op => {
            innerHTML += ('<p><b>' + i++ + ')</b> ' + JSON.stringify(op) + '</p>');
          });
        });

        this.$refs.history.innerHTML = innerHTML;
      },
      publishChange (changes) {
        setTimeout(() => {
          EventBus.$emit(changeEventName, {origin: this.editorID, changes: changes});
        }, this.delay);
      },
      applyReceivedChange (data) {
        console.log("received change: ", data);
        if(data.origin != this.editorID){
          // this.doc = Automerge.applyChanges(this.doc, data.changes);
          this.doc = Automerge.merge(this.doc, data.changes)
          this.updateEditor();
          this.updateHistory();
        }
      },
      initEventBusListener () {
        EventBus.$on(changeEventName, (data) => {
          try {
            this.applyReceivedChange(data);
          } catch (e) {
              console.log(e);
          }
        });
      },
      initEditorListener () {
        this.editor.getSession().on('change', (e) => {
          if (this.editor.curOp && this.editor.curOp.command.name) {
            const newDoc = Automerge.change(this.doc, doc => {
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

            // const changes = Automerge.getChanges(this.doc, newDoc)
            // this.publishChange(changes);

            this.publishChange(newDoc);

            this.doc = newDoc;
            this.updateHistory();
          } else {
            console.log("peer change")
          }
        });
      }
    }
  }
</script>

<style>
  .editor {
      margin: 0;
      width: 100%;
      height: 15em;
      margin-top: 20px;
      font-size: 14px;
  }
  .history {
    font-size: 12px;
  }
</style>