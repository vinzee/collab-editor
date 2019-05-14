<template>
  <div class="md-layout">
    <div class="md-layout-item md-size-50 md-alignment-top-center">
      <Editor/>
    </div>
    <div class="md-layout-item md-size-50 md-alignment-top-center">
      <Editor/>
    </div>
  </div>
</template>

<script>
  import Editor from '@/components/Editor.vue'

  export default {
    name: 'Home',
    components: {
      Editor: Editor
    }
  }
</script>