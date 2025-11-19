<template>
  <div class="allView">
    <threeModel
      :initial-width="'100%'"
      :initial-height="'100%'"
      ref="threeRef"
      :Zoom="6.8"
      :modelUrl="coldModel"
      :elevationDeg="0"
      :azimuthDeg="90"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import threeModel from '@/three/index.vue'
const coldModel = ref('/glb/cold.glb')
</script>

<style scoped>
.allView {
  width: 100%;
  height: calc(100%);
  position: relative;
}
</style>
