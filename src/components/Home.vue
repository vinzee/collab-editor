<template>
  <div class="md-layout md-alignment-top-center">
    <div class="md-layout-item md-size-10">
      <md-field>
        <md-icon>access_time</md-icon>
        <label>Delay</label>
        <md-input v-model="delay" type="number" min="0" max="10000" step="500"></md-input>
        <!-- <label>microseconds</label> -->
      </md-field>
    </div>
    <div class="md-layout-item md-size-45">
      <Editor :delay=delayInt />
    </div>
    <div class="md-layout-item md-size-45">
      <Editor :delay=delayInt />
    </div>
  </div>
</template>

<script>
  import Editor from '@/components/Editor.vue'

  export default {
    name: 'Home',
    components: {
      Editor: Editor
    },
    data: () => ({
        delay: 500
    }),
    computed: {
      delayInt: function () {
        return parseInt(this.delay)
      }
    }
  }
</script>